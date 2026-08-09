import crypto from 'node:crypto';
import { getPaymentAdapter } from './payments/registry.ts';
import { recordBusinessEvent } from './_business-events.ts';

export const config = { api: { bodyParser: false } };

type ApiReq = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
} & AsyncIterable<Uint8Array | Buffer>;

type ApiRes = {
  setHeader: (n: string, v: string) => void;
  status: (c: number) => { json: (b: unknown) => unknown };
};

const MAX_BODY_BYTES = 128_000;
const clean = (value: unknown, max = 500): string =>
  String(value ?? '')
    .trim()
    .slice(0, max);

const json = (res: ApiRes, status: number, body: unknown) => {
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  return res.status(status).json(body);
};

async function readRawBody(req: ApiReq): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buf.length;
    if (size > MAX_BODY_BYTES) throw Object.assign(new Error('request_too_large'), { status: 413 });
    chunks.push(buf);
  }
  return Buffer.concat(chunks);
}

async function applyEvent(event: Record<string, unknown>, payloadHash: string) {
  const url = clean(process.env.SUPABASE_URL, 1000).replace(/\/$/, '');
  const key = clean(process.env.SUPABASE_SERVICE_ROLE_KEY, 5000);
  if (!url || !key)
    throw Object.assign(new Error('trusted_order_store_not_connected'), { status: 503 });
  const isQuote = event.entityType === 'quote' || Boolean(event.quoteNumber);
  if (isQuote && event.kind === 'refund')
    throw Object.assign(new Error('quote_refund_requires_staff_workflow'), { status: 409 });
  const rpc = isQuote
    ? 'apply_verified_quote_payment_event'
    : event.kind === 'refund'
      ? 'apply_verified_refund_event'
      : 'apply_verified_payment_event';
  const common = {
    p_provider: event.provider,
    p_event_id: event.eventId,
    p_amount: event.amount,
    p_currency: event.currency,
    p_transaction_id: event.transactionId,
    p_payload_hash: payloadHash,
  };
  const payload = isQuote
    ? { ...common, p_quote_number: event.quoteNumber, p_event_status: event.eventStatus }
    : event.kind === 'refund'
      ? { ...common, p_order_number: event.orderNumber }
      : { ...common, p_order_number: event.orderNumber, p_event_status: event.eventStatus };
  const response = await fetch(`${url}/rest/v1/rpc/${rpc}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  if (!response.ok)
    throw Object.assign(new Error(`payment_event_rejected:${text.slice(0, 300)}`), {
      status: response.status >= 500 ? 502 : 409,
    });
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export default async function handler(req: ApiReq, res: ApiRes) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { ok: false, error: 'method_not_allowed' });
  }
  let raw: Buffer;
  try {
    raw = await readRawBody(req);
  } catch (error: unknown) {
    const status =
      error && typeof error === 'object' && 'status' in error
        ? Number((error as { status?: unknown }).status || 400)
        : 400;
    const message =
      error && typeof error === 'object' && 'message' in error
        ? (error as { message?: unknown }).message
        : error;
    return json(res, status, { ok: false, error: clean(message, 120) });
  }
  const providerHeader = req.headers?.['x-payment-provider'];
  const providerQuery = req.query?.provider;
  const provider = clean(
    (Array.isArray(providerHeader) ? providerHeader[0] : providerHeader) ||
      (Array.isArray(providerQuery) ? providerQuery[0] : providerQuery),
    80,
  ).toLowerCase();
  const adapter = getPaymentAdapter(provider);
  if (!adapter) return json(res, 400, { ok: false, error: 'unknown_payment_provider' });
  if (!adapter.verifyWebhook?.(raw, req.headers || {}))
    return json(res, 401, { ok: false, error: 'invalid_webhook_signature' });
  let payload: unknown;
  try {
    payload = JSON.parse(raw.toString('utf8'));
  } catch {
    return json(res, 400, { ok: false, error: 'invalid_json' });
  }
  let event: Record<string, unknown>;
  try {
    if (!adapter.normalizeEvent)
      return json(res, 503, { ok: false, error: 'payment_provider_not_connected' });
    event = adapter.normalizeEvent(payload);
  } catch (error: unknown) {
    const status =
      error && typeof error === 'object' && 'status' in error
        ? Number((error as { status?: unknown }).status || 400)
        : 400;
    const message =
      error && typeof error === 'object' && 'message' in error
        ? (error as { message?: unknown }).message
        : error;
    return json(res, status, { ok: false, error: clean(message, 120) });
  }
  const validEntity =
    event.entityType === 'quote' || event.quoteNumber
      ? /^QT-\d{8}-[A-Z0-9-]{4,40}$/i.test(String(event.quoteNumber || ''))
      : /^SHB-\d{8}-\d{7}$/.test(String(event.orderNumber || ''));
  if (
    !event.eventId ||
    !validEntity ||
    !event.eventStatus ||
    !Number.isFinite(Number(event.amount)) ||
    Number(event.amount) <= 0
  )
    return json(res, 400, { ok: false, error: 'invalid_payment_event' });
  try {
    const result = await applyEvent(event, crypto.createHash('sha256').update(raw).digest('hex'));
    const reference = String(event.quoteNumber || event.orderNumber || '');
    const status = String(
      result?.payment_status || result?.paymentStatus || event.eventStatus || '',
    ).toLowerCase();
    const eventName =
      event.kind === 'refund'
        ? 'refund_completed'
        : status === 'paid'
          ? 'purchase_completed'
          : status === 'partially_paid'
            ? 'deposit_paid'
            : 'payment_recovered';
    await recordBusinessEvent(eventName, {
      entityType: event.quoteNumber ? 'quote' : 'order',
      entityReference: reference,
      valueUsd: event.amount,
      currency: String(event.currency || 'USD'),
      channel: String(event.provider || provider),
      sourceEventId: event.eventId,
      properties: { payment_status: status, transaction_id: event.transactionId },
    });
    return json(res, 200, {
      ok: true,
      eventKind: event.kind,
      entityType: event.entityType === 'quote' || event.quoteNumber ? 'quote' : 'order',
      referenceNumber: reference,
      paymentStatus: status || null,
    });
  } catch (error: unknown) {
    const status =
      error && typeof error === 'object' && 'status' in error
        ? Number((error as { status?: unknown }).status || 502)
        : 502;
    const message =
      error && typeof error === 'object' && 'message' in error
        ? (error as { message?: unknown }).message
        : error;
    return json(res, status, { ok: false, error: clean(message, 500) });
  }
}

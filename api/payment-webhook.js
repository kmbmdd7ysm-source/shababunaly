import crypto from 'node:crypto';
import { getPaymentAdapter } from './payments/registry.js';
import { recordBusinessEvent } from './_business-events.ts';
export const config = { api: { bodyParser: false } };
const MAX_BODY_BYTES = 128_000;
const clean = (value, max = 500) =>
  String(value ?? '')
    .trim()
    .slice(0, max);
const json = (res, status, body) => {
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  return res.status(status).json(body);
};
async function readRawBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw Object.assign(new Error('request_too_large'), { status: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
async function applyEvent(event, payloadHash) {
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
    return JSON.parse(text);
  } catch {
    return {};
  }
}
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { ok: false, error: 'method_not_allowed' });
  }
  let raw;
  try {
    raw = await readRawBody(req);
  } catch (error) {
    return json(res, error.status || 400, { ok: false, error: clean(error.message, 120) });
  }
  const provider = clean(
    req.headers['x-payment-provider'] || req.query?.provider,
    80,
  ).toLowerCase();
  const adapter = getPaymentAdapter(provider);
  if (!adapter) return json(res, 400, { ok: false, error: 'unknown_payment_provider' });
  if (!adapter.verifyWebhook(raw, req.headers))
    return json(res, 401, { ok: false, error: 'invalid_webhook_signature' });
  let payload;
  try {
    payload = JSON.parse(raw.toString('utf8'));
  } catch {
    return json(res, 400, { ok: false, error: 'invalid_json' });
  }
  let event;
  try {
    event = adapter.normalizeEvent(payload);
  } catch (error) {
    return json(res, error.status || 400, { ok: false, error: clean(error.message, 120) });
  }
  const validEntity =
    event.entityType === 'quote' || event.quoteNumber
      ? /^QT-\d{8}-[A-Z0-9-]{4,40}$/i.test(event.quoteNumber)
      : /^SHB-\d{8}-\d{7}$/.test(event.orderNumber);
  if (
    !event.eventId ||
    !validEntity ||
    !event.eventStatus ||
    !Number.isFinite(event.amount) ||
    event.amount <= 0
  )
    return json(res, 400, { ok: false, error: 'invalid_payment_event' });
  try {
    const result = await applyEvent(event, crypto.createHash('sha256').update(raw).digest('hex'));
    const reference = event.quoteNumber || event.orderNumber;
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
      currency: event.currency,
      channel: event.provider,
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
  } catch (error) {
    return json(res, error.status || 502, { ok: false, error: clean(error.message, 500) });
  }
}

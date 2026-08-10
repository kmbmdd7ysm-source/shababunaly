import { getPaymentAdapter } from './payments/registry.ts';
import { clean } from './payments/adapters/base.ts';
import { guardPublicPost } from './_request-security.ts';

type ApiReq = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
};
type ApiRes = {
  setHeader: (n: string, v: string) => void;
  status: (c: number) => { json: (b: unknown) => unknown };
};

const MAX_BODY_BYTES = 16_000;
const PAYABLE_STATUSES = new Set(['deposit_required', 'final_payment_required']);

const json = (res: ApiRes, status: number, body: unknown) => {
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  return res.status(status).json(body);
};

async function loadQuote(quoteNumber: string): Promise<Record<string, unknown>> {
  const base = clean(process.env.SUPABASE_URL, 1000).replace(/\/$/, '');
  const key = clean(process.env.SUPABASE_SERVICE_ROLE_KEY, 5000);
  if (!base || !key)
    throw Object.assign(new Error('trusted_quote_store_not_connected'), { status: 503 });
  const select = [
    'id',
    'quote_number',
    'status',
    'currency',
    'total',
    'amount_paid',
    'amount_due_now',
    'remaining_balance',
    'outstanding_balance',
    'payment_status',
    'request_data',
    'expires_at',
  ].join(',');
  const response = await fetch(
    `${base}/rest/v1/quote_requests?select=${select}&quote_number=eq.${encodeURIComponent(quoteNumber)}&limit=1`,
    {
      headers: { Accept: 'application/json', apikey: key, Authorization: `Bearer ${key}` },
      cache: 'no-store',
    },
  );
  if (!response.ok) throw Object.assign(new Error('trusted_quote_lookup_failed'), { status: 502 });
  const rows = (await response.json()) as Array<Record<string, unknown>>;
  const row = rows[0];
  if (!row) throw Object.assign(new Error('quote_not_found'), { status: 404 });
  return row;
}

export default async function handler(req: ApiReq, res: ApiRes) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'method_not_allowed' });
  }
  if (
    !(await guardPublicPost(req, res, {
      maxBytes: MAX_BODY_BYTES,
      limit: 30,
      windowMs: 10 * 60_000,
      bucket: 'create-quote-payment-session',
      honeypot: false,
    }))
  )
    return;
  const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
  const quoteNumber = clean(body.quoteNumber, 80).toUpperCase();
  const method = clean(body.paymentMethod, 40).toLowerCase();
  const adapter = getPaymentAdapter(method);
  if (!/^QT-\d{8}-[A-Z0-9-]{4,40}$/i.test(quoteNumber) || !adapter)
    return json(res, 400, { error: 'invalid_quote_payment_request' });
  if (!adapter.configured()) return json(res, 503, { error: 'payment_provider_not_connected' });

  try {
    const quote = await loadQuote(quoteNumber);
    const due = Number(quote.amount_due_now);
    const requestData = (quote.request_data || {}) as Record<string, unknown>;
    const customerEmail = clean(
      requestData.customerEmail || requestData.email,
      320,
    ).toLowerCase();
    if (
      !PAYABLE_STATUSES.has(String(quote.status || '')) ||
      quote.currency !== 'USD' ||
      (quote.expires_at && new Date(String(quote.expires_at)).getTime() <= Date.now()) ||
      !Number.isFinite(due) ||
      due <= 0
    )
      return json(res, 409, { error: 'quote_not_payable' });
    if (clean(body.customerEmail, 320).toLowerCase() !== customerEmail)
      return json(res, 403, { error: 'quote_customer_mismatch' });
    const site = clean(process.env.SITE_URL || 'https://shababuna.ly', 1000).replace(/\/$/, '');
    const trustedQuote = {
      entityType: 'quote',
      id: quote.id,
      quoteNumber: quote.quote_number,
      customerEmail,
      currency: 'USD',
      amount: due,
      amountMinor: Math.round(due * 100),
      status: quote.status,
      amountPaid: Number(quote.amount_paid || 0),
      outstandingBalance: Number(quote.outstanding_balance ?? quote.remaining_balance ?? 0),
    };
    if (!adapter.createSession) return json(res, 503, { error: 'payment_provider_not_connected' });
    const result = await adapter.createSession({
      trustedOrder: trustedQuote,
      idempotencyKey: `quote:${String(quote.id)}:${String(quote.status)}:${Number(quote.amount_paid || 0).toFixed(2)}:${due.toFixed(2)}`,
      successUrl: `${site}/account?section=workspace&payment=success&quote=${encodeURIComponent(String(quote.quote_number))}`,
      cancelUrl: `${site}/account?section=workspace&payment=cancelled&quote=${encodeURIComponent(String(quote.quote_number))}`,
    });
    return json(res, 200, { url: result.url, quoteNumber: quote.quote_number });
  } catch (error: unknown) {
    const mapped = adapter.mapError
      ? adapter.mapError(error)
      : { status: 502, code: 'payment_session_failed' };
    return json(res, Number(mapped.status || 502), { error: mapped.code });
  }
}

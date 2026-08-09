import { getPaymentAdapter } from './payments/registry.ts';
import { clean } from './payments/adapters/base.js';
import { guardPublicPost } from './_request-security.ts';
const json = (res, status, body) => {
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.status(status).json(body);
};
async function loadRequest(number) {
  const base = clean(process.env.SUPABASE_URL, 1000).replace(/\/$/, '');
  const key = clean(process.env.SUPABASE_SERVICE_ROLE_KEY, 5000);
  if (!base || !key)
    throw Object.assign(new Error('trusted_request_store_not_connected'), { status: 503 });
  const select = [
    'id',
    'request_number',
    'user_id',
    'status',
    'customer_email',
    'currency',
    'quote_total',
    'quote_expires_at',
    'customer_decision',
    'payment_url',
  ].join(',');
  const response = await fetch(
    `${base}/rest/v1/special_requests?select=${select}&request_number=eq.${encodeURIComponent(number)}&limit=1`,
    {
      headers: { Accept: 'application/json', apikey: key, Authorization: `Bearer ${key}` },
      cache: 'no-store',
    },
  );
  if (!response.ok)
    throw Object.assign(new Error('trusted_request_lookup_failed'), { status: 502 });
  const rows = await response.json();
  if (!rows?.[0]) throw Object.assign(new Error('special_request_not_found'), { status: 404 });
  return rows[0];
}
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'method_not_allowed' });
  }
  if (
    !(await guardPublicPost(req, res, {
      maxBytes: 16000,
      limit: 30,
      windowMs: 10 * 60_000,
      bucket: 'create-special-request-payment-session',
      honeypot: false,
    }))
  )
    return;
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const requestNumber = clean(body.requestNumber, 80).toUpperCase();
  const method = clean(body.paymentMethod, 40).toLowerCase();
  const adapter = getPaymentAdapter(method);
  if (!/^SR-\d{8}-\d{7}$/i.test(requestNumber) || !adapter)
    return json(res, 400, { error: 'invalid_special_request_payment' });
  if (!adapter.configured()) return json(res, 503, { error: 'payment_provider_not_connected' });
  try {
    const row = await loadRequest(requestNumber);
    const email = clean(row.customer_email, 320).toLowerCase();
    const amount = Number(row.quote_total);
    if (
      row.status !== 'awaiting_payment' ||
      row.customer_decision !== 'accepted' ||
      (row.quote_expires_at && new Date(row.quote_expires_at).getTime() <= Date.now()) ||
      !Number.isFinite(amount) ||
      amount <= 0
    )
      return json(res, 409, { error: 'special_request_not_payable' });
    if (clean(body.customerEmail, 320).toLowerCase() !== email)
      return json(res, 403, { error: 'special_request_customer_mismatch' });
    const site = clean(process.env.SITE_URL || 'https://shababuna.ly', 1000).replace(/\/$/, '');
    const trusted = {
      entityType: 'special_request',
      id: row.id,
      requestNumber: row.request_number,
      customerEmail: email,
      currency: row.currency || 'USD',
      amount,
      amountMinor: Math.round(amount * 100),
      status: row.status,
    };
    const result = await adapter.createSession({
      trustedOrder: trusted,
      idempotencyKey: `special-request:${row.id}:${amount.toFixed(2)}`,
      successUrl: `${site}/account?section=special-requests&payment=success&request=${encodeURIComponent(row.request_number)}`,
      cancelUrl: `${site}/account?section=special-requests&payment=cancelled&request=${encodeURIComponent(row.request_number)}`,
    });
    return json(res, 200, { url: result.url, requestNumber: row.request_number });
  } catch (error) {
    const mapped = adapter.mapError(error);
    return json(res, mapped.status, { error: mapped.code });
  }
}

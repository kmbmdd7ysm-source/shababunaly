import { getPaymentAdapter } from './payments/registry.js';
import { guardPublicPost } from './_request-security.js';

const MAX_BODY_BYTES = 16_000;
const ALLOWED_METHODS = new Set(['online_card', 'libyan_bank_card']);
const PAYABLE_STATUSES = new Set(['pending', 'failed', 'partially_paid']);
const clean = (value, max = 300) => String(value || '').trim().slice(0, max);
const json = (res, status, body) => { res.setHeader('Cache-Control', 'no-store, private'); res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'no-referrer'); return res.status(status).json(body); };
const validOrderNumber = (value) => /^SHB-\d{8}-\d{7}$/.test(value);
const validUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

async function loadTrustedOrder({ orderNumber, idempotencyKey }) {
  const supabaseUrl = clean(process.env.SUPABASE_URL, 1000).replace(/\/$/, '');
  const serviceRole = clean(process.env.SUPABASE_SERVICE_ROLE_KEY, 4000);
  if (!supabaseUrl || !serviceRole || !/^https:\/\//i.test(supabaseUrl)) throw Object.assign(new Error('trusted_order_store_not_connected'), { status: 503 });
  // The public handler validates that exactly one trusted reference format is
  // present before this private lookup is called. Keeping the lookup free of
  // an unreachable empty-filter state prevents accidental broad order reads.
  const filters = validOrderNumber(orderNumber)
    ? `order_number=eq.${encodeURIComponent(orderNumber)}`
    : `idempotency_key=eq.${encodeURIComponent(idempotencyKey)}`;
  const select = ['id','order_number','idempotency_key','customer_email','currency','subtotal','shipping_total','total','amount_paid','amount_due_now','remaining_balance','payment_method','payment_plan','payment_stage','payment_status','order_status','shipping_quote_required','shipping_quote_expires_at','payment_expires_at','delivery_profile','created_at'].join(',');
  const response = await fetch(`${supabaseUrl}/rest/v1/orders?select=${select}&${filters}&limit=1`, { headers: { Accept: 'application/json', apikey: serviceRole, Authorization: `Bearer ${serviceRole}` } });
  if (!response.ok) throw Object.assign(new Error('trusted_order_lookup_failed'), { status: 502 });
  const rows = await response.json(); const order = Array.isArray(rows) ? rows[0] : null;
  if (!order) throw Object.assign(new Error('trusted_order_not_found'), { status: 404 });
  return order;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return json(res, 405, { error: 'method_not_allowed' }); }
  if (!(await guardPublicPost(req, res, { maxBytes: MAX_BODY_BYTES, limit: 30, windowMs: 10 * 60_000, bucket: 'create-payment-session', honeypot: false }))) return;
  const body = req.body && typeof req.body === 'object' ? req.body : null;
  const method = clean(body?.paymentMethod, 40); const orderNumber = clean(body?.orderNumber, 40).toUpperCase(); const idempotencyKey = clean(body?.idempotencyKey, 80);
  if (!body || !ALLOWED_METHODS.has(method) || (!validOrderNumber(orderNumber) && !validUuid(idempotencyKey))) return json(res, 400, { error: 'invalid_checkout_request' });
  const adapter = getPaymentAdapter(method);
  if (!adapter?.configured()) return json(res, 503, { error: 'payment_provider_not_connected' });
  let order;
  try { order = await loadTrustedOrder({ orderNumber, idempotencyKey }); } catch (error) { return json(res, error.status || 502, { error: clean(error.message, 120) }); }
  const due = Number(order.amount_due_now);
  if (order.payment_method !== method || order.shipping_quote_required === true || (order.shipping_quote_expires_at && new Date(order.shipping_quote_expires_at).getTime() <= Date.now()) || (order.payment_expires_at && new Date(order.payment_expires_at).getTime() <= Date.now()) || order.currency !== 'USD' || !Number.isFinite(due) || due <= 0 || !PAYABLE_STATUSES.has(String(order.payment_status || '').toLowerCase()) || !['awaiting_payment','received','final_payment_required'].includes(String(order.order_status || '').toLowerCase())) return json(res, 409, { error: 'order_not_payable' });
  const requestedEmail = clean(body.customerEmail, 320).toLowerCase();
  if (!requestedEmail || requestedEmail !== String(order.customer_email || '').toLowerCase()) return json(res, 403, { error: 'order_customer_mismatch' });
  const siteUrl = clean(process.env.SITE_URL || 'https://shababuna.ly', 1000).replace(/\/$/, '');
  try {
    const session = await adapter.createSession({ trustedOrder: { id: order.id, orderNumber: order.order_number, idempotencyKey: order.idempotency_key, customerEmail: order.customer_email, currency: order.currency, amount: due, amountMinor: Math.round(due * 100), paymentPlan: order.payment_plan, amountPaid: Number(order.amount_paid || 0), remainingBalance: Number(order.remaining_balance || 0), deliveryProfile: order.delivery_profile }, idempotencyKey: `${order.idempotency_key}:${order.payment_stage || 'initial'}:${Number(order.amount_paid || 0).toFixed(2)}:${due.toFixed(2)}`, successUrl: `${siteUrl}/checkout/success?order=${encodeURIComponent(order.order_number)}`, cancelUrl: `${siteUrl}/checkout/cancelled?order=${encodeURIComponent(order.order_number)}` });
    return json(res, 200, { url: session.url, orderNumber: order.order_number });
  } catch (error) { const mapped = adapter.mapError(error); return json(res, mapped.status, { error: mapped.code }); }
}

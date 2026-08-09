import { applyApiHeaders, guardPublicPost } from './_request-security.ts';
import { resolveSupabaseUser, supabaseAdminRequest } from './_supabase-admin.ts';
import {
  guestEmailHash,
  normalizeGuestEmail,
  normalizeGuestOrderNumber,
  verifyGuestOrderToken,
} from './_guest-order-token.ts';
import { getPaymentAdapter } from './payments/registry.ts';
import { clean } from './payments/adapters/base.js';

const PAYABLE_PAYMENT = new Set(['pending', 'partially_paid', 'failed']);
const PAYABLE_ORDER = new Set(['awaiting_payment', 'received', 'final_payment_required']);
const select = [
  'id',
  'order_number',
  'user_id',
  'customer_email',
  'idempotency_key',
  'currency',
  'total',
  'amount_paid',
  'amount_due_now',
  'outstanding_balance',
  'remaining_balance',
  'payment_method',
  'payment_plan',
  'payment_stage',
  'payment_status',
  'order_status',
  'shipping_quote_required',
  'shipping_quote_expires_at',
  'payment_expires_at',
  'delivery_profile',
].join(',');

async function loadOrder(number) {
  const rows = await supabaseAdminRequest(
    `/rest/v1/orders?select=${encodeURIComponent(select)}&order_number=eq.${encodeURIComponent(number)}&limit=1`,
  );
  return Array.isArray(rows) ? rows[0] || null : null;
}

export default async function handler(req, res) {
  applyApiHeaders(res);
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  if (
    !(await guardPublicPost(req, res, {
      maxBytes: 16_000,
      limit: 8,
      windowMs: 10 * 60_000,
      bucket: 'retry-order-payment',
      honeypot: false,
    }))
  )
    return;
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const orderNumber = normalizeGuestOrderNumber(body.orderNumber);
    if (!orderNumber) return res.status(400).json({ ok: false, error: 'invalid_payment_recovery' });
    const order = await loadOrder(orderNumber);
    if (!order) return res.status(404).json({ ok: false, error: 'order_not_found' });
    const user = await resolveSupabaseUser(req.headers.authorization);
    let authorized = Boolean(user?.id && order.user_id && user.id === order.user_id);
    if (!authorized && !order.user_id) {
      const token = verifyGuestOrderToken(body.accessToken, orderNumber);
      const email = normalizeGuestEmail(order.customer_email);
      authorized = Boolean(token && email && guestEmailHash(email) === token.emailHash);
    }
    if (!authorized) return res.status(403).json({ ok: false, error: 'order_access_denied' });
    const method = clean(order.payment_method, 40).toLowerCase();
    const adapter = getPaymentAdapter(method);
    if (!adapter || !adapter.configured())
      return res.status(503).json({ ok: false, error: 'payment_provider_not_connected' });
    const due = Number(
      order.amount_due_now || order.outstanding_balance || order.remaining_balance || 0,
    );
    const now = Date.now();
    const quoteExpired =
      order.shipping_quote_expires_at && new Date(order.shipping_quote_expires_at).getTime() <= now;
    const paymentExpired =
      order.payment_expires_at && new Date(order.payment_expires_at).getTime() <= now;
    if (
      order.shipping_quote_required ||
      quoteExpired ||
      paymentExpired ||
      order.currency !== 'USD' ||
      !Number.isFinite(due) ||
      due <= 0 ||
      !PAYABLE_PAYMENT.has(String(order.payment_status || '').toLowerCase()) ||
      !PAYABLE_ORDER.has(String(order.order_status || '').toLowerCase())
    ) {
      return res.status(409).json({ ok: false, error: 'order_not_payable' });
    }
    const site = clean(process.env.SITE_URL || 'https://shababuna.ly', 1000).replace(/\/$/, '');
    const session = await adapter.createSession({
      trustedOrder: {
        id: order.id,
        orderNumber: order.order_number,
        idempotencyKey: order.idempotency_key,
        customerEmail: order.customer_email,
        currency: order.currency,
        amount: due,
        amountMinor: Math.round(due * 100),
        paymentPlan: order.payment_plan,
        amountPaid: Number(order.amount_paid || 0),
        remainingBalance: Number(order.outstanding_balance || order.remaining_balance || 0),
        deliveryProfile: order.delivery_profile,
      },
      idempotencyKey: `${order.idempotency_key}:recovery:${order.payment_stage || 'initial'}:${Number(order.amount_paid || 0).toFixed(2)}:${due.toFixed(2)}`,
      successUrl: `${site}/checkout/success?order=${encodeURIComponent(order.order_number)}`,
      cancelUrl: `${site}/order-tracking/${encodeURIComponent(order.order_number)}?payment=cancelled`,
    });
    return res.status(200).json({
      ok: true,
      url: session.url,
      provider: method,
      amountDue: due,
      currency: order.currency,
    });
  } catch (error) {
    return res
      .status(Number(error?.status) || 503)
      .json({ ok: false, error: 'payment_recovery_unavailable' });
  }
}

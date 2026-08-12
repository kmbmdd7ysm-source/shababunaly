import { guardPublicPost, applyApiHeaders } from './_request-security.ts';
import { resolveSupabaseUser, supabaseAdminRequest } from './_supabase-admin.ts';
import { sendInternalFormNotification } from './_internal-form-notification.ts';
import { createGuestOrderToken } from './_guest-order-token.ts';
import { syncUntrackedRequestedCatalog } from './_trusted-static-catalog.ts';

type ApiReq = { method?: string; body?: unknown; headers?: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } };
type ApiRes = { setHeader: (n: string, v: string) => void; status: (c: number) => { json: (b: unknown) => unknown } };
const clean = (value: unknown, max = 5000) => String(value ?? '').trim().replace(/\0/g, '').slice(0, max);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const METHODS = new Set(['cash_on_delivery','cash','online','online_card','libyan_bank_card']);

function normalizedItems(value: unknown) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 50) throw new Error('invalid_items');
  return value.map((raw) => {
    const item = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
    const productId = clean(item.productId, 180);
    const variantId = clean(item.variantId, 260);
    const quantity = Math.trunc(Number(item.quantity || 0));
    const purchaseMode = clean(item.purchaseMode || 'retail', 20).toLowerCase();
    if (!productId || !variantId || quantity < 1 || quantity > 999 || !['retail','wholesale','custom'].includes(purchaseMode)) throw new Error('invalid_items');
    return { productId, variantId, quantity, purchaseMode };
  });
}

export default async function handler(req: ApiReq, res: ApiRes) {
  applyApiHeaders(res);
  if (req.method !== 'POST') { res.setHeader('Allow','POST'); return res.status(405).json({ ok:false,error:'method_not_allowed' }); }
  if (!(await guardPublicPost(req, res, { maxBytes: 96_000, limit: 8, windowMs: 10 * 60_000, bucket: 'order-intake', honeypot: false, allowEphemeralFallback: true }))) return;
  try {
    const body = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {};
    const idempotencyKey = clean(body.idempotencyKey, 36);
    const paymentMethod = clean(body.paymentMethod, 40).toLowerCase();
    const email = clean(body.email, 254).toLowerCase();
    const shipping = body.shipping && typeof body.shipping === 'object' ? body.shipping as Record<string, unknown> : {};
    const items = normalizedItems(body.items);
    if (!UUID.test(idempotencyKey) || !METHODS.has(paymentMethod) || !EMAIL.test(email)) throw new Error('invalid_order');

    const authHeader = req.headers?.authorization;
    const user = await resolveSupabaseUser(Array.isArray(authHeader) ? authHeader[0] : authHeader);
    const trustedEmail = user?.email ? clean(user.email,254).toLowerCase() : email;
    if (user?.email && trustedEmail !== email) throw new Error('email_mismatch');

    // Keep non-inventory-tracked catalogue rows (especially owner-confirmed
    // LHA immediate-delivery items) synchronized on demand before the trusted
    // transaction. This fixes stale production catalogue rows without ever
    // resetting tracked inventory quantities.
    try {
      await syncUntrackedRequestedCatalog(items);
    } catch {
      // The transactional RPC remains the authority; a sync outage should not
      // block an order when the production catalogue is already current.
    }

    const result = await supabaseAdminRequest('/rest/v1/rpc/create_order_transactional', {
      method: 'POST',
      body: JSON.stringify({
        p_user_id: user?.id || null,
        p_customer_email: trustedEmail,
        p_currency: 'USD',
        p_payment_method: paymentMethod,
        p_idempotency_key: idempotencyKey,
        p_shipping: shipping,
        p_items: items,
      }),
    }) as Record<string, unknown>;
    const order = result?.order && typeof result.order === 'object' ? result.order as Record<string, unknown> : null;
    if (!order?.order_number) throw new Error('order_create_failed');

    // Email is sent server-side immediately after the trusted transaction. The
    // checkout can close and the notification does not depend on browser state.
    const displayCurrency = clean(shipping.displayCurrency || 'USD', 8).toUpperCase();
    const customer = shipping.customer && typeof shipping.customer === 'object' ? shipping.customer as Record<string, unknown> : {};
    let guestAccessToken: string | null = null;
    if (!user?.id) {
      try {
        guestAccessToken = createGuestOrderToken({
          orderNumber: order.order_number,
          email: trustedEmail,
          ttlSeconds: 60 * 60,
        });
      } catch {
        // The trusted order is already persisted. Tracking can still be unlocked
        // later with order number + email + Turnstile if token signing is unavailable.
        guestAccessToken = null;
      }
    }

    const trustedItems = Array.isArray(order.order_items) ? order.order_items : items;
    const canonicalSubtotal = Number(order.subtotal) || 0;
    const displaySubtotal = Number(shipping.displaySubtotal);
    const displayRate =
      displayCurrency !== String(order.currency || 'USD').toUpperCase() &&
      canonicalSubtotal > 0 &&
      Number.isFinite(displaySubtotal) &&
      displaySubtotal > 0
        ? displaySubtotal / canonicalSubtotal
        : 1;
    const detailedItems = trustedItems.map((raw: unknown) => {
      const line = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
      const snapshot =
        line.variant_snapshot && typeof line.variant_snapshot === 'object'
          ? (line.variant_snapshot as Record<string, unknown>)
          : {};
      const unit = Number(line.unit_price) || 0;
      const lineTotal = Number(line.line_total) || unit * (Number(line.quantity) || 0);
      return {
        product_name: line.product_name || line.productId || '',
        product_id: line.product_id || line.productId || '',
        sku: line.sku || '',
        variant_id: line.variant_id || line.variantId || '',
        color: snapshot.color || '',
        size: snapshot.size || '',
        purchase_mode: line.purchase_mode || line.purchaseMode || 'retail',
        quantity: Number(line.quantity) || 0,
        unit_price_usd: unit,
        line_total_usd: lineTotal,
        display_currency: displayCurrency,
        display_unit_price: Number((unit * displayRate).toFixed(2)),
        display_line_total: Number((lineTotal * displayRate).toFixed(2)),
      };
    });
    const notification = await sendInternalFormNotification({
      form_type: 'order',
      order_number: order.order_number,
      customer_name: clean(customer.name || shipping.customerName, 180),
      customer_email: trustedEmail,
      customer_phone: clean(customer.phone || shipping.phone, 80),
      country: clean(shipping.country, 2).toUpperCase(),
      address: [shipping.line1 || shipping.address, shipping.apartment, shipping.city, shipping.state, shipping.postal, shipping.country].map((v) => clean(v,300)).filter(Boolean).join(', '),
      payment_method: order.payment_method || paymentMethod,
      payment_plan: order.payment_plan,
      delivery_profile: order.delivery_profile,
      shipping_quote_required: order.shipping_quote_required,
      canonical_currency: order.currency || 'USD',
      canonical_subtotal: order.subtotal,
      canonical_shipping: order.shipping_total,
      canonical_total: order.total,
      display_currency: displayCurrency,
      display_subtotal: shipping.displaySubtotal,
      display_shipping: shipping.displayShippingTotal,
      display_total: shipping.displayTotal,
      amount_due_now: order.amount_due_now,
      display_amount_due_now: shipping.displayAmountDueNow,
      remaining_balance: order.remaining_balance,
      display_remaining_balance: shipping.displayRemainingBalance,
      items: detailedItems,
      item_count: detailedItems.length,
      created_at: order.created_at,
    }, `New Shababuna order ${String(order.order_number)}`);

    return res.status(result?.duplicate ? 200 : 201).json({ ok:true, ...result, guestAccessToken, notification: notification.delivered ? 'delivered' : 'pending' });
  } catch (error: unknown) {
    const message = clean(error && typeof error === 'object' && 'message' in error ? (error as {message?:unknown}).message : error, 500);
    const client = /invalid_|email_mismatch|cash_available_only_in_libya|insufficient_|unavailable|retail_unavailable/i.test(message);
    return res.status(client ? 400 : 503).json({ ok:false, error: client ? 'invalid_order' : 'order_service_unavailable', detail: message });
  }
}

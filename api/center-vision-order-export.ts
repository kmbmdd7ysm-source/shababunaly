import { applyApiHeaders } from './_request-security.js';
import {
  guestEmailHash,
  normalizeGuestOrderNumber,
  verifyGuestOrderToken,
} from './_guest-order-token.js';
import { supabaseAdminRequest } from './_supabase-admin.js';

type ApiReq = { method?: string; body?: unknown };
type ApiRes = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { json: (body: unknown) => unknown };
};

const clean = (value: unknown, max = 5000): string =>
  String(value ?? '').trim().replace(/\0/g, '').slice(0, max);

const objectValue = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const numeric = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

export default async function handler(req: ApiReq, res: ApiRes) {
  applyApiHeaders(res);
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  try {
    const body = objectValue(req.body);
    const orderNumber = normalizeGuestOrderNumber(body.orderNumber);
    const ticket = clean(body.ticket, 8000);
    if (!orderNumber || !ticket) {
      return res.status(400).json({ ok: false, error: 'invalid_request' });
    }

    const verified = verifyGuestOrderToken(ticket, orderNumber);
    if (!verified) {
      return res.status(401).json({ ok: false, error: 'invalid_sync_ticket' });
    }

    const rows = (await supabaseAdminRequest(
      `/rest/v1/orders?order_number=eq.${encodeURIComponent(orderNumber)}&select=*&limit=1`,
    )) as Array<Record<string, unknown>>;
    const order = Array.isArray(rows) ? rows[0] : null;
    if (!order) return res.status(404).json({ ok: false, error: 'order_not_found' });

    const shipping = objectValue(order.shipping ?? order.shipping_address);
    const billing = objectValue(order.billing ?? order.billing_address);
    const customer = objectValue(shipping.customer ?? order.customer);
    const email = clean(
      order.customer_email ?? order.email ?? customer.email ?? shipping.email,
      254,
    ).toLowerCase();

    if (!email || guestEmailHash(email) !== verified.emailHash) {
      return res.status(401).json({ ok: false, error: 'ticket_order_mismatch' });
    }

    const orderId = clean(order.id, 200);
    let items: Array<Record<string, unknown>> = [];
    if (orderId) {
      const itemRows = await supabaseAdminRequest(
        `/rest/v1/order_items?order_id=eq.${encodeURIComponent(orderId)}&select=*&order=created_at.asc`,
      );
      if (Array.isArray(itemRows)) items = itemRows as Array<Record<string, unknown>>;
    }

    const normalizedItems = items.slice(0, 100).map((item) => {
      const snapshot = objectValue(item.variant_snapshot);
      return {
        productName: clean(item.product_name ?? item.name ?? item.product_id, 500),
        productId: clean(item.product_id, 200) || null,
        sku: clean(item.sku, 160) || null,
        variantId: clean(item.variant_id, 260) || null,
        color: clean(snapshot.color ?? item.color, 120) || null,
        size: clean(snapshot.size ?? item.size, 120) || null,
        purchaseMode: clean(item.purchase_mode, 40) || null,
        quantity: numeric(item.quantity) ?? 1,
        unitPrice: numeric(item.unit_price) ?? 0,
        lineTotal:
          numeric(item.line_total) ??
          (numeric(item.unit_price) ?? 0) * (numeric(item.quantity) ?? 1),
      };
    });

    const fullName = clean(
      order.customer_name ??
        customer.name ??
        shipping.customerName ??
        [shipping.firstName, shipping.lastName].filter(Boolean).join(' '),
      180,
    ) || 'Shababuna customer';

    return res.status(200).json({
      ok: true,
      order: {
        orderNumber,
        email,
        fullName,
        phone: clean(order.customer_phone ?? customer.phone ?? shipping.phone, 80) || undefined,
        locale: clean(shipping.locale ?? shipping.language ?? order.locale, 20) || 'en',
        currency: clean(order.currency, 8).toUpperCase() || 'USD',
        subtotal: numeric(order.subtotal) ?? 0,
        discountTotal: numeric(order.discount_total ?? order.discount) ?? 0,
        taxTotal: numeric(order.tax_total ?? order.tax) ?? 0,
        shippingTotal: numeric(order.shipping_total) ?? 0,
        total: numeric(order.total) ?? 0,
        paymentStatus: clean(order.payment_status, 40) || undefined,
        fulfillmentStatus: clean(order.fulfillment_status, 40) || undefined,
        orderStatus: clean(order.status, 40) || undefined,
        paymentMethod: clean(order.payment_method, 80) || undefined,
        paymentPlan: clean(order.payment_plan, 80) || undefined,
        amountDueNow: numeric(order.amount_due_now),
        remainingBalance: numeric(order.remaining_balance),
        createdAt: clean(order.created_at, 100) || undefined,
        shipping,
        billing,
        items: normalizedItems,
      },
    });
  } catch (error: unknown) {
    const message = clean(
      error && typeof error === 'object' && 'message' in error
        ? (error as { message?: unknown }).message
        : error,
      300,
    );
    return res.status(503).json({
      ok: false,
      error: 'order_export_unavailable',
      detail: message,
    });
  }
}

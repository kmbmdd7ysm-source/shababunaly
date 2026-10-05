import { guardPublicPost, applyApiHeaders } from './_request-security.js';
import { sendInternalFormNotification } from './_internal-form-notification.js';
import { createGuestOrderToken } from './_guest-order-token.js';
import { createNativeOrder } from './_native-orders.js';

type Row = Record<string, unknown>;
type ApiReq = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
};
type ApiRes = {
  setHeader: (n: string, v: string | string[]) => void;
  status: (c: number) => { json: (b: unknown) => unknown };
};

const clean = (value: unknown, max = 5000) =>
  String(value ?? '').trim().replace(/\0/g, '').slice(0, max);

const CENTER_VISION_API = (
  process.env.CENTER_VISION_API_BASE_URL ||
  'https://br-sweet-mountain-b46pgqvs-centerapi.compute.c-6.us-east-2.aws.neon.tech/api'
).replace(/\/$/, '');

async function fallbackCenterVisionInquiry(input: {
  order: Row;
  email: string;
  phone?: string;
  fullName?: string;
  shipping: Row;
  items: Row[];
}) {
  const payload = {
    siteKey: 'SHABABUNA',
    inquiryType: 'ORDER_CREATED',
    fullName: clean(input.fullName || 'Shababuna customer', 160),
    email: clean(input.email, 254).toLowerCase(),
    phone: clean(input.phone, 80) || undefined,
    message: `Shababuna website order ${clean(input.order.order_number, 120)} created`,
    locale: clean(input.shipping.locale || input.shipping.language || 'en', 20),
    metadata: {
      source: 'shababunaly.com',
      event: 'ORDER_CREATED_FALLBACK',
      orderNumber: input.order.order_number || null,
      paymentMethod: input.order.payment_method || null,
      paymentPlan: input.order.payment_plan || null,
      currency: input.order.currency || 'USD',
      subtotal: input.order.subtotal || null,
      shippingTotal: input.order.shipping_total || null,
      total: input.order.total || null,
      amountDueNow: input.order.amount_due_now || null,
      remainingBalance: input.order.remaining_balance || null,
      shipping: input.shipping,
      items: input.items,
      createdAt: input.order.created_at || null,
    },
  };
  const response = await fetch(`${CENTER_VISION_API}/v1/public/inquiries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`center_vision_inquiry_${response.status}`);
}

async function syncCenterVisionOrder(input: {
  order: Row;
  email: string;
  phone?: string;
  fullName?: string;
  shipping: Row;
  items: Row[];
  ticket?: string | null;
}) {
  const orderNumber = clean(input.order.order_number, 120);
  if (orderNumber && input.ticket) {
    try {
      const mirror = await fetch(`${CENTER_VISION_API}/v1/public/store/shababuna/sync-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ orderNumber, ticket: input.ticket }),
        signal: AbortSignal.timeout(20_000),
      });
      if (mirror.ok) return 'order-mirrored';
    } catch {
      // Fall through to inquiry recovery.
    }
  }
  await fallbackCenterVisionInquiry(input);
  return 'inquiry-fallback';
}

export default async function handler(req: ApiReq, res: ApiRes) {
  applyApiHeaders(res);
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  if (
    !(await guardPublicPost(req, res, {
      maxBytes: 96_000,
      limit: 8,
      windowMs: 10 * 60_000,
      bucket: 'order-intake',
      honeypot: false,
      allowEphemeralFallback: true,
    }))
  ) return;

  try {
    const body =
      req.body && typeof req.body === 'object' ? (req.body as Row) : {};
    const created = await createNativeOrder(req, body);
    const order = created.order;
    const shipping =
      order.shipping_summary && typeof order.shipping_summary === 'object'
        ? (order.shipping_summary as Row)
        : {};
    const customer =
      order.customer_summary && typeof order.customer_summary === 'object'
        ? (order.customer_summary as Row)
        : {};
    const email = clean(order.customer_email, 254).toLowerCase();
    const items = Array.isArray(order.order_items) ? (order.order_items as Row[]) : [];
    // Reserved example domains are used only by automated production smoke tests.
    // They must exercise the real order engine without creating operational
    // Center Vision records or sending staff notifications.
    const qaTestOrder = /@example\.(com|net|org)$/i.test(email);

    let guestAccessToken: string | null = null;
    if (!created.session?.id) {
      try {
        guestAccessToken = createGuestOrderToken({
          orderNumber: order.order_number,
          email,
          ttlSeconds: 60 * 60,
        });
      } catch {
        guestAccessToken = null;
      }
    }

    let syncTicket: string | null = null;
    try {
      syncTicket = createGuestOrderToken({
        orderNumber: order.order_number,
        email,
        ttlSeconds: 24 * 60 * 60,
      });
    } catch {
      syncTicket = null;
    }

    let centerVision = qaTestOrder ? 'qa-skipped' : 'pending';
    if (!qaTestOrder) {
      try {
        centerVision = await syncCenterVisionOrder({
          order,
          email,
          phone: clean(order.customer_phone || customer.phone || shipping.phone, 80),
          fullName: clean(order.customer_name || customer.name, 180),
          shipping,
          items,
          ticket: syncTicket,
        });
      } catch {
        centerVision = 'pending';
      }
    }

    const notification = qaTestOrder
      ? { delivered: true }
      : await sendInternalFormNotification(
      {
        form_type: 'order',
        order_number: order.order_number,
        customer_name: clean(order.customer_name || customer.name, 180),
        customer_email: email,
        customer_phone: clean(order.customer_phone || customer.phone, 80),
        country: clean(shipping.country, 2).toUpperCase(),
        address: [
          shipping.line1 || shipping.address,
          shipping.apartment,
          shipping.city,
          shipping.state,
          shipping.postal,
          shipping.country,
        ]
          .map((value) => clean(value, 300))
          .filter(Boolean)
          .join(', '),
        payment_method: order.payment_method,
        payment_plan: order.payment_plan,
        delivery_profile: order.delivery_profile,
        shipping_quote_required: order.shipping_quote_required,
        canonical_currency: order.currency || 'USD',
        canonical_subtotal: order.subtotal,
        canonical_shipping: order.shipping_total,
        canonical_total: order.total,
        display_currency: order.display_currency,
        display_subtotal: order.display_subtotal,
        display_shipping: order.display_shipping_total,
        display_total: order.display_total,
        amount_due_now: order.amount_due_now,
        display_amount_due_now: order.display_amount_due_now,
        remaining_balance: order.remaining_balance,
        display_remaining_balance: order.display_remaining_balance,
        items,
        item_count: items.length,
        created_at: order.created_at,
      },
      `New Shababuna order ${String(order.order_number)}`,
    );

    return res.status(created.duplicate ? 200 : 201).json({
      ok: true,
      order,
      duplicate: created.duplicate,
      guestAccessToken,
      accessToken: guestAccessToken,
      notification: notification.delivered ? 'delivered' : 'pending',
      centerVision,
    });
  } catch (error: unknown) {
    const message = clean(
      error && typeof error === 'object' && 'message' in error
        ? (error as { message?: unknown }).message
        : error,
      500,
    );
    const client =
      /invalid_|email_mismatch|cash_available_only_in_libya|insufficient_|unavailable|minimum_quantity|retail_|wholesale_|product_|variant_|price_/i.test(
        message,
      );
    return res.status(client ? 400 : 503).json({
      ok: false,
      error: client ? 'invalid_order' : 'order_service_unavailable',
      detail: message,
    });
  }
}

import { getPaymentAdapter } from './payments/registry.ts';
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
const ALLOWED_METHODS = new Set(['online_card', 'libyan_bank_card']);
const PAYABLE_STATUSES = new Set(['pending', 'failed', 'partially_paid']);

const clean = (value: unknown, max = 300): string =>
  String(value || '')
    .trim()
    .slice(0, max);

const json = (res: ApiRes, status: number, body: unknown) => {
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  return res.status(status).json(body);
};

const validOrderNumber = (value: string) => /^SHB-\d{8}-\d{7}$/.test(value);
const validUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

async function loadTrustedOrder({
  orderNumber,
  idempotencyKey,
}: {
  orderNumber: string;
  idempotencyKey: string;
}): Promise<Record<string, unknown>> {
  const supabaseUrl = clean(process.env.SUPABASE_URL, 1000).replace(/\/$/, '');
  const serviceRole = clean(process.env.SUPABASE_SERVICE_ROLE_KEY, 4000);
  if (!supabaseUrl || !serviceRole || !/^https:\/\//i.test(supabaseUrl))
    throw Object.assign(new Error('trusted_order_store_not_connected'), { status: 503 });
  const filters = validOrderNumber(orderNumber)
    ? `order_number=eq.${encodeURIComponent(orderNumber)}`
    : `idempotency_key=eq.${encodeURIComponent(idempotencyKey)}`;
  const select = [
    'id',
    'order_number',
    'idempotency_key',
    'customer_email',
    'currency',
    'subtotal',
    'shipping_total',
    'total',
    'amount_paid',
    'amount_due_now',
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
    'created_at',
  ].join(',');
  const response = await fetch(
    `${supabaseUrl}/rest/v1/orders?select=${select}&${filters}&limit=1`,
    {
      headers: {
        Accept: 'application/json',
        apikey: serviceRole,
        Authorization: `Bearer ${serviceRole}`,
      },
    },
  );
  if (!response.ok) throw Object.assign(new Error('trusted_order_lookup_failed'), { status: 502 });
  const rows = (await response.json()) as Array<Record<string, unknown>>;
  const order = Array.isArray(rows) ? rows[0] : null;
  if (!order) throw Object.assign(new Error('trusted_order_not_found'), { status: 404 });
  return order;
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
      bucket: 'create-payment-session',
      honeypot: false,
    }))
  )
    return;
  const body = (req.body && typeof req.body === 'object' ? req.body : null) as Record<
    string,
    unknown
  > | null;
  const method = clean(body?.paymentMethod, 40);
  const orderNumber = clean(body?.orderNumber, 40).toUpperCase();
  const idempotencyKey = clean(body?.idempotencyKey, 80);
  if (
    !body ||
    !ALLOWED_METHODS.has(method) ||
    (!validOrderNumber(orderNumber) && !validUuid(idempotencyKey))
  )
    return json(res, 400, { error: 'invalid_checkout_request' });
  const adapter = getPaymentAdapter(method);
  if (!adapter?.configured()) return json(res, 503, { error: 'payment_provider_not_connected' });
  let order: Record<string, unknown>;
  try {
    order = await loadTrustedOrder({ orderNumber, idempotencyKey });
  } catch (error: unknown) {
    const status =
      error && typeof error === 'object' && 'status' in error
        ? Number((error as { status?: unknown }).status || 502)
        : 502;
    const message =
      error && typeof error === 'object' && 'message' in error
        ? (error as { message?: unknown }).message
        : error;
    return json(res, status, { error: clean(message, 120) });
  }
  const due = Number(order.amount_due_now);
  if (
    order.payment_method !== method ||
    order.shipping_quote_required === true ||
    (order.shipping_quote_expires_at &&
      new Date(String(order.shipping_quote_expires_at)).getTime() <= Date.now()) ||
    (order.payment_expires_at && new Date(String(order.payment_expires_at)).getTime() <= Date.now()) ||
    order.currency !== 'USD' ||
    !Number.isFinite(due) ||
    due <= 0 ||
    !PAYABLE_STATUSES.has(String(order.payment_status || '').toLowerCase()) ||
    !['awaiting_payment', 'received', 'final_payment_required'].includes(
      String(order.order_status || '').toLowerCase(),
    )
  )
    return json(res, 409, { error: 'order_not_payable' });
  const requestedEmail = clean(body.customerEmail, 320).toLowerCase();
  if (!requestedEmail || requestedEmail !== String(order.customer_email || '').toLowerCase())
    return json(res, 403, { error: 'order_customer_mismatch' });
  const siteUrl = clean(process.env.SITE_URL || 'https://shababuna.ly', 1000).replace(/\/$/, '');
  try {
    if (!adapter.createSession) return json(res, 503, { error: 'payment_provider_not_connected' });
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
        remainingBalance: Number(order.remaining_balance || 0),
        deliveryProfile: order.delivery_profile,
      },
      idempotencyKey: `${String(order.idempotency_key)}:${String(order.payment_stage || 'initial')}:${Number(order.amount_paid || 0).toFixed(2)}:${due.toFixed(2)}`,
      successUrl: `${siteUrl}/checkout/success?order=${encodeURIComponent(String(order.order_number))}`,
      cancelUrl: `${siteUrl}/checkout/cancelled?order=${encodeURIComponent(String(order.order_number))}`,
    });
    return json(res, 200, { url: session.url, orderNumber: order.order_number });
  } catch (error: unknown) {
    const mapped = adapter.mapError
      ? adapter.mapError(error)
      : { status: 502, code: 'payment_session_failed' };
    return json(res, Number(mapped.status || 502), { error: mapped.code });
  }
}

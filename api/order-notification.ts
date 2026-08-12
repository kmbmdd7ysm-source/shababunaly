import { resolveFormspreeEndpoint } from './_formspree-endpoint.ts';
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

export const resolveOrderNotificationEndpoint = (): string => resolveFormspreeEndpoint();

const safe = (value: unknown, max = 12000): string =>
  String(value ?? '')
    .replace(/\0/g, '')
    .slice(0, max);

async function loadTrustedOrder(orderNumber: string) {
  const base = safe(process.env.SUPABASE_URL, 1000).replace(/\/$/, '');
  const key = safe(process.env.SUPABASE_SERVICE_ROLE_KEY, 5000);
  if (!base || !key) return { configured: false, order: null as Record<string, unknown> | null };
  const select = [
    'order_number',
    'customer_email',
    'currency',
    'subtotal',
    'shipping_total',
    'tax_total',
    'discount_total',
    'total',
    'payment_method',
    'payment_plan',
    'amount_due_now',
    'remaining_balance',
    'order_status',
    'payment_status',
    'items_snapshot',
    'shipping_summary',
    'created_at',
  ].join(',');
  const response = await fetch(
    `${base}/rest/v1/orders?select=${select}&order_number=eq.${encodeURIComponent(orderNumber)}&limit=1`,
    {
      headers: { Accept: 'application/json', apikey: key, Authorization: `Bearer ${key}` },
    },
  );
  if (!response.ok) throw new Error('trusted_order_lookup_failed');
  const rows = (await response.json()) as Array<Record<string, unknown>>;
  return { configured: true, order: Array.isArray(rows) ? rows[0] || null : null };
}

export default async function handler(req: ApiReq, res: ApiRes) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  if (!(await guardPublicPost(req, res, { maxBytes: 32000, limit: 6, allowEphemeralFallback: true })))
    return;
  const endpoint = resolveOrderNotificationEndpoint();
  if (!endpoint || !/^https:\/\//i.test(endpoint))
    return res.status(503).json({ ok: false, error: 'formspree_not_configured' });
  const input = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<
    string,
    unknown
  >;
  if (!input.orderNumber || !input.message) {
    return res.status(400).json({ ok: false, error: 'missing_order_payload' });
  }
  let lookup: { configured: boolean; order: Record<string, unknown> | null };
  try {
    lookup = await loadTrustedOrder(safe(input.orderNumber, 80).toUpperCase());
  } catch {
    return res.status(502).json({ ok: false, error: 'trusted_order_lookup_failed' });
  }
  // If the trusted database is reachable but the order transaction itself fell
  // back locally (cash / pending flow), do not discard the owner's email. The
  // client payload is still rate-limited and becomes the notification source.
  const trusted = lookup.order;
  const submittedEmail = safe(input.customerEmail || input.email, 240).toLowerCase();
  if (trusted && submittedEmail !== safe(trusted.customer_email, 240).toLowerCase()) {
    return res.status(403).json({ ok: false, error: 'order_customer_mismatch' });
  }
  const authoritativeMessage = trusted
    ? JSON.stringify(
        {
          orderNumber: trusted.order_number,
          customerEmail: trusted.customer_email,
          canonicalCurrency: trusted.currency,
          displayCurrency: (trusted.shipping_summary as Record<string, unknown> | undefined)?.displayCurrency || trusted.currency,
          subtotal: trusted.subtotal,
          displaySubtotal: (trusted.shipping_summary as Record<string, unknown> | undefined)?.displaySubtotal,
          shipping: trusted.shipping_total,
          displayShipping: (trusted.shipping_summary as Record<string, unknown> | undefined)?.displayShippingTotal,
          tax: trusted.tax_total,
          discount: trusted.discount_total,
          total: trusted.total,
          displayTotal: (trusted.shipping_summary as Record<string, unknown> | undefined)?.displayTotal,
          paymentMethod: trusted.payment_method,
          paymentPlan: trusted.payment_plan,
          amountDueNow: trusted.amount_due_now,
          displayAmountDueNow: (trusted.shipping_summary as Record<string, unknown> | undefined)?.displayAmountDueNow,
          remainingBalance: trusted.remaining_balance,
          displayRemainingBalance: (trusted.shipping_summary as Record<string, unknown> | undefined)?.displayRemainingBalance,
          orderStatus: trusted.order_status,
          paymentStatus: trusted.payment_status,
          items: trusted.items_snapshot,
          shippingAddress: trusted.shipping_summary,
          createdAt: trusted.created_at,
        },
        null,
        2,
      )
    : safe(input.message);
  const params = new URLSearchParams({
    _subject: safe(input._subject || `New Shababuna order ${String(input.orderNumber)}`, 180),
    _template: 'table',
    form_type: 'order',
    order_number: safe(input.orderNumber, 80),
    customer_name: safe(input.customerName || input.name, 160),
    customer_email: safe(input.customerEmail || input.email, 240),
    customer_phone: safe(input.customerPhone, 80),
    payment_method: safe(trusted?.payment_method || input.paymentMethod, 100),
    total: safe(trusted?.total ?? input.total, 100),
    currency: safe((trusted?.shipping_summary as Record<string, unknown> | undefined)?.displayCurrency || input.currency || trusted?.currency, 20),
    canonical_currency: safe(trusted?.currency || 'USD', 20),
    email: safe(input.customerEmail || input.email, 240),
    _replyto: safe(input.customerEmail || input.email, 240),
    message: safe(authoritativeMessage),
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      body: params.toString(),
      signal: controller.signal,
    });
    const text = await upstream.text();
    if (!upstream.ok) {
      return res.status(502).json({
        ok: false,
        error: 'formspree_rejected',
        status: upstream.status,
        detail: text.slice(0, 500),
      });
    }
    return res
      .status(200)
      .json({ ok: true, provider: 'formspree', orderNumber: input.orderNumber });
  } catch (error: unknown) {
    const message =
      error && typeof error === 'object' && 'message' in error
        ? (error as { message?: unknown }).message
        : error;
    return res.status(502).json({
      ok: false,
      error: 'formspree_delivery_failed',
      detail: safe(message || error, 500),
    });
  } finally {
    clearTimeout(timeout);
  }
}

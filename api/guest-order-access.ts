import { guardPublicPost, applyApiHeaders } from './_request-security.ts';
import { verifyTurnstileToken } from './_turnstile.ts';
import { supabaseAdminRequest } from './_supabase-admin.ts';
import {
  createGuestOrderToken,
  guestEmailHash,
  normalizeGuestEmail,
  normalizeGuestOrderNumber,
  verifyGuestOrderToken,
} from './_guest-order-token.ts';

const clean = (value: unknown, max = 5000): string =>
  String(value ?? '')
    .trim()
    .slice(0, max);
const SELECT = [
  'id',
  'order_number',
  'customer_email',
  'currency',
  'display_currency',
  'subtotal',
  'display_subtotal',
  'shipping_total',
  'display_shipping_total',
  'tax_total',
  'discount_total',
  'total',
  'display_total',
  'payment_method',
  'payment_plan',
  'amount_paid',
  'amount_refunded',
  'amount_due_now',
  'outstanding_balance',
  'remaining_balance',
  'payment_stage',
  'payment_provider',
  'payment_status',
  'order_status',
  'fulfillment_status',
  'shipping_quote_required',
  'payment_expires_at',
  'shipping_quote_expires_at',
  'delivery_profile',
  'created_at',
  'updated_at',
  'delivered_at',
  'shipping_summary',
  'order_items(product_id,sku,product_name,variant_snapshot,quantity,unit_price,line_total)',
].join(',');

async function findOrder(orderNumber: string): Promise<Record<string, unknown> | null> {
  const rows = await supabaseAdminRequest(
    `/rest/v1/orders?select=${encodeURIComponent(SELECT)}&order_number=eq.${encodeURIComponent(orderNumber)}&user_id=is.null&limit=1`,
  );
  return Array.isArray(rows) ? (rows[0] as Record<string, unknown>) || null : null;
}

function publicOrder(row: Record<string, unknown>) {
  const { customer_email: _customerEmail, order_items: orderItems, ...safe } = row;
  return { ...safe, items: orderItems || [] };
}

function orderEmail(row: Record<string, unknown>): string {
  const shipping =
    row.shipping_summary && typeof row.shipping_summary === 'object'
      ? (row.shipping_summary as Record<string, unknown>)
      : {};
  return normalizeGuestEmail(row.customer_email || shipping.email || '');
}

type ApiReq = {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
};
type ApiRes = {
  setHeader: (n: string, v: string) => void;
  status: (c: number) => { json: (b: unknown) => unknown; end?: () => unknown };
};
export default async function handler(req: ApiReq, res: ApiRes) {
  applyApiHeaders(res as never);
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  if (
    !(await guardPublicPost(req as never, res as never, {
      maxBytes: 16_000,
      limit: 10,
      windowMs: 15 * 60_000,
      bucket: 'guest-order-access',
    }))
  )
    return;
  try {
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<
      string,
      unknown
    >;
    const orderNumber = normalizeGuestOrderNumber(body.orderNumber);
    if (!orderNumber) return res.status(200).json({ ok: true, order: null });
    const existing = verifyGuestOrderToken(body.accessToken, orderNumber);
    const order = await findOrder(orderNumber);
    if (!order) return res.status(200).json({ ok: true, order: null });
    if (existing) {
      const storedEmail = orderEmail(order);
      if (!storedEmail || guestEmailHash(storedEmail) !== existing.emailHash)
        return res.status(200).json({ ok: true, order: null });
      return res.status(200).json({
        ok: true,
        order: publicOrder(order),
        accessToken: clean(body.accessToken, 8000),
        expiresAt: new Date(existing.exp * 1000).toISOString(),
      });
    }
    const email = normalizeGuestEmail(body.email);
    if (!email) return res.status(200).json({ ok: true, order: null });
    const forwarded = req.headers['x-forwarded-for'];
    const captchaOk = await verifyTurnstileToken(
      clean(body.turnstileToken, 3000),
      String(
        (Array.isArray(forwarded) ? forwarded[0] : forwarded) || req.socket?.remoteAddress || '',
      ),
    );
    if (!captchaOk) return res.status(400).json({ ok: false, error: 'captcha_failed' });
    const storedEmail = orderEmail(order);
    if (!storedEmail || storedEmail !== email)
      return res.status(200).json({ ok: true, order: null });
    const accessToken = createGuestOrderToken({ orderNumber, email });
    const verified = verifyGuestOrderToken(accessToken, orderNumber);
    if (!verified) return res.status(503).json({ ok: false, error: 'guest_token_unavailable' });
    return res.status(200).json({
      ok: true,
      order: publicOrder(order),
      accessToken,
      expiresAt: new Date(verified.exp * 1000).toISOString(),
    });
  } catch {
    return res.status(503).json({ ok: false, error: 'guest_order_access_unavailable' });
  }
}

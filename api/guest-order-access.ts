import { guardPublicPost, applyApiHeaders } from './_request-security.js';
import {
  createGuestOrderToken,
  guestEmailHash,
  normalizeGuestEmail,
  normalizeGuestOrderNumber,
  verifyGuestOrderToken,
} from './_guest-order-token.js';
import { readNativeOrder } from './_native-orders.js';

const clean = (value: unknown, max = 5000): string =>
  String(value ?? '').trim().slice(0, max);

function publicOrder(row: Record<string, unknown>) {
  const {
    customer_email: _customerEmail,
    customer_phone: _customerPhone,
    customer_name: _customerName,
    idempotency_key: _idempotencyKey,
    ...safe
  } = row;
  return {
    ...safe,
    items: Array.isArray(row.order_items) ? row.order_items : [],
  };
}

function orderEmail(row: Record<string, unknown>): string {
  const shipping =
    row.shipping_summary && typeof row.shipping_summary === 'object'
      ? (row.shipping_summary as Record<string, unknown>)
      : {};
  const customer =
    row.customer_summary && typeof row.customer_summary === 'object'
      ? (row.customer_summary as Record<string, unknown>)
      : {};
  return normalizeGuestEmail(row.customer_email || customer.email || shipping.email || '');
}

type ApiReq = {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
};
type ApiRes = {
  setHeader: (n: string, v: string | string[]) => void;
  status: (c: number) => { json: (b: unknown) => unknown; end?: () => unknown };
};

export default async function handler(req: ApiReq, res: ApiRes) {
  applyApiHeaders(res);
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  if (
    !(await guardPublicPost(req, res, {
      maxBytes: 16_000,
      limit: 10,
      windowMs: 15 * 60_000,
      bucket: 'guest-order-access',
      allowEphemeralFallback: true,
    }))
  ) return;

  try {
    const body =
      req.body && typeof req.body === 'object'
        ? (req.body as Record<string, unknown>)
        : {};
    const orderNumber = normalizeGuestOrderNumber(body.orderNumber);
    if (!orderNumber) return res.status(200).json({ ok: true, order: null });

    const order = await readNativeOrder(orderNumber);
    if (!order) return res.status(200).json({ ok: true, order: null });

    const existing = verifyGuestOrderToken(body.accessToken, orderNumber);
    const storedEmail = orderEmail(order);
    if (!storedEmail) return res.status(200).json({ ok: true, order: null });

    if (existing) {
      if (guestEmailHash(storedEmail) !== existing.emailHash) {
        return res.status(200).json({ ok: true, order: null });
      }
      return res.status(200).json({
        ok: true,
        order: publicOrder(order),
        accessToken: clean(body.accessToken, 8000),
        expiresAt: new Date(existing.exp * 1000).toISOString(),
      });
    }

    const email = normalizeGuestEmail(body.email);
    if (!email || storedEmail !== email) {
      return res.status(200).json({ ok: true, order: null });
    }

    let accessToken = '';
    let expiresAt: string | null = null;
    try {
      accessToken = createGuestOrderToken({ orderNumber, email });
      const verified = verifyGuestOrderToken(accessToken, orderNumber);
      if (verified) expiresAt = new Date(verified.exp * 1000).toISOString();
      else accessToken = '';
    } catch {
      accessToken = '';
    }

    return res.status(200).json({
      ok: true,
      order: publicOrder(order),
      accessToken,
      expiresAt,
      sessionOnly: !accessToken,
    });
  } catch {
    return res.status(503).json({ ok: false, error: 'guest_order_access_unavailable' });
  }
}

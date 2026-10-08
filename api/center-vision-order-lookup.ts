import { applyApiHeaders } from './_request-security.js';

type ApiReq = { method?: string; body?: unknown };
type ApiRes = {
  setHeader: (name: string, value: string | string[]) => void;
  status: (code: number) => { json: (body: unknown) => unknown };
};
const cvBase = (
  process.env.CENTER_VISION_API_BASE_URL ||
  'https://br-sweet-mountain-b46pgqvs-centerapi.compute.c-6.us-east-2.aws.neon.tech/api'
).replace(/\/$/, '');

export default async function handler(req: ApiReq, res: ApiRes) {
  applyApiHeaders(res);
  res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  const body =
    req.body && typeof req.body === 'object' && !Array.isArray(req.body)
      ? (req.body as Record<string, unknown>)
      : {};
  const orderNumber = String(body.orderNumber || '').trim().toUpperCase();
  const email = String(body.email || '').trim().toLowerCase();
  if (
    !/^SHB-\d{8}-\d{7}$/.test(orderNumber) ||
    email.length > 240 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return res.status(400).json({ ok: false, error: 'invalid_lookup' });
  }
  try {
    const response = await fetch(`${cvBase}/v1/public/store/shababuna/order-lookup`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ orderNumber, email }),
      signal: AbortSignal.timeout(12000),
      cache: 'no-store',
    });
    if (response.status === 404)
      return res.status(404).json({ ok: false, error: 'order_not_found' });
    if (!response.ok)
      return res.status(503).json({ ok: false, error: 'center_vision_unavailable' });
    const order = await response.json();
    if (!order || order.externalOrderNumber !== orderNumber)
      return res.status(502).json({ ok: false, error: 'invalid_center_vision_response' });
    return res.status(200).json({
      ok: true,
      status: order.status,
      fulfillmentStatus: order.fulfillmentStatus,
      paymentStatus: order.paymentStatus,
      shipment: order.shipment ?? null,
    });
  } catch {
    return res.status(503).json({ ok: false, error: 'center_vision_unavailable' });
  }
}

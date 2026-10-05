import { applyApiHeaders } from './_request-security.js';
import { listNativeOrdersForUser } from './_native-orders.js';
import { sessionFromRequest } from './_customer-session.js';

type ApiReq = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
};
type ApiRes = {
  setHeader: (name: string, value: string | string[]) => void;
  status: (code: number) => { json: (body: unknown) => unknown };
};

export default async function handler(req: ApiReq, res: ApiRes) {
  applyApiHeaders(res);
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  const session = sessionFromRequest(req);
  if (!session) return res.status(401).json({ ok: false, error: 'authentication_required' });
  try {
    const orders = await listNativeOrdersForUser(session.id);
    return res.status(200).json({ ok: true, orders });
  } catch {
    return res.status(503).json({ ok: false, error: 'orders_unavailable' });
  }
}

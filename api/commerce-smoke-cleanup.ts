import { deleteBlobJson } from './_blob-store.js';
import { orderPath } from './_customer-session.js';

type ApiReq = { method?: string };
type ApiRes = {
  setHeader: (name: string, value: string | string[]) => void;
  status: (code: number) => { json: (body: unknown) => unknown };
};

const records = [
  {
    orderNumber: 'SHB-20261005-6203988',
    idempotencyKey: '94a10d4e-917f-4c35-9e39-eeb6684ff118',
  },
  {
    orderNumber: 'SHB-20261005-8703005',
    idempotencyKey: '0f76172e-ed64-4f04-ae7b-71595a8479cc',
  },
];

export default async function handler(req: ApiReq, res: ApiRes) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  const settled = await Promise.allSettled(
    records.flatMap((record) => [
      deleteBlobJson(orderPath(record.orderNumber)),
      deleteBlobJson(`orders/idempotency/${record.idempotencyKey}.json`),
    ]),
  );
  const failed = settled.filter((result) => result.status === 'rejected').length;
  return res.status(failed ? 503 : 200).json({
    ok: failed === 0,
    deletedOrders: failed === 0 ? records.map((record) => record.orderNumber) : [],
    failures: failed,
  });
}

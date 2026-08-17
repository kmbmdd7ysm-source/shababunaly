import { scrapeStockXCatalogAll } from './_kobe-marketplace-catalog.ts';

type ApiReq = { method?: string };
type ApiRes = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { json: (body: unknown) => unknown; end: () => unknown };
};

export default async function handler(req: ApiReq, res: ApiRes) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'public, max-age=120, s-maxage=21600, stale-while-revalidate=86400');
  if (req.method === 'HEAD') return res.status(204).end();

  const items = await scrapeStockXCatalogAll();
  return res.status(200).json({ ok: true, count: items.length, items });
}

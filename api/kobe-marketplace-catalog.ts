import { scrapeGoatSeries, scrapeMarketplaceSeries } from './_kobe-marketplace-catalog.ts';

type ApiReq = {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
};

type ApiRes = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => {
    json: (body: unknown) => unknown;
    end: () => unknown;
  };
};

const first = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? String(value[0] || '') : String(value || '');

export default async function handler(req: ApiReq, res: ApiRes) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader(
    'Cache-Control',
    'public, max-age=120, s-maxage=21600, stale-while-revalidate=86400',
  );

  if (req.method === 'HEAD') return res.status(204).end();

  const series = Number(first(req.query?.series));
  if (!Number.isInteger(series) || series < 4 || series > 12) {
    return res.status(400).json({ ok: false, error: 'invalid_series' });
  }

  const source = first(req.query?.source).trim().toLowerCase();
  if (source === 'goat') {
    const items = await scrapeGoatSeries(series);
    return res.status(200).json({
      ok: true,
      series,
      source: 'GOAT',
      count: items.length,
      items,
    });
  }

  const result = await scrapeMarketplaceSeries(series);
  return res.status(200).json({
    ok: true,
    series,
    count: result.items.length,
    goatCount: result.goatCount,
    stockxCount: result.stockxCount,
    items: result.items,
  });
}

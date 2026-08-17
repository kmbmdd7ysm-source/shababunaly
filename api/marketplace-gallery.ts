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

const ALLOWED_HOSTS = new Set(['goat.com', 'www.goat.com', 'stockx.com', 'www.stockx.com']);
const MAX_HTML_BYTES = 5_000_000;
const FETCH_TIMEOUT_MS = 8_000;

const first = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? String(value[0] || '') : String(value || '');

const decodeHtml = (value: string): string =>
  value
    .replace(/\\u0026/gi, '&')
    .replace(/\\u002f/gi, '/')
    .replace(/\\\//g, '/')
    .replace(/&amp;/gi, '&')
    .replace(/&#x2F;/gi, '/')
    .replace(/&quot;/gi, '"');

const normalizeImageUrl = (raw: string): string => {
  let value = decodeHtml(raw).trim().replace(/^["']|["']$/g, '');
  if (value.startsWith('//')) value = `https:${value}`;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return '';
    if (url.hostname === 'image.goat.com') {
      if (!url.searchParams.has('width')) url.searchParams.set('width', '1400');
      return url.toString();
    }
    if (url.hostname === 'images.stockx.com' || url.hostname.endsWith('.stockx.com')) {
      return url.toString();
    }
  } catch {
    return '';
  }
  return '';
};

const extractImages = (html: string, host: string): string[] => {
  const candidates: string[] = [];
  const decoded = decodeHtml(html);

  const absoluteImagePattern =
    /https?:\\?\/\\?\/(?:image\.goat\.com|images\.stockx\.com|[^"'<>\\\s]+\.stockx\.com)\/[^"'<>\\\s]+/gi;
  for (const match of decoded.matchAll(absoluteImagePattern)) {
    candidates.push(match[0]);
  }

  const srcPattern = /(?:src|content|srcset)=["']([^"']+)["']/gi;
  for (const match of decoded.matchAll(srcPattern)) {
    const value = String(match[1] || '');
    for (const part of value.split(',')) {
      candidates.push(part.trim().split(/\s+/)[0] || '');
    }
  }

  const normalized = candidates.map(normalizeImageUrl).filter(Boolean);
  const unique = normalized.filter((url, index, list) => list.indexOf(url) === index);

  const preferred =
    host.includes('goat.com')
      ? unique.filter(
          (url) =>
            url.includes('image.goat.com') &&
            (url.includes('product_template_additional_pictures') ||
              url.includes('product_template_pictures') ||
              url.includes('/attachments/')),
        )
      : unique.filter((url) => url.includes('stockx.com'));

  return (preferred.length ? preferred : unique).slice(0, 30);
};

const json = (res: ApiRes, status: number, body: unknown) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', status === 200 ? 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800' : 'no-store');
  return res.status(status).json(body);
};

export default async function handler(req: ApiReq, res: ApiRes) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return json(res, 405, { ok: false, error: 'method_not_allowed' });
  }

  const raw = first(req.query?.url).trim();
  let source: URL;
  try {
    source = new URL(raw);
  } catch {
    return json(res, 400, { ok: false, error: 'invalid_url' });
  }

  if (source.protocol !== 'https:' || !ALLOWED_HOSTS.has(source.hostname.toLowerCase())) {
    return json(res, 400, { ok: false, error: 'unsupported_marketplace' });
  }

  if (req.method === 'HEAD') {
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=86400');
    return res.status(204).end();
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(source.toString(), {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent':
          'Mozilla/5.0 (compatible; SHABABUNA-MediaResolver/1.0; +https://shababuna.com)',
      },
    });

    if (!response.ok) {
      return json(res, 502, { ok: false, error: 'marketplace_fetch_failed', status: response.status });
    }

    const declaredLength = Number(response.headers.get('content-length') || 0);
    if (declaredLength > MAX_HTML_BYTES) {
      return json(res, 502, { ok: false, error: 'marketplace_response_too_large' });
    }

    const html = (await response.text()).slice(0, MAX_HTML_BYTES);
    const images = extractImages(html, source.hostname.toLowerCase());

    if (!images.length) {
      return json(res, 404, { ok: false, error: 'gallery_not_found' });
    }

    return json(res, 200, {
      ok: true,
      source: source.origin,
      count: images.length,
      images,
    });
  } catch (error) {
    const message = error instanceof Error && error.name === 'AbortError' ? 'marketplace_timeout' : 'marketplace_unavailable';
    return json(res, 502, { ok: false, error: message });
  } finally {
    clearTimeout(timeout);
  }
}

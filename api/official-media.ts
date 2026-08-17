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

const SOURCES = {
  'nike-winning': 'https://about.nike.com/en/newsroom/releases/winning-isnt-for-everyone-campaign',
  'newbalance-basketball': 'https://www.newbalance.com/basketball/',
} as const;

type SourceKey = keyof typeof SOURCES;

const FETCH_TIMEOUT_MS = 9000;
const MAX_HTML_BYTES = 8_000_000;

const first = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? String(value[0] || '') : String(value || '');

const decodeHtml = (value: string): string =>
  value
    .replace(/\\u0026/gi, '&')
    .replace(/\\u002f/gi, '/')
    .replace(/\\u003a/gi, ':')
    .replace(/\\\//g, '/')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#x2F;/gi, '/');

const cleanUrl = (value: string): string => decodeHtml(value).trim().replace(/^['"]|['"]$/g, '');

const youtubeIdFromHtml = (htmlInput: string): string => {
  const html = decodeHtml(htmlInput);
  const patterns = [
    /youtube(?:-nocookie)?\.com\/embed\/([A-Za-z0-9_-]{6,})/i,
    /youtube\.com\/watch\?[^"'<>\s]*v=([A-Za-z0-9_-]{6,})/i,
    /youtu\.be\/([A-Za-z0-9_-]{6,})/i,
    /"videoId"\s*:\s*"([A-Za-z0-9_-]{6,})"/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1];
  }
  return '';
};

const videoUrlFromHtml = (htmlInput: string): string => {
  const html = decodeHtml(htmlInput);
  const candidates: string[] = [];
  const attrPattern = /(?:src|content|url)=["']([^"']+(?:\.mp4|\.webm|\.m3u8)[^"']*)["']/gi;
  for (const match of html.matchAll(attrPattern)) if (match[1]) candidates.push(match[1]);
  const jsonPattern = /"(?:src|url|videoUrl|video_url|desktopVideo|mobileVideo)"\s*:\s*"([^"]+(?:\.mp4|\.webm|\.m3u8)[^"]*)"/gi;
  for (const match of html.matchAll(jsonPattern)) if (match[1]) candidates.push(match[1]);
  const absolutePattern = /https?:\\?\/\\?\/[^"'<>\s]+\.(?:mp4|webm|m3u8)(?:\?[^"'<>\s]*)?/gi;
  for (const match of html.matchAll(absolutePattern)) if (match[0]) candidates.push(match[0]);

  const valid: string[] = [];
  for (const candidate of candidates) {
    const raw = cleanUrl(candidate);
    const normalized = raw.startsWith('//') ? `https:${raw}` : raw;
    try {
      const url = new URL(normalized);
      if (url.protocol !== 'https:') continue;
      if (!/\.(?:mp4|webm|m3u8)(?:$|\?)/i.test(url.toString())) continue;
      if (!valid.includes(url.toString())) valid.push(url.toString());
    } catch {
      // Ignore malformed candidates.
    }
  }
  return valid.find((url) => /\.mp4(?:$|\?)/i.test(url))
    || valid.find((url) => /\.webm(?:$|\?)/i.test(url))
    || valid.find((url) => /\.m3u8(?:$|\?)/i.test(url))
    || '';
};

const json = (res: ApiRes, status: number, body: unknown) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader(
    'Cache-Control',
    status === 200
      ? 'public, max-age=300, s-maxage=21600, stale-while-revalidate=86400'
      : 'no-store',
  );
  return res.status(status).json(body);
};

export default async function handler(req: ApiReq, res: ApiRes) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return json(res, 405, { ok: false, error: 'method_not_allowed' });
  }

  const source = first(req.query?.source).trim() as SourceKey;
  if (!(source in SOURCES)) return json(res, 400, { ok: false, error: 'invalid_source' });
  if (req.method === 'HEAD') return res.status(204).end();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(SOURCES[source], {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': 'Mozilla/5.0 (compatible; SHABABUNA-OfficialMediaResolver/1.0; +https://shababuna.ly)',
      },
    });
    if (!response.ok) return json(res, 502, { ok: false, error: 'official_source_fetch_failed' });
    const declared = Number(response.headers.get('content-length') || 0);
    if (declared > MAX_HTML_BYTES) return json(res, 502, { ok: false, error: 'official_source_too_large' });
    const html = (await response.text()).slice(0, MAX_HTML_BYTES);

    const videoUrl = videoUrlFromHtml(html);
    const youtubeId = youtubeIdFromHtml(html);
    const embedUrl = youtubeId
      ? `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${youtubeId}&playsinline=1&rel=0&modestbranding=1`
      : '';

    if (!videoUrl && !embedUrl) {
      return json(res, 404, { ok: false, error: 'official_video_not_found' });
    }

    return json(res, 200, {
      ok: true,
      source,
      sourceUrl: SOURCES[source],
      videoUrl,
      embedUrl,
    });
  } catch (error) {
    const reason = error instanceof Error && error.name === 'AbortError' ? 'official_source_timeout' : 'official_source_unavailable';
    return json(res, 502, { ok: false, error: reason });
  } finally {
    clearTimeout(timeout);
  }
}

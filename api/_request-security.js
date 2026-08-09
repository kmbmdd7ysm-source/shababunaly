import { createHash, timingSafeEqual } from 'node:crypto';

const developmentBuckets = new Map();
const clean = (value, max = 1000) =>
  String(value ?? '')
    .trim()
    .slice(0, max);
const configuredSite = clean(process.env.SITE_URL || 'https://shababuna.ly', 1000).replace(
  /\/$/,
  '',
);
const allowedOrigins = new Set([
  configuredSite,
  'https://shababuna.ly',
  'https://www.shababuna.ly',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

function clientAddress(req) {
  return clean(
    req.headers['x-forwarded-for'] ||
      req.headers['x-real-ip'] ||
      req.socket?.remoteAddress ||
      'unknown',
    200,
  )
    .split(',')[0]
    .trim();
}

function secureEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function applyApiHeaders(res) {
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), usb=()');
  res.setHeader('X-Frame-Options', 'DENY');
}

async function consumeDurableLimit({ bucket, subjectHash, limit, windowSeconds }) {
  const base = clean(process.env.SUPABASE_URL, 1000).replace(/\/$/, '');
  const key = clean(process.env.SUPABASE_SERVICE_ROLE_KEY, 5000);
  if (!base || !key) return null;
  const upstream = await fetch(`${base}/rest/v1/rpc/consume_edge_rate_limit`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      p_bucket: bucket,
      p_subject_hash: subjectHash,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    }),
    cache: 'no-store',
  });
  if (!upstream.ok) throw new Error(`rate_limit_store:${upstream.status}`);
  return Boolean(await upstream.json());
}

function consumeDevelopmentLimit(key, limit, windowMs) {
  const now = Date.now();
  const current = developmentBuckets.get(key);
  const bucket =
    !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
  bucket.count += 1;
  developmentBuckets.set(key, bucket);
  return {
    allowed: bucket.count <= limit,
    retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

export async function guardPublicRequest(
  req,
  res,
  {
    maxBytes = 64_000,
    limit = 12,
    windowMs = 60_000,
    bucket = 'public-request',
    honeypot = true,
  } = {},
) {
  applyApiHeaders(res);
  const origin = clean(req.headers.origin, 1000);
  if (origin && !allowedOrigins.has(origin)) {
    res.status(403).json({ ok: false, error: 'origin_not_allowed' });
    return false;
  }
  const size = Number(req.headers['content-length'] || 0);
  if (Number.isFinite(size) && size > maxBytes) {
    res.status(413).json({ ok: false, error: 'request_too_large' });
    return false;
  }
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  if (honeypot && clean(body.website || body.company_website || body._gotcha, 500)) {
    res.status(200).json({ ok: true });
    return false;
  }

  const salt = clean(process.env.EDGE_RATE_LIMIT_SALT || process.env.CRON_SECRET, 5000);
  const subjectHash = createHash('sha256')
    .update(
      `${salt || 'development'}:${clientAddress(req)}:${clean(req.headers['user-agent'], 500)}`,
    )
    .digest('hex');
  if (!salt) {
    if (process.env.NODE_ENV === 'production') {
      res.status(503).json({ ok: false, error: 'security_service_unavailable' });
      return false;
    }
    const fallback = consumeDevelopmentLimit(`${bucket}:${subjectHash}`, limit, windowMs);
    if (!fallback.allowed) {
      res.setHeader('Retry-After', String(fallback.retryAfter));
      res.status(429).json({ ok: false, error: 'rate_limited' });
      return false;
    }
    return true;
  }
  try {
    const allowed = await consumeDurableLimit({
      bucket: clean(bucket, 80),
      subjectHash,
      limit,
      windowSeconds: Math.max(1, Math.ceil(windowMs / 1000)),
    });
    if (allowed === false) {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil(windowMs / 1000))));
      res.status(429).json({ ok: false, error: 'rate_limited' });
      return false;
    }
    if (allowed === null) {
      if (process.env.NODE_ENV === 'production') {
        res.status(503).json({ ok: false, error: 'security_service_unavailable' });
        return false;
      }
      const fallback = consumeDevelopmentLimit(`${bucket}:${subjectHash}`, limit, windowMs);
      if (!fallback.allowed) {
        res.setHeader('Retry-After', String(fallback.retryAfter));
        res.status(429).json({ ok: false, error: 'rate_limited' });
        return false;
      }
    }
  } catch {
    res.status(503).json({ ok: false, error: 'security_service_unavailable' });
    return false;
  }
  return true;
}

export async function guardPublicPost(req, res, options = {}) {
  return guardPublicRequest(req, res, { ...options, honeypot: options.honeypot !== false });
}

export function verifyBearerSecret(header, expected) {
  const provided = clean(header, 5000).replace(/^Bearer\s+/i, '');
  return Boolean(expected) && secureEqual(provided, expected);
}

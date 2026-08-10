import { guardPublicPost } from './_request-security.ts';
import { verifyTurnstileToken } from './_turnstile.ts';
import { resolveFormspreeEndpoint } from './_formspree-endpoint.ts';

export { resolveFormspreeEndpoint, FORMSPREE_CANONICAL_ENDPOINT } from './_formspree-endpoint.ts';

export function sanitize(value: unknown, max = 12000): string {
  if (value == null) return '';
  let serialized;
  const type = typeof value;
  if (type === 'string' || type === 'number' || type === 'boolean') serialized = String(value);
  else serialized = JSON.stringify(value, null, 2);
  return serialized.replace(/\0/g, '').slice(0, max);
}

export function sanitizeKey(value: unknown): string {
  return String(value || '')
    .trim()
    .replace(/[^A-Za-z0-9_.:-]/g, '_')
    .slice(0, 80);
}

export function buildCleanFormPayload(
  payload: Record<string, unknown> | null | undefined,
): Record<string, string> {
  const cleanPayload: Record<string, string> = {};
  let count = 0;
  for (const [rawKey, value] of Object.entries(payload || ({} as Record<string, unknown>))) {
    if (rawKey === 'turnstileToken') continue;
    const key = sanitizeKey(rawKey);
    if (!key) continue;
    cleanPayload[key] = sanitize(value);
    count += 1;
    if (count >= 60) break;
  }
  return cleanPayload;
}

type ApiReq = {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
};
type ApiRes = {
  setHeader: (n: string, v: string) => void;
  status: (c: number) => { json: (b: unknown) => unknown };
};
export default async function handler(request: ApiReq, response: ApiRes) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  if (!(await guardPublicPost(request as never, response as never, { maxBytes: 64000, limit: 10 })))
    return;
  const endpoint = resolveFormspreeEndpoint();
  if (!endpoint || !/^https:\/\//i.test(endpoint))
    return response.status(503).json({ ok: false, error: 'formspree_not_configured' });
  const payload = (request.body && typeof request.body === 'object' ? request.body : {}) as Record<
    string,
    unknown
  >;
  const forwarded = request.headers['x-forwarded-for'];
  const captchaOk = await verifyTurnstileToken(
    String(payload.turnstileToken || ''),
    String(
      (Array.isArray(forwarded) ? forwarded[0] : forwarded) || request.socket?.remoteAddress || '',
    ),
  );
  if (!captchaOk) return response.status(400).json({ ok: false, error: 'captcha_failed' });
  const clean = buildCleanFormPayload(payload);
  const body = new URLSearchParams(clean).toString();
  const signal = AbortSignal.timeout(20000);
  try {
    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        Accept: 'application/json',
        'User-Agent': 'Shababuna-Commerce-Order-Service/1.0',
      },
      body,
      signal,
    });
    const text = await upstream.text();
    if (!upstream.ok)
      return response.status(502).json({
        ok: false,
        error: 'formspree_rejected',
        status: upstream.status,
        detail: text.slice(0, 500),
      });
    return response.status(200).json({ ok: true, provider: 'formspree' });
  } catch (error) {
    return response.status(502).json({
      ok: false,
      error: 'formspree_delivery_failed',
      detail: String(
        error && typeof error === 'object' && 'message' in error
          ? (error as { message?: unknown }).message
          : error,
      ).slice(0, 500),
    });
  }
}

import { guardPublicPost } from './_request-security.ts';
import { verifyTurnstileToken } from './_turnstile.ts';
import { resolveFormspreeEndpoint } from './_formspree-endpoint.ts';

export { resolveFormspreeEndpoint, FORMSPREE_CANONICAL_ENDPOINT } from './_formspree-endpoint.ts';

export function sanitize(value, max = 12000) {
  if (value == null) return '';
  let serialized;
  const type = typeof value;
  if (type === 'string' || type === 'number' || type === 'boolean') serialized = String(value);
  else serialized = JSON.stringify(value, null, 2);
  return serialized.replace(/\0/g, '').slice(0, max);
}

export function sanitizeKey(value) {
  return String(value || '')
    .trim()
    .replace(/[^A-Za-z0-9_.:-]/g, '_')
    .slice(0, 80);
}

export function buildCleanFormPayload(payload) {
  /** @type {Record<string, string>} */
  const cleanPayload = {};
  let count = 0;
  for (const [rawKey, value] of Object.entries(payload || {})) {
    if (rawKey === 'turnstileToken') continue;
    const key = sanitizeKey(rawKey);
    if (!key) continue;
    cleanPayload[key] = sanitize(value);
    count += 1;
    if (count >= 60) break;
  }
  return cleanPayload;
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  if (!(await guardPublicPost(request, response, { maxBytes: 64000, limit: 10 }))) return;
  const endpoint = resolveFormspreeEndpoint();
  if (!endpoint || !/^https:\/\//i.test(endpoint))
    return response.status(503).json({ ok: false, error: 'formspree_not_configured' });
  const payload = request.body && typeof request.body === 'object' ? request.body : {};
  const captchaOk = await verifyTurnstileToken(
    payload.turnstileToken,
    request.headers['x-forwarded-for'] || request.socket?.remoteAddress || '',
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
      detail: String(error?.message || error).slice(0, 500),
    });
  }
}

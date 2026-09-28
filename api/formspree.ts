import { guardPublicPost } from './_request-security.js';
import { resolveFormspreeEndpoint } from './_formspree-endpoint.js';

const CENTER_VISION_API = (process.env.CENTER_VISION_API_BASE_URL || 'https://br-sweet-mountain-b46pgqvs-centerapi.compute.c-6.us-east-2.aws.neon.tech/api').replace(/\/$/, '');

async function syncCenterVision(payload: Record<string, unknown>) {
  const inquiry = {
    siteKey: 'SHABABUNA',
    inquiryType: String(payload.request_type || payload.formType || payload.requestType || 'website').slice(0, 80),
    fullName: String(payload.customer_name || payload.customerName || payload.name || 'Website visitor').slice(0, 160),
    email: String(payload.customer_email || payload.customerEmail || payload.email || '').trim().toLowerCase() || undefined,
    phone: String(payload.phone || payload.whatsapp || '').trim() || undefined,
    organizationName: String(payload.organization || payload.company || '').trim().slice(0, 180) || undefined,
    message: String(payload.message || payload.details || payload.description || 'Website inquiry').slice(0, 5000),
    locale: String(payload.language || payload.locale || 'en').slice(0, 20),
    metadata: {
      source: 'shababunaly.com',
      referenceId: payload.reference_id || payload.referenceId || payload.reference || null,
      country: payload.country || payload.countryCode || null,
      amount: payload.amount || payload.total || payload.totalUsd || null,
      currency: payload.currency || null,
      paymentMethod: payload.payment_method || payload.paymentMethod || null,
      subject: payload.subject || payload._subject || null,
    },
  };
  const result = await fetch(`${CENTER_VISION_API}/v1/public/inquiries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(inquiry),
    signal: AbortSignal.timeout(15000),
  });
  if (!result.ok) throw new Error(`center_vision_${result.status}`);
  return result.json().catch(() => ({}));
}

export { resolveFormspreeEndpoint, FORMSPREE_CANONICAL_ENDPOINT } from './_formspree-endpoint.js';

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

export function buildCleanFormPayload(payload: Record<string, unknown> | null | undefined): Record<string, string> {
  const cleanPayload: Record<string, string> = {};
  let count = 0;
  for (const [rawKey, value] of Object.entries(payload || {} as Record<string, unknown>)) {
    if (rawKey === 'turnstileToken') continue;
    const key = sanitizeKey(rawKey);
    if (!key) continue;
    cleanPayload[key] = sanitize(value);
    count += 1;
    if (count >= 60) break;
  }
  return cleanPayload;
}

type ApiReq = { method?: string; body?: unknown; headers: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } };
type ApiRes = { setHeader: (n: string, v: string) => void; status: (c: number) => { json: (b: unknown) => unknown } };
export default async function handler(request: ApiReq, response: ApiRes) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  if (!(await guardPublicPost(request, response, { maxBytes: 64000, limit: 10, bucket: 'formspree', allowEphemeralFallback: true }))) return;
  const endpoint = resolveFormspreeEndpoint();
  if (!endpoint || !/^https:\/\//i.test(endpoint))
    return response.status(503).json({ ok: false, error: 'formspree_not_configured' });
  const payload = (request.body && typeof request.body === 'object' ? request.body : {}) as Record<string, unknown>;
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
    let centerVision = 'synced';
    try { await syncCenterVision(payload); } catch { centerVision = 'pending'; }
    return response.status(200).json({ ok: true, provider: 'formspree', centerVision });
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

import { getSupabase } from './supabase';

const clean = (value, max = 3000) =>
  String(value ?? '')
    .trim()
    .slice(0, max);

async function authorizationHeader() {
  const client = await getSupabase();
  if (!client) return {};
  const { data } = await client.auth.getSession();
  const token = data?.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function submitPublicQuote({
  payload,
  organizationId = null,
  turnstileToken,
  idempotencyKey,
}) {
  const key = clean(idempotencyKey, 36) || globalThis.crypto?.randomUUID?.();
  if (!key) throw new Error('idempotency_unavailable');
  const response = await fetch('/api/public-quote-request', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(await authorizationHeader()),
    },
    credentials: 'same-origin',
    body: JSON.stringify({ payload, organizationId, turnstileToken, idempotencyKey: key }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.quote?.id) {
    const error = new Error(clean(data?.error || `quote_request_failed:${response.status}`, 180));
    error.status = response.status;
    throw error;
  }
  return { ...data, idempotencyKey: key };
}

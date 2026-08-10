import { getSupabase } from './supabase.ts';

const clean = (value: unknown, max = 3000): string =>
  String(value ?? '')
    .trim()
    .slice(0, max);

async function authorizationHeader(): Promise<Record<string, string>> {
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
}: {
  payload: Record<string, unknown>;
  organizationId?: string | null;
  turnstileToken?: string;
  idempotencyKey?: string;
}): Promise<Record<string, unknown>> {
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
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown> & {
    quote?: { id?: string };
    error?: string;
  };
  if (!response.ok || !data?.quote?.id) {
    const error = new Error(
      clean(data?.error || `quote_request_failed:${response.status}`, 180),
    ) as Error & {
      status?: number;
    };
    error.status = response.status;
    throw error;
  }
  return { ...data, idempotencyKey: key };
}

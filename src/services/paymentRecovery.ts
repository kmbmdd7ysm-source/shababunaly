import { getSupabase } from './supabase.js';

async function authHeader(): Promise<Record<string, string>> {
  const client = await getSupabase();
  if (!client) return {};
  const auth = client.auth as {
    getSession?: () => Promise<{ data?: { session?: { access_token?: string } } }>;
  };
  const { data } = (await auth.getSession?.()) || {};
  const token = data?.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function retryOrderPayment({
  orderNumber,
  accessToken = '',
}: {
  orderNumber: string;
  accessToken?: string;
}): Promise<{ url: string; [key: string]: unknown }> {
  const response = await fetch('/api/retry-order-payment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(await authHeader()),
    },
    credentials: 'same-origin',
    body: JSON.stringify({ orderNumber, accessToken }),
  });
  const data = (await response.json().catch(() => ({}))) as {
    url?: string;
    error?: string;
  };
  if (!response.ok || !data?.url) {
    const error = new Error(data?.error || `payment_recovery_failed:${response.status}`) as Error & {
      status?: number;
    };
    error.status = response.status;
    throw error;
  }
  return data as { url: string };
}

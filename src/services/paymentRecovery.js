import { getSupabase } from './supabase';

async function authHeader() {
  const client = await getSupabase();
  if (!client) return {};
  const { data } = await client.auth.getSession();
  const token = data?.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function retryOrderPayment({ orderNumber, accessToken = '' }) {
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
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.url) {
    const error = new Error(data?.error || `payment_recovery_failed:${response.status}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

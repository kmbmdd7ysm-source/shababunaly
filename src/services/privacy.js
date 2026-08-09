import { getSupabase } from './supabase';

export async function requestPrivacyExport() {
  const client = await getSupabase();
  if (!client) throw Object.assign(new Error('cloud_not_configured'), { code: 'CLOUD_REQUIRED' });
  const { data, error } = await client.rpc('request_my_privacy_export');
  if (error) throw error;
  return data;
}

export async function listPrivacyExports() {
  const client = await getSupabase();
  if (!client) throw Object.assign(new Error('cloud_not_configured'), { code: 'CLOUD_REQUIRED' });
  const { data, error } = await client
    .from('privacy_export_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return data || [];
}

export async function downloadPrivacyExport(assetId) {
  const client = await getSupabase();
  if (!client) throw Object.assign(new Error('cloud_not_configured'), { code: 'CLOUD_REQUIRED' });
  const { data: sessionData } = await client.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) throw Object.assign(new Error('authentication_required'), { code: 'AUTH_REQUIRED' });
  const response = await fetch(`/api/private-file?assetId=${encodeURIComponent(assetId)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.url) throw new Error(data.error || 'privacy_export_unavailable');
  const anchor = document.createElement('a');
  anchor.href = data.url;
  anchor.download = data.name || 'shababuna-privacy-export.json';
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

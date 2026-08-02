const clean = (value, max = 5000) => String(value ?? '').trim().slice(0, max);

export function getSupabaseAdminConfig() {
  const base = clean(process.env.SUPABASE_URL, 1000).replace(/\/$/, '');
  const serviceKey = clean(process.env.SUPABASE_SERVICE_ROLE_KEY, 5000);
  if (!base || !serviceKey) throw new Error('supabase_not_configured');
  return { base, serviceKey };
}

export async function supabaseAdminRequest(path, options = {}) {
  const { base, serviceKey } = getSupabaseAdminConfig();
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      ...(options.body != null && !(options.body instanceof Uint8Array) ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
    cache: 'no-store',
  });
  const text = await response.text();
  if (!response.ok) {
    const error = new Error(`supabase:${response.status}:${text.slice(0, 500)}`);
    error.status = response.status;
    throw error;
  }
  try { return text ? JSON.parse(text) : null; } catch { return text; }
}

export async function resolveSupabaseUser(authorization) {
  const token = clean(authorization, 6000).replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { base, serviceKey } = getSupabaseAdminConfig();
  const response = await fetch(`${base}/auth/v1/user`, {
    headers: { Accept: 'application/json', apikey: serviceKey, Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (response.status === 401 || response.status === 403) return null;
  if (!response.ok) throw new Error(`supabase_auth:${response.status}`);
  const user = await response.json();
  return user?.id ? user : null;
}

export async function supabaseUserRequest(path, authorization, options = {}) {
  const token = clean(authorization, 6000).replace(/^Bearer\s+/i, '');
  if (!token) throw Object.assign(new Error('authentication_required'), { status: 401 });
  const { base, serviceKey } = getSupabaseAdminConfig();
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      apikey: serviceKey,
      Authorization: `Bearer ${token}`,
      ...(options.body != null && !(options.body instanceof Uint8Array) ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
    cache: 'no-store',
  });
  const text = await response.text();
  if (!response.ok) {
    const error = new Error(`supabase_user:${response.status}:${text.slice(0, 500)}`);
    error.status = response.status;
    throw error;
  }
  try { return text ? JSON.parse(text) : null; } catch { return text; }
}

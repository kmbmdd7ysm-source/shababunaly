import { applyApiHeaders } from './_request-security.js';
import { requireStaffSession } from './_staff-auth.ts';

const ALLOWED_ROLES = new Set(['customer', 'sales', 'operations', 'admin', 'super_admin']);
const clean = (value, max = 500) =>
  String(value ?? '')
    .trim()
    .slice(0, max);
const json = (res, status, body) => {
  applyApiHeaders(res);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(status).json(body);
};

/** @param {string} path @param {{method?:string,token?:string,serviceKey?:string,body?:unknown}} [options] */
async function supabaseAuth(path, options = {}) {
  const { method = 'GET', token = '', serviceKey = '', body = null } = options;
  const base = clean(process.env.SUPABASE_URL, 1000).replace(/\/$/, '');
  if (!base || !serviceKey)
    throw Object.assign(new Error('supabase_not_configured'), { status: 503 });
  const response = await fetch(`${base}/auth/v1/${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      apikey: serviceKey,
      Authorization: `Bearer ${token || serviceKey}`,
    },
    body: body == null ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!response.ok)
    throw Object.assign(new Error(`supabase_auth:${response.status}:${text.slice(0, 300)}`), {
      status: response.status >= 500 ? 502 : response.status,
    });
  return data;
}

async function requireSuperAdmin(req) {
  const session = await requireStaffSession(req, {
    roles: new Set(['super_admin']),
    requireAal2: true,
  });
  const serviceKey = clean(process.env.SUPABASE_SERVICE_ROLE_KEY, 5000);
  if (!serviceKey) throw Object.assign(new Error('supabase_not_configured'), { status: 503 });
  return { requester: session.user, serviceKey };
}

const sanitizeUser = (user) => ({
  id: user.id,
  email: user.email || '',
  createdAt: user.created_at || null,
  confirmedAt: user.email_confirmed_at || user.confirmed_at || null,
  lastSignInAt: user.last_sign_in_at || null,
  role: String(user.app_metadata?.role || 'customer').toLowerCase(),
  accountType: user.user_metadata?.account_type || 'customer',
  organizationName: user.user_metadata?.organization_name || '',
  displayName: user.user_metadata?.display_name || user.user_metadata?.fullName || '',
});

export default async function handler(req, res) {
  if (!['GET', 'PATCH'].includes(req.method)) {
    res.setHeader('Allow', 'GET, PATCH');
    return json(res, 405, { ok: false, error: 'method_not_allowed' });
  }
  if (Number(req.headers['content-length'] || 0) > 16_000)
    return json(res, 413, { ok: false, error: 'request_too_large' });
  let auth;
  try {
    auth = await requireSuperAdmin(req);
  } catch (error) {
    return json(res, error.status || 401, { ok: false, error: clean(error.message, 300) });
  }

  try {
    if (req.method === 'GET') {
      const page = Math.max(1, Math.min(1000, Number(req.query?.page || 1) || 1));
      const perPage = Math.max(1, Math.min(100, Number(req.query?.perPage || 50) || 50));
      const data = await supabaseAuth(`admin/users?page=${page}&per_page=${perPage}`, {
        serviceKey: auth.serviceKey,
      });
      const users = Array.isArray(data?.users) ? data.users.map(sanitizeUser) : [];
      return json(res, 200, {
        ok: true,
        users,
        page,
        perPage,
        total: Number(data?.aud || data?.total || users.length),
      });
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const userId = clean(body.userId, 100);
    const role = clean(body.role, 40).toLowerCase();
    if (!/^[0-9a-f-]{36}$/i.test(userId) || !ALLOWED_ROLES.has(role))
      return json(res, 400, { ok: false, error: 'invalid_role_update' });
    if (userId === auth.requester.id && role !== 'super_admin')
      return json(res, 409, { ok: false, error: 'cannot_remove_own_super_admin_role' });

    const current = await supabaseAuth(`admin/users/${encodeURIComponent(userId)}`, {
      serviceKey: auth.serviceKey,
    });
    const currentMetadata =
      current?.app_metadata && typeof current.app_metadata === 'object' ? current.app_metadata : {};
    const nextMetadata = { ...currentMetadata };
    if (role === 'customer') delete nextMetadata.role;
    else nextMetadata.role = role;
    const updated = await supabaseAuth(`admin/users/${encodeURIComponent(userId)}`, {
      method: 'PUT',
      serviceKey: auth.serviceKey,
      body: { app_metadata: nextMetadata },
    });
    return json(res, 200, { ok: true, user: sanitizeUser(updated) });
  } catch (error) {
    return json(res, error.status || 502, { ok: false, error: clean(error.message, 500) });
  }
}

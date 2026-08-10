import { applyApiHeaders } from './_request-security.ts';
import { requireStaffSession } from './_staff-auth.ts';

type ApiReq = {
  method?: string;
  body?: unknown;
  query?: Record<string, string | string[] | undefined>;
  headers?: Record<string, string | string[] | undefined>;
};
type ApiRes = {
  setHeader: (n: string, v: string) => void;
  status: (c: number) => { json: (b: unknown) => unknown };
};

const ALLOWED_ROLES = new Set(['customer', 'sales', 'operations', 'admin', 'super_admin']);
const clean = (value: unknown, max = 500): string =>
  String(value ?? '')
    .trim()
    .slice(0, max);

const json = (res: ApiRes, status: number, body: unknown) => {
  applyApiHeaders(res);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(status).json(body);
};

async function supabaseAuth(
  path: string,
  options: {
    method?: string;
    token?: string;
    serviceKey?: string;
    body?: unknown;
  } = {},
) {
  const { method = 'GET', token = '', serviceKey = '', body = null } = options;
  const base = clean(process.env.SUPABASE_URL, 1000).replace(/\/$/, '');
  if (!base || !serviceKey)
    throw Object.assign(new Error('supabase_not_configured'), { status: 503 });
  const init: RequestInit = {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      apikey: serviceKey,
      Authorization: `Bearer ${token || serviceKey}`,
    },
  };
  if (body != null) init.body = JSON.stringify(body);
  const response = await fetch(`${base}/auth/v1/${path}`, init);
  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!response.ok)
    throw Object.assign(new Error(`supabase_auth:${response.status}:${text.slice(0, 300)}`), {
      status: response.status >= 500 ? 502 : response.status,
    });
  return data as Record<string, unknown>;
}

async function requireSuperAdmin(req: ApiReq) {
  const session = await requireStaffSession(req, {
    roles: new Set(['super_admin']),
    requireAal2: true,
  });
  const serviceKey = clean(process.env.SUPABASE_SERVICE_ROLE_KEY, 5000);
  if (!serviceKey) throw Object.assign(new Error('supabase_not_configured'), { status: 503 });
  return { requester: (session as { user: { id?: string } }).user, serviceKey };
}

const sanitizeUser = (user: Record<string, unknown>) => {
  const appMeta = (user.app_metadata || {}) as Record<string, unknown>;
  const userMeta = (user.user_metadata || {}) as Record<string, unknown>;
  return {
    id: user.id,
    email: user.email || '',
    createdAt: user.created_at || null,
    confirmedAt: user.email_confirmed_at || user.confirmed_at || null,
    lastSignInAt: user.last_sign_in_at || null,
    role: String(appMeta.role || 'customer').toLowerCase(),
    accountType: userMeta.account_type || 'customer',
    organizationName: userMeta.organization_name || '',
    displayName: userMeta.display_name || userMeta.fullName || '',
  };
};

export default async function handler(req: ApiReq, res: ApiRes) {
  if (!['GET', 'PATCH'].includes(String(req.method || ''))) {
    res.setHeader('Allow', 'GET, PATCH');
    return json(res, 405, { ok: false, error: 'method_not_allowed' });
  }
  const contentLength = req.headers?.['content-length'];
  if (Number((Array.isArray(contentLength) ? contentLength[0] : contentLength) || 0) > 16_000)
    return json(res, 413, { ok: false, error: 'request_too_large' });
  let auth: { requester: { id?: string }; serviceKey: string };
  try {
    auth = await requireSuperAdmin(req);
  } catch (error: unknown) {
    const status =
      error && typeof error === 'object' && 'status' in error
        ? Number((error as { status?: unknown }).status || 401)
        : 401;
    const message =
      error && typeof error === 'object' && 'message' in error
        ? (error as { message?: unknown }).message
        : error;
    return json(res, status, { ok: false, error: clean(message, 300) });
  }

  try {
    if (req.method === 'GET') {
      const pageRaw = req.query?.page;
      const perPageRaw = req.query?.perPage;
      const page = Math.max(
        1,
        Math.min(1000, Number((Array.isArray(pageRaw) ? pageRaw[0] : pageRaw) || 1) || 1),
      );
      const perPage = Math.max(
        1,
        Math.min(100, Number((Array.isArray(perPageRaw) ? perPageRaw[0] : perPageRaw) || 50) || 50),
      );
      const data = await supabaseAuth(`admin/users?page=${page}&per_page=${perPage}`, {
        serviceKey: auth.serviceKey,
      });
      const users = Array.isArray(data?.users)
        ? (data.users as Array<Record<string, unknown>>).map(sanitizeUser)
        : [];
      return json(res, 200, {
        ok: true,
        users,
        page,
        perPage,
        total: Number(data?.aud || data?.total || users.length),
      });
    }

    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<
      string,
      unknown
    >;
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
      current?.app_metadata && typeof current.app_metadata === 'object'
        ? ({ ...(current.app_metadata as Record<string, unknown>) } as Record<string, unknown>)
        : {};
    const nextMetadata = { ...currentMetadata };
    if (role === 'customer') delete nextMetadata.role;
    else nextMetadata.role = role;
    const updated = await supabaseAuth(`admin/users/${encodeURIComponent(userId)}`, {
      method: 'PUT',
      serviceKey: auth.serviceKey,
      body: { app_metadata: nextMetadata },
    });
    return json(res, 200, { ok: true, user: sanitizeUser(updated) });
  } catch (error: unknown) {
    const status =
      error && typeof error === 'object' && 'status' in error
        ? Number((error as { status?: unknown }).status || 502)
        : 502;
    const message =
      error && typeof error === 'object' && 'message' in error
        ? (error as { message?: unknown }).message
        : error;
    return json(res, status, { ok: false, error: clean(message, 500) });
  }
}

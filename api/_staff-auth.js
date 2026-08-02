import { resolveSupabaseUser } from './_supabase-admin.js';

const clean = (value, max = 6000) => String(value ?? '').trim().slice(0, max);
const STAFF_ROLES = new Set(['sales','operations','admin','super_admin']);

export function bearerToken(authorization) {
  const header = clean(authorization);
  const token = header.replace(/^Bearer\s+/i, '');
  return token && token !== header ? token : '';
}

export function decodeJwtPayload(token) {
  try {
    const part = String(token || '').split('.')[1];
    if (!part) return null;
    const normalized = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=');
    return JSON.parse(Buffer.from(normalized, 'base64').toString('utf8'));
  } catch { return null; }
}

export async function requireStaffSession(req, { roles = STAFF_ROLES, requireAal2 = true } = {}) {
  const token = bearerToken(req.headers.authorization);
  if (!token) throw Object.assign(new Error('unauthorized'), { status: 401 });
  const payload = decodeJwtPayload(token);
  if (!payload) throw Object.assign(new Error('invalid_access_token'), { status: 401 });
  const user = await resolveSupabaseUser(`Bearer ${token}`);
  if (!user) throw Object.assign(new Error('unauthorized'), { status: 401 });
  const role = String(user.app_metadata?.role || payload.app_metadata?.role || '').toLowerCase();
  const allowed = roles instanceof Set ? roles : new Set(roles);
  if (!allowed.has(role)) throw Object.assign(new Error('staff_required'), { status: 403 });
  if (requireAal2 && String(payload.aal || 'aal1') !== 'aal2') throw Object.assign(new Error('mfa_required'), { status: 403 });
  return { token, payload, user, role };
}

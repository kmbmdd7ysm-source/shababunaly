import { resolveSupabaseUser } from './_supabase-admin.ts';

const clean = (value: unknown, max = 6000): string =>
  String(value ?? '')
    .trim()
    .slice(0, max);
const STAFF_ROLES = new Set(['sales', 'operations', 'admin', 'super_admin']);

export function bearerToken(authorization: unknown): string {
  const header = clean(authorization);
  const token = header.replace(/^Bearer\s+/i, '');
  return token && token !== header ? token : '';
}

export function decodeJwtPayload(token: unknown): Record<string, unknown> | null {
  try {
    const part = String(token || '').split('.')[1];
    if (!part) return null;
    const normalized = part
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(part.length / 4) * 4, '=');
    return JSON.parse(Buffer.from(normalized, 'base64').toString('utf8')) as Record<
      string,
      unknown
    >;
  } catch {
    return null;
  }
}

export async function requireStaffSession(
  req: { headers?: { authorization?: string } },
  {
    roles = STAFF_ROLES,
    requireAal2 = true,
  }: { roles?: Set<string> | string[]; requireAal2?: boolean } = {},
): Promise<{
  token: string;
  payload: Record<string, unknown>;
  user: NonNullable<Awaited<ReturnType<typeof resolveSupabaseUser>>>;
  role: string;
}> {
  const token = bearerToken(req.headers?.authorization);
  if (!token) throw Object.assign(new Error('unauthorized'), { status: 401 });
  const payload = decodeJwtPayload(token);
  if (!payload) throw Object.assign(new Error('invalid_access_token'), { status: 401 });
  const user = await resolveSupabaseUser(`Bearer ${token}`);
  if (!user) throw Object.assign(new Error('unauthorized'), { status: 401 });
  const role = String(
    (user.app_metadata?.role as string | undefined) ||
      (payload.app_metadata as { role?: string } | undefined)?.role ||
      '',
  ).toLowerCase();
  const allowed = roles instanceof Set ? roles : new Set(roles);
  if (!allowed.has(role)) throw Object.assign(new Error('staff_required'), { status: 403 });
  if (requireAal2 && String(payload.aal || 'aal1') !== 'aal2')
    throw Object.assign(new Error('mfa_required'), { status: 403 });
  return { token, payload, user, role };
}

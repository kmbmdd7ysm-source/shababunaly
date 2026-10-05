import crypto from 'node:crypto';

type ApiReq = { headers?: Record<string, string | string[] | undefined> };
type ApiRes = { setHeader: (name: string, value: string | string[]) => void };

export type CustomerSession = {
  id: string;
  email: string;
  exp: number;
  nonce: string;
};

const COOKIE = 'shababuna_customer_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const clean = (value: unknown, max = 5000): string =>
  String(value ?? '').trim().slice(0, max);

function secret(): string {
  const value = clean(process.env.SHABABUNA_AUTH_SECRET, 5000);
  if (value.length < 32) throw new Error('customer_auth_not_configured');
  return value;
}

function b64(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function sign(encoded: string): string {
  return crypto.createHmac('sha256', secret()).update(encoded).digest('base64url');
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function accountEmailHash(email: unknown): string {
  return crypto
    .createHash('sha256')
    .update(clean(email, 254).toLowerCase())
    .digest('hex');
}

export function accountPath(email: unknown): string {
  return `accounts/by-email/${accountEmailHash(email)}.json`;
}

export function accountIdPath(id: unknown): string {
  const safe = clean(id, 160).replace(/[^A-Za-z0-9._-]/g, '');
  if (!safe) throw new Error('invalid_account_id');
  return `accounts/by-id/${safe}.json`;
}

export function userStatePath(id: unknown): string {
  const safe = clean(id, 160).replace(/[^A-Za-z0-9._-]/g, '');
  if (!safe) throw new Error('invalid_account_id');
  return `users/${safe}/state.json`;
}

export function userAddressesPath(id: unknown): string {
  const safe = clean(id, 160).replace(/[^A-Za-z0-9._-]/g, '');
  if (!safe) throw new Error('invalid_account_id');
  return `users/${safe}/addresses.json`;
}

export function userOrderIndexPath(id: unknown): string {
  const safe = clean(id, 160).replace(/[^A-Za-z0-9._-]/g, '');
  if (!safe) throw new Error('invalid_account_id');
  return `users/${safe}/orders.json`;
}

export function orderPath(orderNumber: unknown): string {
  const safe = clean(orderNumber, 80).toUpperCase();
  if (!/^SHB-\d{8}-\d{7}$/.test(safe)) throw new Error('invalid_order_number');
  return `orders/${safe}.json`;
}

export function hashPassword(password: string): string {
  const value = String(password || '');
  if (value.length < 8 || value.length > 200) throw new Error('weak_password');
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(value, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString('base64url')}$${derived.toString('base64url')}`;
}

export function verifyPassword(password: string, stored: unknown): boolean {
  const [scheme, saltPart, hashPart, extra] = clean(stored, 1000).split('$');
  if (scheme !== 'scrypt' || !saltPart || !hashPart || extra) return false;
  try {
    const salt = Buffer.from(saltPart, 'base64url');
    const expected = Buffer.from(hashPart, 'base64url');
    const derived = crypto.scryptSync(String(password || ''), salt, expected.length, {
      N: 16384,
      r: 8,
      p: 1,
    });
    return expected.length === derived.length && crypto.timingSafeEqual(expected, derived);
  } catch {
    return false;
  }
}

export function createSessionToken(input: { id: string; email: string }): string {
  const payload = b64(
    JSON.stringify({
      id: clean(input.id, 160),
      email: clean(input.email, 254).toLowerCase(),
      exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS,
      nonce: crypto.randomUUID(),
    }),
  );
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: unknown): CustomerSession | null {
  const [payload, signature, extra] = clean(token, 8000).split('.');
  if (!payload || !signature || extra) return null;
  const expected = sign(payload);
  if (!safeEqual(signature, expected)) return null;
  let data: Partial<CustomerSession>;
  try {
    data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Partial<CustomerSession>;
  } catch {
    return null;
  }
  const id = clean(data.id, 160);
  const email = clean(data.email, 254).toLowerCase();
  const exp = Number(data.exp);
  const nonce = clean(data.nonce, 200);
  if (!id || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !nonce) return null;
  if (!Number.isFinite(exp) || exp <= Math.floor(Date.now() / 1000)) return null;
  return { id, email, exp, nonce };
}

function cookieHeader(req: ApiReq): string {
  const value = req.headers?.cookie;
  return Array.isArray(value) ? value.join('; ') : String(value || '');
}

export function sessionFromRequest(req: ApiReq): CustomerSession | null {
  const cookies = cookieHeader(req)
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean);
  const pair = cookies.find((entry) => entry.startsWith(`${COOKIE}=`));
  if (!pair) return null;
  return verifySessionToken(pair.slice(COOKIE.length + 1));
}

export function setSessionCookie(res: ApiRes, account: { id: string; email: string }): string {
  const token = createSessionToken(account);
  res.setHeader(
    'Set-Cookie',
    `${COOKIE}=${token}; Path=/; Max-Age=${MAX_AGE_SECONDS}; HttpOnly; Secure; SameSite=Lax`,
  );
  return token;
}

export function clearSessionCookie(res: ApiRes): void {
  res.setHeader(
    'Set-Cookie',
    `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
  );
}

export function publicCustomer(account: Record<string, unknown>) {
  const metadata =
    account.metadata && typeof account.metadata === 'object'
      ? (account.metadata as Record<string, unknown>)
      : {};
  return {
    id: clean(account.id, 160),
    email: clean(account.email, 254).toLowerCase(),
    email_confirmed_at: account.emailConfirmedAt || account.createdAt || null,
    confirmed_at: account.emailConfirmedAt || account.createdAt || null,
    user_metadata: metadata,
    app_metadata: { provider: 'shababuna' },
  };
}

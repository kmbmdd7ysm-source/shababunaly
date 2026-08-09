import crypto from 'node:crypto';

const clean = (value, max = 5000) =>
  String(value ?? '')
    .trim()
    .slice(0, max);
const ORDER = /^(SHB|LHA)-\d{8}-\d{7}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function secret() {
  const value = clean(process.env.GUEST_ORDER_ACCESS_SECRET || process.env.CRON_SECRET, 5000);
  if (value.length < 32) throw new Error('guest_access_not_configured');
  return value;
}

export function normalizeGuestOrderNumber(value) {
  const orderNumber = clean(value, 40).toUpperCase();
  return ORDER.test(orderNumber) ? orderNumber : '';
}

export function normalizeGuestEmail(value) {
  const email = clean(value, 254).toLowerCase();
  return EMAIL.test(email) ? email : '';
}

export function guestEmailHash(email) {
  return crypto.createHash('sha256').update(normalizeGuestEmail(email)).digest('hex');
}

function signature(encoded) {
  return crypto.createHmac('sha256', secret()).update(encoded).digest('base64url');
}

export function createGuestOrderToken({ orderNumber, email, ttlSeconds = 1800 }) {
  const number = normalizeGuestOrderNumber(orderNumber);
  const normalizedEmail = normalizeGuestEmail(email);
  if (!number || !normalizedEmail) throw new Error('invalid_guest_access');
  const payload = Buffer.from(
    JSON.stringify({
      orderNumber: number,
      emailHash: guestEmailHash(normalizedEmail),
      exp:
        Math.floor(Date.now() / 1000) + Math.max(300, Math.min(86400, Number(ttlSeconds) || 1800)),
      nonce: crypto.randomUUID(),
    }),
  ).toString('base64url');
  return `${payload}.${signature(payload)}`;
}

export function verifyGuestOrderToken(token, expectedOrderNumber = '') {
  const [payload, provided, extra] = clean(token, 8000).split('.');
  if (!payload || !provided || extra) return null;
  const expected = signature(payload);
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return null;
  let data;
  try {
    data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  const number = normalizeGuestOrderNumber(data?.orderNumber);
  if (!number || (expectedOrderNumber && number !== normalizeGuestOrderNumber(expectedOrderNumber)))
    return null;
  if (!/^[0-9a-f]{64}$/i.test(String(data?.emailHash || ''))) return null;
  if (!Number.isFinite(Number(data?.exp)) || Number(data.exp) <= Math.floor(Date.now() / 1000))
    return null;
  return {
    orderNumber: number,
    emailHash: String(data.emailHash).toLowerCase(),
    exp: Number(data.exp),
  };
}

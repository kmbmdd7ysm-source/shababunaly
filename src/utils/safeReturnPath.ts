const ALLOWED_PREFIXES = [
  '/',
  '/checkout',
  '/cart',
  '/shop',
  '/products/',
  '/account',
  '/favorites',
  '/compare',
  '/help',
  '/order-tracking',
] as const;

export function safeInternalReturnPath(value: unknown, fallback = ''): string {
  if (typeof value !== 'string') return fallback;
  let decoded: string;
  if (value !== value.trim()) return fallback;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return fallback;
  }
  if (
    !decoded.startsWith('/') ||
    decoded.startsWith('//') ||
    decoded.includes('\\') ||
    [...decoded].some((character) => character.charCodeAt(0) < 32)
  ) {
    return fallback;
  }
  const url = new URL(decoded, 'https://lha.internal');
  const path = `${url.pathname}${url.search}${url.hash}`;
  const allowed = ALLOWED_PREFIXES.some((prefix) =>
    prefix === '/'
      ? path === '/'
      : path === prefix ||
        path.startsWith(`${prefix}/`) ||
        path.startsWith(`${prefix}?`) ||
        path.startsWith(`${prefix}#`) ||
        (prefix.endsWith('/') && path.startsWith(prefix)),
  );
  return allowed ? path : fallback;
}

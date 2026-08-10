const clean = (value: unknown, max = 5000): string =>
  String(value ?? '')
    .trim()
    .slice(0, max);

export async function verifyTurnstileToken(token: unknown, remoteIp = ''): Promise<boolean> {
  const secret = clean(process.env.TURNSTILE_SECRET_KEY, 5000);
  const testMode =
    process.env.NODE_ENV !== 'production' && process.env.TURNSTILE_TEST_MODE === 'true';
  if (testMode && token === 'test-pass') return true;
  if (!secret || !token) return false;
  const body = new URLSearchParams({
    secret,
    response: clean(token, 3000),
    remoteip: clean(remoteIp, 200),
  });
  const signal = AbortSignal.timeout(10000);
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      cache: 'no-store',
      signal,
    });
    if (!response.ok) return false;
    const result = (await response.json()) as { success?: boolean };
    return result.success === true;
  } catch {
    return false;
  }
}

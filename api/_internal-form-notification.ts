import { resolveFormspreeEndpoint } from './_formspree-endpoint.ts';

const clean = (value: unknown, max = 12000): string =>
  String(value ?? '').replace(/\0/g, '').trim().slice(0, max);

export async function sendInternalFormNotification(
  payload: Record<string, unknown>,
  subject: string,
): Promise<{ delivered: boolean; status?: number }> {
  const endpoint = resolveFormspreeEndpoint();
  if (!endpoint || !/^https:\/\//i.test(endpoint)) return { delivered: false };
  const params = new URLSearchParams();
  params.set('_subject', clean(subject, 180));
  params.set('_template', 'table');
  for (const [key, value] of Object.entries(payload)) {
    if (value == null) continue;
    const safeKey = key.replace(/[^A-Za-z0-9_.:-]/g, '_').slice(0, 80);
    if (!safeKey) continue;
    params.set(
      safeKey,
      typeof value === 'object' ? clean(JSON.stringify(value, null, 2)) : clean(value),
    );
  }
  const email = clean(payload.customerEmail || payload.email, 254);
  if (email) {
    params.set('email', email);
    params.set('_replyto', email);
  }
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'User-Agent': 'Shababuna-Commerce-Notification/1.0',
      },
      body: params.toString(),
      signal: AbortSignal.timeout(15000),
    });
    return { delivered: response.ok, status: response.status };
  } catch {
    return { delivered: false };
  }
}

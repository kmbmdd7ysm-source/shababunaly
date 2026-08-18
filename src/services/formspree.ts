import { integrations } from '../config/integrations.ts';

export const FORMSPREE_ENDPOINT = integrations.formspreeEndpoint;

type FormPayload = Record<string, unknown>;

const stringifyValue = (value: unknown): string => {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
    return String(value);
  return JSON.stringify(value);
};

function referenceOf(payload: FormPayload): string {
  return String(
    payload.referenceId ||
      payload.reference ||
      payload.orderNumber ||
      payload.quoteNumber ||
      payload.requestNumber ||
      crypto.randomUUID(),
  );
}

export function normalizeFormspreePayload(
  payload: FormPayload = {},
  subject = 'Shababuna website message',
): Record<string, string> {
  const customerEmail = String(payload.customerEmail || payload.email || '')
    .trim()
    .toLowerCase();
  const customerName = String(payload.customerName || payload.name || 'Shababuna customer');
  const details = String(payload.details || payload.description || payload.message || '');
  const normalized: Record<string, string> = {
    subject,
    _subject: subject,
    _template: 'table',
    request_type: String(payload.formType || payload.requestType || 'website'),
    reference_id: referenceOf(payload),
    name: customerName,
    customer_name: customerName,
    customer_email: customerEmail,
    phone: String(payload.phone || ''),
    whatsapp: String(payload.whatsapp || ''),
    country: String(payload.country || payload.countryCode || ''),
    message: details,
    details,
    amount: String(payload.amount ?? payload.total ?? payload.totalUsd ?? ''),
    currency: String(payload.currency || 'USD'),
    payment_method: String(payload.paymentMethod || ''),
    admin_order_url: String(payload.adminOrderUrl || ''),
    email: customerEmail,
    _replyto: customerEmail,
  };
  for (const [key, value] of Object.entries(payload)) {
    if (!(key in normalized) && key !== 'files') normalized[key] = stringifyValue(value);
  }
  return normalized;
}

async function postCanonicalFormspree(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const clean = Object.fromEntries(
    Object.entries(body)
      .filter(([key, value]) => key !== 'turnstileToken' && value != null)
      .map(([key, value]) => [key, stringifyValue(value)]),
  );

  // Customer browsers never post directly to a third-party inbox. The
  // Shababuna API is the sole browser-facing boundary so sanitization, abuse
  // controls, observability and provider changes stay server-side.
  const response = await fetch('/api/formspree', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(clean),
    credentials: 'same-origin',
    cache: 'no-store',
  });
  const result = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok || result.ok === false) {
    throw new Error(String(result.error || `formspree_${response.status}`));
  }
  return result;
}

export async function sendFormspree(
  payload: FormPayload,
  subject = 'Shababuna website message',
): Promise<Record<string, unknown>> {
  return postCanonicalFormspree(normalizeFormspreePayload(payload, subject));
}

async function encodeFile(file: File, role = 'additional_file') {
  const buffer = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  const chunk = 0x8000;
  for (let index = 0; index < buffer.length; index += chunk)
    binary += String.fromCharCode(...buffer.subarray(index, index + chunk));
  return { name: file.name, mime: file.type, base64: btoa(binary), role };
}

export async function sendFormspreeWithFiles(
  payload: FormPayload,
  files: Array<File | null | undefined> = [],
  subject = 'Shababuna website request',
): Promise<Record<string, unknown>> {
  if (!FORMSPREE_ENDPOINT) throw new Error('formspree_not_configured');
  const selected = files.filter(Boolean).slice(0, 5) as File[];
  const encoded = [];
  for (const file of selected) encoded.push(await encodeFile(file));
  const response = await fetch('/api/formspree-files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    credentials: 'same-origin',
    cache: 'no-store',
    body: JSON.stringify({
      ...normalizeFormspreePayload(payload, subject),
      files: encoded,
      turnstileToken: payload.turnstileToken || '',
    }),
  });
  const result = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok || result.ok === false)
    throw new Error(String(result.error || `formspree_files_${response.status}`));
  return result;
}

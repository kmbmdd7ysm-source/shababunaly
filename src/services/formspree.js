import { integrations } from '../config/integrations';

export const FORMSPREE_ENDPOINT = integrations.formspreeEndpoint;

const stringifyValue = (value) => {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
    return String(value);
  return JSON.stringify(value);
};

function referenceOf(payload) {
  return (
    payload?.referenceId ||
    payload?.reference ||
    payload?.orderNumber ||
    payload?.quoteNumber ||
    payload?.requestNumber ||
    crypto.randomUUID()
  );
}

export function normalizeFormspreePayload(payload = {}, subject = 'Shababuna website message') {
  const customerEmail = String(payload.customerEmail || payload.email || '')
    .trim()
    .toLowerCase();
  const normalized = {
    _subject: subject,
    _template: 'table',
    request_type: payload.formType || payload.requestType || 'website',
    reference_id: referenceOf(payload),
    customer_name: payload.customerName || payload.name || 'Shababuna customer',
    customer_email: customerEmail,
    phone: payload.phone || '',
    whatsapp: payload.whatsapp || '',
    country: payload.country || payload.countryCode || '',
    details: payload.details || payload.description || payload.message || '',
    amount: payload.amount ?? payload.total ?? payload.totalUsd ?? '',
    currency: payload.currency || 'USD',
    payment_method: payload.paymentMethod || '',
    admin_order_url: payload.adminOrderUrl || '',
    email: customerEmail,
    _replyto: customerEmail,
  };
  for (const [key, value] of Object.entries(payload)) {
    if (!(key in normalized) && key !== 'files') normalized[key] = stringifyValue(value);
  }
  return normalized;
}

async function postJson(body) {
  const response = await fetch('/api/formspree', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
    credentials: 'same-origin',
    cache: 'no-store',
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.ok === false)
    throw new Error(result.error || `formspree_${response.status}`);
  return result;
}

export async function sendFormspree(payload, subject = 'Shababuna website message') {
  return postJson(normalizeFormspreePayload(payload, subject));
}

async function encodeFile(file, role = 'additional_file') {
  const buffer = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  const chunk = 0x8000;
  for (let index = 0; index < buffer.length; index += chunk)
    binary += String.fromCharCode(...buffer.subarray(index, index + chunk));
  return { name: file.name, mime: file.type, base64: btoa(binary), role };
}

export async function sendFormspreeWithFiles(
  payload,
  files = [],
  subject = 'Shababuna website request',
) {
  if (!FORMSPREE_ENDPOINT) throw new Error('formspree_not_configured');
  const selected = files.filter(Boolean).slice(0, 5);
  const encoded = [];
  for (const file of selected) encoded.push(await encodeFile(file));
  const response = await fetch('/api/formspree-files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    credentials: 'same-origin',
    cache: 'no-store',
    body: JSON.stringify({
      payload: normalizeFormspreePayload(payload, subject),
      files: encoded,
      turnstileToken: payload.turnstileToken || '',
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.ok === false)
    throw new Error(result.error || `formspree_${response.status}`);
  return result;
}

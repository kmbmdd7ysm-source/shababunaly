import { getSupabase } from './supabase';

const ACCEPTED = new Map([
  ['image/jpeg', ['jpg', 'jpeg']],
  ['image/png', ['png']],
  ['image/webp', ['webp']],
  ['application/pdf', ['pdf']],
  ['text/csv', ['csv']],
  ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ['xlsx']],
]);
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_TOTAL_BYTES = 3 * 1024 * 1024;
const MAX_FILES = 5;

function extension(name) {
  return (
    String(name || '')
      .split('.')
      .pop()
      ?.toLowerCase() || ''
  );
}

function encodeFile(file, role) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('file_read_failed'));
    reader.onload = () =>
      resolve({
        name: file.name,
        mime: file.type,
        role,
        base64: String(reader.result || '').split(',')[1] || '',
      });
    reader.readAsDataURL(file);
  });
}

export function validateSpecialRequestFiles(productImage, additionalFiles = []) {
  const entries = [
    ...(productImage ? [{ file: productImage, role: 'product_image' }] : []),
    ...additionalFiles.map((file) => ({ file, role: 'additional_file' })),
  ];
  if (entries.length > MAX_FILES) throw new Error('too_many_files');
  let total = 0;
  for (const { file, role } of entries) {
    if (!(file instanceof File) || !file.size || file.size > MAX_FILE_BYTES)
      throw new Error('invalid_file_size');
    total += file.size;
    if (total > MAX_TOTAL_BYTES) throw new Error('files_too_large');
    const allowedExtensions = ACCEPTED.get(file.type);
    if (!allowedExtensions?.includes(extension(file.name)))
      throw new Error('unsupported_file_type');
    if (role === 'product_image' && !file.type.startsWith('image/'))
      throw new Error('product_image_must_be_image');
  }
  return entries;
}

export async function submitSpecialRequest({
  payload,
  productImage = null,
  additionalFiles = [],
  turnstileToken,
  accessToken = '',
}) {
  const entries = validateSpecialRequestFiles(productImage, additionalFiles);
  const files = await Promise.all(entries.map(({ file, role }) => encodeFile(file, role)));
  const response = await fetch('/api/special-request', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({
      ...payload,
      files,
      turnstileToken,
      idempotencyKey: crypto.randomUUID(),
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error(data.error || 'special_request_unavailable');
  return data.request;
}

export async function getMySpecialRequests() {
  const client = await getSupabase();
  if (!client) throw new Error('cloud_not_configured');
  const { data, error } = await client
    .from('special_requests')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function respondToSpecialRequest(requestId, decision, note = '') {
  const client = await getSupabase();
  if (!client) throw new Error('cloud_not_configured');
  const { data, error } = await client.rpc('customer_respond_special_request', {
    p_request_id: requestId,
    p_decision: decision,
    p_note: String(note || '').slice(0, 2000),
  });
  if (error) throw error;
  return data;
}

export async function startSpecialRequestPayment({ requestNumber, customerEmail, paymentMethod }) {
  const response = await fetch('/api/create-special-request-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    credentials: 'same-origin',
    cache: 'no-store',
    body: JSON.stringify({ requestNumber, customerEmail, paymentMethod }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.url) throw new Error(data.error || 'special_request_payment_failed');
  window.location.assign(data.url);
  return data;
}

import { getSupabase } from './supabase.ts';

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

async function authorizationHeader(): Promise<Record<string, string>> {
  const client = await getSupabase();
  if (!client) return {};
  const { data } = await client.auth.getSession();
  const token = data?.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function encodeFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('logo_file_read_failed'));
    reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
    reader.readAsDataURL(file);
  });
}

export function validateCustomLogo(file: File): void {
  if (!(file instanceof File) || !file.size || file.size > MAX_LOGO_BYTES)
    throw new Error('invalid_logo_size');
  if (!ALLOWED_LOGO_TYPES.has(file.type)) throw new Error('unsupported_logo_type');
  const extension = String(file.name || '').split('.').pop()?.toLowerCase() || '';
  const allowedExtension =
    (file.type === 'image/jpeg' && ['jpg', 'jpeg'].includes(extension)) ||
    (file.type === 'image/png' && extension === 'png') ||
    (file.type === 'image/webp' && extension === 'webp');
  if (!allowedExtension) throw new Error('logo_extension_mismatch');
}

export async function uploadCustomDesignAsset({
  file,
  idempotencyKey,
  turnstileToken,
}: {
  file: File;
  idempotencyKey: string;
  turnstileToken?: string;
}): Promise<{ id: string; scanStatus: string; name: string }> {
  validateCustomLogo(file);
  if (!/^[0-9a-f-]{36}$/i.test(idempotencyKey)) throw new Error('invalid_idempotency_key');
  const base64 = await encodeFile(file);
  const response = await fetch('/api/custom-design-asset', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(await authorizationHeader()),
    },
    credentials: 'same-origin',
    cache: 'no-store',
    body: JSON.stringify({
      idempotencyKey,
      turnstileToken,
      files: [{ name: file.name, mime: file.type, base64, role: 'additional_file' }],
    }),
  });
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown> & {
    asset?: Record<string, unknown>;
    error?: string;
  };
  if (!response.ok || !data.asset?.id) throw new Error(String(data.error || 'custom_logo_upload_failed'));
  return {
    id: String(data.asset.id),
    scanStatus: String(data.asset.scan_status || data.asset.scanStatus || 'quarantined'),
    name: String(data.asset.original_name || file.name),
  };
}

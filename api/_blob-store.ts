type JsonValue = Record<string, unknown> | unknown[] | string | number | boolean | null;

const BLOB_API = 'https://vercel.com/api/blob';
const API_VERSION = '12';

const clean = (value: unknown, max = 10_000): string =>
  String(value ?? '').trim().slice(0, max);

function credentials() {
  const token = clean(process.env.BLOB_READ_WRITE_TOKEN, 20_000);
  if (!token) throw new Error('blob_not_configured');
  const parts = token.split('_');
  const storeId = clean(parts[3], 200);
  if (!storeId) throw new Error('blob_store_id_missing');
  return { token, storeId };
}

function safePath(pathname: string): string {
  const path = clean(pathname, 900).replace(/^\/+/, '');
  if (!path || path.includes('..') || path.includes('//')) throw new Error('invalid_blob_path');
  return path;
}

function directUrl(pathname: string, storeId: string): string {
  return `https://${storeId}.private.blob.vercel-storage.com/${safePath(pathname)
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')}`;
}

function apiHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const { token, storeId } = credentials();
  return {
    Authorization: `Bearer ${token}`,
    'x-vercel-blob-store-id': storeId,
    'x-api-version': API_VERSION,
    ...extra,
  };
}

async function jsonBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export type BlobJsonRead<T = Record<string, unknown>> = {
  value: T | null;
  etag: string | null;
};

export async function readBlobJson<T = Record<string, unknown>>(
  pathname: string,
): Promise<BlobJsonRead<T>> {
  const { token, storeId } = credentials();
  const url = new URL(directUrl(pathname, storeId));
  url.searchParams.set('cache', '0');
  const response = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(12_000),
  });
  if (response.status === 404) return { value: null, etag: null };
  if (!response.ok) throw new Error(`blob_read_${response.status}`);
  const value = (await response.json()) as T;
  return { value, etag: response.headers.get('etag') };
}

export async function writeBlobJson(
  pathname: string,
  value: JsonValue,
  options: { ifMatch?: string | null; allowOverwrite?: boolean } = {},
): Promise<{ etag: string | null; pathname: string }> {
  const path = safePath(pathname);
  const params = new URLSearchParams({ pathname: path });
  const response = await fetch(`${BLOB_API}/?${params.toString()}`, {
    method: 'PUT',
    headers: apiHeaders({
      'x-vercel-blob-access': 'private',
      'x-add-random-suffix': '0',
      'x-allow-overwrite': options.allowOverwrite === false ? '0' : '1',
      'x-content-type': 'application/json; charset=utf-8',
      ...(options.ifMatch ? { 'x-if-match': options.ifMatch } : {}),
    }),
    body: JSON.stringify(value),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    const error = new Error(`blob_write_${response.status}`) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  const body = (await jsonBody(response)) as Record<string, unknown> | null;
  return {
    etag: clean(body?.etag) || response.headers.get('etag'),
    pathname: clean(body?.pathname) || path,
  };
}

export async function deleteBlobJson(pathname: string): Promise<void> {
  const { storeId } = credentials();
  const url = directUrl(pathname, storeId);
  const response = await fetch(`${BLOB_API}/delete`, {
    method: 'POST',
    headers: apiHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ urls: [url] }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok && response.status !== 404) throw new Error(`blob_delete_${response.status}`);
}

export async function mutateBlobJson<T extends Record<string, unknown> | unknown[]>(
  pathname: string,
  initialValue: T,
  mutate: (current: T) => T,
  attempts = 5,
): Promise<T> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const current = await readBlobJson<T>(pathname);
    const next = mutate(current.value ?? initialValue);
    try {
      await writeBlobJson(pathname, next, {
        ifMatch: current.etag,
        allowOverwrite: Boolean(current.value),
      });
      return next;
    } catch (error) {
      const status =
        error && typeof error === 'object' && 'status' in error
          ? Number((error as { status?: unknown }).status)
          : 0;
      if (![409, 412].includes(status) || attempt === attempts - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 30 * (attempt + 1)));
    }
  }
  throw new Error('blob_mutation_failed');
}

export function blobStoreConfigured(): boolean {
  try {
    return Boolean(credentials().token);
  } catch {
    return false;
  }
}

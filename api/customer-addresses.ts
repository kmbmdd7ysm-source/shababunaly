import crypto from 'node:crypto';
import { applyApiHeaders, guardPublicPost } from './_request-security.js';
import { mutateBlobJson, readBlobJson } from './_blob-store.js';
import { sessionFromRequest, userAddressesPath } from './_customer-session.js';

type ApiReq = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
};
type ApiRes = {
  setHeader: (name: string, value: string | string[]) => void;
  status: (code: number) => { json: (body: unknown) => unknown };
};

type Address = Record<string, unknown> & {
  id: string;
  user_id: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

const clean = (value: unknown, max = 500): string =>
  String(value ?? '').replace(/[<>\0]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);

function normalizeAddress(source: Record<string, unknown>, userId: string, existing?: Address): Address {
  const now = new Date().toISOString();
  const first = clean(source.first_name ?? source.firstName, 80);
  const last = clean(source.last_name ?? source.lastName, 80);
  const line1 = clean(source.address_line_1 ?? source.line1 ?? source.addressLine1, 180);
  const city = clean(source.city, 100);
  const country = clean(source.country, 2).toUpperCase();
  if (!first || !last || !line1 || !city || !/^[A-Z]{2}$/.test(country)) {
    throw new Error('invalid_address');
  }
  return {
    id: existing?.id || crypto.randomUUID(),
    user_id: userId,
    label: clean(source.label, 40) || 'Home',
    first_name: first,
    last_name: last,
    company: clean(source.company, 120) || null,
    address_line_1: line1,
    address_line_2: clean(source.address_line_2 ?? source.line2 ?? source.addressLine2, 180) || null,
    line1,
    line2: clean(source.address_line_2 ?? source.line2 ?? source.addressLine2, 180) || null,
    city,
    region: clean(source.region ?? source.state, 100),
    postal_code: clean(source.postal_code ?? source.postalCode, 24),
    country,
    phone: clean(source.phone, 40) || null,
    is_default: Boolean(source.is_default ?? source.isDefault),
    created_at: existing?.created_at || now,
    updated_at: now,
  };
}

export default async function handler(req: ApiReq, res: ApiRes) {
  applyApiHeaders(res);
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  const session = sessionFromRequest(req);
  if (!session) return res.status(401).json({ ok: false, error: 'authentication_required' });
  const pathname = userAddressesPath(session.id);

  if (req.method === 'GET') {
    try {
      const { value } = await readBlobJson<Address[]>(pathname);
      const rows = Array.isArray(value) ? value : [];
      rows.sort((a, b) => Number(Boolean(b.is_default)) - Number(Boolean(a.is_default)));
      return res.status(200).json({ ok: true, addresses: rows });
    } catch {
      return res.status(503).json({ ok: false, error: 'addresses_unavailable' });
    }
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  if (
    !(await guardPublicPost(req, res, {
      maxBytes: 32_000,
      limit: 40,
      windowMs: 10 * 60_000,
      bucket: 'customer-addresses',
      honeypot: false,
      allowEphemeralFallback: true,
    }))
  ) return;

  try {
    const body =
      req.body && typeof req.body === 'object'
        ? (req.body as Record<string, unknown>)
        : {};
    const action = clean(body.action, 30).toLowerCase();
    const id = clean(body.id, 100);

    const rows = await mutateBlobJson<Address[]>(pathname, [], (current) => {
      const list = Array.isArray(current) ? [...current] : [];

      if (action === 'delete') {
        const next = list.filter((row) => row.id !== id);
        if (next.length && !next.some((row) => row.is_default)) next[0] = { ...next[0], is_default: true };
        return next;
      }

      if (action === 'default') {
        if (!list.some((row) => row.id === id)) throw new Error('address_not_found');
        return list.map((row) => ({
          ...row,
          is_default: row.id === id,
          updated_at: row.id === id ? new Date().toISOString() : row.updated_at,
        }));
      }

      if (action === 'save') {
        const source =
          body.address && typeof body.address === 'object'
            ? (body.address as Record<string, unknown>)
            : {};
        const existing = id ? list.find((row) => row.id === id) : undefined;
        const record = normalizeAddress(source, session.id, existing);
        let next = existing
          ? list.map((row) => (row.id === id ? record : row))
          : [record, ...list].slice(0, 30);
        if (record.is_default) {
          next = next.map((row) => ({ ...row, is_default: row.id === record.id }));
        } else if (next.length && !next.some((row) => row.is_default)) {
          next[0] = { ...next[0], is_default: true };
        }
        return next;
      }

      throw new Error('invalid_action');
    });

    const selected =
      action === 'save'
        ? rows.find((row) => row.id === id) || rows[0] || null
        : null;
    return res.status(200).json({ ok: true, addresses: rows, address: selected });
  } catch (error: unknown) {
    const message =
      error && typeof error === 'object' && 'message' in error
        ? String((error as { message?: unknown }).message || '')
        : String(error || '');
    const client = /invalid_|not_found/.test(message);
    return res.status(client ? 400 : 503).json({
      ok: false,
      error: client ? message : 'addresses_unavailable',
    });
  }
}

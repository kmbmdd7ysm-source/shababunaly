import { reportClientError } from '../telemetry';
import { getSupabase } from '../supabase';
import { getAddressRequirements, normalizeCountryCode } from '../../data/countries';

type AddressRow = Record<string, unknown> & {
  id?: string;
  user_id?: string;
  label?: string;
  first_name?: string;
  last_name?: string;
  company?: string | null;
  address_line_1?: string;
  address_line_2?: string | null;
  line1?: string;
  line2?: string | null;
  city?: string;
  region?: string;
  postal_code?: string;
  country?: string;
  phone?: string | null;
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
};

type AddressInput = {
  label?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  company?: unknown;
  addressLine1?: unknown;
  addressLine2?: unknown;
  city?: unknown;
  region?: unknown;
  postalCode?: unknown;
  country?: unknown;
  phone?: unknown;
  isDefault?: unknown;
};

type NormalizedAddress = {
  label: string;
  first_name: string;
  last_name: string;
  company: string | null;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  region: string;
  postal_code: string;
  country: string;
  phone: string | null;
  is_default: boolean;
};

const allowLocalPersistence =
  Boolean(import.meta.env.DEV) ||
  ['localhost', '127.0.0.1'].includes(globalThis.location?.hostname || '');

const clean = (value: unknown): string =>
  String(value ?? '')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const localKey = (userId: string): string => `shababuna-addresses-v2:${userId}`;

const readLocal = (userId: string): AddressRow[] => {
  if (!allowLocalPersistence) return [];
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(localKey(userId)) || '[]');
    return Array.isArray(parsed) ? (parsed as AddressRow[]) : [];
  } catch {
    return [];
  }
};

const writeLocal = (userId: string, rows: AddressRow[]): void => {
  if (allowLocalPersistence) localStorage.setItem(localKey(userId), JSON.stringify(rows));
};

const now = (): string => new Date().toISOString();

const normalizeRow = (row: AddressRow = {}): AddressRow => ({
  ...row,
  address_line_1: String(row.address_line_1 || row.line1 || ''),
  address_line_2: (row.address_line_2 || row.line2 || null) as string | null,
});

const cloudPayload = (value: NormalizedAddress, userId: string) => ({
  user_id: userId,
  label: value.label,
  first_name: value.first_name,
  last_name: value.last_name,
  company: value.company,
  line1: value.address_line_1,
  line2: value.address_line_2,
  city: value.city,
  region: value.region,
  postal_code: value.postal_code,
  country: value.country,
  phone: value.phone,
  is_default: value.is_default,
  updated_at: now(),
});

export function normalizeAddress(input: AddressInput | Record<string, unknown>): NormalizedAddress {
  const source = input as AddressInput;
  return {
    label: clean(source.label).slice(0, 40) || 'Home',
    first_name: clean(source.firstName).slice(0, 80),
    last_name: clean(source.lastName).slice(0, 80),
    company: clean(source.company).slice(0, 120) || null,
    address_line_1: clean(source.addressLine1).slice(0, 180),
    address_line_2: clean(source.addressLine2).slice(0, 180) || null,
    city: clean(source.city).slice(0, 100),
    region: clean(source.region).slice(0, 100),
    postal_code: clean(source.postalCode).slice(0, 24),
    country: normalizeCountryCode(clean(source.country)),
    phone: clean(source.phone).slice(0, 30) || null,
    is_default: Boolean(source.isDefault),
  };
}

export function validateAddress(input: AddressInput | Record<string, unknown>): {
  value: NormalizedAddress;
  errors: Record<string, string>;
  valid: boolean;
} {
  const address = normalizeAddress(input);
  const errors: Record<string, string> = {};
  const required: Array<[keyof NormalizedAddress, string]> = [
    ['first_name', 'firstName'],
    ['last_name', 'lastName'],
    ['address_line_1', 'addressLine1'],
    ['city', 'city'],
    ['country', 'country'],
  ];
  for (const [key, label] of required) {
    if (!address[key]) errors[label] = 'required';
  }
  const requirements = getAddressRequirements(address.country) as
    | { regionRequired?: boolean; postalCodeRequired?: boolean }
    | null
    | undefined;
  if (!requirements) errors.country = 'invalid';
  if (requirements?.regionRequired && !address.region) errors.region = 'required';
  if (requirements?.postalCodeRequired && !address.postal_code) errors.postalCode = 'required';
  if (address.country === 'US' && address.postal_code && !/^\d{5}(-\d{4})?$/.test(address.postal_code)) {
    errors.postalCode = 'invalid';
  }
  if (
    address.country === 'CA' &&
    address.postal_code &&
    !/^[A-Z]\d[A-Z][ -]?\d[A-Z]\d$/i.test(address.postal_code)
  ) {
    errors.postalCode = 'invalid';
  }
  return { value: address, errors, valid: Object.keys(errors).length === 0 };
}

async function cloud(): Promise<Awaited<ReturnType<typeof getSupabase>>> {
  const client = await getSupabase();
  if (!client && !allowLocalPersistence) {
    throw Object.assign(new Error('cloud_not_configured'), { code: 'CLOUD_REQUIRED' });
  }
  return client;
}

function localSave(userId: string, value: NormalizedAddress, id?: string): AddressRow {
  let rows = readLocal(userId);
  if (value.is_default) rows = rows.map((row) => ({ ...row, is_default: false }));
  const record: AddressRow = {
    ...value,
    id: id || globalThis.crypto?.randomUUID?.() || `addr-${Date.now()}`,
    user_id: userId,
    updated_at: now(),
    created_at: rows.find((row) => row.id === id)?.created_at || now(),
  };
  rows = id ? rows.map((row) => (row.id === id ? record : row)) : [record, ...rows];
  if (!rows.some((row) => row.is_default)) {
    rows = rows.map((row, index) => (index === 0 ? { ...row, is_default: true } : row));
  }
  writeLocal(userId, rows);
  return record;
}

export async function listAddresses(
  userId: string,
  options: { signal?: AbortSignal } = {},
): Promise<AddressRow[]> {
  const client = await cloud();
  if (!client) {
    return readLocal(userId).sort((a, b) => Number(b.is_default) - Number(a.is_default));
  }
  try {
    let query = client
      .from('addresses')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('updated_at', { ascending: false });
    const queryWithAbort = query as { abortSignal?: (signal: AbortSignal) => typeof query };
    if (options.signal && typeof queryWithAbort.abortSignal === 'function') {
      query = queryWithAbort.abortSignal(options.signal);
    }
    const { data, error } = await query;
    if (error) throw error;
    const normalized = ((data || []) as AddressRow[]).map(normalizeRow);
    if (normalized.length && allowLocalPersistence) writeLocal(userId, normalized);
    return normalized.length
      ? normalized
      : allowLocalPersistence
        ? readLocal(userId).map(normalizeRow)
        : [];
  } catch (error: unknown) {
    if (allowLocalPersistence) {
      const cached = readLocal(userId);
      if (cached.length) return cached;
    }
    throw error;
  }
}

export async function saveAddress(
  userId: string,
  input: AddressInput | Record<string, unknown>,
  id?: string,
): Promise<AddressRow> {
  const { value, errors, valid } = validateAddress(input);
  if (!valid) {
    throw Object.assign(new Error('Invalid address'), { code: 'VALIDATION', fields: errors });
  }
  const localRecord = allowLocalPersistence ? localSave(userId, value, id) : null;
  const client = await cloud();
  if (!client) {
    if (!localRecord) throw new Error('address_save_unavailable');
    return localRecord;
  }
  try {
    if (value.is_default) {
      const { error } = await client
        .from('addresses')
        .update({ is_default: false, updated_at: now() })
        .eq('user_id', userId)
        .eq('is_default', true);
      if (error) throw error;
    }
    const payload = cloudPayload(value, userId);
    const query = id
      ? client.from('addresses').update(payload).eq('id', id).eq('user_id', userId)
      : client.from('addresses').insert(payload);
    const { data, error } = await query.select().single();
    if (error) throw error;
    if (allowLocalPersistence && localRecord) {
      const rows = readLocal(userId).map((row) =>
        row.id === localRecord.id ? (data as AddressRow) : row,
      );
      writeLocal(userId, rows);
    }
    return normalizeRow((data || {}) as AddressRow);
  } catch (error: unknown) {
    reportClientError(error, { source: 'address_save_cloud' });
    if (allowLocalPersistence && localRecord) return localRecord;
    throw error;
  }
}

export async function deleteAddress(userId: string, id: string): Promise<void> {
  if (allowLocalPersistence) {
    writeLocal(
      userId,
      readLocal(userId).filter((row) => row.id !== id),
    );
  }
  const client = await cloud();
  if (!client) return;
  const { error } = await client.from('addresses').delete().eq('id', id).eq('user_id', userId);
  if (error) {
    reportClientError(error, { source: 'address_delete_cloud' });
    throw error;
  }
}

export async function setDefaultAddress(userId: string, id: string): Promise<AddressRow[]> {
  if (allowLocalPersistence) {
    const rows = readLocal(userId).map((row) => ({
      ...row,
      is_default: row.id === id,
      updated_at: now(),
    }));
    writeLocal(userId, rows);
  }
  const client = await cloud();
  if (client) {
    try {
      await client
        .from('addresses')
        .update({ is_default: false, updated_at: now() })
        .eq('user_id', userId);
      const { error } = await client
        .from('addresses')
        .update({ is_default: true, updated_at: now() })
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
    } catch (error: unknown) {
      reportClientError(error, { source: 'address_default_cloud' });
      if (!allowLocalPersistence) throw error;
    }
  }
  return listAddresses(userId);
}

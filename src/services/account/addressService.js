import { reportClientError } from '../telemetry';
import { getSupabase } from '../supabase';
import { getAddressRequirements, normalizeCountryCode } from '../../data/countries';

const allowLocalPersistence =
  Boolean(import.meta.env.DEV) ||
  ['localhost', '127.0.0.1'].includes(globalThis.location?.hostname || '');
const clean = (v) =>
  String(v ?? '')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
const localKey = (userId) => `shababuna-addresses-v2:${userId}`;
const readLocal = (userId) => {
  if (!allowLocalPersistence) return [];
  try {
    return JSON.parse(localStorage.getItem(localKey(userId)) || '[]');
  } catch {
    return [];
  }
};
const writeLocal = (userId, rows) => {
  if (allowLocalPersistence) localStorage.setItem(localKey(userId), JSON.stringify(rows));
};
const now = () => new Date().toISOString();
const normalizeRow = (row = {}) => ({
  ...row,
  address_line_1: row.address_line_1 || row.line1 || '',
  address_line_2: row.address_line_2 || row.line2 || null,
});
const cloudPayload = (value, userId) => ({
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

export function normalizeAddress(input) {
  return {
    label: clean(input.label).slice(0, 40) || 'Home',
    first_name: clean(input.firstName).slice(0, 80),
    last_name: clean(input.lastName).slice(0, 80),
    company: clean(input.company).slice(0, 120) || null,
    address_line_1: clean(input.addressLine1).slice(0, 180),
    address_line_2: clean(input.addressLine2).slice(0, 180) || null,
    city: clean(input.city).slice(0, 100),
    region: clean(input.region).slice(0, 100),
    postal_code: clean(input.postalCode).slice(0, 24),
    country: normalizeCountryCode(clean(input.country)),
    phone: clean(input.phone).slice(0, 30) || null,
    is_default: Boolean(input.isDefault),
  };
}
export function validateAddress(input) {
  const a = normalizeAddress(input),
    errors = {};
  for (const [k, label] of [
    ['first_name', 'firstName'],
    ['last_name', 'lastName'],
    ['address_line_1', 'addressLine1'],
    ['city', 'city'],
    ['country', 'country'],
  ])
    if (!a[k]) errors[label] = 'required';
  const requirements = getAddressRequirements(a.country);
  if (!requirements) errors.country = 'invalid';
  if (requirements?.regionRequired && !a.region) errors.region = 'required';
  if (requirements?.postalCodeRequired && !a.postal_code) errors.postalCode = 'required';
  if (a.country === 'US' && a.postal_code && !/^\d{5}(-\d{4})?$/.test(a.postal_code))
    errors.postalCode = 'invalid';
  if (a.country === 'CA' && a.postal_code && !/^[A-Z]\d[A-Z][ -]?\d[A-Z]\d$/i.test(a.postal_code))
    errors.postalCode = 'invalid';
  return { value: a, errors, valid: Object.keys(errors).length === 0 };
}
async function cloud() {
  const client = await getSupabase();
  if (!client && !allowLocalPersistence)
    throw Object.assign(new Error('cloud_not_configured'), { code: 'CLOUD_REQUIRED' });
  return client;
}
function localSave(userId, value, id) {
  let rows = readLocal(userId);
  if (value.is_default) rows = rows.map((row) => ({ ...row, is_default: false }));
  const record = {
    ...value,
    id: id || crypto.randomUUID?.() || `addr-${Date.now()}`,
    user_id: userId,
    updated_at: now(),
    created_at: rows.find((r) => r.id === id)?.created_at || now(),
  };
  rows = id ? rows.map((row) => (row.id === id ? record : row)) : [record, ...rows];
  if (!rows.some((row) => row.is_default))
    rows = rows.map((row, index) => (index === 0 ? { ...row, is_default: true } : row));
  writeLocal(userId, rows);
  return record;
}
export async function listAddresses(userId, options = {}) {
  const s = await cloud();
  if (!s) return readLocal(userId).sort((a, b) => Number(b.is_default) - Number(a.is_default));
  try {
    let query = s
      .from('addresses')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('updated_at', { ascending: false });
    if (options.signal && typeof query.abortSignal === 'function')
      query = query.abortSignal(options.signal);
    const { data, error } = await query;
    if (error) throw error;
    const normalized = (data || []).map(normalizeRow);
    if (normalized.length && allowLocalPersistence) writeLocal(userId, normalized);
    return normalized.length
      ? normalized
      : allowLocalPersistence
        ? readLocal(userId).map(normalizeRow)
        : [];
  } catch (error) {
    if (allowLocalPersistence) {
      const cached = readLocal(userId);
      if (cached.length) return cached;
    }
    throw error;
  }
}
export async function saveAddress(userId, input, id) {
  const { value, errors, valid } = validateAddress(input);
  if (!valid) throw Object.assign(Error('Invalid address'), { code: 'VALIDATION', fields: errors });
  const localRecord = allowLocalPersistence ? localSave(userId, value, id) : null;
  const s = await cloud();
  if (!s) return localRecord;
  try {
    if (value.is_default) {
      const { error } = await s
        .from('addresses')
        .update({ is_default: false, updated_at: now() })
        .eq('user_id', userId)
        .eq('is_default', true);
      if (error) throw error;
    }
    const payload = cloudPayload(value, userId);
    const query = id
      ? s.from('addresses').update(payload).eq('id', id).eq('user_id', userId)
      : s.from('addresses').insert(payload);
    const { data, error } = await query.select().single();
    if (error) throw error;
    if (allowLocalPersistence && localRecord) {
      const rows = readLocal(userId).map((row) => (row.id === localRecord.id ? data : row));
      writeLocal(userId, rows);
    }
    return normalizeRow(data);
  } catch (error) {
    reportClientError(error, { source: 'address_save_cloud' });
    if (allowLocalPersistence && localRecord) return localRecord;
    throw error;
  }
}
export async function deleteAddress(userId, id) {
  if (allowLocalPersistence)
    writeLocal(
      userId,
      readLocal(userId).filter((row) => row.id !== id),
    );
  const s = await cloud();
  if (!s) return;
  const { error } = await s.from('addresses').delete().eq('id', id).eq('user_id', userId);
  if (error) {
    reportClientError(error, { source: 'address_delete_cloud' });
    throw error;
  }
}
export async function setDefaultAddress(userId, id) {
  if (allowLocalPersistence) {
    const rows = readLocal(userId).map((row) => ({
      ...row,
      is_default: row.id === id,
      updated_at: now(),
    }));
    writeLocal(userId, rows);
  }
  const s = await cloud();
  if (s) {
    try {
      await s
        .from('addresses')
        .update({ is_default: false, updated_at: now() })
        .eq('user_id', userId);
      const { error } = await s
        .from('addresses')
        .update({ is_default: true, updated_at: now() })
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
    } catch (error) {
      reportClientError(error, { source: 'address_default_cloud' });
      if (!allowLocalPersistence) throw error;
    }
  }
  return listAddresses(userId);
}

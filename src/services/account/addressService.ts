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

const clean = (value: unknown): string =>
  String(value ?? '')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeRow = (row: AddressRow = {}): AddressRow => ({
  ...row,
  address_line_1: String(row.address_line_1 || row.line1 || ''),
  address_line_2: (row.address_line_2 || row.line2 || null) as string | null,
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

async function api(body?: Record<string, unknown>): Promise<Record<string, unknown>> {
  const response = await fetch('/api/customer-addresses', {
    method: body ? 'POST' : 'GET',
    credentials: 'same-origin',
    headers: body
      ? { 'Content-Type': 'application/json', Accept: 'application/json' }
      : { Accept: 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: 'no-store',
  });
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw Object.assign(new Error(String(payload.error || `addresses_${response.status}`)), {
      status: response.status,
    });
  }
  return payload;
}

export async function listAddresses(
  userId: string,
  options: { signal?: AbortSignal } = {},
): Promise<AddressRow[]> {
  if (!userId) return [];
  if (options.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  const payload = await api();
  return (Array.isArray(payload.addresses) ? payload.addresses : []).map((row) =>
    normalizeRow(row as AddressRow),
  );
}

export async function saveAddress(
  userId: string,
  input: AddressInput | Record<string, unknown>,
  id?: string,
): Promise<AddressRow> {
  if (!userId) throw new Error('authentication_required');
  const { value, errors, valid } = validateAddress(input);
  if (!valid) {
    throw Object.assign(new Error('Invalid address'), { code: 'VALIDATION', fields: errors });
  }
  const payload = await api({
    action: 'save',
    id: id || '',
    address: value,
  });
  return normalizeRow((payload.address || {}) as AddressRow);
}

export async function deleteAddress(userId: string, id: string): Promise<void> {
  if (!userId) return;
  await api({ action: 'delete', id });
}

export async function setDefaultAddress(userId: string, id: string): Promise<AddressRow[]> {
  if (!userId) return [];
  const payload = await api({ action: 'default', id });
  return (Array.isArray(payload.addresses) ? payload.addresses : []).map((row) =>
    normalizeRow(row as AddressRow),
  );
}

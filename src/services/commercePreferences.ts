import { commerceConfig, isSupportedDisplayCurrency } from '../config/commerce.ts';
import { isSupportedCountryCode, normalizeCountryCode } from '../data/countries.ts';
import type { Currency } from '../domain/types.ts';
import { safeRead, safeRemove, safeWrite, scopeKey } from './sync/storage.js';

const BASES = Object.freeze({
  currency: 'shababuna-display-currency',
  country: 'shababuna-checkout-country',
  pending: 'shababuna-commerce-channel-preference-pending',
});

export function normalizeCurrency(value: unknown): Currency {
  return isSupportedDisplayCurrency(value) ? value : commerceConfig.defaultDisplayCurrency;
}

export function hasCurrencyPreference(userId: string | null | undefined): boolean {
  return safeRead(scopeKey(BASES.currency, userId), null) != null;
}

export function hasCountryPreference(userId: string | null | undefined): boolean {
  return safeRead(scopeKey(BASES.country, userId), null) != null;
}

export function readCurrencyPreference(userId: string | null | undefined): Currency {
  return normalizeCurrency(
    safeRead(scopeKey(BASES.currency, userId), commerceConfig.defaultDisplayCurrency),
  );
}

export function writeCurrencyPreference(userId: string | null | undefined, value: unknown): boolean {
  return safeWrite(scopeKey(BASES.currency, userId), normalizeCurrency(value));
}

export function readCountryPreference(userId: string | null | undefined): string {
  return normalizeCountryCode(
    safeRead(scopeKey(BASES.country, userId), commerceConfig.defaultCountryCode),
  );
}

export function writeCountryPreference(userId: string | null | undefined, value: unknown): boolean {
  const code = isSupportedCountryCode(value)
    ? String(value).toUpperCase()
    : commerceConfig.defaultCountryCode;
  return safeWrite(scopeKey(BASES.country, userId), code);
}

export function writePendingCommercePreference(
  userId: string | null | undefined,
  patch: { preferredCurrency?: unknown; preferredCountry?: unknown },
): boolean {
  if (!userId) return false;
  const safePatch: { preferredCurrency?: Currency; preferredCountry?: string } = {};
  if (patch.preferredCurrency)
    safePatch.preferredCurrency = normalizeCurrency(patch.preferredCurrency);
  if (patch.preferredCountry && isSupportedCountryCode(patch.preferredCountry)) {
    safePatch.preferredCountry = String(patch.preferredCountry).toUpperCase();
  }
  return safeWrite(scopeKey(BASES.pending, userId), {
    ...safePatch,
    updatedAt: Date.now(),
  });
}

export function readPendingCommercePreference(userId: string | null | undefined): {
  preferredCurrency?: Currency;
  preferredCountry?: string;
  updatedAt: number;
} | null {
  if (!userId) return null;
  const value = safeRead<Record<string, unknown> | null>(scopeKey(BASES.pending, userId), null);
  if (!value || typeof value !== 'object') return null;
  const result: {
    preferredCurrency?: Currency;
    preferredCountry?: string;
    updatedAt: number;
  } = {
    updatedAt: Number(value.updatedAt) || 0,
  };
  if (value.preferredCurrency) result.preferredCurrency = normalizeCurrency(value.preferredCurrency);
  if (value.preferredCountry && isSupportedCountryCode(value.preferredCountry)) {
    result.preferredCountry = String(value.preferredCountry).toUpperCase();
  }
  return result;
}

export function clearPendingCommercePreference(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return safeRemove(scopeKey(BASES.pending, userId));
}

export function resolveCountryPreference({
  sessionCountry,
  selectedAddressCountry,
  defaultAddressCountry,
  profileCountry,
}: {
  sessionCountry?: unknown;
  selectedAddressCountry?: unknown;
  defaultAddressCountry?: unknown;
  profileCountry?: unknown;
}): string {
  const candidates = [
    sessionCountry,
    selectedAddressCountry,
    defaultAddressCountry,
    profileCountry,
  ];
  const firstValid = candidates.find(isSupportedCountryCode);
  return firstValid ? String(firstValid).toUpperCase() : commerceConfig.defaultCountryCode;
}

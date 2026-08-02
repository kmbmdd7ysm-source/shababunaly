import { commerceConfig, isSupportedDisplayCurrency } from '../config/commerce';
import { isSupportedCountryCode, normalizeCountryCode } from '../data/countries';
import { safeRead, safeRemove, safeWrite, scopeKey } from './sync/storage';

const BASES = Object.freeze({
  currency: 'shababuna-display-currency',
  country: 'shababuna-checkout-country',
  pending: 'shababuna-commerce-channel-preference-pending',
});

export function normalizeCurrency(value) {
  return isSupportedDisplayCurrency(value) ? value : commerceConfig.defaultDisplayCurrency;
}

export function hasCurrencyPreference(userId) {
  return safeRead(scopeKey(BASES.currency, userId), null) != null;
}

export function hasCountryPreference(userId) {
  return safeRead(scopeKey(BASES.country, userId), null) != null;
}

export function readCurrencyPreference(userId) {
  return normalizeCurrency(
    safeRead(scopeKey(BASES.currency, userId), commerceConfig.defaultDisplayCurrency),
  );
}

export function writeCurrencyPreference(userId, value) {
  return safeWrite(scopeKey(BASES.currency, userId), normalizeCurrency(value));
}

export function readCountryPreference(userId) {
  return normalizeCountryCode(
    safeRead(scopeKey(BASES.country, userId), commerceConfig.defaultCountryCode),
  );
}

export function writeCountryPreference(userId, value) {
  const code = isSupportedCountryCode(value)
    ? String(value).toUpperCase()
    : commerceConfig.defaultCountryCode;
  return safeWrite(scopeKey(BASES.country, userId), code);
}

export function writePendingCommercePreference(userId, patch) {
  if (!userId) return false;
  const safePatch = {};
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

export function readPendingCommercePreference(userId) {
  if (!userId) return null;
  const value = safeRead(scopeKey(BASES.pending, userId), null);
  if (!value || typeof value !== 'object') return null;
  return {
    preferredCurrency: value.preferredCurrency
      ? normalizeCurrency(value.preferredCurrency)
      : undefined,
    preferredCountry:
      value.preferredCountry && isSupportedCountryCode(value.preferredCountry)
        ? String(value.preferredCountry).toUpperCase()
        : undefined,
    updatedAt: Number(value.updatedAt) || 0,
  };
}

export function clearPendingCommercePreference(userId) {
  if (!userId) return false;
  return safeRemove(scopeKey(BASES.pending, userId));
}

export function resolveCountryPreference({
  sessionCountry,
  selectedAddressCountry,
  defaultAddressCountry,
  profileCountry,
}) {
  const candidates = [
    sessionCountry,
    selectedAddressCountry,
    defaultAddressCountry,
    profileCountry,
  ];
  const firstValid = candidates.find(isSupportedCountryCode);
  return firstValid ? String(firstValid).toUpperCase() : commerceConfig.defaultCountryCode;
}

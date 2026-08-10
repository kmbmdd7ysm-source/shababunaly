import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { commerceConfig, isSupportedDisplayCurrency } from '../config/commerce.ts';
import { fetchPublicShippingRates, fetchUsdToLydRate } from '../services/commerceSettings.ts';
import { isSupportedCountryCode, normalizeCountryCode } from '../data/countries.ts';
import { convertPrice, formatMoney } from '../services/money.ts';
import type { Currency } from '../domain/types.ts';
import {
  clearPendingCommercePreference,
  hasCountryPreference,
  hasCurrencyPreference,
  normalizeCurrency,
  readCountryPreference,
  readCurrencyPreference,
  readPendingCommercePreference,
  writeCountryPreference,
  writeCurrencyPreference,
  writePendingCommercePreference,
} from '../services/commercePreferences.ts';
import { fetchProfile, upsertProfile } from '../services/sync/cloudState.ts';
import { createChannel } from '../services/sync/storage.ts';
import { trackEvent } from '../utils/analytics.ts';
import { useAuth } from './AuthContext';

export type CommerceContextValue = {
  currency: Currency;
  setCurrency: (value: string, options?: { explicit?: boolean; persist?: boolean }) => void;
  countryCode: string;
  setCountryCode: (value: string, options?: { explicit?: boolean; persist?: boolean }) => void;
  preferenceStatus: string;
  convert: (amount: number | string, from?: string) => number;
  format: (amount: number | string, lang?: string, from?: string) => string;
  config: typeof commerceConfig;
  usdToLydRate: number;
  rateStatus: string;
  rateReady: boolean;
  shippingRates: Record<string, number>;
  shippingRatesStatus: string;
};

const CommerceContext = createContext<CommerceContextValue | null>(null);
const CLOUD_DEBOUNCE_MS = 800;

function validProfileCurrency(profile: Record<string, unknown> | null | undefined): string | null {
  const value = profile?.preferred_currency || profile?.preferredCurrency;
  return isSupportedDisplayCurrency(value) ? value : null;
}

function validProfileCountry(profile: Record<string, unknown> | null | undefined): string | null {
  const value = profile?.preferred_country || profile?.preferredCountry;
  return isSupportedCountryCode(value) ? String(value).toUpperCase() : null;
}

export function CommerceProvider({ children }: { children?: ReactNode }) {
  const auth = useAuth();
  const userId = auth.user?.id || null;
  const [currency, setCurrencyState] = useState<Currency>(() => readCurrencyPreference(null));
  const [countryCode, setCountryState] = useState<string>(() => readCountryPreference(null));
  const [preferenceStatus, setPreferenceStatus] = useState('local');
  // A safe public fallback is available immediately so selecting LYD can never
  // merely relabel an unconverted USD amount while the cloud setting loads.
  const [usdToLydRate, setUsdToLydRate] = useState<number>(commerceConfig.fallbackUsdToLydRate);
  const [rateStatus, setRateStatus] = useState('fallback');
  const [shippingRates, setShippingRates] = useState({});
  const [shippingRatesStatus, setShippingRatesStatus] = useState('idle');
  const channel = useRef<ReturnType<typeof createChannel> | null>(null);
  const cloudTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const generation = useRef(0);
  const explicitCurrency = useRef(false);
  const explicitCountry = useRef(false);

  useEffect(() => {
    // USD visitors already have every amount they need. Avoid booting the
    // cloud client on the anonymous home page; fetch the authoritative rate
    // only when LYD is actually selected or an authenticated profile needs it.
    if (currency !== 'LYD' && !userId) {
      setUsdToLydRate(commerceConfig.fallbackUsdToLydRate);
      setRateStatus('fallback');
      return undefined;
    }

    let active = true;
    setRateStatus('loading');
    fetchUsdToLydRate()
      .then((rate) => {
        if (!active) return;
        setUsdToLydRate(rate);
        setRateStatus('ready');
      })
      .catch(() => {
        if (!active) return;
        setUsdToLydRate(commerceConfig.fallbackUsdToLydRate);
        setRateStatus('fallback');
      });
    return () => {
      active = false;
    };
  }, [currency, userId]);

  useEffect(() => {
    const path = globalThis.location?.pathname || '/';
    const shouldLoad = /^\/checkout(?:\/|$)/.test(path) || (countryCode && countryCode !== 'LY');
    if (!shouldLoad) return undefined;
    let active = true;
    setShippingRatesStatus('loading');
    fetchPublicShippingRates()
      .then((rates) => {
        if (!active) return;
        setShippingRates(rates);
        setShippingRatesStatus('ready');
      })
      .catch(() => {
        if (!active) return;
        setShippingRates({});
        setShippingRatesStatus('error');
      });
    return () => {
      active = false;
    };
  }, [countryCode]);

  useEffect(() => {
    channel.current = createChannel('shababuna-commerce-channel', (message) => {
      if (message.scope !== (userId || 'guest')) return;
      if (message.type === 'currency') setCurrencyState(normalizeCurrency(message.payload));
      if (message.type === 'country') setCountryState(normalizeCountryCode(message.payload));
    });
    return () => channel.current?.close();
  }, [userId]);

  useEffect(() => {
    const currentGeneration = ++generation.current;
    clearTimeout(cloudTimer.current);
    explicitCurrency.current = false;
    explicitCountry.current = false;

    if (!userId) {
      setCurrencyState(readCurrencyPreference(null));
      setCountryState(readCountryPreference(null));
      setPreferenceStatus('local');
      return;
    }

    setCurrencyState(readCurrencyPreference(userId));
    setCountryState(readCountryPreference(userId));
    setPreferenceStatus('syncing');
    (fetchProfile(userId) as Promise<Record<string, unknown> | null>)
      .then((profile) => {
        if (generation.current !== currentGeneration || !profile) return;
        const cloudCurrency = validProfileCurrency(profile);
        const cloudCountry = validProfileCountry(profile);
        if (cloudCurrency && !explicitCurrency.current) {
          setCurrencyState(normalizeCurrency(cloudCurrency));
          writeCurrencyPreference(userId, cloudCurrency);
        }
        if (cloudCountry && !explicitCountry.current) {
          setCountryState(cloudCountry);
          writeCountryPreference(userId, cloudCountry);
        }
        setPreferenceStatus('synced');
      })
      .catch(() => {
        if (generation.current === currentGeneration) {
          setPreferenceStatus(globalThis.navigator?.onLine === false ? 'offline' : 'error');
        }
      });
  }, [userId]);

  useEffect(() => {
    // Geo defaults apply only before the visitor has made an explicit choice.
    if (hasCountryPreference(userId) || hasCurrencyPreference(userId)) return undefined;
    let active = true;
    let started = false;
    let controller: AbortController | undefined;

    const removeListeners = () => {
      globalThis.removeEventListener?.('pointerdown', startGeoLookup);
      globalThis.removeEventListener?.('touchstart', startGeoLookup);
      globalThis.removeEventListener?.('keydown', startGeoLookup);
    };

    function startGeoLookup() {
      if (started || !active) return;
      started = true;
      removeListeners();
      controller = new AbortController();
      fetch('/api/geo', { cache: 'no-store', signal: controller.signal })
        .then((response) => (response.ok ? response.json() : null))
        .then((geo) => {
          if (
            !active ||
            geo?.country !== 'LY' ||
            explicitCurrency.current ||
            explicitCountry.current
          )
            return;
          setCountryState('LY');
          setCurrencyState('LYD');
          writeCountryPreference(userId, 'LY');
          writeCurrencyPreference(userId, 'LYD');
        })
        .catch(() => {});
    }

    const needsImmediateGeo = /^\/checkout(?:\/|$)/.test(globalThis.location?.pathname || '');
    if (needsImmediateGeo) {
      startGeoLookup();
    } else {
      const options = { once: true, passive: true };
      globalThis.addEventListener?.('pointerdown', startGeoLookup, options);
      globalThis.addEventListener?.('touchstart', startGeoLookup, options);
      globalThis.addEventListener?.('keydown', startGeoLookup, { once: true });
    }

    return () => {
      active = false;
      removeListeners();
      controller?.abort();
    };
  }, [userId]);

  const persistCloud = useCallback(
    (patch: { preferredCurrency?: string; preferredCountry?: string }) => {
      if (!userId) return;
      clearTimeout(cloudTimer.current);
      if (globalThis.navigator?.onLine === false) {
        writePendingCommercePreference(userId, patch);
        setPreferenceStatus('offline');
        return;
      }
      setPreferenceStatus('syncing');
      cloudTimer.current = setTimeout(() => {
        void (async () => {
          try {
            const existing = ((await fetchProfile(userId)) as Record<string, unknown> | null) || {};
            await upsertProfile(userId, { ...existing, ...patch });
            clearPendingCommercePreference(userId);
            setPreferenceStatus('synced');
          } catch {
            setPreferenceStatus(globalThis.navigator?.onLine === false ? 'offline' : 'error');
          }
        })();
      }, CLOUD_DEBOUNCE_MS);
    },
    [userId],
  );

  useEffect(() => () => clearTimeout(cloudTimer.current), []);
  useEffect(() => {
    const onOnline = () => {
      if (userId && (preferenceStatus === 'offline' || preferenceStatus === 'error')) {
        const pending = readPendingCommercePreference(userId);
        persistCloud(pending || { preferredCurrency: currency, preferredCountry: countryCode });
      }
    };
    globalThis.addEventListener?.('online', onOnline);
    return () => globalThis.removeEventListener?.('online', onOnline);
  }, [userId, preferenceStatus, currency, countryCode, persistCloud]);

  const setCurrency = useCallback(
    (next: string) => {
      const valid = normalizeCurrency(next);
      explicitCurrency.current = true;
      setCurrencyState(valid);
      writeCurrencyPreference(userId, valid);
      channel.current?.post('currency', valid, { scope: userId || 'guest', version: Date.now() });
      persistCloud({ preferredCurrency: valid, preferredCountry: countryCode });
      trackEvent('currency_changed', { currency: valid });
    },
    [userId, countryCode, persistCloud],
  );

  const setCountryCode = useCallback(
    (next: string) => {
      const valid = normalizeCountryCode(next);
      explicitCountry.current = true;
      setCountryState(valid);
      writeCountryPreference(userId, valid);
      channel.current?.post('country', valid, { scope: userId || 'guest', version: Date.now() });
      persistCloud({ preferredCurrency: currency, preferredCountry: valid });
      trackEvent('country_changed', { country_code: valid });
    },
    [userId, currency, persistCloud],
  );

  const convert = useCallback(
    (amount: number | string, sourceCurrency: string = commerceConfig.baseCurrency) => {
      return Number(convertPrice(amount, sourceCurrency, currency, usdToLydRate) || 0);
    },
    [currency, usdToLydRate],
  );
  const format = useCallback(
    (
      amount: number | string,
      lang = 'en',
      sourceCurrency: string = commerceConfig.baseCurrency,
    ) => {
      if (sourceCurrency !== currency && !usdToLydRate)
        return lang === 'ar' ? 'السعر غير متاح' : 'Price unavailable';
      return formatMoney(
        convertPrice(amount, sourceCurrency, currency, usdToLydRate),
        currency,
        lang === 'ar' ? 'ar' : 'en',
      );
    },
    [currency, usdToLydRate],
  );

  const value = useMemo<CommerceContextValue>(
    () => ({
      currency,
      setCurrency,
      countryCode,
      setCountryCode,
      preferenceStatus,
      convert,
      format,
      config: commerceConfig,
      usdToLydRate,
      rateStatus,
      rateReady: rateStatus === 'ready' || rateStatus === 'fallback',
      shippingRates,
      shippingRatesStatus,
    }),
    [
      currency,
      setCurrency,
      countryCode,
      setCountryCode,
      preferenceStatus,
      convert,
      format,
      usdToLydRate,
      rateStatus,
      shippingRates,
      shippingRatesStatus,
    ],
  );
  return <CommerceContext.Provider value={value}>{children}</CommerceContext.Provider>;
}

export function useCommerce(): CommerceContextValue {
  const value = useContext(CommerceContext);
  if (!value) throw new Error('useCommerce must be used inside CommerceProvider');
  return value;
}

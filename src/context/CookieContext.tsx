import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { revokeAnalyticsConsent } from '../utils/analytics.ts';
import { STORAGE_KEYS } from '../config.ts';

type Consent = {
  necessary: boolean;
  analytics: boolean;
  updatedAt: string;
};

export type CookieContextValue = {
  consent: Consent | null;
  save: (analytics: boolean) => void;
  analyticsAllowed: boolean;
  preferencesOpen: boolean;
  openPreferences: () => void;
  closePreferences: () => void;
};

const CookieContext = createContext<CookieContextValue | null>(null);

function readConsent(): Consent | null {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.consent) || 'null') as Consent | null;
  } catch {
    return null;
  }
}

export function CookieProvider({ children }: { children?: ReactNode }) {
  const [consent, setConsent] = useState<Consent | null>(readConsent);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  const save = useCallback((analytics: boolean) => {
    const value: Consent = {
      necessary: true,
      analytics: Boolean(analytics),
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEYS.consent, JSON.stringify(value));
    setConsent(value);
    setPreferencesOpen(false);
    if (!value.analytics) revokeAnalyticsConsent();
  }, []);

  const openPreferences = useCallback(() => setPreferencesOpen(true), []);
  const closePreferences = useCallback(() => setPreferencesOpen(false), []);

  const value = useMemo<CookieContextValue>(
    () => ({
      consent,
      save,
      analyticsAllowed: Boolean(consent?.analytics),
      preferencesOpen,
      openPreferences,
      closePreferences,
    }),
    [consent, save, preferencesOpen, openPreferences, closePreferences],
  );

  return <CookieContext.Provider value={value}>{children}</CookieContext.Provider>;
}

export const useCookies = (): CookieContextValue => {
  const ctx = useContext(CookieContext);
  if (!ctx) {
    return {
      consent: null,
      save: () => undefined,
      analyticsAllowed: false,
      preferencesOpen: false,
      openPreferences: () => undefined,
      closePreferences: () => undefined,
    };
  }
  return ctx;
};

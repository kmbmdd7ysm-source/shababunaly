import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { revokeAnalyticsConsent } from '../utils/analytics';
import { STORAGE_KEYS } from '../config';

const CookieContext = createContext(null);

function readConsent() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.consent));
  } catch {
    return null;
  }
}

export function CookieProvider({ children }) {
  const [consent, setConsent] = useState(readConsent);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  const save = useCallback((analytics) => {
    const value = {
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

  const value = useMemo(
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

export const useCookies = () => useContext(CookieContext);

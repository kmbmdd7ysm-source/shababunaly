import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { translations } from '../data/translations';
import { STORAGE_KEYS } from '../config';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem(STORAGE_KEYS.language) || 'en');
  const setLang = useCallback((value) => setLangState(value === 'ar' ? 'ar' : 'en'), []);
  const pick = useCallback(
    (value) =>
      typeof value === 'object' && value ? (value[lang] ?? value.en ?? '') : (value ?? ''),
    [lang],
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.language, lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.body.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.getElementById('root')?.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    const skip = document.getElementById('skip-link');
    if (skip) skip.textContent = translations[lang].a11y.skip;
  }, [lang]);

  const value = useMemo(
    () => ({
      lang,
      dir: lang === 'ar' ? 'rtl' : 'ltr',
      setLang,
      t: translations[lang],
      pick,
    }),
    [lang, pick, setLang],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => useContext(LanguageContext);

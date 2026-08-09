import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { translations } from '../data/translations.js';
import { STORAGE_KEYS } from '../config.ts';

type Lang = 'en' | 'ar';
type LocaleValue = { en?: string; ar?: string } | string | null | undefined;

export type LanguageContextValue = {
  lang: Lang;
  dir: 'ltr' | 'rtl';
  setLang: (value: string) => void;
  t: Record<string, unknown>;
  pick: (value: LocaleValue) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children?: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(
    () => (localStorage.getItem(STORAGE_KEYS.language) === 'ar' ? 'ar' : 'en'),
  );
  const setLang = useCallback((value: string) => setLangState(value === 'ar' ? 'ar' : 'en'), []);
  const pick = useCallback(
    (value: LocaleValue) =>
      typeof value === 'object' && value
        ? String(value[lang] ?? value.en ?? '')
        : String(value ?? ''),
    [lang],
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.language, lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.body.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.getElementById('root')?.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    const skip = document.getElementById('skip-link');
    const pack = (translations as Record<string, { a11y?: { skip?: string } }>)[lang];
    if (skip && pack?.a11y?.skip) skip.textContent = pack.a11y.skip;
  }, [lang]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      dir: lang === 'ar' ? 'rtl' : 'ltr',
      setLang,
      t: (translations as Record<string, Record<string, unknown>>)[lang] || {},
      pick,
    }),
    [lang, pick, setLang],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useLanguage = (): LanguageContextValue => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    return {
      lang: 'en',
      dir: 'ltr',
      setLang: () => undefined,
      t: {},
      pick: (value) =>
        typeof value === 'object' && value ? String(value.en ?? '') : String(value ?? ''),
    };
  }
  return ctx;
};

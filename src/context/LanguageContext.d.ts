import type { ReactNode } from 'react';

export function useLanguage(): {
  lang: 'en' | 'ar' | string;
  dir: 'ltr' | 'rtl';
  setLang: (lang: string) => void;
  pick: (value: { en?: string; ar?: string } | string | null | undefined) => string;
  t: Record<string, unknown>;
};

export function LanguageProvider(props: { children?: ReactNode }): ReactNode;

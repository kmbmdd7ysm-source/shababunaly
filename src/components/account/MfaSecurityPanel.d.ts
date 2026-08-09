import type { ReactElement } from 'react';

export default function MfaSecurityPanel(props: {
  auth?: unknown;
  pick: (value: { en: string; ar: string }) => string;
  lang?: string;
  [key: string]: unknown;
}): ReactElement;

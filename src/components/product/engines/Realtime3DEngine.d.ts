import type { ReactElement } from 'react';
import type { LocaleValue } from '../../../context/LanguageContext';

type Realtime3DEngineProps = {
  model?: string | undefined;
  fallbackSrc?: string | undefined;
  alt?: string | undefined;
  eager?: boolean | undefined;
  pick: (value: LocaleValue) => string;
};

export default function Realtime3DEngine(props: Realtime3DEngineProps): ReactElement;

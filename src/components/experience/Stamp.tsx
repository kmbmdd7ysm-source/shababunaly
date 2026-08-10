import type { ReactNode } from 'react';

const TONES = ['neutral', 'verified', 'alert', 'warn', 'signal'] as const;
type StampTone = (typeof TONES)[number];

/**
 * A drawn status mark.
 * Colour is never the only signal: tone + label text state the meaning.
 */
export default function Stamp({
  children,
  tone = 'neutral',
  dot = true,
}: {
  children?: ReactNode;
  tone?: string;
  dot?: boolean;
}) {
  const safeTone: StampTone = (TONES as readonly string[]).includes(tone)
    ? (tone as StampTone)
    : 'neutral';
  const modifier = safeTone === 'neutral' ? '' : ` gw-stamp--${safeTone}`;
  return (
    <span className={`gw-stamp${modifier}`} data-tone={safeTone}>
      {dot && <i className="gw-stamp-dot" aria-hidden="true" />}
      {children}
    </span>
  );
}

export { TONES as STAMP_TONES };

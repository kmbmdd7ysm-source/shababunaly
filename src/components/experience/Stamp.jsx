const TONES = ['neutral', 'verified', 'alert', 'warn', 'signal'];

/**
 * A drawn status mark.
 *
 * Colour is never the only signal: the tone renders a leading dot AND the
 * label text always states the meaning in words, so the stamp survives
 * greyscale, forced-colors and screen readers.
 *
 * @param {{ children: any, tone?: string, dot?: boolean }} props
 */
export default function Stamp({ children, tone = 'neutral', dot = true }) {
  const safeTone = TONES.includes(tone) ? tone : 'neutral';
  const modifier = safeTone === 'neutral' ? '' : ` gw-stamp--${safeTone}`;
  return (
    <span className={`gw-stamp${modifier}`} data-tone={safeTone}>
      {dot && <i className="gw-stamp-dot" aria-hidden="true" />}
      {children}
    </span>
  );
}

export { TONES as STAMP_TONES };

import { useLanguage } from '../../context/LanguageContext';
import ColorSwatch from '../common/ColorSwatch';

type ColorOption = {
  key: string;
  name?: { en?: string; ar?: string } | string;
  hex?: string;
};

// Colour swatches + size pills with per-variant availability awareness.
export function ColorSelector({
  colors,
  value,
  onChange,
}: {
  colors?: ColorOption[] | null;
  value?: string;
  onChange: (key: string) => void;
}) {
  const { t, pick } = useLanguage();
  const common = (t.common as { color?: string } | undefined) || {};
  const a11y = (t.a11y as { selectColor?: string } | undefined) || {};
  if (!colors || colors.length <= 1) return null;
  const selected = colors.find((c) => c.key === value);
  return (
    <div className="variant-group">
      <span className="variant-label">
        {common.color}
        {value ? `: ${pick(selected?.name)}` : ''}
      </span>
      <div className="swatch-row" role="radiogroup" aria-label={a11y.selectColor}>
        {colors.map((c) => (
          <button
            key={c.key}
            type="button"
            role="radio"
            aria-checked={value === c.key}
            className={`swatch${value === c.key ? ' selected' : ''}`}
            onClick={() => onChange(c.key)}
            title={pick(c.name)}
            aria-label={pick(c.name)}
          >
            <ColorSwatch {...(c.hex ? { color: c.hex } : {})} />
          </button>
        ))}
      </div>
    </div>
  );
}

const STANDARD_DISPLAY_SIZES = ['S', 'M', 'L', 'XL', 'XXL', '3XL'];

export function SizeSelector({
  sizes,
  value,
  onChange,
  stockFor,
}: {
  sizes?: string[] | null;
  value?: string;
  onChange: (size: string) => void;
  stockFor?: (size: string) => number;
}) {
  const { t } = useLanguage();
  const a11y = (t.a11y as { selectSize?: string } | undefined) || {};
  if (!sizes || (sizes.length === 1 && sizes[0] === 'OS')) return null;
  const first = sizes[0] || '';
  const displaySizes = STANDARD_DISPLAY_SIZES.includes(first) ? STANDARD_DISPLAY_SIZES : sizes;
  return (
    <div className="variant-group size-selector-group">
      <div className="size-row" role="radiogroup" aria-label={a11y.selectSize}>
        {displaySizes.map((s) => {
          const unavailable = !sizes.includes(s);
          const outOfStock = unavailable || (stockFor ? stockFor(s) <= 0 : false);
          return (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={value === s}
              disabled={outOfStock}
              aria-label={outOfStock ? `${s} unavailable` : s}
              className={`size-pill${value === s ? ' selected' : ''}${outOfStock ? ' out' : ''}`}
              onClick={() => onChange(s)}
            >
              {s}
            </button>
          );
        })}
      </div>
    </div>
  );
}

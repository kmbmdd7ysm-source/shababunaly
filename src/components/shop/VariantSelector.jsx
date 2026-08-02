import { useLanguage } from '../../context/LanguageContext';
import ColorSwatch from '../common/ColorSwatch';

// Colour swatches + size pills with per-variant availability awareness.
export function ColorSelector({ colors, value, onChange }) {
  const { t, pick } = useLanguage();
  if (!colors || colors.length <= 1) return null;
  return (
    <div className="variant-group">
      <span className="variant-label">
        {t.common.color}
        {value ? `: ${pick(colors.find((c) => c.key === value)?.name)}` : ''}
      </span>
      <div className="swatch-row" role="radiogroup" aria-label={t.a11y.selectColor}>
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
            <ColorSwatch color={c.hex} />
          </button>
        ))}
      </div>
    </div>
  );
}

const STANDARD_DISPLAY_SIZES = ['S', 'M', 'L', 'XL', 'XXL', '3XL'];

export function SizeSelector({ sizes, value, onChange, stockFor }) {
  const { t } = useLanguage();
  if (!sizes || (sizes.length === 1 && sizes[0] === 'OS')) return null;
  const displaySizes = STANDARD_DISPLAY_SIZES.includes(sizes[0])
    ? STANDARD_DISPLAY_SIZES
    : sizes;
  return (
    <div className="variant-group size-selector-group">
      <div className="size-row" role="radiogroup" aria-label={t.a11y.selectSize}>
        {displaySizes.map((s) => {
          const unavailable = !sizes.includes(s);
          const outOfStock = unavailable || (stockFor && stockFor(s) <= 0);
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

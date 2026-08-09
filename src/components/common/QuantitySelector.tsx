import { useLanguage } from '../../context/LanguageContext';
import Icon from '../icons/Icon';

export default function QuantitySelector({
  value,
  onChange,
  min = 1,
  max = 99,
  compact = false,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  compact?: boolean;
}) {
  const { t } = useLanguage();
  const a11y = (t.a11y as { quantity?: string; decrease?: string; increase?: string } | undefined) || {};
  return (
    <div
      className={`qty-selector${compact ? ' qty-selector--compact' : ''}`}
      role="group"
      aria-label={a11y.quantity || 'Quantity'}
    >
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label={a11y.decrease}
      >
        <Icon name="minus" size={20} />
      </button>
      <span aria-live="polite">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label={a11y.increase}
      >
        <Icon name="plus" size={20} />
      </button>
    </div>
  );
}

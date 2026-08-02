import { useLanguage } from '../../context/LanguageContext';
import Icon from '../icons/Icon';

export default function QuantitySelector({ value, onChange, min = 1, max = 99, compact = false }) {
  const { t } = useLanguage();
  return (
    <div
      className={`qty-selector${compact ? ' qty-selector--compact' : ''}`}
      role="group"
      aria-label={t.a11y.quantity}
    >
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label={t.a11y.decrease}
      >
        <Icon name="minus" size={20} />
      </button>
      <span aria-live="polite">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label={t.a11y.increase}
      >
        <Icon name="plus" size={20} />
      </button>
    </div>
  );
}

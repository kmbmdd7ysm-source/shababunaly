import { useCommerce } from '../../context/CommerceContext';
import { useLanguage } from '../../context/LanguageContext';

export default function CurrencySelector({ compact = false }) {
  const { currency, setCurrency } = useCommerce();
  const { pick } = useLanguage();
  return (
    <label className={`currency-selector${compact ? ' compact' : ''}`}>
      <span className="sr-only">{pick({ en: 'Display currency', ar: 'عملة العرض' })}</span>
      <select
        value={currency}
        onChange={(event) => setCurrency(event.target.value)}
        aria-label={pick({
          en: `Display currency, currently ${currency}`,
          ar: `عملة العرض الحالية ${currency}`,
        })}
      >
        <option value="USD">USD</option>
        <option value="LYD">LYD</option>
      </select>
    </label>
  );
}

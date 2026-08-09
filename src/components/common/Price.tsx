import { useLanguage } from '../../context/LanguageContext';
import { useCommerce } from '../../context/CommerceContext';

// Consistent price display with optional compare-at (strikethrough).
export default function Price({
  amount,
  compareAt = null,
  size = 'md',
}: {
  amount: number;
  compareAt?: number | null;
  size?: string;
}) {
  const { lang } = useLanguage();
  const { format } = useCommerce();
  const onSale = Boolean(compareAt && compareAt > amount);
  return (
    <span className={`price price--${size}`} dir="ltr">
      <span className={onSale ? 'price-now price-now--sale' : 'price-now'}>
        {format(amount, lang)}
      </span>
      {onSale && compareAt != null && <span className="price-was">{format(compareAt, lang)}</span>}
    </span>
  );
}

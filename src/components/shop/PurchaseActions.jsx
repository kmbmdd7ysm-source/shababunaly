import Icon from '../icons/Icon';
import QuantitySelector from '../common/QuantitySelector';
import { useLanguage } from '../../context/LanguageContext';

export default function PurchaseActions({
  quantity,
  onQuantityChange = () => {},
  min = 1,
  max = 99,
  showQuantity = true,
  onAdd,
  addDisabled = false,
  adding = false,
  favorite,
  onFavorite,
}) {
  const { pick } = useLanguage();
  return (
    <div className="purchase-actions" data-testid="purchase-actions">
      {showQuantity && (
        <div className="quantity-row">
          <span className="variant-label">{pick({ en: 'Quantity', ar: 'الكمية' })}</span>
          <QuantitySelector value={quantity} onChange={onQuantityChange} min={min} max={max} />
        </div>
      )}
      <button
        type="button"
        className="btn-primary block add-btn purchase-primary"
        onClick={onAdd}
        disabled={addDisabled || adding}
        aria-busy={adding}
      >
        {adding
          ? pick({ en: 'Adding…', ar: 'جارٍ الإضافة…' })
          : pick({ en: 'Add to Bag', ar: 'أضف إلى الحقيبة' })}
      </button>
      <button
        type="button"
        className={`btn-secondary block favorite-product${favorite ? ' active' : ''}`}
        aria-pressed={Boolean(favorite)}
        onClick={onFavorite}
      >
        <span>
          {pick({
            en: favorite ? 'Favorited' : 'Favorite',
            ar: favorite ? 'في المفضلة' : 'المفضلة',
          })}
        </span>
        <Icon name="heart" size={24} />
      </button>
    </div>
  );
}

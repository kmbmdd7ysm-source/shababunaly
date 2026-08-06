import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useCart, cartKey } from '../../context/CartContext';
import { useCommerce } from '../../context/CommerceContext';
import { useWishlist } from '../../hooks/useWishlist';
import { useCatalog } from '../../context/CatalogContext';
import SmartImage from '../common/SmartImage';
import Price from '../common/Price';
import Badge from '../common/Badge';
import { useCompare } from '../../context/CompareContext';
import Icon from '../icons/Icon';
import ColorSwatch from '../common/ColorSwatch';
import '../../styles/product-card.css';
import { getCompareAction } from '../../utils/productOptions';
import { getVariantPurchaseLimit } from '../../utils/productEligibility';

export default function ProductCard({ product, eager = false, displayColor = null }) {
  const { t, pick } = useLanguage();
  const { addItem } = useCart();
  const { countryCode } = useCommerce();
  const { isLowStock } = useCatalog();
  const { has, toggle } = useWishlist();
  const compare = useCompare();
  const navigate = useNavigate();
  const comingSoon = product.available === false || product.comingSoon === true;
  const soldOut = product.availability === 'sold-out';
  const onSale = product.compareAt && product.compareAt > product.price;
  const low = isLowStock(product);
  const to = `/products/${product.slug}${displayColor ? `?color=${displayColor}` : ''}`;
  const cardColor = product.colors.find((c) => c.key === displayColor);
  const cardImage = cardColor?.image || product.image;
  const action = getCompareAction(product);

  const runPrimaryAction = () => {
    if (comingSoon || soldOut || action.type === 'unavailable') return;
    if (action.type === 'quote') {
      navigate(`/teams-wholesale?product=${encodeURIComponent(product.slug)}#quote`);
      return;
    }
    if (action.type === 'choose-options') {
      navigate(to);
      return;
    }
    const variant = action.variant;
    if (!variant) return;
    const unitPrice = Number(variant.unitPrice ?? product.price);
    addItem({
      key: cartKey('product', product.id, `${variant.color}-${variant.size}-retail`),
      type: 'product',
      id: product.id,
      slug: product.slug,
      name: product.name,
      image: cardImage,
      price: unitPrice,
      retailPrice: unitPrice,
      wholesalePrice: Number(variant.wholesalePrice ?? product.wholesalePrice ?? 0) || null,
      size: variant.size,
      color: variant.color,
      sku: variant.sku,
      maxStock: getVariantPurchaseLimit(variant),
      inventoryTracking: variant.inventoryTracking !== false,
      href: to,
      quantity: 1,
      purchaseMode: 'retail',
      readyToShip: product.readyToShip === true && variant.readyToShip !== false,
      customizable: product.customizable === true,
      madeInUSA:
        product.madeInUSA === true &&
        product.claimVerified === true &&
        Boolean(product.claimEvidenceReference),
      largeEquipment: product.largeEquipment === true,
      deliveryProfile: product.readyToShip ? 'ready' : 'standard',
    });
  };

  const actionLabel =
    action.type === 'choose-options'
      ? pick({ en: 'Choose options', ar: 'اختر الخيارات' })
      : action.type === 'quote'
        ? pick({ en: 'Request price', ar: 'اطلب السعر' })
        : t.common.quickAdd;

  return (
    <article className="product-card" data-product-id={product.id}>
      <div className="product-card-media">
        <Link to={to} aria-label={pick(product.name)}>
          <SmartImage
            src={cardImage}
            alt={pick(product.alt)}
            width={900}
            height={1200}
            sizes="(min-width: 1040px) 25vw, (min-width: 700px) 33vw, 50vw"
            className="product-card-img product-card-img--main"
            eager={eager}
          />
          {product.hoverImage && (
            <SmartImage
              src={product.hoverImage}
              alt=""
              width={900}
              height={1200}
              sizes="(min-width: 1040px) 25vw, (min-width: 700px) 33vw, 50vw"
              className="product-card-img product-card-img--hover"
            />
          )}
        </Link>
        <div className="product-card-badges">
          {comingSoon && <Badge tone="limited">{pick({ en: 'Coming Soon', ar: 'قريباً' })}</Badge>}
          {!comingSoon && soldOut && <Badge tone="sold">{t.badge.soldOut}</Badge>}
          {!comingSoon && !soldOut && product.readyToShip && countryCode === 'LY' && (
            <span className="ready-badge">
              <i className="ready-dot" />
              {pick({ en: 'Ready to Ship', ar: 'تسليم فوري' })}
            </span>
          )}
          {!comingSoon && !soldOut && onSale && <Badge tone="sale">{t.badge.sale}</Badge>}
          {!comingSoon && !soldOut && product.newArrival && <Badge tone="new">{t.badge.new}</Badge>}
          {!comingSoon && !soldOut && product.bestSeller && (
            <Badge tone="best">{t.badge.best}</Badge>
          )}
          {!comingSoon && !soldOut && low && <Badge tone="limited">{t.badge.limited}</Badge>}
        </div>
        <button
          type="button"
          className={`gw-card-action gw-card-action--wish${has(product.id) ? ' is-active' : ''}`}
          onClick={() => toggle(product.id)}
          aria-pressed={has(product.id)}
          aria-label={has(product.id) ? t.a11y.removeWishlist : t.a11y.addWishlist}
        >
          <Icon name="heart" />
        </button>
        <button
          type="button"
          className={`gw-card-action gw-card-action--compare${compare.has(product.id) ? ' is-active' : ''}`}
          onClick={() => compare.toggle(product.id)}
          aria-pressed={compare.has(product.id)}
          aria-label={pick({ en: 'Compare product', ar: 'قارن المنتج' })}
        >
          <Icon name="compare" />
        </button>
        {!comingSoon && !soldOut && action.type !== 'unavailable' && (
          <button
            type="button"
            className="gw-quick-add"
            onClick={runPrimaryAction}
            aria-label={actionLabel}
          >
            <Icon name="bag" />
            <span className="gw-quick-add-label">{actionLabel}</span>
          </button>
        )}
      </div>
      <div className="product-card-body">
        <span className="product-card-brand">{product.brand}</span>
        <Link to={to} className="product-card-name">
          {pick(product.name)}
        </Link>
        <div className="product-card-meta">
          {product.quoteOnly ? (
            <span className="status-pill">
              {pick({ en: 'Price by request', ar: 'السعر عند الطلب' })}
            </span>
          ) : comingSoon ? (
            <span className="status-pill">{pick({ en: 'Coming Soon', ar: 'قريباً' })}</span>
          ) : (
            <Price amount={product.price} compareAt={product.compareAt} size="sm" />
          )}
          {product.colors.length > 1 && (
            <span className="color-dots" aria-hidden="true">
              {product.colors.slice(0, 4).map((c) => (
                <ColorSwatch key={c.key} color={c.hex} className="color-dot" />
              ))}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

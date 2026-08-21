import type { ReactElement } from 'react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useCart, cartKey } from '../../context/CartContext';
import { useCommerce } from '../../context/CommerceContext';
import { useCatalog } from '../../context/CatalogContext';
import { useWishlist } from '../../hooks/useWishlist';
import SmartImage from '../common/SmartImage';
import Price from '../common/Price';
import Icon from '../icons/Icon';
import ColorSwatch from '../common/ColorSwatch';
import QuickAddSheet from './QuickAddSheet';
import { getCompareAction } from '../../utils/productOptions';
import { getVariantPurchaseLimit, type VariantLike } from '../../utils/productEligibility';
import type { LocaleText } from '../../types/i18n';
import { availabilityLabel, resolveAvailabilityState } from '../../domain/availability';
import type { ProductLike } from '../../utils/productEligibility';
import '../../styles/design/phase2-commerce.css';

type CardColor = { key?: string; image?: string; name?: unknown; hex?: string };
type CardProduct = ProductLike & {
  id?: string;
  slug?: string;
  price?: number;
  compareAt?: number | null;
  image?: string;
  hoverImage?: string;
  alt?: LocaleText;
  name?: LocaleText;
  brand?: string;
  colors?: CardColor[];
  inventoryVerified?: boolean;
  wholesalePrice?: number | null;
  largeEquipment?: boolean;
  newArrival?: boolean;
  bestSeller?: boolean;
  readyToShip?: boolean;
  reservationAvailable?: boolean;
};

const asCardProduct = (product: unknown): CardProduct => (product || {}) as CardProduct;

export default function ProductCard({
  product,
  eager = false,
  displayColor = null,
}: {
  product: unknown;
  eager?: boolean;
  displayColor?: string | null;
}): ReactElement {
  const p = asCardProduct(product);
  const { t, pick, lang } = useLanguage();
  const common = (t.common || {}) as Record<string, string>;
  const a11y = (t.a11y || {}) as Record<string, string>;
  const { addItem } = useCart();
  const { countryCode } = useCommerce();
  const { isLowStock } = useCatalog();
  const wishlist = useWishlist();
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [addState, setAddState] = useState<'idle' | 'adding' | 'added'>('idle');

  const availability = resolveAvailabilityState(p, { countryCode });
  const comingSoon = availability === 'COMING_SOON';
  const reservationAvailable = p.reservationAvailable === true;
  const soldOut = availability === 'OUT_OF_STOCK';
  const low = isLowStock(p) && p.inventoryVerified === true;
  const availabilityCopy = availabilityLabel(availability, lang === 'ar' ? 'ar' : 'en');
  const to = `/products/${String(p.slug || '')}${displayColor ? `?color=${displayColor}` : ''}`;
  const selectedColor = (p.colors || []).find((color) => color.key === displayColor);
  const image = selectedColor?.image || p.image;
  const action = getCompareAction(p);
  const onSale = Boolean(p.compareAt && Number(p.compareAt) > Number(p.price || 0));

  const runPrimaryAction = () => {
    if (comingSoon || soldOut || action.type === 'unavailable') return;
    if (action.type === 'quote') {
      navigate(`/teams-wholesale?product=${encodeURIComponent(String(p.slug || ''))}#quote`);
      return;
    }
    if (action.type === 'choose-options') {
      setSheetOpen(true);
      return;
    }
    const variant = action.variant;
    if (!variant) return;
    const unitPrice = Number(variant.unitPrice ?? p.price);
    setAddState('adding');
    addItem({
      key: cartKey('product', String(p.id || ''), `${variant.color}-${variant.size}-retail`),
      type: 'product',
      id: String(p.id || ''),
      slug: String(p.slug || ''),
      name: p.name,
      image: String(image || ''),
      price: unitPrice,
      retailPrice: unitPrice,
      wholesalePrice: Number((variant as { wholesalePrice?: number }).wholesalePrice ?? p.wholesalePrice ?? 0) || null,
      size: String(variant.size || ''),
      color: String(variant.color || ''),
      sku: String(variant.sku || ''),
      maxStock: getVariantPurchaseLimit(variant as VariantLike),
      inventoryTracking: variant.inventoryTracking !== false,
      inventoryPoolKey: variant.inventoryPoolKey ? String(variant.inventoryPoolKey) : undefined,
      inventoryPoolStock: Number.isFinite(Number(variant.inventoryPoolStock)) ? Number(variant.inventoryPoolStock) : undefined,
      href: to,
      quantity: 1,
      purchaseMode: 'retail',
      readyToShip: p.readyToShip === true && variant.readyToShip !== false,
      customizable: p.customizable === true,
      madeInUSA: p.madeInUSA === true && p.claimVerified === true && Boolean(p.claimEvidenceReference),
      largeEquipment: p.largeEquipment === true,
      deliveryProfile: p.readyToShip ? 'ready' : 'standard',
    });
    window.setTimeout(() => {
      setAddState('added');
      window.setTimeout(() => setAddState('idle'), 900);
    }, 140);
  };

  const primaryBadge = comingSoon
    ? availabilityCopy.label
    : soldOut
      ? availabilityCopy.label
      : reservationAvailable
        ? pick({ en: 'Available to Reserve', ar: 'متوفر بالحجز' })
        : availability === 'READY_TO_SHIP'
        ? availabilityCopy.label
        : p.newArrival
          ? pick({ en: 'New', ar: 'جديد' })
          : p.bestSeller
            ? pick({ en: 'Popular', ar: 'رائج' })
            : onSale
              ? pick({ en: 'Sale', ar: 'تخفيض' })
              : low
                ? pick({ en: 'Limited', ar: 'كمية محدودة' })
                : null;

  const actionLabel = reservationAvailable
    ? action.type === 'choose-options'
      ? pick({ en: 'Reserve options', ar: 'اختر للحجز' })
      : pick({ en: 'Reserve', ar: 'احجز' })
    : action.type === 'choose-options'
      ? pick({ en: 'Choose options', ar: 'اختر الخيارات' })
      : action.type === 'quote'
        ? pick({ en: 'Request price', ar: 'اطلب السعر' })
        : common.quickAdd || pick({ en: 'Quick add', ar: 'إضافة سريعة' });

  return (
    <article className="s2-product-card" data-product-id={String(p.id || '')}>
      <div className="s2-product-card__media">
        <Link to={to} className="s2-product-card__media-link" aria-label={String(pick((p.name || '') as LocaleText) || '')}>
          <SmartImage
            src={String(image || '')}
            alt={String(pick((p.alt || p.name || '') as LocaleText) || '')}
            width={900}
            height={1125}
            sizes="(min-width: 1200px) 25vw, (min-width: 760px) 33vw, 50vw"
            className="s2-product-card__image s2-product-card__image--main"
            eager={eager}
          />
          {p.hoverImage ? (
            <SmartImage
              src={String(p.hoverImage)}
              alt=""
              width={900}
              height={1125}
              sizes="(min-width: 1200px) 25vw, (min-width: 760px) 33vw, 50vw"
              className="s2-product-card__image s2-product-card__image--hover"
            />
          ) : null}
        </Link>

        {primaryBadge ? <span className="s2-product-card__badge">{primaryBadge}</span> : null}

        <button
          type="button"
          className={`s2-product-card__wish${wishlist.has(String(p.id || '')) ? ' is-active' : ''}`}
          aria-pressed={wishlist.has(String(p.id || ''))}
          aria-label={wishlist.has(String(p.id || '')) ? a11y.removeWishlist : a11y.addWishlist}
          onClick={() => wishlist.toggle(String(p.id || ''))}
        >
          <Icon name="heart" size={20} />
        </button>

        {!comingSoon && !soldOut && action.type !== 'unavailable' ? (
          <button
            type="button"
            className={`s2-product-card__quick${addState === 'added' ? ' is-added' : ''}`}
            onClick={runPrimaryAction}
            disabled={addState === 'adding'}
            aria-label={actionLabel}
          >
            <Icon name={addState === 'added' ? 'check' : 'plus'} size={18} />
            <span>{addState === 'added' ? pick({ en: 'Added', ar: 'تمت الإضافة' }) : actionLabel}</span>
          </button>
        ) : null}
      </div>

      <div className="s2-product-card__body">
        <div className="s2-product-card__title-row">
          <Link to={to} className="s2-product-card__name">{pick((p.name || '') as LocaleText)}</Link>
          {p.quoteOnly ? (
            <span className="s2-product-card__price">{pick({ en: 'Price on request', ar: 'السعر عند الطلب' })}</span>
          ) : (
            <Price amount={Number(p.price) || 0} compareAt={p.compareAt == null ? null : Number(p.compareAt)} size="sm" />
          )}
        </div>
        <div className="s2-product-card__subrow">
          <span>{String(p.brand || 'Shababuna')}</span>
          {(p.colors || []).length > 1 ? (
            <span className="s2-product-card__colors" aria-label={pick({ en: `${p.colors?.length || 0} colours`, ar: `${p.colors?.length || 0} ألوان` })}>
              {(p.colors || []).slice(0, 4).map((color) => (
                <ColorSwatch key={String(color.key || color.hex || '')} color={String(color.hex || '#777')} className="s2-product-card__swatch" />
              ))}
              {(p.colors || []).length > 4 ? <small>+{(p.colors || []).length - 4}</small> : null}
            </span>
          ) : null}
        </div>
      </div>

      <QuickAddSheet product={p} open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </article>
  );
}

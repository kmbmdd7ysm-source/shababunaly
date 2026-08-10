import type { ReactElement } from 'react';
import { useState } from 'react';
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
import QuickAddSheet from './QuickAddSheet';
import '../../styles/product-card.css';
import { getCompareAction } from '../../utils/productOptions';
import type { LocaleText } from '../../types/i18n';
import { availabilityLabel, resolveAvailabilityState } from '../../domain/availability.ts';
import {
  getVariantPurchaseLimit,
  type ProductLike,
  type VariantLike,
} from '../../utils/productEligibility.ts';
import '../../styles/domain-media.css';

type CardColor = {
  key?: string;
  image?: string;
  name?: unknown;
  hex?: string;
};

type CardProduct = ProductLike & {
  id?: string;
  slug?: string;
  price?: number;
  compareAt?: number | null;
  image?: string;
  hoverImage?: string;
  alt?: { en?: string; ar?: string } | string;
  name?: { en?: string; ar?: string } | string;
  brand?: { en?: string; ar?: string } | string;
  colors?: CardColor[];
  inventoryVerified?: boolean;
  wholesalePrice?: number | null;
  largeEquipment?: boolean;
  newArrival?: boolean;
  bestSeller?: boolean;
  readyToShip?: boolean;
};

function asCardProduct(product: unknown): CardProduct {
  return (product || {}) as CardProduct;
}

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
  const badge = (t.badge || {}) as Record<string, string>;
  const a11y = (t.a11y || {}) as Record<string, string>;
  const { addItem } = useCart();
  const { countryCode } = useCommerce();
  const { isLowStock } = useCatalog();
  const { has, toggle } = useWishlist();
  const compare = useCompare();
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [addState, setAddState] = useState<'idle' | 'adding' | 'added'>('idle');
  const availability = resolveAvailabilityState(p, { countryCode });
  const comingSoon = availability === 'COMING_SOON';
  const soldOut = availability === 'OUT_OF_STOCK';
  const onSale = Boolean(p.compareAt && Number(p.compareAt) > Number(p.price || 0));
  const low = isLowStock(p) && p.inventoryVerified === true;
  const availabilityCopy = availabilityLabel(availability, lang === 'ar' ? 'ar' : 'en');
  const to = `/products/${String(p.slug || '')}${displayColor ? `?color=${displayColor}` : ''}`;
  const cardColor = (p.colors || []).find((c) => c.key === displayColor);
  const cardImage = cardColor?.image || p.image;
  const action = getCompareAction(p);

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
      image: String(cardImage || ''),
      price: unitPrice,
      retailPrice: unitPrice,
      wholesalePrice:
        Number((variant as { wholesalePrice?: number }).wholesalePrice ?? p.wholesalePrice ?? 0) ||
        null,
      size: String(variant.size || ''),
      color: String(variant.color || ''),
      sku: String(variant.sku || ''),
      maxStock: getVariantPurchaseLimit(variant as VariantLike),
      inventoryTracking: variant.inventoryTracking !== false,
      href: to,
      quantity: 1,
      purchaseMode: 'retail',
      readyToShip: p.readyToShip === true && variant.readyToShip !== false,
      customizable: p.customizable === true,
      madeInUSA:
        p.madeInUSA === true && p.claimVerified === true && Boolean(p.claimEvidenceReference),
      largeEquipment: p.largeEquipment === true,
      deliveryProfile: p.readyToShip ? 'ready' : 'standard',
    });
    window.setTimeout(() => {
      setAddState('added');
      window.setTimeout(() => setAddState('idle'), 900);
    }, 160);
  };

  const actionLabel =
    action.type === 'choose-options'
      ? pick({ en: 'Choose options', ar: 'اختر الخيارات' })
      : action.type === 'quote'
        ? pick({ en: 'Request price', ar: 'اطلب السعر' })
        : common.quickAdd;

  return (
    <article className="product-card" data-product-id={String(p.id || '')}>
      <div className="product-card-media">
        <Link to={to} aria-label={pick((p.name || '') as LocaleText)}>
          <SmartImage
            src={String(cardImage || '')}
            alt={String(pick((p.alt || p.name || '') as LocaleText) || '')}
            width={900}
            height={1200}
            sizes="(min-width: 1040px) 25vw, (min-width: 700px) 33vw, 50vw"
            className="product-card-img product-card-img--main"
            eager={eager}
          />
          {Boolean(p.hoverImage) && (
            <SmartImage
              src={String(p.hoverImage || '')}
              alt=""
              width={900}
              height={1200}
              sizes="(min-width: 1040px) 25vw, (min-width: 700px) 33vw, 50vw"
              className="product-card-img product-card-img--hover"
            />
          )}
        </Link>
        <div className="product-card-badges">
          {comingSoon && <Badge tone="limited">{availabilityCopy.label}</Badge>}
          {!comingSoon && soldOut && <Badge tone="sold">{availabilityCopy.label}</Badge>}
          {!comingSoon && !soldOut && availability === 'READY_TO_SHIP' && (
            <span className="ready-badge">
              <i className="ready-dot" />
              {availabilityCopy.label}
            </span>
          )}
          {!comingSoon &&
            !soldOut &&
            availability !== 'READY_TO_SHIP' &&
            (availability === 'QUOTE_ONLY' ||
              availability === 'MADE_TO_ORDER' ||
              availability === 'SUPPLIER_ORDER') && (
              <Badge tone="limited">{availabilityCopy.label}</Badge>
            )}
          {!comingSoon && !soldOut && onSale && <Badge tone="sale">{badge.sale}</Badge>}
          {!comingSoon && !soldOut && Boolean(p.newArrival) && (
            <Badge tone="new">{badge.new}</Badge>
          )}
          {!comingSoon && !soldOut && Boolean(p.bestSeller) && (
            <Badge tone="best">{badge.best}</Badge>
          )}
          {!comingSoon && !soldOut && low && <Badge tone="limited">{badge.limited}</Badge>}
        </div>
        <button
          type="button"
          className={`gw-card-action gw-card-action--wish${has(String(p.id || '')) ? ' is-active' : ''}`}
          onClick={() => toggle(String(p.id || ''))}
          aria-pressed={has(String(p.id || ''))}
          aria-label={has(String(p.id || '')) ? a11y.removeWishlist : a11y.addWishlist}
        >
          <Icon name="heart" />
        </button>
        <button
          type="button"
          className={`gw-card-action gw-card-action--compare${compare.has(String(p.id || '')) ? ' is-active' : ''}`}
          onClick={() => compare.toggle(String(p.id || ''))}
          aria-pressed={compare.has(String(p.id || ''))}
          aria-label={pick({ en: 'Compare product', ar: 'قارن المنتج' })}
        >
          <Icon name="compare" />
        </button>
        {!comingSoon && !soldOut && action.type !== 'unavailable' && (
          <button
            type="button"
            className={`gw-quick-add${addState === 'added' ? ' is-added' : ''}`}
            onClick={runPrimaryAction}
            aria-label={actionLabel}
            disabled={addState === 'adding'}
          >
            <Icon name={addState === 'added' ? 'check' : 'bag'} />
            <span className="gw-quick-add-label">
              {addState === 'adding'
                ? pick({ en: 'Adding…', ar: 'جاري الإضافة…' })
                : addState === 'added'
                  ? pick({ en: 'Added', ar: 'تمت الإضافة' })
                  : actionLabel}
            </span>
          </button>
        )}
      </div>
      <QuickAddSheet product={p} open={sheetOpen} onClose={() => setSheetOpen(false)} />
      <div className="product-card-body">
        <span className="product-card-brand">{String(p.brand || '')}</span>
        <Link to={to} className="product-card-name">
          {pick((p.name as { en?: string; ar?: string } | string) || '')}
        </Link>
        <div className="product-card-meta">
          {p.quoteOnly ? (
            <span className="status-pill">
              {pick({ en: 'Price by request', ar: 'السعر عند الطلب' })}
            </span>
          ) : comingSoon ? (
            <span className="status-pill">{pick({ en: 'Coming Soon', ar: 'قريباً' })}</span>
          ) : (
            <Price
              amount={Number(p.price) || 0}
              compareAt={p.compareAt == null ? null : Number(p.compareAt)}
              size="sm"
            />
          )}
          {(p.colors || []).length > 1 && (
            <span className="color-dots" aria-hidden="true">
              {(p.colors || []).slice(0, 4).map((c) => (
                <ColorSwatch
                  key={String(c.key || c.hex || '')}
                  color={String(c.hex || '')}
                  className="color-dot"
                />
              ))}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

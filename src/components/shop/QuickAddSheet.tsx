import type { ReactElement } from 'react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useCart, cartKey } from '../../context/CartContext';
import Icon from '../icons/Icon';
import ColorSwatch from '../common/ColorSwatch';
import Price from '../common/Price';
import { getPurchasableVariants } from '../../utils/productOptions';
import { getVariantPurchaseLimit } from '../../utils/productEligibility';
import { lockDocumentScroll } from '../../utils/scrollLock';
import '../../styles/product-card.css';

type ProductLike = {
  id?: string;
  slug?: string;
  name?: unknown;
  image?: string;
  price?: number;
  wholesalePrice?: number | null;
  colors?: Array<{ key?: string; hex?: string; name?: unknown; image?: string }>;
  readyToShip?: boolean;
  customizable?: boolean;
  madeInUSA?: boolean;
  claimVerified?: boolean;
  claimEvidenceReference?: unknown;
  largeEquipment?: boolean;
  variants?: unknown[];
  [key: string]: unknown;
};

type VariantLike = {
  size?: string;
  color?: string;
  sku?: string;
  unitPrice?: number;
  wholesalePrice?: number | null;
  inventoryTracking?: boolean;
  readyToShip?: boolean;
  [key: string]: unknown;
};

type QuickAddSheetProps = {
  product: unknown;
  open: boolean;
  onClose: () => void;
};

export default function QuickAddSheet({
  product: productInput,
  open,
  onClose,
}: QuickAddSheetProps): ReactElement | null {
  const product = productInput as ProductLike;
  const { pick, lang } = useLanguage();
  const { addItem } = useCart();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const variants = useMemo(
    () =>
      getPurchasableVariants(
        product as import('../../utils/productEligibility').ProductLike,
      ) as VariantLike[],
    [product],
  );
  const colors = useMemo(() => {
    const keys = [...new Set(variants.map((variant) => String(variant.color || '')).filter(Boolean))];
    return keys.map((key) => {
      const meta = (product.colors || []).find((color) => color.key === key);
      return {
        key,
        hex: String(meta?.hex || '#111111'),
        name: meta?.name || key,
        image: meta?.image,
      };
    });
  }, [product.colors, variants]);
  const [color, setColor] = useState(String(colors[0]?.key || ''));
  const sizes = useMemo(
    () =>
      [
        ...new Set(
          variants
            .filter((variant) => !color || String(variant.color || '') === color)
            .map((variant) => String(variant.size || ''))
            .filter(Boolean),
        ),
      ],
    [variants, color],
  );
  const [size, setSize] = useState(String(sizes[0] || ''));
  const [status, setStatus] = useState<'idle' | 'adding' | 'added'>('idle');

  useEffect(() => {
    if (!open) return undefined;
    setColor(String(colors[0]?.key || ''));
    setStatus('idle');
    const unlock = lockDocumentScroll();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      unlock();
    };
  }, [open, onClose, colors]);

  useEffect(() => {
    if (!sizes.includes(size)) setSize(String(sizes[0] || ''));
  }, [sizes, size]);

  if (!open || product.quoteOnly === true || Number(product.price ?? 0) <= 0) return null;

  const selected =
    variants.find(
      (variant) =>
        String(variant.color || '') === color && String(variant.size || '') === size,
    ) || null;
  const unitPrice = Number(selected?.unitPrice ?? product.price ?? 0);
  const image =
    colors.find((entry) => entry.key === color)?.image || product.image || '';

  const commit = () => {
    if (!selected || status === 'adding' || !Number.isFinite(unitPrice) || unitPrice <= 0) return;
    setStatus('adding');
    addItem({
      key: cartKey('product', String(product.id || ''), `${color}-${size}-retail`),
      type: 'product',
      id: String(product.id || ''),
      slug: String(product.slug || ''),
      name: product.name,
      image: String(image || ''),
      price: unitPrice,
      retailPrice: unitPrice,
      wholesalePrice:
        Number(selected.wholesalePrice ?? product.wholesalePrice ?? 0) || null,
      size,
      color,
      sku: String(selected.sku || ''),
      maxStock: getVariantPurchaseLimit(selected as import('../../utils/productEligibility').VariantLike),
      inventoryTracking: selected.inventoryTracking !== false,
      inventoryPoolKey: selected.inventoryPoolKey ? String(selected.inventoryPoolKey) : undefined,
      inventoryPoolStock: Number.isFinite(Number(selected.inventoryPoolStock)) ? Number(selected.inventoryPoolStock) : undefined,
      href: `/products/${String(product.slug || '')}`,
      quantity: 1,
      purchaseMode: 'retail',
      readyToShip: product.readyToShip === true && selected.readyToShip !== false,
      customizable: product.customizable === true,
      madeInUSA:
        product.madeInUSA === true &&
        product.claimVerified === true &&
        Boolean(product.claimEvidenceReference),
      largeEquipment: product.largeEquipment === true,
      deliveryProfile: product.readyToShip ? 'ready' : 'standard',
    });
    window.setTimeout(() => {
      setStatus('added');
      window.setTimeout(() => onClose(), 700);
    }, 180);
  };

  return (
    <div className="gw-quick-sheet" role="presentation">
      <button
        type="button"
        className="gw-quick-sheet-backdrop"
        aria-label={pick({ en: 'Close', ar: 'إغلاق' })}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className="gw-quick-sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="gw-quick-sheet-head">
          <div>
            <p className="gw-spec">{pick({ en: 'Quick add', ar: 'إضافة سريعة' })}</p>
            <h2 id={titleId}>{pick(product.name as { en?: string; ar?: string })}</h2>
          </div>
          <button
            type="button"
            className="gw-card-action"
            onClick={onClose}
            aria-label={pick({ en: 'Close', ar: 'إغلاق' })}
          >
            <Icon name="close" />
          </button>
        </div>

        {colors.length > 1 && (
          <div
            className="gw-quick-sheet-row"
            role="radiogroup"
            aria-label={pick({ en: 'Colour', ar: 'اللون' })}
          >
            {colors.map((entry) => (
              <button
                key={entry.key}
                type="button"
                role="radio"
                className={`gw-quick-swatch${color === entry.key ? ' is-active' : ''}`}
                aria-checked={color === entry.key}
                aria-label={String(pick(entry.name as { en?: string; ar?: string }) || entry.key)}
                onClick={() => setColor(entry.key)}
              >
                <ColorSwatch color={entry.hex} className="color-dot" />
              </button>
            ))}
          </div>
        )}

        {sizes.length > 0 && (
          <div
            className="gw-quick-sheet-sizes"
            role="radiogroup"
            aria-label={pick({ en: 'Size', ar: 'المقاس' })}
          >
            {sizes.map((entry) => (
              <button
                key={entry}
                type="button"
                role="radio"
                className={`size-pill${size === entry ? ' is-active' : ''}`}
                aria-checked={size === entry}
                aria-label={entry}
                onClick={() => setSize(entry)}
              >
                {entry}
              </button>
            ))}
          </div>
        )}

        <div className="gw-quick-sheet-foot" aria-live="polite">
          <Price amount={unitPrice} size="sm" />
          <button
            type="button"
            className="gw-btn gw-btn--primary"
            disabled={!selected || status === 'adding'}
            onClick={commit}
          >
            {status === 'adding'
              ? pick({ en: 'Adding…', ar: 'جاري الإضافة…' })
              : status === 'added'
                ? pick({ en: 'Added', ar: 'تمت الإضافة' })
                : pick({ en: 'Add to bag', ar: 'أضف إلى الحقيبة' })}
          </button>
        </div>
        <p className="gw-quick-sheet-note">
          {lang === 'ar'
            ? 'تُحفظ الاختيارات في الحقيبة ويمكن تعديلها لاحقًا.'
            : 'Selections save to your bag and can be adjusted later.'}
        </p>
      </div>
    </div>
  );
}

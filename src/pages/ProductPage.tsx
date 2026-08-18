import type { ReactElement } from 'react';
import type { CatalogProduct } from '../context/CatalogContext';
import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useCommerce } from '../context/CommerceContext';
import { useCart, type CartItem, cartKey } from '../context/CartContext';
import { useRecentlyViewed } from '../hooks/useRecentlyViewed';
import { trackEvent } from '../utils/analytics';
import Seo from '../components/common/Seo';
import { resolveProductMediaMode } from '../utils/productViewerTier';
import Breadcrumbs from '../components/common/Breadcrumbs';
import Price from '../components/common/Price';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import ShareButtons from '../components/common/ShareButtons';
import ProductCard from '../components/shop/ProductCard';
import { useCatalog } from '../context/CatalogContext';
import { getCategory, getSubcategory } from '../data/categories';
import { getSizeGuide } from '../data/sizeGuide';
import NotFoundPage from './NotFoundPage';
import MediaLightbox from '../components/media/MediaLightbox';
import { useCompare } from '../context/CompareContext';
import Recommendations from '../components/recommendations/Recommendations';
import { useWishlist } from '../hooks/useWishlist';
import Icon from '../components/icons/Icon';
import ColorSwatch from '../components/common/ColorSwatch';
import ProductMediaViewer from '../components/product/ProductMediaViewer';
import PerformanceProfile from '../components/product/PerformanceProfile';
import { isBasketballPerformanceShoe } from '../utils/productIntelligence';
import '../styles/domain-shop.css';
import { getVariantPurchaseLimit, isVariantPurchasable } from '../utils/productEligibility';
import '../styles/catalog.css';
import '../styles/domain-misc.css';
import '../styles/product-experience.css';
import SizeGuideTable from '../components/product/SizeGuideTable';

type ColorEntry = { key: string; hex?: string; name?: { en?: string; ar?: string }; image?: string };
type SizeEntry = string;
type VariantEntry = Record<string, unknown> & {
  color?: string;
  size?: string;
  stock?: number;
  inventoryTracking?: boolean;
  unitPrice?: number;
  wholesalePrice?: number | null;
  compareAt?: number | null;
  sku?: string;
};

const asColors = (product: CatalogProduct | undefined): ColorEntry[] =>
  Array.isArray(product?.colors) ? (product.colors as ColorEntry[]) : [];
const asSizes = (product: CatalogProduct | undefined): SizeEntry[] =>
  Array.isArray(product?.sizes) ? (product.sizes as SizeEntry[]).map(String) : [];
const asVariants = (product: CatalogProduct | undefined): VariantEntry[] =>
  Array.isArray(product?.variants) ? (product.variants as VariantEntry[]) : [];
const asGallery = (product: CatalogProduct | undefined): string[] =>
  Array.isArray(product?.gallery) ? (product.gallery as string[]).map(String) : [];

const asFeatureList = (product: CatalogProduct | undefined, lang: string): string[] => {
  const value = product?.features;
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (value && typeof value === 'object') {
    const localized = value as Record<string, unknown>;
    const selected = localized[lang] ?? localized.en ?? localized.ar;
    return Array.isArray(selected) ? selected.map(String).filter(Boolean) : [];
  }
  return [];
};

export default function ProductPage(): ReactElement {
  const { slug } = useParams();
  const { getProduct, getProductById, relatedProducts, isLowStock } = useCatalog();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, pick, lang } = useLanguage();
  const productCopy = (t.product || {}) as Record<string, string>;
  const common = (t.common || {}) as Record<string, string>;
  const nav = (t.nav || {}) as Record<string, string>;
  const badge = (t.badge || {}) as Record<string, string>;
  const { countryCode } = useCommerce();
  const { addItem } = useCart();
  const compare = useCompare();
  const wishlist = useWishlist();
  const { ids, record } = useRecentlyViewed();
  const product = slug ? getProduct(String(slug)) : undefined;

  const [color, setColor] = useState('');
  const [size, setSize] = useState('');
  const [purchaseMode, setPurchaseMode] = useState('retail');
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [guideOpen, setGuideOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  useEffect(() => {
    if (!product) return;
    record(product.id);
    trackEvent('view_item', { item_id: product.id, item_name: pick(product.name as { en?: string; ar?: string }) });
    const colors = asColors(product);
    const sizes = asSizes(product);
    const requestedColor = searchParams.get('color');
    const initialColor = colors.some((entry) => entry.key === requestedColor)
      ? String(requestedColor || '')
      : String(colors[0]?.key || '');
    setColor(initialColor);
    setSize(sizes.length === 1 ? String(sizes[0] || '') : '');
    setPurchaseMode('retail');
    setQty(1);
    setActiveImg(0);
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional dependency scope
  }, [slug]);

  /* Verified photography and a concept plate need different stage treatments:
     a photograph shot on white should read as a print laid on the stage, a
     transparent plate should read as a drawing floating in the light. */
  const mediaMode = resolveProductMediaMode(product);

  const gallery = useMemo(() => {
    if (!product) return [] as string[];
    const colors = asColors(product);
    const selected = colors.find((entry) => entry.key === color);
    return [
      selected?.image || product.image,
      ...colors.map((entry) => entry.image).filter(Boolean),
      product.hoverImage,
      ...asGallery(product),
    ]
      .filter(Boolean)
      .map(String)
      .filter((src, index, list) => list.indexOf(src) === index);
  }, [product, color]);

  if (!product) return <NotFoundPage />;

  const colors = asColors(product);
  const sizes = asSizes(product);
  const variants = asVariants(product);
  const needsColor = colors.length > 1;
  const needsSize = !(sizes.length === 1 && sizes[0] === 'OS');
  const matchedVariant =
    variants.find(
      (variant) =>
        (!needsColor || variant.color === color) && (!needsSize || variant.size === size),
    ) || null;
  const stockForSize = (requestedSize: string) => {
    const matching = variants.filter(
      (variant) => variant.size === requestedSize && (!needsColor || variant.color === color),
    );
    if (matching.some((variant) => variant.inventoryTracking === false))
      return Number.POSITIVE_INFINITY;
    return matching.reduce((sum, variant) => sum + Number(variant.stock || 0), 0);
  };

  const comingSoon = product.available === false || product.comingSoon === true;
  const soldOut = product.availability === 'sold-out';
  const low = isLowStock(product);
  const quoteOnly = product.quoteOnly === true;
  const isWholesale = purchaseMode === 'wholesale';
  const minQuantity = isWholesale ? Number(product.wholesaleMin || product.minimumOrder || 1) : 1;
  const retailPrice = Number(matchedVariant?.unitPrice ?? product.price);
  const wholesalePrice = Number(
    matchedVariant?.wholesalePrice ?? product.wholesalePrice ?? retailPrice,
  );
  const activePrice = isWholesale && wholesalePrice > 0 ? wholesalePrice : retailPrice;
  const activeCompareAt = !isWholesale
    ? Number(matchedVariant?.compareAt ?? product.compareAt ?? 0) || null
    : null;
  const onSale = Boolean(activeCompareAt && activeCompareAt > activePrice);
  const maxStock = getVariantPurchaseLimit(matchedVariant);
  const isLibya = countryCode === 'LY';
  const showReady = isLibya && product.readyToShip;

  const cat = getCategory(String(product.category || ''));
  const sub = getSubcategory(String(product.category || ''), String(product.subcategory || ''));
  const crumbs = [
    { label: nav.shop || 'Shop', to: '/shop' },
    ...(cat ? [{ label: pick(cat.name), to: `/shop/${product.category}` }] : []),
    ...(sub
      ? [{ label: pick(sub.name), to: `/shop/${product.category}/${product.subcategory}` }]
      : []),
    { label: pick(product.name as { en?: string; ar?: string }) },
  ];

  const changeMode = (mode: string) => {
    setPurchaseMode(mode);
    const nextMin = mode === 'wholesale' ? Number(product.wholesaleMin || 1) : 1;
    setQty(nextMin);
    setError('');
  };

  const addToCart = () => {
    if (soldOut || comingSoon || quoteOnly || adding) return;
    if (needsColor && !color) return setError(productCopy.chooseColor || '');
    if (needsSize && !size) return setError(productCopy.chooseSize || '');
    if (!matchedVariant || !isVariantPurchasable(product, matchedVariant))
      return setError(common.outOfStock || '');
    if (qty < minQuantity) {
      return setError(
        pick({
          en: `Minimum ${purchaseMode} quantity is ${minQuantity}.`,
          ar: `الحد الأدنى لهذا النوع من الطلب هو ${minQuantity}.`,
        }),
      );
    }
    setError('');
    setAdding(true);
    const variantKey = `${matchedVariant.color}-${matchedVariant.size}-${purchaseMode}`;
    addItem({
      key: cartKey('product', product.id, variantKey),
      type: 'product',
      id: product.id,
      slug: product.slug,
      name: product.name,
      image: gallery[0],
      price: activePrice,
      retailPrice,
      wholesalePrice: wholesalePrice > 0 ? wholesalePrice : null,
      size: matchedVariant.size,
      color: matchedVariant.color,
      sku: matchedVariant.sku,
      maxStock: Math.max(getVariantPurchaseLimit(matchedVariant), qty),
      inventoryTracking: matchedVariant.inventoryTracking !== false,
      inventoryPoolKey: matchedVariant.inventoryPoolKey ? String(matchedVariant.inventoryPoolKey) : undefined,
      inventoryPoolStock: Number.isFinite(Number(matchedVariant.inventoryPoolStock)) ? Number(matchedVariant.inventoryPoolStock) : undefined,
      minQuantity,
      href: `/products/${product.slug}`,
      quantity: qty,
      purchaseMode,
      readyToShip: product.readyToShip === true,
      customizable: product.customizable === true,
      madeInUSA:
        product.madeInUSA === true &&
        product.claimVerified === true &&
        Boolean(product.claimEvidenceReference),
      largeEquipment: product.largeEquipment === true,
      deliveryProfile: isWholesale ? 'custom' : product.readyToShip ? 'ready' : 'standard',
    } as CartItem);
    trackEvent('add_to_cart', {
      item_id: product.id,
      item_name: pick(product.name as { en?: string; ar?: string }),
      quantity: qty,
      purchase_mode: purchaseMode,
      value: activePrice * qty,
    });
    window.setTimeout(() => setAdding(false), 250);
  };

  const guide = product.sizeGuide ? getSizeGuide(String(product.sizeGuide || '')) : null;
  const related = relatedProducts(product) as CatalogProduct[];
  const recent = ids
    .filter((id) => id !== product.id)
    .map((id) => getProductById(String(id)))
    .filter((item): item is CatalogProduct => Boolean(item))
    .slice(0, 4);
  const shippingCopy = showReady
    ? pick({
        en: 'Ready in Libya · estimated delivery 24–72 hours.',
        ar: 'متوفر داخل ليبيا · التوصيل المتوقع خلال 24–72 ساعة.',
      })
    : isWholesale
      ? pick({
          en: 'Wholesale timing and payment terms are confirmed in the approved quote for the product, quantity and destination.',
          ar: 'يتم تأكيد مدة الجملة وشروط الدفع في عرض السعر المعتمد حسب المنتج والكمية والوجهة.',
        })
      : isLibya
        ? pick({
            en: 'Estimated delivery to Libya: 14–18 days.',
            ar: 'التوصيل المتوقع إلى ليبيا: 14–18 يومًا.',
          })
        : pick({
            en: 'Worldwide shipping is available. Price and delivery time are confirmed for each destination; the order stays pending until shipping is added.',
            ar: 'الشحن متاح لجميع دول العالم. يتم تأكيد السعر والمدة لكل وجهة، ويبقى الطلب قيد الانتظار حتى إضافة تكلفة الشحن.',
          });

  const featureList = asFeatureList(product, lang);

  const details = [
    product.material && { title: productCopy.material, content: <p>{pick(product.material as { en?: string; ar?: string })}</p> },
    product.fit && { title: productCopy.fit, content: <p>{pick(product.fit as { en?: string; ar?: string })}</p> },
    product.care && { title: productCopy.care, content: <p>{pick(product.care as { en?: string; ar?: string })}</p> },
    featureList.length > 0 && {
      title: productCopy.features,
      content: (
        <ul className="tick-list">
          {featureList.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      ),
    },
    { title: productCopy.shipping, content: <p>{shippingCopy}</p> },
  ].filter((entry): entry is { title: string; content: ReactElement } => Boolean(entry));

  const purchasable = !comingSoon && !soldOut && !quoteOnly;

  const canUseAdvancedViewer = ['SPIN_360', 'MODEL_3D', 'VIDEO_GALLERY', 'HYBRID'].includes(mediaMode);
  const selectedColor = colors.find((entry) => entry.key === color);
  const shareTitle = pick(product.name as { en?: string; ar?: string });

  return (
    <>
      <Seo
        title={String(
          pick((product.seoTitle as { en?: string; ar?: string }) || {}) ||
            shareTitle ||
            '',
        )}
        description={String(
          pick((product.seoDescription as { en?: string; ar?: string }) || {}) ||
            pick(product.description as { en?: string; ar?: string }) ||
            '',
        )}
        path={`/products/${String(product.slug || '')}`}
        image={String(product.socialImage || product.image || '')}
        type="product"
      />

      <main className="pdx-page">
        <div className="pdx-breadcrumb">
          <Breadcrumbs items={crumbs} />
        </div>

        <section className="pdx-main" aria-labelledby="pdx-product-title">
          <div className="pdx-media" aria-label={pick({ en: 'Product media', ar: 'صور المنتج' })}>
            <div className="pdx-gallery-shell">
              <div className="pdx-gallery-stage">
                {canUseAdvancedViewer ? (
                  <div className="pdx-media-cell pdx-media-cell--viewer" data-media-mode={mediaMode}>
                    <ProductMediaViewer product={product} eager />
                  </div>
                ) : gallery.length ? (
                  <button
                    type="button"
                    className="pdx-gallery-main"
                    onClick={() => setLightboxOpen(true)}
                    aria-label={pick({ en: 'Open product gallery', ar: 'افتح معرض صور المنتج' })}
                  >
                    <img
                      src={gallery[activeImg] || gallery[0]}
                      alt={`${shareTitle} ${activeImg + 1}`}
                      width="1200"
                      height="1500"
                      loading="eager"
                      decoding="async"
                    />
                  </button>
                ) : null}
                {!canUseAdvancedViewer && gallery.length > 1 ? (
                  <>
                    <button type="button" className="pdx-gallery-arrow pdx-gallery-arrow--prev" onClick={() => setActiveImg((current) => (current - 1 + gallery.length) % gallery.length)} aria-label={pick({ en: 'Previous image', ar: 'الصورة السابقة' })}>‹</button>
                    <button type="button" className="pdx-gallery-arrow pdx-gallery-arrow--next" onClick={() => setActiveImg((current) => (current + 1) % gallery.length)} aria-label={pick({ en: 'Next image', ar: 'الصورة التالية' })}>›</button>
                    <span className="pdx-gallery-count">{activeImg + 1} / {gallery.length}</span>
                  </>
                ) : null}
              </div>
              {!canUseAdvancedViewer && gallery.length > 1 ? (
                <div className="pdx-gallery-thumbs" role="list" aria-label={pick({ en: 'Product images', ar: 'صور المنتج' })}>
                  {gallery.map((src, imageIndex) => (
                    <button key={`${src}-${imageIndex}`} type="button" className={imageIndex === activeImg ? 'is-active' : ''} onClick={() => setActiveImg(imageIndex)} aria-label={pick({ en: `Show image ${imageIndex + 1}`, ar: `اعرض الصورة ${imageIndex + 1}` })}>
                      <img src={src} alt="" width="120" height="150" loading="lazy" decoding="async" />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <aside className="pdx-buy">
            <div className="pdx-identity">
              <div className="pdx-title-line">
                <div>
                  <p className="pdx-brand">{product.brand}</p>
                  <h1 id="pdx-product-title">{shareTitle}</h1>
                  {selectedColor ? (
                    <p className="pdx-color-name">
                      {pick(selectedColor.name || { en: selectedColor.key, ar: selectedColor.key })}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  className={`pdx-heart${wishlist.has(product.id) ? ' is-active' : ''}`}
                  aria-label={pick({ en: 'Save product', ar: 'حفظ المنتج' })}
                  aria-pressed={wishlist.has(product.id)}
                  onClick={() => wishlist.toggle(product.id)}
                >
                  <Icon name="heart" size={22} />
                </button>
              </div>

              <div className="pdx-price-row">
                {comingSoon ? (
                  <Badge tone="limited">{pick({ en: 'Coming Soon', ar: 'قريباً' })}</Badge>
                ) : quoteOnly ? (
                  <strong>{pick({ en: 'Price on request', ar: 'السعر عند الطلب' })}</strong>
                ) : (
                  <Price amount={activePrice} compareAt={activeCompareAt} size="lg" />
                )}
              </div>

              <div className="pdx-status-row">
                {showReady ? (
                  <span className="pdx-ready"><i className="ready-dot" />{pick({ en: 'Verified stock in Libya', ar: 'مخزون موثق داخل ليبيا' })}</span>
                ) : null}
                {!comingSoon && !soldOut && onSale ? <Badge tone="sale">{badge.sale || 'Sale'}</Badge> : null}
                {!comingSoon && !soldOut && product.newArrival ? <Badge tone="new">{badge.new || 'New'}</Badge> : null}
              </div>

              <p className="pdx-description">{pick(product.description as { en?: string; ar?: string })}</p>
            </div>

            {purchasable && Boolean(product.wholesaleAvailable) ? (
              <div className="pdx-option-block">
                <div className="pdx-option-head">
                  <strong>{pick({ en: 'Purchase type', ar: 'نوع الشراء' })}</strong>
                </div>
                <div className="pdx-mode-grid" role="group" aria-label={pick({ en: 'Purchase type', ar: 'نوع الشراء' })}>
                  <button type="button" className={purchaseMode === 'retail' ? 'is-active' : ''} aria-pressed={purchaseMode === 'retail'} onClick={() => changeMode('retail')}>
                    <span>{pick({ en: 'Single item', ar: 'بالقطعة' })}</span><Price amount={retailPrice} size="sm" />
                  </button>
                  <button type="button" className={purchaseMode === 'wholesale' ? 'is-active' : ''} aria-pressed={purchaseMode === 'wholesale'} onClick={() => changeMode('wholesale')}>
                    <span>{pick({ en: 'Wholesale', ar: 'جملة' })}</span><Price amount={wholesalePrice || retailPrice} size="sm" />
                  </button>
                </div>
              </div>
            ) : null}

            {purchasable && colors.length > 0 ? (
              <div className="pdx-option-block">
                <div className="pdx-option-head">
                  <strong>{common.color || pick({ en: 'Color', ar: 'اللون' })}</strong>
                  {selectedColor ? <span>{pick(selectedColor.name || { en: selectedColor.key, ar: selectedColor.key })}</span> : null}
                </div>
                <div className="pdx-colors" role="group" aria-label={common.color || 'Color'}>
                  {colors.map((entry) => (
                    <button
                      key={entry.key}
                      type="button"
                      className={entry.key === color ? 'is-active' : ''}
                      onClick={() => {
                        setColor(entry.key);
                        setActiveImg(0);
                        setError('');
                        const nextParams = new URLSearchParams(searchParams);
                        nextParams.set('color', entry.key);
                        setSearchParams(nextParams);
                      }}
                      aria-label={pick(entry.name || { en: entry.key, ar: entry.key })}
                      aria-pressed={entry.key === color}
                    >
                      <ColorSwatch color={entry.hex || '#777777'} className="pdx-color-swatch" />
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {purchasable && needsSize ? (
              <div className="pdx-option-block">
                <div className="pdx-option-head">
                  <strong>{common.size || pick({ en: 'Size', ar: 'المقاس' })}</strong>
                  {guide ? (
                    <button type="button" className="pdx-text-link" onClick={() => setGuideOpen(true)}>
                      {productCopy.sizeGuide || pick({ en: 'Size guide', ar: 'دليل المقاسات' })}
                    </button>
                  ) : null}
                </div>
                <div className="pdx-sizes" role="group" aria-label={common.size || 'Size'}>
                  {sizes.map((entry) => {
                    const available = stockForSize(entry) > 0;
                    return (
                      <button
                        key={entry}
                        type="button"
                        className={entry === size ? 'is-active' : ''}
                        disabled={!available}
                        onClick={() => { setSize(entry); setError(''); }}
                        aria-pressed={entry === size}
                      >
                        {entry}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {purchasable ? (
              <div className="pdx-purchase">
                {isWholesale || qty > 1 ? (
                  <label className="pdx-quantity">
                    <span>{pick({ en: 'Quantity', ar: 'الكمية' })}</span>
                    <input
                      type="number"
                      min={minQuantity}
                      max={Math.max(maxStock, minQuantity)}
                      value={qty}
                      onChange={(event) => setQty(Math.max(minQuantity, Number(event.target.value) || minQuantity))}
                    />
                  </label>
                ) : null}
                <button type="button" className="pdx-add" onClick={addToCart} disabled={adding}>
                  {adding
                    ? pick({ en: 'Adding…', ar: 'جارٍ الإضافة…' })
                    : productCopy.addToCart || pick({ en: 'Add to bag', ar: 'أضف إلى الحقيبة' })}
                </button>
                {matchedVariant && low && Number(matchedVariant.stock || 0) > 0 ? <p className="stock-note">{productCopy.lowStock}</p> : null}
                {isWholesale ? (
                  <p className="minimum-note">{pick({ en: `Wholesale price applies from ${minQuantity} units.`, ar: `يطبق سعر الجملة ابتداءً من ${minQuantity} قطع.` })}</p>
                ) : null}
                {error ? <p className="form-error" role="alert">{error}</p> : null}
              </div>
            ) : null}

            {quoteOnly ? (
              <div className="pdx-quote">
                <p>{pick({ en: 'This product is available by confirmed quote. Request the final price and order details before checkout.', ar: 'هذا المنتج متوفر بعرض سعر مؤكد. اطلب السعر النهائي وتفاصيل الطلب قبل إتمام الشراء.' })}</p>
                <Link to={`/teams-wholesale?product=${encodeURIComponent(String(product.slug || ''))}#quote`} className="pdx-add">
                  {pick({ en: 'Request a quote', ar: 'اطلب عرض سعر' })}
                </Link>
              </div>
            ) : null}

            {(comingSoon || soldOut) ? (
              <div className="pdx-unavailable">
                <strong>{comingSoon ? pick({ en: 'Coming soon', ar: 'قريباً' }) : pick({ en: 'Currently unavailable', ar: 'غير متوفر حالياً' })}</strong>
                <button type="button" className="pdx-secondary" onClick={() => wishlist.toggle(product.id)}>
                  <Icon name="heart" size={20} /> {pick({ en: 'Save for later', ar: 'احفظه لاحقاً' })}
                </button>
              </div>
            ) : null}

            <div className="pdx-delivery">
              <strong>{pick({ en: 'Delivery', ar: 'التوصيل' })}</strong>
              <p>{shippingCopy}</p>
              {Boolean(product.customizable) ? (
                <Link to={`/customize?product=${product.slug}`} className="pdx-text-link">
                  {pick({ en: 'Customize this product', ar: 'خصص هذا المنتج' })}
                </Link>
              ) : null}
            </div>

            <div className="pdx-details">
              {details.map((entry) => (
                <details key={entry.title}>
                  <summary>{entry.title}</summary>
                  <div>{entry.content}</div>
                </details>
              ))}
            </div>

            <div className="pdx-utility-actions">
              <button
                type="button"
                className={`pdx-compare-action${compare.has(product.id) ? ' is-active' : ''}`}
                onClick={() => compare.toggle(product.id)}
              >
                <Icon name="compare" size={18} />
                <span>{pick({ en: compare.has(product.id) ? 'Remove from compare' : 'Compare product', ar: compare.has(product.id) ? 'إزالة من المقارنة' : 'قارن المنتج' })}</span>
              </button>
              <div className="pdx-share-block">
                <ShareButtons title={shareTitle} text={pick(product.description as { en?: string; ar?: string })} label={productCopy.share} />
              </div>
            </div>
          </aside>
        </section>

        {isBasketballPerformanceShoe(product) ? <PerformanceProfile product={product} /> : null}

        {(product.material || product.features) ? (
          <section className="px-technology" aria-labelledby="px-technology-title">
            <div className="px-section-head">
              <p className="px-eyebrow">{pick({ en: 'Product intelligence', ar: 'معلومات المنتج' })}</p>
              <h2 id="px-technology-title">{pick({ en: 'The details that matter.', ar: 'التفاصيل التي تهمك.' })}</h2>
            </div>
            <div className="px-technology-grid">
              {product.material ? <article><span>{pick({ en: 'Material', ar: 'الخامة' })}</span><p>{pick(product.material as { en?: string; ar?: string })}</p></article> : null}
              {product.fit ? <article><span>{pick({ en: 'Fit', ar: 'القَصّة' })}</span><p>{pick(product.fit as { en?: string; ar?: string })}</p></article> : null}
              {featureList.length ? <article><span>{pick({ en: 'Features', ar: 'المزايا' })}</span><p>{featureList.join(' · ')}</p></article> : null}
            </div>
          </section>
        ) : null}

        {related.length > 0 ? (
          <section className="pdx-related">
            <div className="pdx-section-head"><p>{pick({ en: 'More to explore', ar: 'اكتشف المزيد' })}</p><h2>{productCopy.related || pick({ en: 'Related products', ar: 'منتجات مرتبطة' })}</h2></div>
            <div className="pdx-related-rail">
              {related.map((item) => <ProductCard key={String(item?.id)} product={item || {}} />)}
            </div>
          </section>
        ) : null}

        <Recommendations current={product} />

        {recent.length > 0 ? (
          <section className="pdx-related pdx-recent">
            <div className="pdx-section-head"><p>{pick({ en: 'Recently viewed', ar: 'شاهدتها مؤخراً' })}</p><h2>{productCopy.recentlyViewed || pick({ en: 'Your recent products', ar: 'منتجاتك الأخيرة' })}</h2></div>
            <div className="pdx-related-rail">
              {recent.map((item) => <ProductCard key={String(item?.id)} product={item || {}} />)}
            </div>
          </section>
        ) : null}
      </main>

      {purchasable ? (
        <div className="pdx-mobile-buybar">
          <Price amount={activePrice} size="sm" />
          <button type="button" className="pdx-add" onClick={addToCart} disabled={adding}>
            {productCopy.addToCart || pick({ en: 'Add to bag', ar: 'أضف إلى الحقيبة' })}
          </button>
        </div>
      ) : null}

      <MediaLightbox open={lightboxOpen} onClose={() => setLightboxOpen(false)} items={gallery} index={activeImg} onIndexChange={setActiveImg} label={shareTitle} />
      {guide ? (
        <Modal open={guideOpen} onClose={() => setGuideOpen(false)} title={pick(guide.title)}>
          <SizeGuideTable guide={guide} lang={lang} />
        </Modal>
      ) : null}
    </>
  );
}

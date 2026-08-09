import type { ReactElement } from 'react';
import type { CatalogProduct } from '../context/CatalogContext';
import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useCinematicOpening } from '../hooks/useCinematicOpening';
import { useCommerce } from '../context/CommerceContext';
import { useCart, cartKey } from '../context/CartContext';
import { useRecentlyViewed } from '../hooks/useRecentlyViewed';
import { trackEvent } from '../utils/analytics';
import Seo from '../components/common/Seo';
import { resolveProductViewer } from '../utils/productViewerTier';
import Breadcrumbs from '../components/common/Breadcrumbs';
import Price from '../components/common/Price';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import ShareButtons from '../components/common/ShareButtons';
import ProductCard from '../components/shop/ProductCard';
import { ColorSelector, SizeSelector } from '../components/shop/VariantSelector';
import { useCatalog } from '../context/CatalogContext';
import { getCategory, getSubcategory } from '../data/categories';
import { getSizeGuide } from '../data/sizeGuide';
import NotFoundPage from './NotFoundPage';
import MediaLightbox from '../components/media/MediaLightbox';
import { useCompare } from '../context/CompareContext';
import Recommendations from '../components/recommendations/Recommendations';
import { useWishlist } from '../hooks/useWishlist';
import Icon from '../components/icons/Icon';
import PurchaseActions from '../components/shop/PurchaseActions';
import ViewingTierNote from '../components/product/ViewingTierNote';
import ProductMediaViewer from '../components/product/ProductMediaViewer';
import '../styles/stage.css';
import '../styles/catalogue.css';
import { getVariantPurchaseLimit, isVariantPurchasable } from '../utils/productEligibility';
import '../styles/catalog.css';

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
  // Full-bleed dark opening: the header floats over it, transparent.
  useCinematicOpening();

  const viewerTier = resolveProductViewer(product).tier;

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
    } as never);
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
          en: 'Wholesale estimate: 30–60 days. 50% before production and 50% when the goods arrive.',
          ar: 'المدة التقديرية للجملة: 30–60 يومًا. 50% قبل التصنيع و50% عند وصول البضاعة.',
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

  const details = [
    product.material && { title: productCopy.material, content: <p>{pick(product.material as { en?: string; ar?: string })}</p> },
    product.fit && { title: productCopy.fit, content: <p>{pick(product.fit as { en?: string; ar?: string })}</p> },
    product.care && { title: productCopy.care, content: <p>{pick(product.care as { en?: string; ar?: string })}</p> },
    (Array.isArray(product.features) ? product.features : []).length > 0 && {
      title: productCopy.features,
      content: (
        <ul className="tick-list">
          {(Array.isArray(product.features) ? product.features : []).map((feature: unknown) => (
            <li key={String(feature)}>{String(feature)}</li>
          ))}
        </ul>
      ),
    },
    { title: productCopy.shipping, content: <p>{shippingCopy}</p> },
  ].filter((entry): entry is { title: string; content: ReactElement } => Boolean(entry));

  // The badge set is composed once and placed on the stage, not scattered.
  const stageBadges = [
    comingSoon && {
      key: 'soon',
      node: <Badge tone="limited">{pick({ en: 'Coming Soon', ar: 'قريباً' })}</Badge>,
    },
    !comingSoon && soldOut && { key: 'sold', node: <Badge tone="sold">{badge.soldOut}</Badge> },
    !comingSoon &&
      !soldOut &&
      showReady && {
        key: 'ready',
        node: (
          <span className="ready-badge">
            <i className="ready-dot" />
            {pick({ en: 'Ready to Ship', ar: 'تسليم فوري' })}
          </span>
        ),
      },
    !comingSoon &&
      !soldOut &&
      onSale && { key: 'sale', node: <Badge tone="sale">{badge.sale || ''}</Badge> },
    !comingSoon &&
      !soldOut &&
      product.newArrival && { key: 'new', node: <Badge tone="new">{badge.new || ''}</Badge> },
  ].filter((entry): entry is { key: string; node: ReactElement } => Boolean(entry));

  const purchasable = !comingSoon && !soldOut && !quoteOnly;

  return (
    <>
      <Seo
        title={String(
          pick((product.seoTitle as { en?: string; ar?: string }) || {}) ||
            pick(product.name as { en?: string; ar?: string }) ||
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

      {/* ================================================================
          1 — THE STAGE
          The product is the room, not a thumbnail beside a form. A dark
          chapter carrying the viewer full-bleed, the trail and identity as
          overlaid specification, and the angle register beneath it.
          ================================================================ */}
      <section className="gw-stage" aria-labelledby="gw-product-title">
        {/* The viewer is the stage, not a column of it. It fills the section
            edge to edge; identity, trail and the angle register are overlaid on
            top of it. Nothing sits beside it competing for the same width. */}
        <div className="gw-stage-canvas" data-tier={viewerTier}>
          {/*
            The adaptive ProductViewer is the stage. Levels A/B/C/D are chosen
            by verified assets — never by inventing a spin from one photograph.
            Full-screen remains available for the current gallery frame.
          */}
          <div className="gw-stage-viewer">
            <ProductMediaViewer product={product} eager />
          </div>
          <button
            type="button"
            className="gw-stage-zoom"
            onClick={() => setLightboxOpen(true)}
            aria-label={pick({ en: 'View full screen', ar: 'عرض بملء الشاشة' })}
          >
            <Icon name="search" />
            {pick({ en: 'Full screen', ar: 'ملء الشاشة' })}
          </button>
        </div>

        {/* Identity, overlaid on the stage at the leading foot. */}
        <div className="gw-stage-overlay">
          <div className="gw-stage-trail">
            <Breadcrumbs items={crumbs} />
          </div>
          <p className="gw-spec gw-stage-origin">
            {product.brand}
            {sub ? ` \u00b7 ${pick(sub.name)}` : ''}
          </p>
          <h1 id="gw-product-title" className="gw-stage-title">
            {pick(product.name as { en?: string; ar?: string })}
          </h1>
          <p className="gw-spec gw-stage-sku">
            {productCopy.sku}:{' '}
            <span className="gw-isolate-ltr">{String(matchedVariant?.sku || product.sku || '')}</span>
          </p>
          {stageBadges.length > 0 && (
            <div className="gw-stage-badges">
              {stageBadges
                .filter((badge): badge is { key: string; node: ReactElement } => Boolean(badge))
                .map((badge) => (
                  <span key={badge.key}>{badge.node}</span>
                ))}
            </div>
          )}
        </div>

        {/* The honest tier disclosure sits on the stage it describes. */}
        <div className="gw-stage-tier">
          <ViewingTierNote product={product} />
        </div>
      </section>

      {/* ================================================================
          2 — THE DECK
          Commerce controls as an instrument deck on a light ground, with
          the specification beside them rather than hidden in an accordion.
          ================================================================ */}
      <section className="gw-deck">
        <div className="gw-deck-inner">
          <div className="gw-deck-buy">
            <div className="gw-deck-price">
              {comingSoon ? (
                <span className="status-pill">{pick({ en: 'Coming Soon', ar: 'قريباً' })}</span>
              ) : quoteOnly ? (
                <span className="status-pill">
                  {pick({ en: 'Price by quote', ar: 'السعر حسب عرض الطلب' })}
                </span>
              ) : (
                <Price amount={activePrice} compareAt={activeCompareAt} size="lg" />
              )}
            </div>

            <p className="gw-deck-desc">{pick(product.description as { en?: string; ar?: string })}</p>

            {purchasable && Boolean(product.wholesaleAvailable) && (
              <div
                className="gw-mode"
                role="group"
                aria-label={pick({ en: 'Purchase type', ar: 'نوع الشراء' })}
              >
                <button
                  type="button"
                  className={`gw-mode-option${purchaseMode === 'retail' ? ' is-active' : ''}`}
                  aria-pressed={purchaseMode === 'retail'}
                  onClick={() => changeMode('retail')}
                >
                  <span className="gw-spec">{pick({ en: 'By the piece', ar: 'بالقطعة' })}</span>
                  <Price amount={retailPrice} size="sm" />
                </button>
                <button
                  type="button"
                  className={`gw-mode-option${purchaseMode === 'wholesale' ? ' is-active' : ''}`}
                  aria-pressed={purchaseMode === 'wholesale'}
                  onClick={() => changeMode('wholesale')}
                >
                  <span className="gw-spec">{pick({ en: 'Wholesale', ar: 'جملة' })}</span>
                  <span>
                    <Price amount={wholesalePrice || retailPrice} size="sm" />
                    {' · '}
                    {pick({
                      en: `Min. ${product.wholesaleMin || 1}`,
                      ar: `أقل كمية ${product.wholesaleMin || 1}`,
                    })}
                  </span>
                </button>
              </div>
            )}

            {purchasable && (
              <>
                <ColorSelector
                  colors={colors}
                  value={color}
                  onChange={(next) => {
                    setColor(next);
                    setActiveImg(0);
                    setError('');
                    {
                      const nextParams = new URLSearchParams(searchParams);
                      nextParams.set('color', next);
                      setSearchParams(nextParams);
                    }
                  }}
                />
                {needsSize && (
                  <div className="gw-size-block">
                    <div className="gw-size-head">
                      <span className="variant-label">{common.size}</span>
                      {guide && (
                        <button
                          type="button"
                          className="link-btn"
                          onClick={() => setGuideOpen(true)}
                        >
                          <Icon name="ruler" size={21} />
                          {productCopy.sizeGuide}
                        </button>
                      )}
                    </div>
                    <SizeSelector
                      sizes={sizes}
                      value={size}
                      onChange={(next) => {
                        setSize(next);
                        setError('');
                      }}
                      stockFor={stockForSize}
                    />
                  </div>
                )}
                {matchedVariant && low && Number(matchedVariant.stock || 0) > 0 && (
                  <p className="stock-note">{productCopy.lowStock}</p>
                )}
                <PurchaseActions
                  quantity={qty}
                  onQuantityChange={setQty}
                  min={minQuantity}
                  max={Math.max(maxStock, minQuantity)}
                  onAdd={addToCart}
                  addDisabled={!matchedVariant || !isVariantPurchasable(product, matchedVariant)}
                  adding={adding}
                  favorite={wishlist.has(product.id)}
                  onFavorite={() => wishlist.toggle(product.id)}
                />
                {isWholesale && (
                  <p className="minimum-note">
                    {pick({
                      en: `Wholesale price applies from ${minQuantity} units.`,
                      ar: `يطبق سعر الجملة ابتداءً من ${minQuantity} قطع.`,
                    })}
                  </p>
                )}
                {error && (
                  <p className="form-error" role="alert">
                    {error}
                  </p>
                )}
              </>
            )}

            {quoteOnly && (
              <div className="gw-deck-quote">
                <p>
                  {pick({
                    en: 'This product requires a technical and shipping quote. Minimum order: 1.',
                    ar: 'هذا المنتج يحتاج عرض سعر فني وحساب شحن. الحد الأدنى للطلب: 1.',
                  })}
                </p>
                <Link
                  to={`/teams-wholesale?product=${encodeURIComponent(String(product.slug || ''))}#quote`}
                  className="gw-btn gw-btn--primary"
                >
                  {pick({ en: 'Request a Quote', ar: 'اطلب عرض سعر' })}
                </Link>
              </div>
            )}

            {(comingSoon || soldOut) && (
              <PurchaseActions
                quantity={1}
                showQuantity={false}
                onAdd={() => {}}
                addDisabled
                favorite={wishlist.has(product.id)}
                onFavorite={() => wishlist.toggle(product.id)}
              />
            )}

            <div className="gw-deck-secondary">
              <button
                type="button"
                className={`gw-deck-compare${compare.has(product.id) ? ' is-active' : ''}`}
                onClick={() => compare.toggle(product.id)}
              >
                {pick({
                  en: compare.has(product.id) ? 'Remove from compare' : 'Compare product',
                  ar: compare.has(product.id) ? 'إزالة من المقارنة' : 'قارن المنتج',
                })}
              </button>
              <ShareButtons
                title={pick(product.name as { en?: string; ar?: string })}
                text={pick(product.description as { en?: string; ar?: string })}
                label={productCopy.share}
              />
            </div>
          </div>

          {/* Fulfilment and specification as open plates, not an accordion.
              A customer deciding on a 400 LYD uniform should not have to
              click to discover the fabric or the delivery window. */}
          <div className="gw-deck-spec">
            <div className={`gw-fulfilment${showReady ? ' is-ready' : ''}`}>
              <p className="gw-spec">{pick({ en: 'Fulfilment', ar: 'التسليم' })}</p>
              {showReady && (
                <strong className="gw-fulfilment-ready">
                  <i className="ready-dot" />
                  {pick({ en: 'Ready to Ship in Libya', ar: 'متوفر للتسليم الفوري داخل ليبيا' })}
                </strong>
              )}
              <p>{shippingCopy}</p>
              {Boolean(product.madeInUSA) &&
                product.claimVerified === true &&
                Boolean(product.claimEvidenceReference) && (
                  <p className="gw-fulfilment-origin">
                    {pick({
                      en: 'Made in USA · Shababuna manufactured apparel',
                      ar: 'صُنع في الولايات المتحدة · من تصنيع شبابنا للملابس',
                    })}
                  </p>
                )}
              {Boolean(product.customizable) && (
                <Link to={`/customize?product=${product.slug}`} className="gw-fulfilment-link">
                  {pick({ en: 'Customize this product', ar: 'صمّم هذا المنتج' })} →
                </Link>
              )}
            </div>

            {details.map((entry) => (
              <div className="gw-specplate" key={entry.title}>
                <p className="gw-spec">{entry.title}</p>
                <div className="gw-specplate-body">{entry.content}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* A sticky commit bar on mobile, so the price and the action are never
          scrolled away from each other. */}
      {purchasable && (
        <div className="gw-buybar" aria-hidden="true">
          <div className="gw-buybar-price">
            <Price amount={activePrice} size="sm" />
          </div>
          <button
            type="button"
            className="gw-btn gw-btn--primary"
            onClick={addToCart}
            tabIndex={-1}
          >
            {productCopy.addToCart || pick({ en: 'Add to bag', ar: 'أضف إلى الحقيبة' })}
          </button>
        </div>
      )}

      <MediaLightbox
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        items={gallery}
        index={activeImg}
        onIndexChange={setActiveImg}
        label={pick(product.name as { en?: string; ar?: string })}
      />
      {guide && (
        <Modal open={guideOpen} onClose={() => setGuideOpen(false)} title={pick(guide.title)}>
          <SizeGuideTable guide={guide} lang={lang} />
        </Modal>
      )}

      {/* ================================================================
          3 — THE CONTINUATION
          Related work presented as chapters rather than three identical
          grids stacked on each other.
          ================================================================ */}
      {related.length > 0 && (
        <section className="gw-continue gw-continue--maple">
          <div className="gw-continue-inner">
            <div className="gw-continue-head">
              <p className="gw-spec">{pick({ en: 'Continue', ar: 'تابع' })}</p>
              <h2 className="gw-continue-title">{productCopy.related}</h2>
            </div>
            <div className="gw-catalogue-grid">
              {related.map((item) => (
                <ProductCard key={String(item?.id)} product={(item || {}) as never} />
              ))}
            </div>
          </div>
        </section>
      )}
      <Recommendations current={product} />
      {recent.length > 0 && (
        <section className="gw-continue">
          <div className="gw-continue-inner">
            <div className="gw-continue-head">
              <p className="gw-spec">{pick({ en: 'Your trail', ar: 'مسارك' })}</p>
              <h2 className="gw-continue-title">{productCopy.recentlyViewed}</h2>
            </div>
            <div className="gw-catalogue-grid">
              {recent.map((item) => (
                <ProductCard key={String(item?.id)} product={(item || {}) as never} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

function SizeGuideTable({
  guide,
  lang,
}: {
  guide: {
    columns?: Array<string | { en?: string; ar?: string }>;
    rows?: unknown[][];
  };
  lang: string;
}): ReactElement {
  const columns = guide.columns || [];
  const rows = guide.rows || [];
  return (
    <div className="size-table-wrap">
      <table className="size-table">
        <thead>
          <tr>
            {columns.map((column, index) => (
              <th key={index}>
                {typeof column === 'string'
                  ? column
                  : String((column as Record<string, string>)[lang] ?? column.en ?? '')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {(row || []).map((cell, cellIndex) => (
                <td key={cellIndex}>{String(cell ?? '')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

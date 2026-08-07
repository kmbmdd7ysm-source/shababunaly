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
import SmartImage from '../components/common/SmartImage';
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

export default function ProductPage() {
  const { slug } = useParams();
  const { getProduct, getProductById, relatedProducts, isLowStock } = useCatalog();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, pick, lang } = useLanguage();
  const { countryCode } = useCommerce();
  const { addItem } = useCart();
  const compare = useCompare();
  const wishlist = useWishlist();
  const { ids, record } = useRecentlyViewed();
  const product = getProduct(slug);

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
    trackEvent('view_item', { item_id: product.id, item_name: pick(product.name) });
    const requestedColor = searchParams.get('color');
    const initialColor = product.colors.some((entry) => entry.key === requestedColor)
      ? requestedColor
      : product.colors[0]?.key || '';
    setColor(initialColor);
    setSize(product.sizes.length === 1 ? product.sizes[0] : '');
    setPurchaseMode('retail');
    setQty(1);
    setActiveImg(0);
    setError('');
  }, [slug]);

  /* Verified photography and a concept plate need different stage treatments:
     a photograph shot on white should read as a print laid on the stage, a
     transparent plate should read as a drawing floating in the light. */
  // Full-bleed dark opening: the header floats over it, transparent.
  useCinematicOpening();

  const viewerTier = resolveProductViewer(product).tier;

  const gallery = useMemo(() => {
    if (!product) return [];
    const selected = product.colors.find((entry) => entry.key === color);
    return [
      selected?.image || product.image,
      ...product.colors.map((entry) => entry.image).filter(Boolean),
      product.hoverImage,
      ...(product.gallery || []),
    ]
      .filter(Boolean)
      .filter((src, index, list) => list.indexOf(src) === index);
  }, [product, color]);

  if (!product) return <NotFoundPage />;

  const needsColor = product.colors.length > 1;
  const needsSize = !(product.sizes.length === 1 && product.sizes[0] === 'OS');
  const matchedVariant =
    product.variants.find(
      (variant) =>
        (!needsColor || variant.color === color) && (!needsSize || variant.size === size),
    ) || null;
  const stockForSize = (requestedSize) => {
    const matching = product.variants.filter(
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

  const cat = getCategory(product.category);
  const sub = getSubcategory(product.category, product.subcategory);
  const crumbs = [
    { label: t.nav.shop, to: '/shop' },
    ...(cat ? [{ label: pick(cat.name), to: `/shop/${product.category}` }] : []),
    ...(sub
      ? [{ label: pick(sub.name), to: `/shop/${product.category}/${product.subcategory}` }]
      : []),
    { label: pick(product.name) },
  ];

  const changeMode = (mode) => {
    setPurchaseMode(mode);
    const nextMin = mode === 'wholesale' ? Number(product.wholesaleMin || 1) : 1;
    setQty(nextMin);
    setError('');
  };

  const addToCart = () => {
    if (soldOut || comingSoon || quoteOnly || adding) return;
    if (needsColor && !color) return setError(t.product.chooseColor);
    if (needsSize && !size) return setError(t.product.chooseSize);
    if (!matchedVariant || !isVariantPurchasable(product, matchedVariant))
      return setError(t.common.outOfStock);
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
    });
    trackEvent('add_to_cart', {
      item_id: product.id,
      item_name: pick(product.name),
      quantity: qty,
      purchase_mode: purchaseMode,
      value: activePrice * qty,
    });
    window.setTimeout(() => setAdding(false), 250);
  };

  const guide = product.sizeGuide ? getSizeGuide(product.sizeGuide) : null;
  const related = relatedProducts(product);
  const recent = ids
    .filter((id) => id !== product.id)
    .map(getProductById)
    .filter(Boolean)
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
    product.material && { title: t.product.material, content: <p>{pick(product.material)}</p> },
    product.fit && { title: t.product.fit, content: <p>{pick(product.fit)}</p> },
    product.care && { title: t.product.care, content: <p>{pick(product.care)}</p> },
    (pick(product.features) || []).length > 0 && {
      title: t.product.features,
      content: (
        <ul className="tick-list">
          {pick(product.features).map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      ),
    },
    { title: t.product.shipping, content: <p>{shippingCopy}</p> },
  ].filter(Boolean);

  // The badge set is composed once and placed on the stage, not scattered.
  const stageBadges = [
    comingSoon && {
      key: 'soon',
      node: <Badge tone="limited">{pick({ en: 'Coming Soon', ar: 'قريباً' })}</Badge>,
    },
    !comingSoon && soldOut && { key: 'sold', node: <Badge tone="sold">{t.badge.soldOut}</Badge> },
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
      onSale && { key: 'sale', node: <Badge tone="sale">{t.badge.sale}</Badge> },
    !comingSoon &&
      !soldOut &&
      product.newArrival && { key: 'new', node: <Badge tone="new">{t.badge.new}</Badge> },
  ].filter(Boolean);

  const purchasable = !comingSoon && !soldOut && !quoteOnly;

  return (
    <>
      <Seo
        title={pick(product.seoTitle) || pick(product.name)}
        description={pick(product.seoDescription) || pick(product.description)}
        path={`/products/${product.slug}`}
        image={product.socialImage || product.image}
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
            {pick(product.name)}
          </h1>
          <p className="gw-spec gw-stage-sku">
            {t.product.sku}:{' '}
            <span className="gw-isolate-ltr">{matchedVariant?.sku || product.sku}</span>
          </p>
          {stageBadges.length > 0 && (
            <div className="gw-stage-badges">
              {stageBadges.map((badge) => (
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

            <p className="gw-deck-desc">{pick(product.description)}</p>

            {purchasable && product.wholesaleAvailable && (
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
                  colors={product.colors}
                  value={color}
                  onChange={(next) => {
                    setColor(next);
                    setActiveImg(0);
                    setError('');
                    setSearchParams(
                      (params) => {
                        params.set('color', next);
                        return params;
                      },
                      { replace: true },
                    );
                  }}
                />
                {needsSize && (
                  <div className="gw-size-block">
                    <div className="gw-size-head">
                      <span className="variant-label">{t.common.size}</span>
                      {guide && (
                        <button
                          type="button"
                          className="link-btn"
                          onClick={() => setGuideOpen(true)}
                        >
                          <Icon name="ruler" size={21} />
                          {t.product.sizeGuide}
                        </button>
                      )}
                    </div>
                    <SizeSelector
                      sizes={product.sizes}
                      value={size}
                      onChange={(next) => {
                        setSize(next);
                        setError('');
                      }}
                      stockFor={stockForSize}
                    />
                  </div>
                )}
                {matchedVariant && low && matchedVariant.stock > 0 && (
                  <p className="stock-note">{t.product.lowStock}</p>
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
                  to={`/teams-wholesale?product=${encodeURIComponent(product.slug)}#quote`}
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
                title={pick(product.name)}
                text={pick(product.description)}
                label={t.product.share}
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
              {product.madeInUSA &&
                product.claimVerified === true &&
                product.claimEvidenceReference && (
                  <p className="gw-fulfilment-origin">
                    {pick({
                      en: 'Made in USA · Shababuna manufactured apparel',
                      ar: 'صُنع في الولايات المتحدة · من تصنيع شبابنا للملابس',
                    })}
                  </p>
                )}
              {product.customizable && (
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
            {t.product.addToCart || pick({ en: 'Add to bag', ar: 'أضف إلى الحقيبة' })}
          </button>
        </div>
      )}

      <MediaLightbox
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        items={gallery}
        index={activeImg}
        onIndexChange={setActiveImg}
        label={pick(product.name)}
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
              <h2 className="gw-continue-title">{t.product.related}</h2>
            </div>
            <div className="gw-catalogue-grid">
              {related.map((item) => (
                <ProductCard key={item.id} product={item} />
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
              <h2 className="gw-continue-title">{t.product.recentlyViewed}</h2>
            </div>
            <div className="gw-catalogue-grid">
              {recent.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

function SizeGuideTable({ guide, lang }) {
  return (
    <div className="size-table-wrap">
      <table className="size-table">
        <thead>
          <tr>
            {guide.columns.map((column, index) => (
              <th key={index}>{column[lang] ?? column.en}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {guide.rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
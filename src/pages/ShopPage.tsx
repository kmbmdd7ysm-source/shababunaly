import type { ReactElement } from 'react';
import type { CatalogProduct } from '../context/CatalogContext';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useCommerce } from '../context/CommerceContext';
import Seo from '../components/common/Seo';
import EditorialMedia from '../components/common/EditorialMedia';
import Filters from '../components/shop/Filters';
import SortSelect from '../components/shop/SortSelect';
import ProductCard from '../components/shop/ProductCard';
import EmptyState from '../components/common/EmptyState';
import Icon from '../components/icons/Icon';
import { useCatalog } from '../context/CatalogContext';
import { categories, getCategory, getSubcategory } from '../data/categories';
import { CATEGORY_WORLDS, SHOP_CAMPAIGN } from '../data/merchandising';
import { lockDocumentScroll } from '../utils/scrollLock';
import { isReadyToShipEligible, type ProductLike } from '../utils/productEligibility';
import '../styles/design/phase2-shop.css';
import '../styles/design/phase2-commerce.css';

const asProductLike = (product: unknown): ProductLike => (product || {}) as ProductLike;
const numberOrNull = (value: unknown): number | null =>
  value === '' || value == null || Number.isNaN(Number(value)) ? null : Number(value);
const nameEn = (name: CatalogProduct['name']): string =>
  name && typeof name === 'object' ? String(name.en || '') : String(name || '');

export default function ShopPage(): ReactElement {
  const { category, subcategory } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, pick } = useLanguage();
  const common = (t.common || {}) as Record<string, string>;
  const shopCopy = (t.shop || {}) as Record<string, string>;
  const { countryCode } = useCommerce();
  const { products, featuredProducts } = useCatalog();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const cat = category ? getCategory(category) : null;
  const sub = cat && subcategory ? getSubcategory(String(category), String(subcategory)) : null;

  const filters = useMemo(
    () => ({
      category: category || '',
      subcategory: subcategory || '',
      sizes: params.getAll('size'),
      colors: params.getAll('color'),
      brands: params.getAll('brand'),
      productTypes: params.getAll('type'),
      priceMin: params.get('min') || '',
      priceMax: params.get('max') || '',
      inStock: params.get('instock') === '1',
      readyOnly: params.get('ready') === '1' || category === 'ready-to-ship',
      newOnly: params.get('new') === '1',
      bestOnly: params.get('best') === '1',
      customizableOnly: params.get('custom') === '1',
      q: params.get('q') || '',
    }),
    [category, subcategory, params],
  );
  const sort = params.get('sort') || 'featured';

  const updateParams = useCallback(
    (mutate: (query: URLSearchParams) => void) => {
      const next = new URLSearchParams(params);
      mutate(next);
      setParams(next);
    },
    [params, setParams],
  );

  const onChange = useCallback(
    (patch: Record<string, unknown>) => {
      if ('category' in patch || 'subcategory' in patch) {
        const nextCategory = 'category' in patch ? String(patch.category || '') : filters.category;
        const nextSubcategory = 'subcategory' in patch
          ? String(patch.subcategory || '')
          : 'category' in patch
            ? ''
            : filters.subcategory;
        const query = new URLSearchParams(params);
        if (nextCategory !== 'ready-to-ship') query.delete('ready');
        let path = '/shop';
        if (nextCategory) path += `/${nextCategory}`;
        if (nextCategory && nextSubcategory) path += `/${nextSubcategory}`;
        navigate(query.toString() ? `${path}?${query}` : path);
        return;
      }
      updateParams((query) => {
        Object.entries(patch).forEach(([key, value]) => {
          const arrayMap: Record<string, string> = { sizes: 'size', colors: 'color', brands: 'brand', productTypes: 'type' };
          if (arrayMap[key]) {
            const param = arrayMap[key];
            query.delete(param);
            (Array.isArray(value) ? value : []).forEach((entry) => query.append(param, String(entry)));
            return;
          }
          if (key === 'priceMin' || key === 'priceMax') {
            const param = key === 'priceMin' ? 'min' : 'max';
            if (value) query.set(param, String(value));
            else query.delete(param);
            return;
          }
          const booleanMap: Record<string, string> = {
            inStock: 'instock', readyOnly: 'ready', newOnly: 'new', bestOnly: 'best', customizableOnly: 'custom',
          };
          const param = booleanMap[key];
          if (param) {
            if (value) query.set(param, '1');
            else query.delete(param);
          }
        });
      });
    },
    [filters.category, filters.subcategory, navigate, params, updateParams],
  );

  const baseProducts = useMemo(
    () => (products as CatalogProduct[]).filter((product) => {
      if (category === 'ready-to-ship') return isReadyToShipEligible(asProductLike(product), 'LY');
      if (category && product.category !== category) return false;
      if (subcategory && product.subcategory !== subcategory) return false;
      return true;
    }),
    [category, subcategory, products],
  );

  const filtered = useMemo(() => {
    const min = numberOrNull(filters.priceMin);
    const max = numberOrNull(filters.priceMax);
    const query = filters.q.trim().toLowerCase();
    let list = baseProducts.filter((product) => {
      if (filters.sizes.length && !(product.sizes || []).some((size) => filters.sizes.includes(String(size)))) return false;
      if (filters.colors.length && !(product.colors || []).some((color) => filters.colors.includes(String(color.key)))) return false;
      if (filters.brands.length && !filters.brands.includes(String(product.brand || ''))) return false;
      if (filters.productTypes.length && !filters.productTypes.includes(String(product.productType || ''))) return false;
      if (min != null && Number(product.price || 0) < min) return false;
      if (max != null && Number(product.price || 0) > max) return false;
      if (filters.inStock && !(product.inventoryVerified === true && product.inventoryTracking === true && Number(product.stock) > 0)) return false;
      if (filters.readyOnly && !isReadyToShipEligible(asProductLike(product), 'LY')) return false;
      if (filters.newOnly && !product.newArrival) return false;
      if (filters.bestOnly && !product.bestSeller) return false;
      if (filters.customizableOnly && !product.customizable) return false;
      if (query) {
        const haystack = `${nameEn(product.name)} ${pick(product.description as { en?: string; ar?: string })} ${product.brand || ''} ${product.productType || ''}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
    if (sort === 'price-asc') list = [...list].sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    else if (sort === 'price-desc') list = [...list].sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    else if (sort === 'name-asc') list = [...list].sort((a, b) => nameEn(a.name).localeCompare(nameEn(b.name)));
    else if (sort === 'name-desc') list = [...list].sort((a, b) => nameEn(b.name).localeCompare(nameEn(a.name)));
    else if (sort === 'newest') list = [...list].sort((a, b) => Number(b.newArrival) - Number(a.newArrival));
    else list = [...list].sort((a, b) => Number(b.featured) - Number(a.featured) || Number(b.bestSeller) - Number(a.bestSeller));
    return list;
  }, [baseProducts, filters, pick, sort]);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const unlock = lockDocumentScroll();
    requestAnimationFrame(() => (drawerRef.current?.querySelector('button,input') as HTMLElement | null)?.focus());
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDrawerOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !drawerRef.current) return;
      const focusables = [...drawerRef.current.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])',
      )].filter((element) => !element.hidden && element.getAttribute('aria-hidden') !== 'true');
      const first = focusables[0];
      const last = focusables.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    const trigger = triggerRef.current;
    return () => {
      unlock();
      document.removeEventListener('keydown', onKey);
      trigger?.focus();
    };
  }, [drawerOpen]);

  const heading = sub ? pick(sub.name) : cat ? pick(cat.name) : pick({ en: 'Shop', ar: 'تسوق' });
  const path = sub ? `/shop/${category}/${subcategory}` : cat ? `/shop/${category}` : '/shop';
  const activeCount = filters.sizes.length + filters.colors.length + filters.brands.length + filters.productTypes.length
    + Number(filters.inStock) + Number(filters.readyOnly && category !== 'ready-to-ship') + Number(filters.newOnly)
    + Number(filters.bestOnly) + Number(filters.customizableOnly) + Number(Boolean(filters.priceMin)) + Number(Boolean(filters.priceMax));
  const world = CATEGORY_WORLDS.find((entry) => entry.slug === category);
  const showShopHero = !category && activeCount === 0 && sort === 'featured';
  const featured = featuredProducts().slice(0, 4);

  return (
    <>
      <Seo
        title={heading}
        description={pick({ en: 'Shop basketball footwear, apparel, accessories, basketballs and equipment.', ar: 'تسوق أحذية وملابس وإكسسوارات وكرات ومعدات كرة السلة.' })}
        path={path}
      />

      {showShopHero ? (
        <section className="s2-shop-hero" aria-labelledby="s2-shop-title">
          <EditorialMedia
            desktopMedia={SHOP_CAMPAIGN.desktopMedia}
            mobileMedia={SHOP_CAMPAIGN.mobileMedia}
            desktopVideo={SHOP_CAMPAIGN.desktopVideo}
            mobileVideo={SHOP_CAMPAIGN.mobileVideo}
            officialVideoSource={SHOP_CAMPAIGN.officialVideoSource}
            loading="eager"
          />
          <span className="s2-shop-hero__shade" />
          <div className="s2-shop-hero__copy">
            <span className="s2-overline">Shababuna</span>
            <h1 id="s2-shop-title">{pick({ en: 'Shop basketball.', ar: 'تسوق كرة السلة.' })}</h1>
            <p>{pick(SHOP_CAMPAIGN.copy)}</p>
          </div>
        </section>
      ) : (
        <header className="s2-plp-head">
          <div className="s2-container">
            <div>
              <span className="s2-overline">{pick({ en: 'Shop', ar: 'تسوق' })}</span>
              <h1>{heading}</h1>
            </div>
            <span className="s2-plp-head__count">{filtered.length} {filtered.length === 1 ? common.result : common.results}</span>
          </div>
        </header>
      )}

      {world && category !== 'ready-to-ship' ? (
        <Link to={`/shop/${world.slug}`} className="s2-category-banner">
          <EditorialMedia
            desktopMedia={world.desktopMedia}
            mobileMedia={world.mobileMedia}
            desktopVideo={world.desktopVideo}
            mobileVideo={world.mobileVideo}
            officialVideoSource={world.officialVideoSource}
          />
          <span className="s2-category-banner__shade" />
          <strong>{pick(world.title)}</strong>
        </Link>
      ) : null}

      <div className="s2-plp-toolbar-wrap">
        <div className="s2-plp-toolbar s2-container">
          <nav className="s2-plp-categories" aria-label={pick({ en: 'Product categories', ar: 'فئات المنتجات' })}>
            <button type="button" className={!category ? 'is-active' : ''} onClick={() => navigate('/shop')}>{common.all}</button>
            {categories.filter((entry) => entry.slug !== 'ready-to-ship').map((entry) => (
              <button key={entry.slug} type="button" className={category === entry.slug ? 'is-active' : ''} onClick={() => navigate(`/shop/${entry.slug}`)}>
                {pick(entry.name)}
              </button>
            ))}
          </nav>
          <div className="s2-plp-actions">
            <button ref={triggerRef} type="button" className="s2-filter-trigger" onClick={() => setDrawerOpen(true)}>
              <Icon name="filter" size={19} />
              <span>{common.filters}</span>
              {activeCount > 0 ? <b>{activeCount}</b> : null}
            </button>
            <SortSelect
              value={sort}
              onChange={(value) => updateParams((query) => value === 'featured' ? query.delete('sort') : query.set('sort', value))}
            />
          </div>
        </div>

        {cat?.subcategories?.length ? (
          <nav className="s2-subcategory-row s2-container" aria-label={pick({ en: 'Product types', ar: 'أنواع المنتجات' })}>
            <button type="button" className={!subcategory ? 'is-active' : ''} onClick={() => navigate(`/shop/${cat.slug}`)}>{pick({ en: 'All', ar: 'الكل' })}</button>
            {cat.subcategories.map((entry) => (
              <button key={entry.slug} type="button" className={subcategory === entry.slug ? 'is-active' : ''} onClick={() => navigate(`/shop/${cat.slug}/${entry.slug}`)}>
                {pick(entry.name)}
              </button>
            ))}
          </nav>
        ) : null}
      </div>

      {category === 'ready-to-ship' && countryCode !== 'LY' ? (
        <div className="s2-ready-message s2-container">
          {pick({ en: 'Ready-to-Ship inventory is held in Libya. International shipping is confirmed before fulfilment.', ar: 'مخزون التسليم الفوري موجود في ليبيا. يتم تأكيد الشحن الدولي قبل التنفيذ.' })}
        </div>
      ) : null}

      {showShopHero && featured.length > 0 ? (
        <section className="s2-section s2-section--compact">
          <div className="s2-section__head s2-container">
            <div><span className="s2-overline">{pick({ en: 'Featured', ar: 'مختارات' })}</span><h2>{pick({ en: 'Start here', ar: 'ابدأ من هنا' })}</h2></div>
            <Link className="s2-text-link" to="/discover/shababuna-selects">{pick({ en: 'Explore', ar: 'اكتشف' })}</Link>
          </div>
          <div className="s2-product-rail s2-container">
            {featured.map((product, index) => <ProductCard key={product.id} product={product} eager={index < 4} />)}
          </div>
        </section>
      ) : null}

      <section className="s2-plp s2-container" aria-label={heading}>
        {filtered.length ? (
          <div className="s2-product-grid">
            {filtered.map((product, index) => (
              <ProductCard key={product.id} product={product} eager={index < 8} />
            ))}
          </div>
        ) : (
          <EmptyState
            message={category === 'ready-to-ship' ? pick({ en: 'No verified ready-to-ship stock right now.', ar: 'لا يوجد مخزون موثق للتسليم الفوري حالياً.' }) : shopCopy.empty || pick({ en: 'No products found.', ar: 'لا توجد منتجات.' })}
            hint={category === 'ready-to-ship' ? pick({ en: 'This collection only shows physically verified stock.', ar: 'هذه المجموعة تعرض فقط المخزون الموثق فعلياً.' }) : shopCopy.emptyHint || ''}
            action={{ label: pick({ en: 'Shop all', ar: 'تسوق الكل' }), onClick: () => navigate('/shop') }}
          />
        )}
      </section>

      <aside className="s2-shop-request s2-container">
        <span>{pick({ en: 'Can’t find it?', ar: 'مش لاقيه؟' })}</span>
        <Link to="/special-request">{pick({ en: 'Send a product request', ar: 'أرسل طلب منتج' })}<Icon name="arrow" size={18} /></Link>
      </aside>

      {drawerOpen ? createPortal(
        <div className="s2-filter-sheet" role="dialog" aria-modal="true" aria-label={common.filters}>
          <button type="button" className="s2-filter-sheet__scrim" onClick={() => setDrawerOpen(false)} aria-label={common.close} />
          <div ref={drawerRef} className="s2-filter-sheet__panel">
            <div className="s2-filter-sheet__head">
              <h2>{common.filters}</h2>
              <button type="button" className="s2-icon-action" onClick={() => setDrawerOpen(false)} aria-label={common.close}><Icon name="close" /></button>
            </div>
            <div className="s2-filter-sheet__body">
              <Filters filters={filters} onChange={onChange} onClear={() => navigate('/shop')} visibleProducts={baseProducts} />
            </div>
            <div className="s2-filter-sheet__foot">
              <button type="button" onClick={() => setDrawerOpen(false)}>{pick({ en: `Show ${filtered.length} products`, ar: `عرض ${filtered.length} منتج` })}</button>
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
}

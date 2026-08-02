import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useCommerce } from '../context/CommerceContext';
import Seo from '../components/common/Seo';
import PageHero from '../components/common/PageHero';
import Breadcrumbs from '../components/common/Breadcrumbs';
import Filters from '../components/shop/Filters';
import SortSelect, { SORT_OPTIONS } from '../components/shop/SortSelect';
import ProductCard from '../components/shop/ProductCard';
import EmptyState from '../components/common/EmptyState';
import Icon from '../components/icons/Icon';
import { useCatalog } from '../context/CatalogContext';
import { categories, getCategory, getSubcategory } from '../data/categories';
import { lockDocumentScroll } from '../utils/scrollLock';

const numberOrNull = (value) => (value === '' || value == null || Number.isNaN(Number(value)) ? null : Number(value));

export default function ShopPage() {
  const { category, subcategory } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, pick } = useLanguage();
  const { countryCode } = useCommerce();
  const { products } = useCatalog();
  const isLibya = countryCode === 'LY';
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef(null);
  const triggerRef = useRef(null);
  const cat = category ? getCategory(category) : null;
  const sub = cat && subcategory ? getSubcategory(category, subcategory) : null;

  const filters = useMemo(() => ({
    category: category || '',
    subcategory: subcategory || '',
    sizes: params.getAll('size'),
    colors: params.getAll('color'),
    brands: params.getAll('brand'),
    productTypes: params.getAll('type'),
    priceMin: params.get('min') || '',
    priceMax: params.get('max') || '',
    inStock: params.get('instock') === '1',
    readyOnly: isLibya && (params.get('ready') === '1' || category === 'ready-to-ship'),
    newOnly: params.get('new') === '1',
    bestOnly: params.get('best') === '1',
    customizableOnly: params.get('custom') === '1',
    q: params.get('q') || '',
  }), [category, subcategory, params, isLibya]);
  const sort = params.get('sort') || 'featured';

  const updateParams = useCallback((mutate) => {
    const next = new URLSearchParams(params);
    mutate(next);
    setParams(next, { replace: true, preventScrollReset: true });
  }, [params, setParams]);

  const onChange = useCallback((patch) => {
    if ('category' in patch || 'subcategory' in patch) {
      const nextCategory = 'category' in patch ? patch.category : filters.category;
      const nextSubcategory = 'subcategory' in patch ? patch.subcategory : ('category' in patch ? '' : filters.subcategory);
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
        const map = { sizes: 'size', colors: 'color', brands: 'brand', productTypes: 'type' };
        if (map[key]) {
          query.delete(map[key]);
          value.forEach((entry) => query.append(map[key], entry));
        } else if (key === 'priceMin') value ? query.set('min', value) : query.delete('min');
        else if (key === 'priceMax') value ? query.set('max', value) : query.delete('max');
        else {
          const booleanMap = { inStock: 'instock', readyOnly: 'ready', newOnly: 'new', bestOnly: 'best', customizableOnly: 'custom' };
          const queryKey = booleanMap[key];
          if (queryKey) value ? query.set(queryKey, '1') : query.delete(queryKey);
        }
      });
    });
  }, [filters.category, filters.subcategory, navigate, params, updateParams]);

  const baseProducts = useMemo(() => products.filter((product) => {
    if (category === 'ready-to-ship') return isLibya && product.readyToShip;
    if (category && product.category !== category) return false;
    if (subcategory && product.subcategory !== subcategory) return false;
    return true;
  }), [category, subcategory, isLibya]);

  const filtered = useMemo(() => {
    const min = numberOrNull(filters.priceMin);
    const max = numberOrNull(filters.priceMax);
    const query = filters.q.trim().toLowerCase();
    let list = baseProducts.filter((product) => {
      if (filters.sizes.length && !product.sizes.some((size) => filters.sizes.includes(size))) return false;
      if (filters.colors.length && !product.colors.some((color) => filters.colors.includes(color.key))) return false;
      if (filters.brands.length && !filters.brands.includes(product.brand)) return false;
      if (filters.productTypes.length && !filters.productTypes.includes(product.productType)) return false;
      if (min != null && product.price < min) return false;
      if (max != null && product.price > max) return false;
      if (filters.inStock && product.availability !== 'in-stock') return false;
      if (filters.readyOnly && !product.readyToShip) return false;
      if (filters.newOnly && !product.newArrival) return false;
      if (filters.bestOnly && !product.bestSeller) return false;
      if (filters.customizableOnly && !product.customizable) return false;
      if (query) {
        const haystack = `${product.name.en} ${pick(product.description)} ${product.brand} ${product.productType}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
    if (sort === 'price-asc') list = [...list].sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') list = [...list].sort((a, b) => b.price - a.price);
    else if (sort === 'name-asc') list = [...list].sort((a, b) => a.name.en.localeCompare(b.name.en));
    else if (sort === 'name-desc') list = [...list].sort((a, b) => b.name.en.localeCompare(a.name.en));
    else if (sort === 'newest') list = [...list].sort((a, b) => Number(b.newArrival) - Number(a.newArrival));
    else list = [...list].sort((a, b) => Number(b.featured) - Number(a.featured) || Number(b.readyToShip) - Number(a.readyToShip));
    return list;
  }, [baseProducts, filters, pick, sort]);

  useEffect(() => {
    if (!isLibya && category === 'ready-to-ship') navigate('/shop', { replace: true });
  }, [category, isLibya, navigate]);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const unlock = lockDocumentScroll();
    drawerRef.current?.querySelector('button,input')?.focus();
    const onKey = (event) => event.key === 'Escape' && setDrawerOpen(false);
    document.addEventListener('keydown', onKey);
    return () => {
      unlock();
      document.removeEventListener('keydown', onKey);
      triggerRef.current?.focus();
    };
  }, [drawerOpen]);

  const heading = sub ? pick(sub.name) : cat ? pick(cat.name) : pick({ en: 'Shop', ar: 'المتجر' });
  const description = cat?.slug === 'ready-to-ship'
    ? pick({ en: 'Available now in Libya with delivery in 24–72 hours.', ar: 'متوفر الآن داخل ليبيا مع توصيل خلال 24–72 ساعة.' })
    : pick({ en: 'Basketball clothing, footwear, accessories, balls and equipment — retail, wholesale and custom-ready.', ar: 'ملابس وأحذية وإكسسوارات وكرات ومعدات كرة السلة — بالقطعة والجملة وقابلة للتخصيص.' });
  /** @type {Array<{label:any,to?:string}>} */
  const crumbs = [{ label: t.nav.shop, to: '/shop' }];
  if (cat) crumbs.push(sub ? { label: pick(cat.name), to: `/shop/${cat.slug}` } : { label: pick(cat.name) });
  if (sub) crumbs.push({ label: pick(sub.name) });
  const path = sub ? `/shop/${category}/${subcategory}` : cat ? `/shop/${category}` : '/shop';

  return (
    <>
      <Seo title={heading} description={description} path={path} />
      <PageHero label={pick({ en: 'SHABABUNA SHOP', ar: 'متجر شبابنا' })} title={heading} description={description} />
      <div className="container"><Breadcrumbs items={crumbs} /></div>

      <section className="section shop-layout">
        <div className="container shop-grid">
          <aside className="shop-sidebar">
            <Filters filters={filters} onChange={onChange} onClear={() => navigate('/shop')} visibleProducts={baseProducts} />
          </aside>
          <div className="shop-main">
            <nav className="shop-category-scroll" aria-label={pick({ en:'Shop departments', ar:'أقسام المتجر' })}>
              <button className={!category ? 'active' : ''} onClick={() => navigate('/shop')}>{t.common.all}</button>
              {categories.filter((item) => isLibya || item.slug !== 'ready-to-ship').map((item) => <button key={item.slug} className={category === item.slug ? 'active' : ''} onClick={() => navigate(`/shop/${item.slug}`)}>{pick(item.name)}</button>)}
            </nav>
            {!!cat?.subcategories?.length && (
              <nav className="shop-subcategory-scroll" aria-label={pick({ en:'Product categories', ar:'أنواع المنتجات' })}>
                <button className={!subcategory ? 'active' : ''} onClick={() => navigate(`/shop/${cat.slug}`)}>{pick({ en:`All ${cat.name.en}`, ar:`كل ${cat.name.ar}` })}</button>
                {cat.subcategories.map((item) => <button key={item.slug} className={subcategory === item.slug ? 'active' : ''} onClick={() => navigate(`/shop/${cat.slug}/${item.slug}`)}>{pick(item.name)}</button>)}
              </nav>
            )}
            <div className="shop-toolbar">
              <button ref={triggerRef} type="button" className="btn-secondary compact shop-filter-btn" onClick={() => setDrawerOpen(true)}><Icon name="filter" /> {t.common.filters}</button>
              <p className="shop-count">{filtered.length} {filtered.length === 1 ? t.common.result : t.common.results}</p>
              <SortSelect value={sort} onChange={(value) => updateParams((query) => value === 'featured' ? query.delete('sort') : query.set('sort', value))} options={SORT_OPTIONS} />
            </div>
            <div className="shop-special-request-bar"><div><strong>{pick({ en: 'Looking for something not listed?', ar: 'تبحث عن منتج غير موجود؟' })}</strong><span>{pick({ en: 'Send a link or image and receive a verified quote.', ar: 'أرسل رابطًا أو صورة واحصل على عرض موثق.' })}</span></div><Link to="/special-request" className="btn-secondary compact">{pick({ en: 'Special Request', ar: 'طلب خاص' })}</Link></div>
            {filtered.length ? (
              <div className="product-grid product-grid--airy">
                {filtered.map((product, index) => <ProductCard key={product.id} product={product} eager={index < 4} />)}
              </div>
            ) : (
              <EmptyState message={t.shop.empty} hint={t.shop.emptyHint} action={{ label:t.common.clearAll, onClick:() => navigate('/shop') }} />
            )}
          </div>
        </div>
      </section>

      {drawerOpen && createPortal(
        <div className="filters-drawer open" role="dialog" aria-modal="true" aria-label={t.common.filters}>
          <div className="filters-drawer-backdrop" onClick={() => setDrawerOpen(false)} />
          <div ref={drawerRef} className="filters-drawer-panel filters-drawer-panel--full">
            <div className="filters-drawer-head"><h2>{t.common.filters}</h2><button type="button" className="icon-btn" onClick={() => setDrawerOpen(false)} aria-label={t.common.close}><Icon name="close" /></button></div>
            <Filters filters={filters} onChange={onChange} onClear={() => navigate('/shop')} visibleProducts={baseProducts} />
            <div className="filter-sheet-actions"><button type="button" className="btn-primary block" onClick={() => setDrawerOpen(false)}>{pick({ en:`Show ${filtered.length} products`, ar:`عرض ${filtered.length} منتج` })}</button></div>
          </div>
        </div>, document.body)}
    </>
  );
}

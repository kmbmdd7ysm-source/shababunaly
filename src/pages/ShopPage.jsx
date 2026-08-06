import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useCinematicOpening } from '../hooks/useCinematicOpening';
import { useCommerce } from '../context/CommerceContext';
import Seo from '../components/common/Seo';
import Breadcrumbs from '../components/common/Breadcrumbs';
import Filters from '../components/shop/Filters';
import SortSelect, { SORT_OPTIONS } from '../components/shop/SortSelect';
import ProductCard from '../components/shop/ProductCard';
import ProductPlinth from '../components/shop/ProductPlinth';
import EmptyState from '../components/common/EmptyState';
import Icon from '../components/icons/Icon';
import { useCatalog } from '../context/CatalogContext';
import { categories, getCategory, getSubcategory } from '../data/categories';
import { lockDocumentScroll } from '../utils/scrollLock';
import '../styles/catalogue.css';
import '../styles/runs.css';

const numberOrNull = (value) =>
  value === '' || value == null || Number.isNaN(Number(value)) ? null : Number(value);

export default function ShopPage() {
  const { category, subcategory } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, pick } = useLanguage();
  const { countryCode } = useCommerce();
  const { products, featuredProducts } = useCatalog();
  const isLibya = countryCode === 'LY';
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef(null);
  const triggerRef = useRef(null);
  const cat = category ? getCategory(category) : null;
  const sub = cat && subcategory ? getSubcategory(category, subcategory) : null;

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
      readyOnly: isLibya && (params.get('ready') === '1' || category === 'ready-to-ship'),
      newOnly: params.get('new') === '1',
      bestOnly: params.get('best') === '1',
      customizableOnly: params.get('custom') === '1',
      q: params.get('q') || '',
    }),
    [category, subcategory, params, isLibya],
  );
  const sort = params.get('sort') || 'featured';

  const updateParams = useCallback(
    (mutate) => {
      const next = new URLSearchParams(params);
      mutate(next);
      setParams(next, { replace: true, preventScrollReset: true });
    },
    [params, setParams],
  );

  const onChange = useCallback(
    (patch) => {
      if ('category' in patch || 'subcategory' in patch) {
        const nextCategory = 'category' in patch ? patch.category : filters.category;
        const nextSubcategory =
          'subcategory' in patch
            ? patch.subcategory
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
          const map = { sizes: 'size', colors: 'color', brands: 'brand', productTypes: 'type' };
          if (map[key]) {
            query.delete(map[key]);
            value.forEach((entry) => query.append(map[key], entry));
          } else if (key === 'priceMin') value ? query.set('min', value) : query.delete('min');
          else if (key === 'priceMax') value ? query.set('max', value) : query.delete('max');
          else {
            const booleanMap = {
              inStock: 'instock',
              readyOnly: 'ready',
              newOnly: 'new',
              bestOnly: 'best',
              customizableOnly: 'custom',
            };
            const queryKey = booleanMap[key];
            if (queryKey) value ? query.set(queryKey, '1') : query.delete(queryKey);
          }
        });
      });
    },
    [filters.category, filters.subcategory, navigate, params, updateParams],
  );

  const baseProducts = useMemo(
    () =>
      products.filter((product) => {
        if (category === 'ready-to-ship') return isLibya && product.readyToShip;
        if (category && product.category !== category) return false;
        if (subcategory && product.subcategory !== subcategory) return false;
        return true;
      }),
    [category, subcategory, isLibya],
  );

  const filtered = useMemo(() => {
    const min = numberOrNull(filters.priceMin);
    const max = numberOrNull(filters.priceMax);
    const query = filters.q.trim().toLowerCase();
    let list = baseProducts.filter((product) => {
      if (filters.sizes.length && !product.sizes.some((size) => filters.sizes.includes(size)))
        return false;
      if (
        filters.colors.length &&
        !product.colors.some((color) => filters.colors.includes(color.key))
      )
        return false;
      if (filters.brands.length && !filters.brands.includes(product.brand)) return false;
      if (filters.productTypes.length && !filters.productTypes.includes(product.productType))
        return false;
      if (min != null && product.price < min) return false;
      if (max != null && product.price > max) return false;
      if (filters.inStock && product.availability !== 'in-stock') return false;
      if (filters.readyOnly && !product.readyToShip) return false;
      if (filters.newOnly && !product.newArrival) return false;
      if (filters.bestOnly && !product.bestSeller) return false;
      if (filters.customizableOnly && !product.customizable) return false;
      if (query) {
        const haystack =
          `${product.name.en} ${pick(product.description)} ${product.brand} ${product.productType}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
    if (sort === 'price-asc') list = [...list].sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') list = [...list].sort((a, b) => b.price - a.price);
    else if (sort === 'name-asc')
      list = [...list].sort((a, b) => a.name.en.localeCompare(b.name.en));
    else if (sort === 'name-desc')
      list = [...list].sort((a, b) => b.name.en.localeCompare(a.name.en));
    else if (sort === 'newest')
      list = [...list].sort((a, b) => Number(b.newArrival) - Number(a.newArrival));
    else
      list = [...list].sort(
        (a, b) =>
          Number(b.featured) - Number(a.featured) || Number(b.readyToShip) - Number(a.readyToShip),
      );
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
  const description =
    cat?.slug === 'ready-to-ship'
      ? pick({
          en: 'Available now in Libya with delivery in 24–72 hours.',
          ar: 'متوفر الآن داخل ليبيا مع توصيل خلال 24–72 ساعة.',
        })
      : pick({
          en: 'Basketball clothing, footwear, accessories, balls and equipment — retail, wholesale and custom-ready.',
          ar: 'ملابس وأحذية وإكسسوارات وكرات ومعدات كرة السلة — بالقطعة والجملة وقابلة للتخصيص.',
        });
  /** @type {Array<{label:any,to?:string}>} */
  const crumbs = [{ label: t.nav.shop, to: '/shop' }];
  if (cat)
    crumbs.push(
      sub ? { label: pick(cat.name), to: `/shop/${cat.slug}` } : { label: pick(cat.name) },
    );
  if (sub) crumbs.push({ label: pick(sub.name) });
  const path = sub ? `/shop/${category}/${subcategory}` : cat ? `/shop/${category}` : '/shop';

  // Active filters, rendered as a drawn summary the visitor can dismantle one
  // token at a time. Reads the same `filters` object the query string owns, so
  // nothing new is stored and the URL stays the single source of truth.
  const activeTokens = [
    ...filters.sizes.map((value) => ({
      key: `size-${value}`,
      label: value,
      clear: () => onChange({ sizes: filters.sizes.filter((entry) => entry !== value) }),
    })),
    ...filters.colors.map((value) => ({
      key: `color-${value}`,
      label: value,
      clear: () => onChange({ colors: filters.colors.filter((entry) => entry !== value) }),
    })),
    ...filters.brands.map((value) => ({
      key: `brand-${value}`,
      label: value,
      clear: () => onChange({ brands: filters.brands.filter((entry) => entry !== value) }),
    })),
    ...filters.productTypes.map((value) => ({
      key: `type-${value}`,
      label: value,
      clear: () =>
        onChange({ productTypes: filters.productTypes.filter((entry) => entry !== value) }),
    })),
    ...(filters.inStock
      ? [
          {
            key: 'instock',
            label: pick({ en: 'In stock', ar: 'متوفر' }),
            clear: () => onChange({ inStock: false }),
          },
        ]
      : []),
    ...(filters.readyOnly && category !== 'ready-to-ship'
      ? [
          {
            key: 'ready',
            label: pick({ en: 'Ready to Ship', ar: 'تسليم فوري' }),
            clear: () => onChange({ readyOnly: false }),
          },
        ]
      : []),
    ...(filters.newOnly
      ? [
          {
            key: 'new',
            label: pick({ en: 'New', ar: 'جديد' }),
            clear: () => onChange({ newOnly: false }),
          },
        ]
      : []),
    ...(filters.bestOnly
      ? [
          {
            key: 'best',
            label: pick({ en: 'Best sellers', ar: 'الأكثر مبيعًا' }),
            clear: () => onChange({ bestOnly: false }),
          },
        ]
      : []),
    ...(filters.customizableOnly
      ? [
          {
            key: 'custom',
            label: pick({ en: 'Customizable', ar: 'قابل للتخصيص' }),
            clear: () => onChange({ customizableOnly: false }),
          },
        ]
      : []),
    ...(filters.priceMin
      ? [
          {
            key: 'min',
            label: `${pick({ en: 'From', ar: 'من' })} ${filters.priceMin}`,
            clear: () => onChange({ priceMin: '' }),
          },
        ]
      : []),
    ...(filters.priceMax
      ? [
          {
            key: 'max',
            label: `${pick({ en: 'To', ar: 'إلى' })} ${filters.priceMax}`,
            clear: () => onChange({ priceMax: '' }),
          },
        ]
      : []),
  ];

  const departments = categories.filter((item) => isLibya || item.slug !== 'ready-to-ship');

  // The catalogue reads as a set of RUNS rather than one undifferentiated grid.
  // The lead product of each run gets a plinth; the remainder gets an efficient
  // grid. This is presentation only — `filtered` and its order are untouched.
  // The entrance only stands when nothing has been narrowed yet. The moment a
  // visitor filters, sorts or picks a department they are working, not
  // arriving, and the gateway would be in the way.
  const featured = featuredProducts().slice(0, 4);

  const showEntranceValue = !category && !sub && activeTokens.length === 0 && sort === 'featured';

  const RUN = 9;
  // When a department world spotlights the lead product, the runs start after it
  // so the same product is not presented twice in one scroll.
  const runSource =
    !showEntranceValue && category && filtered.length > 0 ? filtered.slice(1) : filtered;
  const runs = [];
  for (let index = 0; index < runSource.length; index += RUN) {
    const slice = runSource.slice(index, index + RUN);
    runs.push({ lead: slice[0], rest: slice.slice(1), from: index });
  }

  const showEntrance = showEntranceValue;
  // The entrance is a full-bleed dark composition; the working header is light,
  // so the declaration has to follow the state rather than the route.
  useCinematicOpening(showEntrance);

  return (
    <>
      <Seo title={heading} description={description} path={path} />

      {/* ── THE ENTRANCE ────────────────────────────────────────────────
          A collection gateway, shown only on arrival. Departments as plates
          over court geometry, with the live count of each. Not a hero: a
          doorway that answers "where do I go" before any grid appears. */}
      {showEntrance && (
        <section className="gw-entrance" aria-labelledby="gw-catalogue-title">
          <picture className="gw-entrance-atmos" aria-hidden="true">
            <source
              type="image/webp"
              srcSet="/media/atmosphere/fabric-macro-900.webp 900w, /media/atmosphere/fabric-macro-1400.webp 1400w"
              sizes="100vw"
            />
            <img
              src="/media/atmosphere/fabric-macro-1400.webp"
              alt=""
              width="1400"
              height="933"
              fetchPriority="high"
              decoding="async"
            />
          </picture>
          <div className="gw-entrance-inner">
            <div className="gw-entrance-lede">
              <Breadcrumbs items={crumbs} />
              <p className="gw-spec">{pick({ en: 'Shababuna shop', ar: 'متجر شبابنا' })}</p>
              <h1 id="gw-catalogue-title" className="gw-entrance-title">
                {pick({ en: 'The catalogue', ar: 'الكتالوج' })}
              </h1>
              <p className="gw-entrance-copy">{description}</p>
              <p className="gw-entrance-count">
                <span className="gw-figure gw-isolate-ltr">{filtered.length}</span>
                <span className="gw-spec">
                  {filtered.length === 1 ? t.common.result : t.common.results}
                </span>
              </p>
            </div>
            <ul className="gw-entrance-gates">
              {departments.map((item) => (
                <li key={item.slug}>
                  <Link to={`/shop/${item.slug}`} className="gw-gate">
                    <span className="gw-gate-name">{pick(item.name)}</span>
                    <span className="gw-gate-count gw-isolate-ltr">
                      {products.filter((entry) => entry.category === item.slug).length ||
                        baseProducts.length}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Editorial featured stage — only on arrival, before any filter narrows the set. */}
      {showEntrance && featured.length > 0 && (
        <section className="gw-world" aria-labelledby="gw-featured-title">
          <div className="gw-world-inner">
            <header className="gw-world-head">
              <p className="gw-spec">{pick({ en: 'Featured', ar: 'مختارات' })}</p>
              <h2 id="gw-featured-title" className="gw-world-title">
                {pick({ en: 'On the floor now', ar: 'على الأرض الآن' })}
              </h2>
            </header>
            <div className="gw-world-stage">
              <ProductPlinth product={featured[0]} index={0} eager />
            </div>
            {featured.length > 1 && (
              <div className="gw-world-rail">
                {featured.slice(1).map((product, index) => (
                  <ProductCard key={product.id} product={product} eager={index < 2} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── THE HEADER ──────────────────────────────────────────────────
          Only when working. It carries the department name and the count. */}
      {!showEntrance && (
        <section
          className="gw-world-headband"
          aria-labelledby="gw-catalogue-title"
          data-dept={category || 'all'}
        >
          <div className="gw-cat-head-inner">
            <Breadcrumbs items={crumbs} />
            <div className="gw-cat-head-row">
              <div>
                <p className="gw-spec">{pick({ en: 'Department', ar: 'القسم' })}</p>
                <h1 id="gw-catalogue-title" className="gw-cat-title">
                  {heading}
                </h1>
                {description && <p className="gw-world-lede">{description}</p>}
              </div>
              <p className="gw-cat-count">
                <span className="gw-figure gw-isolate-ltr">{filtered.length}</span>
                <span className="gw-spec">
                  {filtered.length === 1 ? t.common.result : t.common.results}
                </span>
              </p>
            </div>
            {!!cat?.subcategories?.length && (
              <nav
                className="gw-subregister"
                aria-label={pick({ en: 'Product categories', ar: 'أنواع المنتجات' })}
              >
                <button
                  type="button"
                  className={`gw-subregister-tab${!subcategory ? ' is-active' : ''}`}
                  aria-current={!subcategory ? 'page' : undefined}
                  onClick={() => navigate(`/shop/${cat.slug}`)}
                >
                  {pick({ en: `All ${cat.name.en}`, ar: `كل ${cat.name.ar}` })}
                </button>
                {cat.subcategories.map((item) => (
                  <button
                    key={item.slug}
                    type="button"
                    className={`gw-subregister-tab${subcategory === item.slug ? ' is-active' : ''}`}
                    aria-current={subcategory === item.slug ? 'page' : undefined}
                    onClick={() => navigate(`/shop/${cat.slug}/${item.slug}`)}
                  >
                    {pick(item.name)}
                  </button>
                ))}
              </nav>
            )}
          </div>
        </section>
      )}

      {/* Department world stage — editorial lead when browsing a department. */}
      {!showEntrance && category && filtered.length > 0 && (
        <section className="gw-dept-world" aria-label={heading}>
          <div className="gw-dept-world-inner">
            <ProductPlinth product={filtered[0]} index={0} eager />
            {filtered.length > 1 && (
              <div className="gw-dept-world-rail">
                {filtered.slice(1, 4).map((product) => (
                  <ProductCard key={`world-${product.id}`} product={product} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── THE CONSOLE ─────────────────────────────────────────────────
          The filter sidebar is gone. Every control now lives in one sticky
          instrument strip and filters open as a sheet on ALL viewports, so the
          products get the full measure of the page instead of two thirds. */}
      <div className="gw-console-strip">
        <div className="gw-console-strip-inner">
          <nav
            className="gw-console-departments"
            aria-label={pick({ en: 'Shop departments', ar: 'أقسام المتجر' })}
          >
            <button
              type="button"
              className={`gw-console-dept${!category ? ' is-active' : ''}`}
              aria-current={!category ? 'page' : undefined}
              onClick={() => navigate('/shop')}
            >
              {t.common.all}
            </button>
            {departments.map((item) => (
              <button
                key={item.slug}
                type="button"
                className={`gw-console-dept${category === item.slug ? ' is-active' : ''}`}
                aria-current={category === item.slug ? 'page' : undefined}
                onClick={() => navigate(`/shop/${item.slug}`)}
              >
                {pick(item.name)}
              </button>
            ))}
          </nav>

          <div className="gw-console-tools">
            <button
              ref={triggerRef}
              type="button"
              className="gw-console-filter"
              onClick={() => setDrawerOpen(true)}
            >
              <Icon name="filter" />
              <span>{t.common.filters}</span>
              {activeTokens.length > 0 && (
                <span className="gw-tally gw-tally--inline">{activeTokens.length}</span>
              )}
            </button>
            <SortSelect
              value={sort}
              onChange={(value) =>
                updateParams((query) =>
                  value === 'featured' ? query.delete('sort') : query.set('sort', value),
                )
              }
              options={SORT_OPTIONS}
            />
          </div>
        </div>

        {activeTokens.length > 0 && (
          <div
            className="gw-console-active"
            aria-label={pick({ en: 'Active filters', ar: 'عوامل التصفية النشطة' })}
          >
            <p className="gw-spec">{pick({ en: 'Filtering by', ar: 'التصفية حسب' })}</p>
            <ul>
              {activeTokens.map((token) => (
                <li key={token.key}>
                  <button type="button" onClick={token.clear}>
                    <span>{token.label}</span>
                    <Icon name="close" />
                    <span className="sr-only">
                      {pick({ en: 'Remove filter', ar: 'إزالة عامل التصفية' })}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className="gw-console-clear" onClick={() => navigate('/shop')}>
              {t.common.clearAll}
            </button>
          </div>
        )}
      </div>

      {/* ── THE RUNS ────────────────────────────────────────────────────
          Lead product on a plinth, remainder in an efficient grid. Repeats
          every nine products so a long catalogue keeps its rhythm. */}
      <div className="gw-runs">
        {filtered.length ? (
          runs.length ? (
            runs.map((run) => (
              <section key={run.from} className="gw-run" aria-label={`${heading} ${run.from + 1}`}>
                <ProductPlinth product={run.lead} index={run.from / RUN} eager={run.from === 0} />
                {run.rest.length > 0 && (
                  <div className="gw-run-grid">
                    {run.rest.map((product, position) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        eager={run.from === 0 && position < 3}
                      />
                    ))}
                  </div>
                )}
              </section>
            ))
          ) : null
        ) : (
          <div className="gw-run">
            <EmptyState
              message={t.shop.empty}
              hint={t.shop.emptyHint}
              action={{ label: t.common.clearAll, onClick: () => navigate('/shop') }}
            />
          </div>
        )}

        <aside className="gw-runs-request">
          <div>
            <p className="gw-spec">{pick({ en: 'Not listed?', ar: 'غير موجود؟' })}</p>
            <p className="gw-runs-request-copy">
              {pick({
                en: 'Send a link or an image and receive a verified quote.',
                ar: 'أرسل رابطًا أو صورة واحصل على عرض موثق.',
              })}
            </p>
          </div>
          <Link to="/special-request" className="gw-btn gw-btn--secondary">
            {pick({ en: 'Special Request', ar: 'طلب خاص' })}
          </Link>
        </aside>
      </div>

      {drawerOpen &&
        createPortal(
          <div
            className="gw-filter-sheet is-open"
            role="dialog"
            aria-modal="true"
            aria-label={t.common.filters}
          >
            <div className="gw-filter-sheet-scrim" onClick={() => setDrawerOpen(false)} />
            <div ref={drawerRef} className="gw-filter-sheet-panel">
              <div className="gw-filter-sheet-head">
                <h2>{t.common.filters}</h2>
                <button
                  type="button"
                  className="gw-instrument"
                  onClick={() => setDrawerOpen(false)}
                  aria-label={t.common.close}
                >
                  <Icon name="close" />
                </button>
              </div>
              <div className="gw-filter-sheet-body">
                <Filters
                  filters={filters}
                  onChange={onChange}
                  onClear={() => navigate('/shop')}
                  visibleProducts={baseProducts}
                />
              </div>
              <div className="gw-filter-sheet-foot">
                <button
                  type="button"
                  className="gw-btn gw-btn--primary"
                  onClick={() => setDrawerOpen(false)}
                >
                  {pick({
                    en: `Show ${filtered.length} products`,
                    ar: `عرض ${filtered.length} منتج`,
                  })}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

import type { CSSProperties, ReactElement } from 'react';
import type { CatalogProduct } from '../context/CatalogContext';
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
import { getDepartmentArt } from '../data/departmentArtDirection';
import { lockDocumentScroll } from '../utils/scrollLock';
import { isReadyToShipEligible } from '../utils/productEligibility';
import '../styles/domain-shop.css';
import '../styles/catalogue.css';
import '../styles/runs.css';
import '../styles/catalog.css';
import type { ProductLike } from '../utils/productEligibility.ts';

function asProductLike(product: unknown): ProductLike {
  return (product || {}) as ProductLike;
}

const numberOrNull = (value: unknown): number | null =>
  value === '' || value == null || Number.isNaN(Number(value)) ? null : Number(value);

const nameEn = (name: CatalogProduct['name']): string => {
  if (name && typeof name === 'object') return String(name.en || '');
  return String(name || '');
};

export default function ShopPage(): ReactElement {
  const { category, subcategory } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, pick } = useLanguage();
  const common = (t.common || {}) as Record<string, string>;
  const shop = (t.shop || {}) as Record<string, string>;
  const nav = (t.nav || {}) as Record<string, string>;
  const { countryCode } = useCommerce();
  const { products, featuredProducts } = useCatalog();
  const isLibya = countryCode === 'LY';
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
          const map: Record<string, string> = {
            sizes: 'size',
            colors: 'color',
            brands: 'brand',
            productTypes: 'type',
          };
          if (map[key]) {
            const param = map[key];
            query.delete(param);
            (Array.isArray(value) ? value : []).forEach((entry) =>
              query.append(param, String(entry)),
            );
          } else if (key === 'priceMin') {
            if (value) query.set('min', String(value));
            else query.delete('min');
          } else if (key === 'priceMax') {
            if (value) query.set('max', String(value));
            else query.delete('max');
          } else {
            const booleanMap: Record<string, string> = {
              inStock: 'instock',
              readyOnly: 'ready',
              newOnly: 'new',
              bestOnly: 'best',
              customizableOnly: 'custom',
            };
            const queryKey = booleanMap[key];
            if (queryKey) {
              if (value) query.set(queryKey, '1');
              else query.delete(queryKey);
            }
          }
        });
      });
    },
    [filters.category, filters.subcategory, navigate, params, updateParams],
  );

  const baseProducts = useMemo(
    () =>
      (products as CatalogProduct[]).filter((product) => {
        if (category === 'ready-to-ship') {
          // Honest Libya readiness: only verified tracked stock, never fabricated.
          return isReadyToShipEligible(asProductLike(product), 'LY');
        }
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
      if (filters.sizes.length && !(product.sizes || []).some((size) => filters.sizes.includes(String(size))))
        return false;
      if (
        filters.colors.length &&
        !(product.colors || []).some((color) => filters.colors.includes(String(color.key)))
      )
        return false;
      if (filters.brands.length && !filters.brands.includes(String(product.brand || ''))) return false;
      if (filters.productTypes.length && !filters.productTypes.includes(String(product.productType || '')))
        return false;
      if (min != null && Number(product.price || 0) < min) return false;
      if (max != null && Number(product.price || 0) > max) return false;
      if (
        filters.inStock &&
        !(
          product.inventoryVerified === true &&
          product.inventoryTracking === true &&
          Number(product.stock) > 0
        )
      ) {
        return false;
      }
      if (filters.readyOnly && !isReadyToShipEligible(asProductLike(product), 'LY')) {
        return false;
      }
      if (filters.newOnly && !product.newArrival) return false;
      if (filters.bestOnly && !product.bestSeller) return false;
      if (filters.customizableOnly && !product.customizable) return false;
      if (query) {
        const haystack =
          `${nameEn(product.name)} ${pick(product.description as { en?: string; ar?: string })} ${product.brand || ''} ${product.productType || ''}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
    if (sort === 'price-asc') list = [...list].sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    else if (sort === 'price-desc') list = [...list].sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    else if (sort === 'name-asc')
      list = [...list].sort((a, b) => nameEn(a.name).localeCompare(nameEn(b.name)));
    else if (sort === 'name-desc')
      list = [...list].sort((a, b) => nameEn(b.name).localeCompare(nameEn(a.name)));
    else if (sort === 'newest')
      list = [...list].sort((a, b) => Number(b.newArrival) - Number(a.newArrival));
    else
      list = [...list].sort(
        (a, b) =>
          Number(b.featured) - Number(a.featured) || Number(b.readyToShip) - Number(a.readyToShip),
      );
    return list;
  }, [baseProducts, filters, pick, sort]);

  useEffect(() => {}, [category, navigate]);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const unlock = lockDocumentScroll();
    (drawerRef.current?.querySelector('button,input') as HTMLElement | null)?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setDrawerOpen(false); };
    document.addEventListener('keydown', onKey);
    const trigger = triggerRef.current;
    return () => {
      unlock();
      document.removeEventListener('keydown', onKey);
      trigger?.focus();
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
  const crumbs: Array<{ label: string; to?: string }> = [{ label: nav.shop || 'Shop', to: '/shop' }];
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
            label: pick({ en: 'Verified stock', ar: 'مخزون موثّق' }),
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

  const departments = categories;

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
  const departmentArt = useMemo(
    () => getDepartmentArt(String(category || 'clothing')),
    [category],
  );
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
              <p className="gw-kicker">{pick({ en: 'Shababuna shop', ar: 'متجر شبابنا' })}</p>
              <h1 id="gw-catalogue-title" className="gw-entrance-title">
                {pick({ en: 'Shop basketball', ar: 'تسوق كرة السلة' })}
              </h1>
              <p className="gw-entrance-copy">
                {pick({
                  en: 'Clothing, footwear, balls and equipment — ready to ship, made to order, and custom for clubs.',
                  ar: 'ملابس وأحذية وكرات ومعدات — تسليم فوري وتصنيع حسب الطلب وتخصيص للأندية.',
                })}
              </p>
              <div className="gw-entrance-cta">
                <Link className="gw-btn gw-btn--primary" to="/shop/clothing">
                  {pick({ en: 'Explore clothing', ar: 'استكشف الملابس' })}
                </Link>
                <Link className="gw-btn gw-btn--secondary" to="/shop/ready-to-ship">
                  {pick({ en: 'Ready to Ship', ar: 'تسليم فوري' })}
                </Link>
              </div>
            </div>
            <ul className="gw-entrance-gates gw-entrance-gates--visual">
              <li>
                <div
                  className="gw-gate-shell"
                  style={
                    {
                      ['--gw-gate-art' as string]: `url(${getDepartmentArt('ready-to-ship').desktopHero || ''})`,
                    } as CSSProperties
                  }
                >
                  <Link to="/shop/ready-to-ship" className="gw-gate gw-gate--ready gw-gate--visual">
                    <span className="gw-gate-name">
                      {pick({ en: 'Ready to Ship', ar: 'تسليم فوري' })}
                    </span>
                    <span className="gw-gate-count gw-isolate-ltr">
                      {
                        products.filter((entry) => isReadyToShipEligible(asProductLike(entry), 'LY'))
                          .length
                      }
                    </span>
                  </Link>
                </div>
              </li>
              {departments
                .filter((item) => item.slug !== 'ready-to-ship')
                .map((item) => (
                  <li key={item.slug}>
                    <div
                      className="gw-gate-shell"
                      style={
                        {
                          ['--gw-gate-art' as string]: `url(${getDepartmentArt(item.slug).desktopHero || ''})`,
                        } as CSSProperties
                      }
                    >
                      <Link to={`/shop/${item.slug}`} className="gw-gate gw-gate--visual">
                        <span className="gw-gate-name">{pick(item.name)}</span>
                        <span className="gw-gate-count gw-isolate-ltr">
                          {products.filter((entry) => entry.category === item.slug).length ||
                            baseProducts.length}
                        </span>
                      </Link>
                    </div>
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
              <p className="gw-kicker">{pick({ en: 'Featured', ar: 'مختارات' })}</p>
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
          style={
            departmentArt.desktopHero
              ? ({
                  ['--gw-dept-art' as string]: `url(${departmentArt.desktopHero})`,
                } as CSSProperties)
              : undefined
          }
        >
          <div className="gw-cat-head-inner">
            <Breadcrumbs items={crumbs} />
            <div className="gw-cat-head-row">
              <div>
                <p className="gw-kicker">{pick({ en: 'Shop', ar: 'تسوق' })}</p>
                <h1 id="gw-catalogue-title" className="gw-cat-title">
                  {heading}
                </h1>
                {description && <p className="gw-world-lede">{description}</p>}
              </div>
              <p className="gw-cat-count">
                <span className="gw-figure gw-isolate-ltr">{filtered.length}</span>
                <span className="gw-kicker">
                  {filtered.length === 1 ? common.result : common.results}
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

      {!showEntrance && category === 'ready-to-ship' && !isLibya && (
        <aside className="gw-ready-note" role="note">
          <p>
            {pick({
              en: 'Ready-to-Ship inventory is held in Libya. International delivery requires confirmation of shipping before the order is fulfilled.',
              ar: 'مخزون التسليم الفوري موجود في ليبيا. الشحن الدولي يتطلب تأكيد تكلفة التوصيل قبل تنفيذ الطلب.',
            })}
          </p>
        </aside>
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
              {common.all}
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
            {category !== 'ready-to-ship' && (
              <Link to="/shop/ready-to-ship" className="gw-console-ready">
                {pick({ en: 'Ready to Ship', ar: 'تسليم فوري' })}
              </Link>
            )}
            <button
              ref={triggerRef}
              type="button"
              className="gw-console-filter"
              onClick={() => setDrawerOpen(true)}
            >
              <Icon name="filter" />
              <span>{common.filters}</span>
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
              options={[...SORT_OPTIONS] as string[]}
            />
          </div>
        </div>

        {activeTokens.length > 0 && (
          <div
            className="gw-console-active"
            aria-label={pick({ en: 'Active filters', ar: 'عوامل التصفية النشطة' })}
          >
            <p className="gw-kicker">{pick({ en: 'Filtering by', ar: 'التصفية حسب' })}</p>
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
              {common.clearAll}
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
              message={
                category === 'ready-to-ship'
                  ? pick({
                      en: 'No verified ready-to-ship stock right now.',
                      ar: 'لا توجد كمية موثّقة للتسليم الفوري حالياً.',
                    })
                  : shop.empty || ''
              }
              hint={
                category === 'ready-to-ship'
                  ? pick({
                      en: 'Ready-to-Ship only lists products with verified Libya inventory — never estimated stock.',
                      ar: 'التسليم الفوري يعرض فقط المنتجات ذات المخزون الموثّق داخل ليبيا — دون تقديرات.',
                    })
                  : shop.emptyHint || ''
              }
              action={{
                label:
                  category === 'ready-to-ship'
                    ? pick({ en: 'Browse the catalogue', ar: 'تصفح الكتالوج' })
                    : common.clearAll || 'Clear',
                onClick: () => navigate('/shop'),
              }}
            />
          </div>
        )}

        <aside className="gw-runs-request">
          <div>
            <p className="gw-kicker">{pick({ en: 'Not listed?', ar: 'غير موجود؟' })}</p>
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
            aria-label={common.filters}
          >
            <button
              type="button"
              className="gw-filter-sheet-scrim"
              aria-label={common.close}
              onClick={() => setDrawerOpen(false)}
            />
            <div ref={drawerRef} className="gw-filter-sheet-panel">
              <div className="gw-filter-sheet-head">
                <h2>{common.filters}</h2>
                <button
                  type="button"
                  className="gw-instrument"
                  onClick={() => setDrawerOpen(false)}
                  aria-label={common.close}
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

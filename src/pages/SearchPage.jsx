import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import Seo from '../components/common/Seo';
import PageHero from '../components/common/PageHero';
import ProductCard from '../components/shop/ProductCard';
import EmptyState from '../components/common/EmptyState';
import { searchSite, getSearchFacets } from '../utils/search';
import { useCatalog } from '../context/CatalogContext';

export default function SearchPage() {
  const { t, pick } = useLanguage();
  const { products } = useCatalog();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') || '');
  const [types, setTypes] = useState([]);
  const [colors, setColors] = useState([]);
  const [brands, setBrands] = useState([]);
  useEffect(() => setQuery(params.get('q') || ''), [params]);
  const results = useMemo(
    () => searchSite(query, 999, { types, colors, brands }, products),
    [query, types, colors, brands, products],
  );
  const searchFacets = useMemo(() => getSearchFacets(products), [products]);
  const toggle = (value, setter) =>
    setter((current) =>
      current.includes(value) ? current.filter((x) => x !== value) : [...current, value],
    );
  return (
    <>
      <Seo
        title={pick({ en: 'Search', ar: 'البحث' })}
        description={pick({
          en: 'Search Shababuna products and services.',
          ar: 'ابحث في منتجات وخدمات شبابنا.',
        })}
        path="/search"
        noindex
      />
      <PageHero
        label={pick({ en: 'SEARCH', ar: 'البحث' })}
        title={pick({ en: 'Find what you need', ar: 'اعثر على ما تحتاجه' })}
      >
        <form
          className="search-page-form"
          onSubmit={(e) => {
            e.preventDefault();
            setParams(query.trim() ? { q: query.trim() } : {});
          }}
        >
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={pick({
              en: 'Search products, brands and services…',
              ar: 'ابحث عن المنتجات والبراندات والخدمات…',
            })}
          />
          <button className="btn-primary compact">{t.common.search}</button>
        </form>
      </PageHero>
      <section className="section">
        <div className="container search-layout">
          <aside className="search-facets">
            <div className="filter-head">
              <strong>{pick({ en: 'Filter Results', ar: 'تصفية النتائج' })}</strong>
              <button
                onClick={() => {
                  setTypes([]);
                  setColors([]);
                  setBrands([]);
                }}
              >
                {t.common.clearAll}
              </button>
            </div>
            <Facet
              title={pick({ en: 'Result type', ar: 'نوع النتيجة' })}
              vals={searchFacets.types}
              active={types}
              toggle={(v) => toggle(v, setTypes)}
              labels={{
                products: pick({ en: 'Products', ar: 'المنتجات' }),
                pages: pick({ en: 'Pages & Services', ar: 'الصفحات والخدمات' }),
              }}
            />
            <Facet
              title={pick({ en: 'Brand', ar: 'البراند' })}
              vals={searchFacets.brands}
              active={brands}
              toggle={(v) => toggle(v, setBrands)}
            />
            <Facet
              title={pick({ en: 'Colour', ar: 'اللون' })}
              vals={searchFacets.colors}
              active={colors}
              toggle={(v) => toggle(v, setColors)}
            />
          </aside>
          <main>
            {!query.trim() && !types.length && !colors.length && !brands.length ? (
              <EmptyState
                message={pick({
                  en: 'Start typing to search Shababuna.',
                  ar: 'ابدأ الكتابة للبحث في شبابنا.',
                })}
              />
            ) : results.total === 0 ? (
              <div className="search-special-empty">
                <EmptyState message={t.search.noResults} />
                <p>{pick({ en: 'Still can’t find it?', ar: 'ما زلت لم تجد المنتج؟' })}</p>
                <Link className="btn-primary compact" to="/special-request">
                  {pick({ en: 'Send a Special Request', ar: 'أرسل طلبًا خاصًا' })}
                </Link>
              </div>
            ) : (
              <div className="search-results">
                <p className="shop-count">
                  {results.total} {t.common.results}
                </p>
                {results.products.length > 0 && (
                  <Group title={pick({ en: 'Products', ar: 'المنتجات' })}>
                    <div className="product-grid">
                      {results.products.map((product) => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                    </div>
                  </Group>
                )}
                {results.pages.length > 0 && (
                  <Group title={pick({ en: 'Pages & Services', ar: 'الصفحات والخدمات' })}>
                    <ul className="search-pages">
                      {results.pages.map((item) => (
                        <li key={item.to}>
                          <Link to={item.to}>{pick(item.title)}</Link>
                        </li>
                      ))}
                    </ul>
                  </Group>
                )}
              </div>
            )}
          </main>
        </div>
      </section>
    </>
  );
}
function Facet({ title, vals, active, toggle, labels = {} }) {
  return (
    <fieldset>
      <legend>{title}</legend>
      {vals.map((value) => (
        <label key={value}>
          <input type="checkbox" checked={active.includes(value)} onChange={() => toggle(value)} />
          <span>{labels[value] || value}</span>
        </label>
      ))}
    </fieldset>
  );
}
function Group({ title, children }) {
  return (
    <section className="search-group">
      <h2 className="section-title">{title}</h2>
      {children}
    </section>
  );
}

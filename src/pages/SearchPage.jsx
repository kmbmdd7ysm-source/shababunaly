import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import Seo from '../components/common/Seo';
import ProductCard from '../components/shop/ProductCard';
import { searchSite, getSearchFacets } from '../utils/search';
import { useCatalog } from '../context/CatalogContext';
import '../styles/catalogue.css';
import '../styles/composition.css';
import '../styles/catalog.css';

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
  const activeFacets = types.length + colors.length + brands.length;

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

      {/* A QUERY CONSOLE, not a hero with a box under it. The field is the
          subject of the page: full measure, display scale, with the result
          count as a live figure beside it. */}
      <section className="gw-console gw-search-desk" aria-labelledby="gw-search-title">
        <div className="gw-console-inner">
          <p className="gw-spec">{pick({ en: 'Search', ar: 'البحث' })}</p>
          <h1 id="gw-search-title" className="gw-console-title">
            {pick({ en: 'Find what you need', ar: 'اعثر على ما تحتاجه' })}
          </h1>
          <form
            className="gw-console-form"
            onSubmit={(event) => {
              event.preventDefault();
              setParams(query.trim() ? { q: query.trim() } : {});
            }}
            role="search"
          >
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label={pick({ en: 'Search Shababuna', ar: 'ابحث في شبابنا' })}
              placeholder={pick({
                en: 'Search products, brands and services…',
                ar: 'ابحث عن المنتجات والبراندات والخدمات…',
              })}
            />
            <button className="gw-btn gw-btn--primary">{t.common.search}</button>
          </form>
          <p className="gw-console-readout" aria-live="polite">
            <span className="gw-figure gw-isolate-ltr">{results.total}</span>
            <span className="gw-spec">{t.common.results}</span>
          </p>
        </div>
      </section>

      <div className="gw-catalogue">
        <div className="gw-catalogue-inner">
          <aside className="gw-catalogue-rail">
            <div className="gw-facet-head">
              <p className="gw-spec">{pick({ en: 'Filter results', ar: 'تصفية النتائج' })}</p>
              {activeFacets > 0 && (
                <button
                  type="button"
                  className="gw-active-filters-clear"
                  onClick={() => {
                    setTypes([]);
                    setColors([]);
                    setBrands([]);
                  }}
                >
                  {t.common.clearAll}
                </button>
              )}
            </div>
            <Facet
              title={pick({ en: 'Result type', ar: 'نوع النتيجة' })}
              vals={searchFacets.types}
              active={types}
              toggle={(value) => toggle(value, setTypes)}
              labels={{
                products: pick({ en: 'Products', ar: 'المنتجات' }),
                pages: pick({ en: 'Pages & Services', ar: 'الصفحات والخدمات' }),
              }}
            />
            <Facet
              title={pick({ en: 'Brand', ar: 'البراند' })}
              vals={searchFacets.brands}
              active={brands}
              toggle={(value) => toggle(value, setBrands)}
            />
            <Facet
              title={pick({ en: 'Colour', ar: 'اللون' })}
              vals={searchFacets.colors}
              active={colors}
              toggle={(value) => toggle(value, setColors)}
            />
          </aside>

          <div className="gw-catalogue-main">
            {!query.trim() && activeFacets === 0 ? (
              <div className="gw-terminal-inner">
                <h2 className="gw-terminal-title">
                  {pick({ en: 'Start typing to search', ar: 'ابدأ الكتابة للبحث' })}
                </h2>
                <p className="gw-terminal-copy">
                  {pick({
                    en: 'Products, brands, pages and services are all searched together.',
                    ar: 'يشمل البحث المنتجات والبراندات والصفحات والخدمات معًا.',
                  })}
                </p>
              </div>
            ) : results.total === 0 ? (
              <div className="gw-terminal-inner">
                <h2 className="gw-terminal-title">{t.search.noResults}</h2>
                <p className="gw-terminal-copy">
                  {pick({ en: 'Still cannot find it?', ar: 'ما زلت لم تجد المنتج؟' })}
                </p>
                <div className="gw-terminal-actions">
                  <Link className="gw-btn gw-btn--primary" to="/special-request">
                    {pick({ en: 'Send a Special Request', ar: 'أرسل طلبًا خاصًا' })}
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {results.products.length > 0 && (
                  <section className="gw-resultset">
                    <h2 className="gw-resultset-head">
                      <span className="gw-spec">{pick({ en: 'Products', ar: 'المنتجات' })}</span>
                      <span className="gw-figure gw-isolate-ltr">{results.products.length}</span>
                    </h2>
                    <div className="gw-catalogue-grid">
                      {results.products.map((product) => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                    </div>
                  </section>
                )}
                {results.pages.length > 0 && (
                  <section className="gw-resultset">
                    <h2 className="gw-resultset-head">
                      <span className="gw-spec">
                        {pick({ en: 'Pages & Services', ar: 'الصفحات والخدمات' })}
                      </span>
                      <span className="gw-figure gw-isolate-ltr">{results.pages.length}</span>
                    </h2>
                    <ul className="gw-resultlist">
                      {results.pages.map((item) => (
                        <li key={item.to}>
                          <Link to={item.to}>{pick(item.title)}</Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function Facet({ title, vals, active, toggle, labels = {} }) {
  return (
    <fieldset className="gw-facet">
      <legend className="gw-spec">{title}</legend>
      {vals.map((value) => (
        <label key={value} className="gw-facet-option">
          <input type="checkbox" checked={active.includes(value)} onChange={() => toggle(value)} />
          <span>{labels[value] || value}</span>
        </label>
      ))}
    </fieldset>
  );
}
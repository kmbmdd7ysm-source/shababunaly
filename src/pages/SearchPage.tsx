import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Seo from '../components/common/Seo';
import ProductCard from '../components/shop/ProductCard';
import Icon from '../components/icons/Icon';
import { useLanguage } from '../context/LanguageContext';
import { useCatalog } from '../context/CatalogContext';
import { getSearchFacets, searchSite } from '../utils/search';
import '../styles/design/phase2-search.css';
import '../styles/design/phase2-commerce.css';

export default function SearchPage(): ReactElement {
  const { pick } = useLanguage();
  const { products } = useCatalog();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') || '');
  const [types, setTypes] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);

  useEffect(() => setQuery(params.get('q') || ''), [params]);

  const results = useMemo(
    () => searchSite(query, 999, { types, brands }, products),
    [query, types, brands, products],
  );
  const facets = useMemo(() => getSearchFacets(products), [products]);

  const toggle = (value: string, setter: (next: (current: string[]) => string[]) => void) => {
    setter((current) => current.includes(value) ? current.filter((entry) => entry !== value) : [...current, value]);
  };

  const submit = () => {
    const value = query.trim();
    setParams(value ? { q: value } : {});
  };

  return (
    <>
      <Seo
        title={pick({ en: 'Search', ar: 'البحث' })}
        description={pick({ en: 'Search Shababuna products and pages.', ar: 'ابحث في منتجات وصفحات شبابنا.' })}
        path="/search"
        noindex
      />

      <header className="s2-search-page-head">
        <div className="s2-container">
          <span className="s2-overline">{pick({ en: 'Search', ar: 'البحث' })}</span>
          <form
            className="s2-search-page-form"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            <Icon name="search" size={30} />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={pick({ en: 'What are you looking for?', ar: 'شن تدور عليه؟' })}
              aria-label={pick({ en: 'Search Shababuna', ar: 'ابحث في شبابنا' })}
            />
            <button type="submit">{pick({ en: 'Search', ar: 'بحث' })}</button>
          </form>
          <p aria-live="polite">{results.total} {pick({ en: 'results', ar: 'نتيجة' })}</p>
        </div>
      </header>

      <div className="s2-search-page-tools s2-container">
        <div className="s2-search-page-filters">
          <button type="button" className={!types.length ? 'is-active' : ''} onClick={() => setTypes([])}>
            {pick({ en: 'All', ar: 'الكل' })}
          </button>
          {facets.types.map((type) => (
            <button
              type="button"
              key={type}
              className={types.includes(type) ? 'is-active' : ''}
              onClick={() => toggle(type, setTypes)}
            >
              {type === 'products' ? pick({ en: 'Products', ar: 'المنتجات' }) : pick({ en: 'Pages', ar: 'الصفحات' })}
            </button>
          ))}
        </div>
        {facets.brands.length > 1 ? (
          <details className="s2-search-brand-filter">
            <summary>{pick({ en: 'Brands', ar: 'البراندات' })}{brands.length ? ` (${brands.length})` : ''}</summary>
            <div>
              {(facets.brands as string[]).filter(Boolean).map((brand) => (
                <label key={brand}>
                  <input type="checkbox" checked={brands.includes(brand)} onChange={() => toggle(brand, setBrands)} />
                  <span>{brand}</span>
                </label>
              ))}
            </div>
          </details>
        ) : null}
      </div>

      <main className="s2-search-page-body s2-container">
        {!query.trim() ? (
          <section className="s2-search-page-empty">
            <h1>{pick({ en: 'Search Shababuna.', ar: 'ابحث في شبابنا.' })}</h1>
            <div>
              <Link to="/discover/new-this-week">{pick({ en: 'New this week', ar: 'جديد هذا الأسبوع' })}</Link>
              <Link to="/discover/trending-now">{pick({ en: 'Trending now', ar: 'الرائج الآن' })}</Link>
              <Link to="/discover/performance-picks">{pick({ en: 'Performance picks', ar: 'اختيارات الأداء' })}</Link>
            </div>
          </section>
        ) : results.total === 0 ? (
          <section className="s2-search-page-empty">
            <h1>{pick({ en: 'No results.', ar: 'لا توجد نتائج.' })}</h1>
            <p>{pick({ en: 'Try another term or send us the product.', ar: 'جرب كلمة ثانية أو ابعتلنا المنتج.' })}</p>
            <Link to="/special-request">{pick({ en: 'Send a product request', ar: 'أرسل طلب منتج' })}</Link>
          </section>
        ) : (
          <>
            {results.products.length ? (
              <section className="s2-search-result-section" aria-labelledby="s2-search-products">
                <div className="s2-section__head">
                  <h2 id="s2-search-products">{pick({ en: 'Products', ar: 'المنتجات' })}</h2>
                  <span>{results.products.length}</span>
                </div>
                <div className="s2-product-grid">
                  {results.products.map((product, index) => <ProductCard key={product.id} product={product} eager={index < 8} />)}
                </div>
              </section>
            ) : null}

            {results.pages.length ? (
              <section className="s2-search-result-section s2-search-pages" aria-labelledby="s2-search-pages">
                <div className="s2-section__head">
                  <h2 id="s2-search-pages">{pick({ en: 'Pages', ar: 'الصفحات' })}</h2>
                  <span>{results.pages.length}</span>
                </div>
                <div className="s2-search-page-links">
                  {results.pages.map((item) => (
                    <Link key={item.to} to={item.to}>
                      <span>{pick(item.title)}</span>
                      <Icon name="arrow" size={18} />
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </main>
    </>
  );
}

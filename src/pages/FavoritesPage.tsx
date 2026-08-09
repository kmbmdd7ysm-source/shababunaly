import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useWishlist } from '../hooks/useWishlist';
import { useUserData } from '../context/UserDataContext';
import { useCatalog } from '../context/CatalogContext';
import Seo from '../components/common/Seo';
import ProductCard from '../components/shop/ProductCard';
import { categories } from '../data/categories';
import { useCommerce } from '../context/CommerceContext';
import '../styles/catalogue.css';
import '../styles/runs.css';
import '../styles/ledger.css';

export default function FavoritesPage(): ReactElement {
  const { products } = useCatalog();
  const { pick } = useLanguage();
  const { ids } = useWishlist();
  const userData = useUserData();
  const { countryCode } = useCommerce();
  const isLibya = countryCode === 'LY';
  const savedProducts = ids
    .map((id) => products.find((p) => p.id === id))
    .filter((product): product is Record<string, unknown> & { id: string } =>
      Boolean(product && typeof product === 'object' && 'id' in product),
    );
  const savedCount = savedProducts.length;
  const departments = categories.filter((item) => isLibya || item.slug !== 'ready-to-ship');

  return (
    <>
      <Seo title={pick({ en: 'Favorites', ar: 'المفضلة' })} path="/favorites" />
      <section className="gw-world-headband" aria-labelledby="favorites-title">
        <div className="gw-cat-head-inner">
          <p className="gw-spec">{pick({ en: 'Saved for later', ar: 'محفوظ لاحقًا' })}</p>
          <div className="gw-cat-head-row">
            <h1 id="favorites-title" className="gw-cat-title">
              {pick({ en: 'Favorites', ar: 'المفضلة' })}
            </h1>
            <p className="gw-cat-count">
              <span className="gw-figure gw-isolate-ltr">{savedCount}</span>
              <span className="gw-spec">{pick({ en: 'saved', ar: 'محفوظ' })}</span>
            </p>
          </div>
        </div>
      </section>

      <div className="gw-catalogue">
        <div className="gw-catalogue-inner gw-catalogue-inner--full">
          {(userData?.status === 'error' || userData?.status === 'offline') && (
            <div className="gw-notice" role="status" aria-live="polite">
              <div>
                <strong>
                  {pick(
                    userData.status === 'offline'
                      ? { en: 'Favorites are available offline', ar: 'المفضلة متاحة دون اتصال' }
                      : {
                          en: 'Favorites sync is temporarily unavailable',
                          ar: 'مزامنة المفضلة غير متاحة مؤقتًا',
                        },
                  )}
                </strong>
                <p>
                  {pick({
                    en: 'Your locally saved items are still shown below.',
                    ar: 'لا تزال العناصر المحفوظة محليًا ظاهرة أدناه.',
                  })}
                </p>
              </div>
              <button
                className="gw-btn gw-btn--secondary"
                type="button"
                onClick={() => {
                  const retry = userData.retrySync;
                  if (typeof retry === 'function') retry();
                }}
              >
                {pick({ en: 'Retry', ar: 'إعادة المحاولة' })}
              </button>
            </div>
          )}

          <span className="sr-only" aria-live="polite">
            {savedCount}
          </span>

          {userData?.status === 'syncing' && !savedCount ? (
            <div className="gw-terminal-inner" role="status">
              <h2 className="gw-terminal-title">
                {pick({ en: 'Loading saved items…', ar: 'جارٍ تحميل العناصر المحفوظة…' })}
              </h2>
            </div>
          ) : savedCount ? (
            <div className="gw-catalogue-grid">
              {savedProducts.map((product) => (
                <ProductCard key={String(product.id)} product={product} />
              ))}
            </div>
          ) : (
            <div className="gw-ledger-empty">
              <div className="gw-ledger-empty-say">
                <p className="gw-ledger-empty-line">
                  {pick({ en: 'Nothing saved yet', ar: 'لا شيء محفوظ بعد' })}
                </p>
                <p className="gw-ledger-empty-hint">
                  {pick({
                    en: 'Save products from the shop and they will appear here.',
                    ar: 'احفظ منتجات من المتجر لتظهر هنا.',
                  })}
                </p>
                <Link to="/shop" className="gw-btn gw-btn--primary">
                  {pick({ en: 'Browse the shop', ar: 'تصفح المتجر' })}
                </Link>
              </div>
              <ul className="gw-ledger-gates">
                {departments.map((entry, position) => (
                  <li key={entry.slug}>
                    <Link to={`/shop/${entry.slug}`}>
                      <span className="gw-ledger-gate-num" aria-hidden="true">
                        {String(position + 1).padStart(2, '0')}
                      </span>
                      <span className="gw-ledger-gate-name">{pick(entry.name)}</span>
                      <span className="gw-ledger-gate-count gw-isolate-ltr">
                        {products.filter((item) => item.category === entry.slug).length}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useWishlist } from '../hooks/useWishlist';
import { useUserData } from '../context/UserDataContext';
import { useCatalog } from '../context/CatalogContext';
import Seo from '../components/common/Seo';
import ProductCard from '../components/shop/ProductCard';

export default function FavoritesPage() {
  const { products } = useCatalog();
  const { pick } = useLanguage();
  const { ids } = useWishlist();
  const userData = useUserData();
  const savedProducts = ids.map((id) => products.find((p) => p.id === id)).filter(Boolean);
  const savedCount = savedProducts.length;

  return (
    <>
      <Seo title={pick({ en: 'Favorites', ar: 'المفضلة' })} path="/favorites" />
      <section className="section favorites-page">
        <div className="container">
          <p className="section-label">SHABABUNA</p>
          <div className="page-title-row">
            <h1>{pick({ en: 'Favorites', ar: 'المفضلة' })}</h1>
            <span aria-live="polite">{savedCount}</span>
          </div>
          {(userData?.status === 'error' || userData?.status === 'offline') && (
            <div className="sync-warning" role="status" aria-live="polite">
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
                className="btn-secondary"
                type="button"
                onClick={() => userData.retrySync?.()}
              >
                {pick({ en: 'Retry', ar: 'إعادة المحاولة' })}
              </button>
            </div>
          )}
          {userData?.status === 'syncing' && !savedCount ? (
            <div className="empty-state" role="status">
              <h2>{pick({ en: 'Loading saved items…', ar: 'جارٍ تحميل العناصر المحفوظة…' })}</h2>
            </div>
          ) : savedCount ? (
            <>
              {savedProducts.length > 0 && (
                <div className="product-grid">
                  {savedProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}

            </>
          ) : userData?.status === 'error' || userData?.status === 'offline' ? (
            <div className="empty-state">
              <h2>
                {pick({ en: 'No local favorites are available', ar: 'لا توجد مفضلات محلية متاحة' })}
              </h2>
              <p>
                {pick({
                  en: 'Retry when your connection is available.',
                  ar: 'أعد المحاولة عند توفر الاتصال.',
                })}
              </p>
            </div>
          ) : (
            <div className="empty-state">
              <h2>{pick({ en: 'No saved items yet', ar: 'لا توجد عناصر محفوظة بعد' })}</h2>
              <p>
                {pick({
                  en: 'Save products with the heart icon and they will appear here.',
                  ar: 'احفظ المنتجات باستخدام رمز القلب وستظهر هنا.',
                })}
              </p>
              <Link className="btn-primary" to="/shop">
                {pick({ en: 'Browse shop', ar: 'تصفح المتجر' })}
              </Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useWishlist } from '../hooks/useWishlist';
import { useUserData } from '../context/UserDataContext';
import { useCatalog } from '../context/CatalogContext';
import Seo from '../components/common/Seo';
import ProductCard from '../components/shop/ProductCard';
import RouteMasthead from '../components/composition/RouteMasthead';
import '../styles/catalogue.css';

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
      <RouteMasthead
        eyebrow="Shababuna"
        title={pick({ en: 'Favorites', ar: 'المفضلة' })}
        trail={[{ label: pick({ en: 'Favorites', ar: 'المفضلة' }) }]}
        figure={{ value: savedCount, label: pick({ en: 'saved', ar: 'محفوظ' }) }}
      />

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
                onClick={() => userData.retrySync?.()}
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
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : userData?.status === 'error' || userData?.status === 'offline' ? (
            <div className="gw-terminal-inner">
              <h2 className="gw-terminal-title">
                {pick({ en: 'No local favorites are available', ar: 'لا توجد مفضلات محلية متاحة' })}
              </h2>
              <p className="gw-terminal-copy">
                {pick({
                  en: 'Retry when your connection is available.',
                  ar: 'أعد المحاولة عند توفر الاتصال.',
                })}
              </p>
            </div>
          ) : (
            <div className="gw-terminal-inner">
              <h2 className="gw-terminal-title">
                {pick({ en: 'No saved items yet', ar: 'لا توجد عناصر محفوظة بعد' })}
              </h2>
              <p className="gw-terminal-copy">
                {pick({
                  en: 'Save products with the heart icon and they will appear here.',
                  ar: 'احفظ المنتجات باستخدام رمز القلب وستظهر هنا.',
                })}
              </p>
              <div className="gw-terminal-actions">
                <Link className="gw-btn gw-btn--primary" to="/shop">
                  {pick({ en: 'Browse shop', ar: 'تصفح المتجر' })}
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

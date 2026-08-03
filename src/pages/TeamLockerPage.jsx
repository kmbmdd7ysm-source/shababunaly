import { useEffect, useMemo, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import Seo from '../components/common/Seo';
import PageHero from '../components/common/PageHero';
import ProductCard from '../components/shop/ProductCard';
import { useAuth } from '../context/AuthContext';
import { useCatalog } from '../context/CatalogContext';
import { useLanguage } from '../context/LanguageContext';
import { getTeamLocker } from '../services/b2b';

export default function TeamLockerPage() {
  const { slug } = useParams();
  const auth = useAuth();
  const catalog = useCatalog();
  const { pick } = useLanguage();
  const [state, setState] = useState({ loading: true, store: null, rows: [], error: '' });
  useEffect(() => {
    let active = true;
    if (!auth.user?.id) return undefined;
    setState((current) => ({ ...current, loading: true, error: '' }));
    getTeamLocker(slug)
      .then((result) => {
        if (active)
          setState({ loading: false, store: result.store, rows: result.products, error: '' });
      })
      .catch((error) => {
        if (active)
          setState({
            loading: false,
            store: null,
            rows: [],
            error: error?.message || 'team_locker_unavailable',
          });
      });
    return () => {
      active = false;
    };
  }, [auth.user?.id, slug]);
  const products = useMemo(
    () => state.rows.map((row) => catalog.getProductById(row.product_id)).filter(Boolean),
    [catalog, state.rows],
  );
  if (auth.loading) return null;
  if (!auth.user)
    return (
      <Navigate to={`/account?returnTo=${encodeURIComponent(`/team-locker/${slug}`)}`} replace />
    );
  return (
    <>
      <Seo title={state.store?.name || 'Team Locker'} path={`/team-locker/${slug}`} noindex />
      <PageHero
        label="TEAM LOCKER"
        title={state.store?.name || pick({ en: 'Private Team Store', ar: 'متجر الفريق الخاص' })}
        description={
          state.store?.description ||
          pick({
            en: 'Approved products for authorized organization members.',
            ar: 'منتجات معتمدة لأعضاء المؤسسة المصرح لهم.',
          })
        }
      />
      <section className="section">
        <div className="container">
          {state.loading ? (
            <p role="status">
              {pick({ en: 'Loading team store…', ar: 'جاري تحميل متجر الفريق…' })}
            </p>
          ) : state.error ? (
            <div className="workspace-empty">
              <h2>{pick({ en: 'Team store unavailable', ar: 'متجر الفريق غير متاح' })}</h2>
              <p>
                {pick({
                  en: 'The store may be closed or your account may not have access.',
                  ar: 'قد يكون المتجر مغلقًا أو قد لا يملك حسابك صلاحية الوصول.',
                })}
              </p>
            </div>
          ) : products.length ? (
            <div className="product-grid">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="workspace-empty">
              <h2>{pick({ en: 'No products published yet', ar: 'لا توجد منتجات منشورة بعد' })}</h2>
              <p>
                {pick({
                  en: 'The organization manager will publish approved products here.',
                  ar: 'سينشر مدير المؤسسة المنتجات المعتمدة هنا.',
                })}
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

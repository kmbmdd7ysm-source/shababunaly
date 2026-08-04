import { useEffect, useMemo, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import Seo from '../components/common/Seo';
import RouteMasthead from '../components/composition/RouteMasthead';
import '../styles/catalogue.css';
import '../styles/composition.css';
import '../styles/workspace.css';
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
  const productCount = products.length;

  return (
    <>
      <Seo title={state.store?.name || 'Team Locker'} path={`/team-locker/${slug}`} noindex />

      {/* A PRIVATE CLUB WORKSPACE, not a public store page. The masthead states
          plainly that access is restricted and carries the published product
          count as a figure, so a member can see at a glance whether their
          manager has published anything yet. */}
      <RouteMasthead
        eyebrow={pick({ en: 'Team Locker · private', ar: 'خزانة الفريق · خاصة' })}
        title={state.store?.name || pick({ en: 'Private Team Store', ar: 'متجر الفريق الخاص' })}
        lede={
          state.store?.description ||
          pick({
            en: 'Approved products for authorized organization members.',
            ar: 'منتجات معتمدة لأعضاء المؤسسة المصرح لهم.',
          })
        }
        figure={
          !state.loading && !state.error
            ? { value: productCount, label: pick({ en: 'published', ar: 'منشور' }) }
            : null
        }
      />

      <section
        className="gw-vault"
        aria-label={pick({ en: 'Published products', ar: 'المنتجات المنشورة' })}
      >
        <div className="gw-vault-inner">
          <p className="gw-spec gw-vault-seal">
            {pick({
              en: 'Authorized members only · not indexed',
              ar: 'للأعضاء المصرح لهم فقط · غير مفهرس',
            })}
          </p>
          {state.loading ? (
            <p className="gw-locker-status" role="status">
              {pick({ en: 'Loading team store…', ar: 'جاري تحميل متجر الفريق…' })}
            </p>
          ) : state.error ? (
            <div className="gw-terminal-inner">
              <h2 className="gw-terminal-title">
                {pick({ en: 'Team store unavailable', ar: 'متجر الفريق غير متاح' })}
              </h2>
              <p className="gw-terminal-copy">
                {pick({
                  en: 'The store may be closed or your account may not have access.',
                  ar: 'قد يكون المتجر مغلقًا أو قد لا يملك حسابك صلاحية الوصول.',
                })}
              </p>
            </div>
          ) : productCount ? (
            <div className="gw-catalogue-grid">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="gw-terminal-inner">
              <h2 className="gw-terminal-title">
                {pick({ en: 'No products published yet', ar: 'لا توجد منتجات منشورة بعد' })}
              </h2>
              <p className="gw-terminal-copy">
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

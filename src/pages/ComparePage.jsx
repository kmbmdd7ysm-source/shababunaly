import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useCompare } from '../context/CompareContext';
import { useCatalog } from '../context/CatalogContext';
import { useLanguage } from '../context/LanguageContext';
import { useCart, cartKey } from '../context/CartContext';
import Seo from '../components/common/Seo';
import Price from '../components/common/Price';
import { getCompareAction } from '../utils/productOptions';
import Icon from '../components/icons/Icon';
import SmartImage from '../components/common/SmartImage';
import { getVariantPurchaseLimit } from '../utils/productEligibility';
export default function ComparePage() {
  const { products } = useCatalog();
  const c = useCompare(),
    { pick } = useLanguage(),
    { addItem } = useCart(),
    navigate = useNavigate(),
    location = useLocation();
  const list = c.ids.map((id) => products.find((p) => p.id === id)).filter(Boolean);
  const rows = [
    [pick({ en: 'Category', ar: 'الفئة' }), (p) => p.category],
    [pick({ en: 'Collection', ar: 'المجموعة' }), (p) => p.collection],
    [pick({ en: 'Colors', ar: 'الألوان' }), (p) => p.colors?.map((x) => pick(x.name)).join(', ')],
    [pick({ en: 'Sizes', ar: 'المقاسات' }), (p) => p.sizes?.join(', ')],
    [pick({ en: 'Material', ar: 'الخامة' }), (p) => pick(p.material)],
    [pick({ en: 'Fit', ar: 'القَصّة' }), (p) => pick(p.fit)],
    [pick({ en: 'Availability', ar: 'التوفر' }), (p) => p.availability],
    [pick({ en: 'Features', ar: 'المزايا' }), (p) => (pick(p.features) || []).join(' · ')],
  ];
  return (
    <>
      <Seo title="Compare products" path="/compare" noindex />
      <section className="section">
        <div className="container">
          <div className="compare-head">
            <div>
              <p className="section-label">SHABABUNA</p>
              <h1>{pick({ en: 'Compare products', ar: 'مقارنة المنتجات' })}</h1>
            </div>
            {list.length > 0 && (
              <button className="btn-secondary" onClick={c.clear}>
                {pick({ en: 'Clear all', ar: 'مسح الكل' })}
              </button>
            )}
          </div>
          {!list.length ? (
            <div className="empty-state">
              <h2>{pick({ en: 'No products selected', ar: 'لم تختر منتجات' })}</h2>
              <Link className="btn-primary" to="/shop">
                {pick({ en: 'Browse shop', ar: 'تصفح المتجر' })}
              </Link>
            </div>
          ) : (
            <div
              className="compare-scroll"
              role="region"
              aria-label={pick({
                en: 'Product comparison table; scroll horizontally for more products',
                ar: 'جدول مقارنة المنتجات؛ مرر أفقياً لرؤية المزيد من المنتجات',
              })}
            >
              <table className="compare-table">
                <thead>
                  <tr>
                    <th>{pick({ en: 'Product', ar: 'المنتج' })}</th>
                    {list.map((p) => (
                      <th key={p.id}>
                        <button
                          className="compare-remove"
                          onClick={() => c.remove(p.id)}
                          aria-label={pick({
                            en: `Remove ${pick(p.name)} from comparison`,
                            ar: `إزالة ${pick(p.name)} من المقارنة`,
                          })}
                        >
                          <Icon name="close" size={20} />
                        </button>
                        <SmartImage
                          src={p.image}
                          alt={pick(p.name)}
                          width={1000}
                          height={1250}
                          sizes="(min-width: 900px) 260px, 62vw"
                        />
                        <Link to={`/products/${p.slug}`}>{pick(p.name)}</Link>
                        <Price amount={p.price} compareAt={p.compareAt} />
                        {(() => {
                          const action = getCompareAction(p);
                          const label =
                            action.type === 'choose-options'
                              ? pick({ en: 'Choose options', ar: 'اختر الخيارات' })
                              : action.type === 'quote'
                                ? pick({ en: 'Request price', ar: 'اطلب السعر' })
                                : action.type === 'unavailable'
                                  ? pick({ en: 'Unavailable', ar: 'غير متوفر' })
                                  : pick({ en: 'Add to cart', ar: 'أضف إلى السلة' });
                          return (
                            <button
                              className="btn-primary"
                              disabled={action.type === 'unavailable'}
                              aria-label={`${label}: ${pick(p.name)}`}
                              onClick={() => {
                                if (action.type === 'choose-options') {
                                  navigate(`/products/${p.slug}`, {
                                    state: { from: location.pathname, compareIds: c.ids },
                                  });
                                  return;
                                }
                                if (action.type === 'quote') {
                                  navigate(`/teams-wholesale?product=${encodeURIComponent(p.slug)}#quote`);
                                  return;
                                }
                                const v = action.variant;
                                if (!v) return;
                                addItem({
                                  key: cartKey('product', p.id, `${v.color}-${v.size}`),
                                  type: 'product',
                                  id: p.id,
                                  slug: p.slug,
                                  name: p.name,
                                  image: p.image,
                                  price: Number(v.unitPrice ?? p.price),
                                  retailPrice: Number(v.unitPrice ?? p.price),
                                  wholesalePrice: Number(v.wholesalePrice ?? p.wholesalePrice ?? 0) || null,
                                  size: v.size,
                                  color: v.color,
                                  sku: v.sku,
                                  maxStock: getVariantPurchaseLimit(v),
                                  inventoryTracking: v.inventoryTracking !== false,
                                  href: `/products/${p.slug}`,
                                  quantity: 1,
                                  purchaseMode: 'retail',
                                  readyToShip: p.readyToShip === true && v.readyToShip !== false,
                                  deliveryProfile: p.readyToShip ? 'ready' : 'standard',
                                });
                              }}
                            >
                              {label}
                            </button>
                          );
                        })()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(([label, get]) => {
                    const vals = list.map(get);
                    if (vals.every((v) => !v)) return null;
                    const diff = new Set(vals.map((v) => JSON.stringify(v))).size > 1;
                    return (
                      <tr className={diff ? 'is-different' : ''} key={label}>
                        <th>{label}</th>
                        {vals.map((v, i) => (
                          <td key={i}>{v || '—'}</td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

import type { ReactElement } from 'react';
import type { CatalogProduct } from '../context/CatalogContext';
import { Link, useNavigate } from 'react-router-dom';
import { useCompare } from '../context/CompareContext';
import { useCatalog } from '../context/CatalogContext';
import { useLanguage } from '../context/LanguageContext';
import { useCart, type CartItem, cartKey } from '../context/CartContext';
import Seo from '../components/common/Seo';
import RouteMasthead from '../components/composition/RouteMasthead';
import '../styles/composition.css';
import Price from '../components/common/Price';
import { getCompareAction } from '../utils/productOptions';
import Icon from '../components/icons/Icon';
import SmartImage from '../components/common/SmartImage';
import { getVariantPurchaseLimit, type VariantLike } from '../utils/productEligibility';

export default function ComparePage(): ReactElement {
  const { products } = useCatalog();
  const c = useCompare();
  const { pick } = useLanguage();
  const { addItem } = useCart();
  const navigate = useNavigate();
  const list = c.ids
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is CatalogProduct => Boolean(p));
  type RowFn = (p: CatalogProduct) => unknown;
  const rows: Array<[string, RowFn]> = [
    [pick({ en: 'Category', ar: 'الفئة' }), (p) => p.category],
    [pick({ en: 'Collection', ar: 'المجموعة' }), (p) => p.collection],
    [
      pick({ en: 'Colors', ar: 'الألوان' }),
      (p) =>
        (Array.isArray(p.colors) ? p.colors : [])
          .map((x) => pick((x.name as { en?: string; ar?: string }) || { en: '', ar: '' }))
          .join(', '),
    ],
    [
      pick({ en: 'Sizes', ar: 'المقاسات' }),
      (p) => (Array.isArray(p.sizes) ? p.sizes : []).join(', '),
    ],
    [
      pick({ en: 'Material', ar: 'الخامة' }),
      (p) => pick(p.material as { en?: string; ar?: string }),
    ],
    [pick({ en: 'Fit', ar: 'القَصّة' }), (p) => pick(p.fit as { en?: string; ar?: string })],
    [pick({ en: 'Availability', ar: 'التوفر' }), (p) => p.availability],
    [
      pick({ en: 'Features', ar: 'المزايا' }),
      (p) => (Array.isArray(p.features) ? p.features : []).map(String).join(' · '),
    ],
  ];
  return (
    <>
      <Seo title="Compare products" path="/compare" noindex />
      <RouteMasthead
        eyebrow="Shababuna"
        title={pick({ en: 'Compare products', ar: 'مقارنة المنتجات' })}
        trail={[{ label: pick({ en: 'Compare', ar: 'المقارنة' }) }]}
        figure={{ value: list.length, label: pick({ en: 'selected', ar: 'محدد' }) }}
      >
        {list.length > 0 && (
          <button type="button" className="gw-btn gw-btn--secondary" onClick={c.clear}>
            {pick({ en: 'Clear all', ar: 'مسح الكل' })}
          </button>
        )}
      </RouteMasthead>
      <section className="gw-matrix">
        <div className="gw-matrix-inner">
          {!list.length ? (
            /* An empty comparison was a thin dead band saying nothing. A
               comparison page's whole value is its AXES, so the empty state
               shows them: the exact eight attributes the matrix will line up,
               read from the same `rows` the built matrix uses so the preview
               can never promise a column that does not appear. Three empty
               slots stand in for the products, making the shape of the answer
               visible before the visitor commits to filling it. */
            <div className="gw-matrix-blank">
              <div className="gw-matrix-blank-say">
                <h2 className="gw-matrix-blank-title">
                  {pick({ en: 'No products selected', ar: 'لم تختر منتجات' })}
                </h2>
                <p className="gw-matrix-blank-hint">
                  {pick({
                    en: 'Add products from the shop and they will be lined up against each of these.',
                    ar: 'أضف منتجات من المتجر لتُعرض جنبًا إلى جنب على هذه المعايير.',
                  })}
                </p>
                <Link className="gw-btn gw-btn--primary" to="/shop">
                  {pick({ en: 'Browse shop', ar: 'تصفح المتجر' })}
                </Link>
              </div>
              <table className="gw-matrix-preview">
                <caption className="sr-only">
                  {pick({
                    en: 'Attributes this comparison comes with',
                    ar: 'المعايير التي تشملها المقارنة',
                  })}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">{pick({ en: 'Attribute', ar: 'المعيار' })}</th>
                    {[0, 1, 2].map((slot) => (
                      <th scope="col" key={slot}>
                        <span className="gw-matrix-slot" aria-hidden="true">
                          {String(slot + 1).padStart(2, '0')}
                        </span>
                        <span className="sr-only">
                          {pick({ en: 'Empty slot', ar: 'خانة فارغة' })}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(([label]) => (
                    <tr key={String(label)}>
                      <th scope="row">{label}</th>
                      {[0, 1, 2].map((slot) => (
                        <td key={slot} aria-hidden="true">
                          —
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
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
                            en: `Remove ${pick(p.name as { en?: string; ar?: string })} from comparison`,
                            ar: `إزالة ${pick(p.name as { en?: string; ar?: string })} من المقارنة`,
                          })}
                        >
                          <Icon name="close" size={20} />
                        </button>
                        <SmartImage
                          src={String(p.image || '')}
                          alt={pick(p.name as { en?: string; ar?: string })}
                          width={1000}
                          height={1250}
                          sizes="(min-width: 900px) 260px, 62vw"
                        />
                        <Link to={`/products/${String(p.slug || '')}`}>
                          {pick(p.name as { en?: string; ar?: string })}
                        </Link>
                        <Price
                          amount={Number(p.price || 0)}
                          compareAt={p.compareAt == null ? null : Number(p.compareAt)}
                        />
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
                              aria-label={`${label}: ${pick(p.name as { en?: string; ar?: string })}`}
                              onClick={() => {
                                if (action.type === 'choose-options') {
                                  navigate(`/products/${String(p.slug || '')}`);
                                  return;
                                }
                                if (action.type === 'quote') {
                                  navigate(
                                    `/teams-wholesale?product=${encodeURIComponent(String(p.slug || ''))}#quote`,
                                  );
                                  return;
                                }
                                const v = action.variant;
                                if (!v) return;
                                const variant = v as Record<string, unknown>;
                                addItem({
                                  key: cartKey(
                                    'product',
                                    p.id,
                                    `${String(variant.color)}-${String(variant.size)}`,
                                  ),
                                  type: 'product',
                                  id: p.id,
                                  slug: String(p.slug || ''),
                                  name: p.name,
                                  image: String(p.image || ''),
                                  price: Number(variant.unitPrice ?? p.price),
                                  retailPrice: Number(variant.unitPrice ?? p.price),
                                  wholesalePrice:
                                    Number(variant.wholesalePrice ?? p.wholesalePrice ?? 0) || null,
                                  size: String(variant.size || ''),
                                  color: String(variant.color || ''),
                                  sku: String(variant.sku || ''),
                                  maxStock: getVariantPurchaseLimit(variant as VariantLike),
                                  inventoryTracking: variant.inventoryTracking !== false,
                                  href: `/products/${String(p.slug || '')}`,
                                  quantity: 1,
                                  purchaseMode: 'retail',
                                  readyToShip:
                                    p.readyToShip === true && variant.readyToShip !== false,
                                  deliveryProfile: p.readyToShip ? 'ready' : 'standard',
                                } as CartItem);
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
                          <td key={i}>{String(v ?? '—')}</td>
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

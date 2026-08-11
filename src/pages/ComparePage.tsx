import type { ReactElement } from 'react';
import type { CatalogProduct } from '../context/CatalogContext';
import { Link, useNavigate } from 'react-router-dom';
import { useCompare } from '../context/CompareContext';
import { useCatalog } from '../context/CatalogContext';
import { useLanguage } from '../context/LanguageContext';
import { useCart, type CartItem, cartKey } from '../context/CartContext';
import Seo from '../components/common/Seo';
import Price from '../components/common/Price';
import SmartImage from '../components/common/SmartImage';
import Icon from '../components/icons/Icon';
import { getCompareAction } from '../utils/productOptions';
import { getVariantPurchaseLimit, type VariantLike } from '../utils/productEligibility';
import { PERFORMANCE_METRICS, getPerformanceProfile, isBasketballPerformanceShoe } from '../utils/productIntelligence';
import '../styles/consumer-commerce.css';

export default function ComparePage(): ReactElement {
  const { products } = useCatalog();
  const compare = useCompare();
  const { pick } = useLanguage();
  const { addItem } = useCart();
  const navigate = useNavigate();
  const list = compare.ids
    .map((id) => products.find((product) => product.id === id))
    .filter((product): product is CatalogProduct => Boolean(product))
    .slice(0, 4);

  const genericRows: Array<[string, (product: CatalogProduct) => string]> = [
    [pick({ en: 'Category', ar: 'الفئة' }), (p) => String(p.category || '—')],
    [pick({ en: 'Sizes', ar: 'المقاسات' }), (p) => (Array.isArray(p.sizes) ? p.sizes.map(String).join(' · ') : '—')],
    [pick({ en: 'Material', ar: 'الخامة' }), (p) => p.material ? pick(p.material as { en?: string; ar?: string }) : '—'],
    [pick({ en: 'Fit', ar: 'القَصّة' }), (p) => p.fit ? pick(p.fit as { en?: string; ar?: string }) : '—'],
    [pick({ en: 'Availability', ar: 'التوفر' }), (p) => String(p.availability || '—')],
  ];
  const showPerformance = list.some(isBasketballPerformanceShoe);

  const add = (product: CatalogProduct) => {
    const action = getCompareAction(product);
    if (action.type === 'choose-options') return navigate(`/products/${String(product.slug || '')}`);
    if (action.type === 'quote') return navigate(`/teams-wholesale?product=${encodeURIComponent(String(product.slug || ''))}#quote`);
    if (action.type === 'unavailable' || !action.variant) return;
    const variant = action.variant as Record<string, unknown>;
    addItem({
      key: cartKey('product', product.id, `${String(variant.color)}-${String(variant.size)}`),
      type: 'product',
      id: product.id,
      slug: String(product.slug || ''),
      name: product.name,
      image: String(product.image || ''),
      price: Number(variant.unitPrice ?? product.price),
      retailPrice: Number(variant.unitPrice ?? product.price),
      wholesalePrice: Number(variant.wholesalePrice ?? product.wholesalePrice ?? 0) || null,
      size: String(variant.size || ''),
      color: String(variant.color || ''),
      sku: String(variant.sku || ''),
      maxStock: getVariantPurchaseLimit(variant as VariantLike),
      inventoryTracking: variant.inventoryTracking !== false,
      href: `/products/${String(product.slug || '')}`,
      quantity: 1,
      purchaseMode: 'retail',
      readyToShip: product.readyToShip === true && variant.readyToShip !== false,
      deliveryProfile: product.readyToShip ? 'ready' : 'standard',
    } as CartItem);
  };

  return (
    <>
      <Seo title="Compare products" path="/compare" noindex />
      <main className="cc-compare-page">
        <header className="cc-page-head">
          <div>
            <p className="cc-eyebrow">{pick({ en: 'Basketball intelligence', ar: 'ذكاء كرة السلة' })}</p>
            <h1>{pick({ en: 'Compare what matters.', ar: 'قارن ما يهم فعلًا.' })}</h1>
            <p>{pick({ en: 'Up to four products. Performance rows stay blank unless the underlying data is verified.', ar: 'حتى أربعة منتجات. بيانات الأداء تبقى غير موثقة ما لم توجد بيانات موثقة فعلًا.' })}</p>
          </div>
          {list.length ? <button className="cc-text-action" type="button" onClick={compare.clear}>{pick({ en: 'Clear all', ar: 'مسح الكل' })}</button> : null}
        </header>

        {!list.length ? (
          <section className="cc-empty">
            <h2>{pick({ en: 'Nothing to compare yet.', ar: 'لا توجد منتجات للمقارنة بعد.' })}</h2>
            <p>{pick({ en: 'Add products from a PDP or use the Basketball Shoe Finder.', ar: 'أضف منتجات من صفحة المنتج أو استخدم أداة اختيار حذاء كرة السلة.' })}</p>
            <div className="cc-actions"><Link className="gw-btn gw-btn--primary" to="/basketball/shoe-finder">{pick({ en: 'Open Shoe Finder', ar: 'افتح اختيار الحذاء' })}</Link><Link className="gw-btn gw-btn--ghost" to="/shop">{pick({ en: 'Browse shop', ar: 'تصفح المتجر' })}</Link></div>
          </section>
        ) : (
          <section className="cc-compare-wrap" aria-label={pick({ en: 'Product comparison', ar: 'مقارنة المنتجات' })}>
            <div className="cc-compare-scroll">
              <table className="cc-compare-table">
                <thead>
                  <tr>
                    <th scope="col">{pick({ en: 'Product', ar: 'المنتج' })}</th>
                    {list.map((product) => {
                      const action = getCompareAction(product);
                      return (
                        <th scope="col" key={product.id}>
                          <button className="cc-remove" type="button" onClick={() => compare.remove(product.id)} aria-label={pick({ en: 'Remove from comparison', ar: 'إزالة من المقارنة' })}><Icon name="close" size={18} /></button>
                          <Link className="cc-product-media" to={`/products/${String(product.slug || '')}`}><SmartImage src={String(product.image || '')} alt={pick(product.name as { en?: string; ar?: string })} width={900} height={1125} /></Link>
                          <Link className="cc-product-name" to={`/products/${String(product.slug || '')}`}>{pick(product.name as { en?: string; ar?: string })}</Link>
                          <Price amount={Number(product.price || 0)} compareAt={product.compareAt == null ? null : Number(product.compareAt)} />
                          <button className="gw-btn gw-btn--primary cc-product-action" type="button" disabled={action.type === 'unavailable'} onClick={() => add(product)}>{action.type === 'choose-options' ? pick({ en: 'Choose options', ar: 'اختر الخيارات' }) : action.type === 'quote' ? pick({ en: 'Request price', ar: 'اطلب السعر' }) : action.type === 'unavailable' ? pick({ en: 'Unavailable', ar: 'غير متوفر' }) : pick({ en: 'Add to bag', ar: 'أضف للحقيبة' })}</button>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {genericRows.map(([label, getter]) => (
                    <tr key={label}><th scope="row">{label}</th>{list.map((product) => <td key={product.id}>{getter(product)}</td>)}</tr>
                  ))}
                  {showPerformance ? <tr className="cc-section-row"><th colSpan={list.length + 1}>{pick({ en: 'Verified basketball performance', ar: 'أداء كرة السلة الموثق' })}</th></tr> : null}
                  {showPerformance ? PERFORMANCE_METRICS.map(({ key, en, ar }) => (
                    <tr key={key}>
                      <th scope="row">{pick({ en, ar })}</th>
                      {list.map((product) => {
                        const item = getPerformanceProfile(product)[key];
                        return <td key={product.id}>{item ? `${item.value.toFixed(1)}/10` : pick({ en: 'Not verified', ar: 'غير موثق' })}</td>;
                      })}
                    </tr>
                  )) : null}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </>
  );
}

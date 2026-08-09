import type { ChangeEvent, ReactElement } from 'react';
import { useState } from 'react';
import { updateCatalogProduct } from '../../services/operations';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function ProductContentCard({
  row,
  pick,
  saving,
  run,
}: {
  row: Record<string, unknown>;
  pick: (value: import('../../context/LanguageContext').LocaleValue) => string;
  saving?: string | boolean | undefined;
  run: (...args: unknown[]) => unknown;
}): ReactElement {
  const data = asRecord(row.variant_data);
  const [values, setValues] = useState({
    nameEn: String(data.nameEn || row.product_name || ''),
    nameAr: String(data.nameAr || ''),
    descriptionEn: String(data.descriptionEn || ''),
    descriptionAr: String(data.descriptionAr || ''),
    brand: String(data.brand || ''),
    category: String(data.category || ''),
    subcategory: String(data.subcategory || ''),
    productType: String(data.productType || ''),
    imageUrl: String(data.imageUrl || ''),
    featured: Boolean(data.featured),
    newArrival: Boolean(data.newArrival),
    bestSeller: Boolean(data.bestSeller),
    comingSoon: Boolean(data.comingSoon),
    quoteOnly: Boolean(data.quoteOnly),
  });
  const key = `catalog-product-${String(row.product_id || '')}`;
  const set =
    (field: keyof typeof values) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const target = event.target;
      const nextValue =
        target instanceof HTMLInputElement && target.type === 'checkbox'
          ? target.checked
          : target.value;
      setValues((current) => ({
        ...current,
        [field]: nextValue,
      }));
    };
  return (
    <details className="operations-product-card">
      <summary>
        <span>
          <strong>{values.nameEn || String(row.product_name || '')}</strong>
          <small>
            {String(row.product_id || '')} · {values.brand || String(data.brand || 'Shababuna')}
          </small>
        </span>
        <span>{pick({ en: 'Edit', ar: 'تعديل' })}</span>
      </summary>
      <div className="operations-product-editor">
        <div className="operations-form-grid">
          <label>
            <span>English name</span>
            <input value={values.nameEn} onChange={set('nameEn')} />
          </label>
          <label>
            <span>{pick({ en: 'Arabic name (optional)', ar: 'الاسم العربي (اختياري)' })}</span>
            <input value={values.nameAr} onChange={set('nameAr')} />
          </label>
          <label>
            <span>Brand</span>
            <input value={values.brand} onChange={set('brand')} />
          </label>
          <label>
            <span>Product type</span>
            <input value={values.productType} onChange={set('productType')} />
          </label>
          <label>
            <span>Category</span>
            <input value={values.category} onChange={set('category')} />
          </label>
          <label>
            <span>Subcategory</span>
            <input value={values.subcategory} onChange={set('subcategory')} />
          </label>
        </div>
        <label>
          <span>
            {pick({
              en: 'Product image URL or /public path',
              ar: 'رابط صورة المنتج أو مسار public',
            })}
          </span>
          <input
            value={values.imageUrl}
            onChange={set('imageUrl')}
            placeholder="/images/products/item.webp"
          />
        </label>
        <div className="operations-form-grid operations-form-grid--descriptions">
          <label>
            <span>English description</span>
            <textarea rows={4} value={values.descriptionEn} onChange={set('descriptionEn')} />
          </label>
          <label>
            <span>{pick({ en: 'Arabic description', ar: 'الوصف العربي' })}</span>
            <textarea rows={4} value={values.descriptionAr} onChange={set('descriptionAr')} />
          </label>
        </div>
        <div className="operations-check-grid">
          {(
            [
              ['featured', 'Featured'],
              ['newArrival', 'New Arrival'],
              ['bestSeller', 'Best Seller'],
              ['comingSoon', 'Coming Soon'],
              ['quoteOnly', 'Quote Only'],
            ] as const
          ).map(([field, label]) => (
            <label key={field}>
              <input type="checkbox" checked={Boolean(values[field])} onChange={set(field)} />
              <span>{label}</span>
            </label>
          ))}
        </div>
        <button
          className="btn-primary compact"
          disabled={saving === key || !values.nameEn.trim()}
          onClick={() => {
            void Promise.resolve(
              run(
                key,
                () => updateCatalogProduct({ productId: String(row.product_id || ''), ...values }),
                pick({
                  en: 'Product content saved and published to the live catalog.',
                  ar: 'تم حفظ محتوى المنتج ونشره في الكتالوج المباشر.',
                }),
              ),
            );
          }}
        >
          {pick({ en: 'Save Product', ar: 'حفظ المنتج' })}
        </button>
      </div>
    </details>
  );
}

import type { ReactElement } from 'react';
import { useState } from 'react';
import {
  addCatalogVariantDraft,
  archiveCatalogProduct,
  createCatalogProductDraft,
} from '../../../services/operations';

export default function CatalogDraftManager({
  state,
  pick,
  saving,
  run,
}: {
  state: unknown;
  pick: (value: string | { en?: string; ar?: string }) => string;
  saving?: string | boolean | undefined;
  run: (...args: unknown[]) => unknown;
  [key: string]: unknown;
}): ReactElement {
  const s = (state || {}) as Record<string, unknown>;
  const rows = (key: string) =>
    Array.isArray(s[key]) ? (s[key] as Array<Record<string, unknown>>) : [];
  const [product, setProduct] = useState({
    productId: '',
    slug: '',
    nameEn: '',
    nameAr: '',
    descriptionEn: '',
    descriptionAr: '',
    brand: 'SHABABUNA',
    category: 'clothing',
    subcategory: '',
    productType: '',
    sku: '',
    color: 'black',
    size: 'OS',
    currency: 'USD',
  });
  const [variant, setVariant] = useState({ productId: '', sku: '', color: 'black', size: 'OS' });
  const productIds = [
    ...new Set(rows('catalog').map((row: Record<string, unknown>) => row.product_id)),
  ].map((id: unknown) => String(id));
  return (
    <section className="operations-subsection">
      <h3>{pick({ en: 'Safe product & variant creation', ar: 'إنشاء آمن للمنتجات والخيارات' })}</h3>
      <p>
        {pick({
          en: 'New catalog records are always drafts with zero inventory and cannot appear in the storefront until real media, SKU, price and verified inventory are supplied.',
          ar: 'تُنشأ السجلات الجديدة دائمًا كمسودات بمخزون صفري، ولا تظهر في المتجر قبل إضافة صور حقيقية وSKU وسعر ومخزون موثق.',
        })}
      </p>
      <div className="operations-card-grid">
        <form
          className="operations-card"
          onSubmit={(event) => {
            event.preventDefault();
            run(
              'catalog-product-create',
              () => createCatalogProductDraft(product),
              pick({ en: 'Draft product created safely.', ar: 'تم إنشاء المنتج كمسودة آمنة.' }),
            );
          }}
        >
          <strong>{pick({ en: 'New draft product', ar: 'منتج جديد كمسودة' })}</strong>
          <div className="operations-form-grid">
            <input
              value={product.productId}
              onChange={(event) =>
                setProduct({
                  ...product,
                  productId: event.target.value.replace(/[^a-z0-9._-]/gi, '-').toLowerCase(),
                })
              }
              placeholder="product-id"
              required
            />
            <input
              value={product.slug}
              onChange={(event) =>
                setProduct({
                  ...product,
                  slug: event.target.value.replace(/[^a-z0-9-]/gi, '-').toLowerCase(),
                })
              }
              placeholder="product-slug"
              required
            />
            <input
              value={product.nameEn}
              onChange={(event) => setProduct({ ...product, nameEn: event.target.value })}
              placeholder="Product name EN"
              required
            />
            <input
              value={product.nameAr}
              onChange={(event) => setProduct({ ...product, nameAr: event.target.value })}
              placeholder="اسم المنتج"
              required
            />
            <input
              value={product.brand}
              onChange={(event) => setProduct({ ...product, brand: event.target.value })}
              placeholder="Brand"
              required
            />
            <input
              value={product.category}
              onChange={(event) => setProduct({ ...product, category: event.target.value })}
              placeholder="Category"
              required
            />
            <input
              value={product.subcategory}
              onChange={(event) => setProduct({ ...product, subcategory: event.target.value })}
              placeholder="Subcategory"
            />
            <input
              value={product.productType}
              onChange={(event) => setProduct({ ...product, productType: event.target.value })}
              placeholder="Product type"
            />
            <input
              value={product.sku}
              onChange={(event) =>
                setProduct({ ...product, sku: event.target.value.toUpperCase() })
              }
              placeholder="SKU"
              required
            />
            <input
              value={product.color}
              onChange={(event) => setProduct({ ...product, color: event.target.value })}
              placeholder="Color"
            />
            <input
              value={product.size}
              onChange={(event) => setProduct({ ...product, size: event.target.value })}
              placeholder="Size"
            />
          </div>
          <textarea
            rows={3}
            value={product.descriptionEn}
            onChange={(event) => setProduct({ ...product, descriptionEn: event.target.value })}
            placeholder="Description EN"
          />
          <textarea
            rows={3}
            value={product.descriptionAr}
            onChange={(event) => setProduct({ ...product, descriptionAr: event.target.value })}
            placeholder="الوصف"
          />
          <button className="btn-primary compact" disabled={saving === 'catalog-product-create'}>
            {pick({ en: 'Create draft', ar: 'إنشاء المسودة' })}
          </button>
        </form>
        <form
          className="operations-card"
          onSubmit={(event) => {
            event.preventDefault();
            run(
              'catalog-variant-create',
              () => addCatalogVariantDraft(variant),
              pick({ en: 'Draft variant added.', ar: 'تمت إضافة الخيار كمسودة.' }),
            );
          }}
        >
          <strong>{pick({ en: 'Add draft variant', ar: 'إضافة خيار كمسودة' })}</strong>
          <select
            value={variant.productId}
            onChange={(event) => setVariant({ ...variant, productId: event.target.value })}
            required
          >
            <option value="">{pick({ en: 'Select product', ar: 'اختر المنتج' })}</option>
            {productIds.map((id) => (
              <option key={String(id)} value={String(id)}>
                {String(id)}
              </option>
            ))}
          </select>
          <input
            value={variant.sku}
            onChange={(event) => setVariant({ ...variant, sku: event.target.value.toUpperCase() })}
            placeholder="SKU"
            required
          />
          <input
            value={variant.color}
            onChange={(event) => setVariant({ ...variant, color: event.target.value })}
            placeholder="Color"
          />
          <input
            value={variant.size}
            onChange={(event) => setVariant({ ...variant, size: event.target.value })}
            placeholder="Size"
          />
          <button className="btn-primary compact" disabled={saving === 'catalog-variant-create'}>
            {pick({ en: 'Add variant', ar: 'إضافة الخيار' })}
          </button>
        </form>
      </div>
      <details>
        <summary>{pick({ en: 'Archive catalog products', ar: 'أرشفة منتجات الكتالوج' })}</summary>
        <div className="workspace-list">
          {productIds.slice(0, 200).map((id) => (
            <article key={String(id)}>
              <strong>{String(id)}</strong>
              <button
                type="button"
                className="btn-text danger"
                disabled={saving === `archive-${String(id)}`}
                onClick={() =>
                  run(
                    `archive-${String(id)}`,
                    () => archiveCatalogProduct(id),
                    pick({ en: 'Product archived.', ar: 'تمت أرشفة المنتج.' }),
                  )
                }
              >
                {pick({ en: 'Archive', ar: 'أرشفة' })}
              </button>
            </article>
          ))}
        </div>
      </details>
    </section>
  );
}

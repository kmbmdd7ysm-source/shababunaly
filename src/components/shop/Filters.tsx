import type { ReactElement } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useCommerce } from '../../context/CommerceContext';
import { categories } from '../../data/categories.js';
import { useCatalog, type CatalogProduct } from '../../context/CatalogContext';
import ColorSwatch from '../common/ColorSwatch';

type FilterState = Record<string, unknown> & {
  category?: string;
  subcategory?: string;
  brands?: string[];
  productTypes?: string[];
  sizes?: string[];
  colors?: string[];
  readyToShip?: boolean;
  priceMin?: string | number;
  priceMax?: string | number;
};

export default function Filters({
  filters,
  onChange,
  onClear,
  visibleProducts = [],
}: {
  filters: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
  onClear: () => void;
  visibleProducts?: CatalogProduct[];
}): ReactElement {
  const catalog = useCatalog();
  const allSizes = (catalog.allSizes || []) as string[];
  const allColors = (catalog.allColors || []) as Array<{ key: string; hex?: string; name?: { en?: string; ar?: string } }>;
  const allBrands = (catalog.allBrands || []) as string[];
  const allProductTypes = (catalog.allProductTypes || []) as string[];
  const { t, pick } = useLanguage();
  const common = (t.common || {}) as Record<string, string>;
  const shop = (t.shop || {}) as Record<string, string>;
  const { countryCode } = useCommerce();
  const isLibya = countryCode === 'LY';
  const activeCat = categories.find((c) => c.slug === filters.category);
  const availableBrands = new Set(visibleProducts.map((p) => p.brand));
  const availableTypes = new Set(visibleProducts.map((p) => p.productType));
  const availableSizes = new Set(visibleProducts.flatMap((p) => (p.sizes as string[]) || []));
  const availableColors = new Set(
    visibleProducts.flatMap((p) =>
      (Array.isArray(p.colors) ? p.colors : []).map((c) => String(c.key || '')),
    ),
  );

  const toggleArray = (field: string, value: string) => {
    const current = Array.isArray(filters[field]) ? (filters[field] as string[]) : [];
    const set = new Set(current);
    if (set.has(value)) set.delete(value);
    else set.add(value);
    onChange({ [field]: [...set] });
  };

  return (
    <div className="filters filters--premium">
      <div className="filters-head">
        <h2 className="filters-title">{common.filters}</h2>
        <button type="button" className="filters-clear" onClick={onClear}>
          {common.clearAll}
        </button>
      </div>

      <fieldset className="filter-group">
        <legend>{pick({ en: 'Department', ar: 'القسم' })}</legend>
        <label className="filter-radio">
          <input
            type="radio"
            name="cat"
            checked={!filters.category}
            onChange={() => onChange({ category: '', subcategory: '' })}
          />
          <span>{common.all}</span>
        </label>
        {categories
          .filter((category) => isLibya || category.slug !== 'ready-to-ship')
          .map((category) => (
            <label key={category.slug} className="filter-radio">
              <input
                type="radio"
                name="cat"
                checked={filters.category === category.slug}
                onChange={() => onChange({ category: category.slug, subcategory: '' })}
              />
              <span>{pick(category.name)}</span>
            </label>
          ))}
      </fieldset>

      {!!activeCat?.subcategories?.length && (
        <fieldset className="filter-group">
          <legend>{pick({ en: 'Product category', ar: 'نوع المنتج' })}</legend>
          <label className="filter-radio">
            <input
              type="radio"
              name="sub"
              checked={!filters.subcategory}
              onChange={() => onChange({ subcategory: '' })}
            />
            <span>{common.all}</span>
          </label>
          {activeCat.subcategories.map((subcategory) => (
            <label key={subcategory.slug} className="filter-radio">
              <input
                type="radio"
                name="sub"
                checked={filters.subcategory === subcategory.slug}
                onChange={() => onChange({ subcategory: subcategory.slug })}
              />
              <span>{pick(subcategory.name)}</span>
            </label>
          ))}
        </fieldset>
      )}

      <fieldset className="filter-group">
        <legend>{pick({ en: 'Delivery', ar: 'التسليم' })}</legend>
        {isLibya && (
          <label className="filter-check filter-check--ready">
            <input
              type="checkbox"
              checked={Boolean(filters.readyOnly)}
              onChange={(event) => onChange({ readyOnly: event.target.checked })}
            />
            <span>
              <i className="ready-dot" aria-hidden="true" />
              {pick({ en: 'Ready to Ship in Libya', ar: 'تسليم فوري داخل ليبيا' })}
            </span>
          </label>
        )}
        <label className="filter-check">
          <input
            type="checkbox"
            checked={Boolean(filters.inStock)}
            onChange={(event) => onChange({ inStock: event.target.checked })}
          />
          <span>{shop.inStock}</span>
        </label>
      </fieldset>

      <fieldset className="filter-group">
        <legend>{pick({ en: 'Brand', ar: 'العلامة التجارية' })}</legend>
        <div className="filter-list-scroll">
          {allBrands
            .filter((brand) => availableBrands.has(brand))
            .map((brand) => (
              <label className="filter-check" key={brand}>
                <input
                  type="checkbox"
                  checked={(filters.brands || []).includes(brand)}
                  onChange={() => toggleArray('brands', brand)}
                />
                <span>{brand}</span>
              </label>
            ))}
        </div>
      </fieldset>

      {availableTypes.size > 1 && (
        <fieldset className="filter-group">
          <legend>{pick({ en: 'Type', ar: 'النوع' })}</legend>
          <div className="filter-list-scroll">
            {allProductTypes
              .filter((type) => availableTypes.has(type))
              .map((type) => (
                <label className="filter-check" key={type}>
                  <input
                    type="checkbox"
                    checked={(filters.productTypes || []).includes(type)}
                    onChange={() => toggleArray('productTypes', type)}
                  />
                  <span>{type}</span>
                </label>
              ))}
          </div>
        </fieldset>
      )}

      {availableSizes.size > 1 && (
        <fieldset className="filter-group">
          <legend>{shop.sizeFilter}</legend>
          <div className="filter-chips">
            {allSizes
              .filter((size) => availableSizes.has(size))
              .map((size) => (
                <button
                  key={size}
                  type="button"
                  className={`filter-chip${(filters.sizes || []).includes(size) ? ' active' : ''}`}
                  onClick={() => toggleArray('sizes', size)}
                  aria-pressed={(filters.sizes || []).includes(size)}
                >
                  {size}
                </button>
              ))}
          </div>
        </fieldset>
      )}

      {availableColors.size > 1 && (
        <fieldset className="filter-group">
          <legend>{shop.colorFilter}</legend>
          <div className="filter-swatches">
            {allColors
              .filter((color) => availableColors.has(color.key))
              .map((color) => (
                <button
                  key={color.key}
                  type="button"
                  className={`filter-swatch${(filters.colors || []).includes(color.key) ? ' active' : ''}`}
                  onClick={() => toggleArray('colors', color.key)}
                  aria-pressed={(filters.colors || []).includes(color.key)}
                  title={pick(color.name)}
                  aria-label={pick(color.name)}
                >
                  <ColorSwatch color={String(color.hex || '#777777')} />
                </button>
              ))}
          </div>
        </fieldset>
      )}

      <fieldset className="filter-group">
        <legend>{shop.priceRange}</legend>
        <div className="price-range">
          <label>
            <span className="sr-only">{shop.min}</span>
            <input
              type="number"
              min="0"
              placeholder={shop.min}
              value={filters.priceMin}
              onChange={(event) => onChange({ priceMin: event.target.value })}
            />
          </label>
          <span aria-hidden="true">—</span>
          <label>
            <span className="sr-only">{shop.max}</span>
            <input
              type="number"
              min="0"
              placeholder={shop.max}
              value={filters.priceMax}
              onChange={(event) => onChange({ priceMax: event.target.value })}
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="filter-group">
        <legend>{pick({ en: 'Highlights', ar: 'خيارات مميزة' })}</legend>
        <label className="filter-check">
          <input
            type="checkbox"
            checked={Boolean(filters.newOnly)}
            onChange={(event) => onChange({ newOnly: event.target.checked })}
          />
          <span>{shop.newOnly}</span>
        </label>
        <label className="filter-check">
          <input
            type="checkbox"
            checked={Boolean(filters.bestOnly)}
            onChange={(event) => onChange({ bestOnly: event.target.checked })}
          />
          <span>{shop.bestOnly}</span>
        </label>
        <label className="filter-check">
          <input
            type="checkbox"
            checked={Boolean(filters.customizableOnly)}
            onChange={(event) => onChange({ customizableOnly: event.target.checked })}
          />
          <span>{pick({ en: 'Customizable', ar: 'قابل للتخصيص' })}</span>
        </label>
      </fieldset>
    </div>
  );
}

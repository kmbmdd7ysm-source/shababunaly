import { useLanguage } from '../../context/LanguageContext';
import { useCommerce } from '../../context/CommerceContext';
import { categories } from '../../data/categories';
import { useCatalog } from '../../context/CatalogContext';
import ColorSwatch from '../common/ColorSwatch';

export default function Filters({ filters, onChange, onClear, visibleProducts = [] }) {
  const { allSizes, allColors, allBrands, allProductTypes } = useCatalog();
  const { t, pick } = useLanguage();
  const { countryCode } = useCommerce();
  const isLibya = countryCode === 'LY';
  const activeCat = categories.find((c) => c.slug === filters.category);
  const availableBrands = new Set(visibleProducts.map((p) => p.brand));
  const availableTypes = new Set(visibleProducts.map((p) => p.productType));
  const availableSizes = new Set(visibleProducts.flatMap((p) => p.sizes || []));
  const availableColors = new Set(
    visibleProducts.flatMap((p) => (p.colors || []).map((c) => c.key)),
  );

  const toggleArray = (field, value) => {
    const set = new Set(filters[field] || []);
    set.has(value) ? set.delete(value) : set.add(value);
    onChange({ [field]: [...set] });
  };

  return (
    <div className="filters filters--premium">
      <div className="filters-head">
        <h2 className="filters-title">{t.common.filters}</h2>
        <button type="button" className="filters-clear" onClick={onClear}>
          {t.common.clearAll}
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
          <span>{t.common.all}</span>
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
            <span>{t.common.all}</span>
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
              checked={filters.readyOnly}
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
            checked={filters.inStock}
            onChange={(event) => onChange({ inStock: event.target.checked })}
          />
          <span>{t.shop.inStock}</span>
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
                  checked={filters.brands.includes(brand)}
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
                    checked={filters.productTypes.includes(type)}
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
          <legend>{t.shop.sizeFilter}</legend>
          <div className="filter-chips">
            {allSizes
              .filter((size) => availableSizes.has(size))
              .map((size) => (
                <button
                  key={size}
                  type="button"
                  className={`filter-chip${filters.sizes.includes(size) ? ' active' : ''}`}
                  onClick={() => toggleArray('sizes', size)}
                  aria-pressed={filters.sizes.includes(size)}
                >
                  {size}
                </button>
              ))}
          </div>
        </fieldset>
      )}

      {availableColors.size > 1 && (
        <fieldset className="filter-group">
          <legend>{t.shop.colorFilter}</legend>
          <div className="filter-swatches">
            {allColors
              .filter((color) => availableColors.has(color.key))
              .map((color) => (
                <button
                  key={color.key}
                  type="button"
                  className={`filter-swatch${filters.colors.includes(color.key) ? ' active' : ''}`}
                  onClick={() => toggleArray('colors', color.key)}
                  aria-pressed={filters.colors.includes(color.key)}
                  title={pick(color.name)}
                  aria-label={pick(color.name)}
                >
                  <ColorSwatch color={color.hex} />
                </button>
              ))}
          </div>
        </fieldset>
      )}

      <fieldset className="filter-group">
        <legend>{t.shop.priceRange}</legend>
        <div className="price-range">
          <label>
            <span className="sr-only">{t.shop.min}</span>
            <input
              type="number"
              min="0"
              placeholder={t.shop.min}
              value={filters.priceMin}
              onChange={(event) => onChange({ priceMin: event.target.value })}
            />
          </label>
          <span aria-hidden="true">—</span>
          <label>
            <span className="sr-only">{t.shop.max}</span>
            <input
              type="number"
              min="0"
              placeholder={t.shop.max}
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
            checked={filters.newOnly}
            onChange={(event) => onChange({ newOnly: event.target.checked })}
          />
          <span>{t.shop.newOnly}</span>
        </label>
        <label className="filter-check">
          <input
            type="checkbox"
            checked={filters.bestOnly}
            onChange={(event) => onChange({ bestOnly: event.target.checked })}
          />
          <span>{t.shop.bestOnly}</span>
        </label>
        <label className="filter-check">
          <input
            type="checkbox"
            checked={filters.customizableOnly}
            onChange={(event) => onChange({ customizableOnly: event.target.checked })}
          />
          <span>{pick({ en: 'Customizable', ar: 'قابل للتخصيص' })}</span>
        </label>
      </fieldset>
    </div>
  );
}

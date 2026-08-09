import { PRODUCT_FAMILIES } from '../../../data/productFamilies.js';
import { CUSTOM_PRODUCT_TYPES } from '../../../data/customization';

export default function ProductStep({
  pick,
  productFamily,
  setProductFamily,
  design,
  selectProduct,
  setStep,
}) {
  return (
    <section className="gw-family-stage" aria-labelledby="custom-product-title">
      <header className="gw-toolbench-head">
        <div>
          <p className="gw-spec">{pick({ en: 'Product laboratory', ar: 'مختبر المنتج' })}</p>
          <h2 id="custom-product-title" className="gw-toolbench-title">
            {productFamily
              ? pick({ en: 'Choose the product', ar: 'اختر المنتج' })
              : pick({ en: 'Choose a product family', ar: 'اختر عائلة المنتج' })}
          </h2>
          <p className="gw-toolbench-lede">
            {pick({
              en: 'Start with a family, then open a dedicated product into the design stage. Minimums stay exactly as configured.',
              ar: 'ابدأ بالعائلة، ثم افتح منتجًا مخصصًا إلى مرحلة التصميم. الحدود الدنيا كما هي مهيأة.',
            })}
          </p>
        </div>
        {productFamily && (
          <button
            type="button"
            className="gw-btn gw-btn--ghost"
            onClick={() => setProductFamily(null)}
          >
            {pick({ en: 'All families', ar: 'كل العائلات' })}
          </button>
        )}
      </header>

      {!productFamily ? (
        <ul className="gw-family-grid">
          {PRODUCT_FAMILIES.map((family) => (
            <li key={family.key}>
              <button
                type="button"
                className="gw-family-card"
                onClick={() => setProductFamily(family.key)}
              >
                <span className="gw-family-card-name">{pick(family.label)}</span>
                <span className="gw-family-card-copy">{pick(family.copy)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="gw-family-grid gw-family-grid--products">
          {CUSTOM_PRODUCT_TYPES.filter((item) =>
            (PRODUCT_FAMILIES.find((family) => family.key === productFamily)?.types || []).includes(
              item.key,
            ),
          ).map((item) => (
            <li key={item.key}>
              <button
                type="button"
                className={`gw-family-card${design.productType === item.key ? ' is-active' : ''}`}
                onClick={() => {
                  selectProduct(item.key);
                  setStep('design');
                }}
              >
                <span className="gw-family-card-kicker">
                  {pick({ en: `Minimum ${item.minimum}`, ar: `الحد الأدنى ${item.minimum}` })}
                </span>
                <span className="gw-family-card-name">{pick(item.label)}</span>
                <span className="gw-family-card-copy">
                  {pick({ en: 'Open in the design stage', ar: 'افتح في مرحلة التصميم' })}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

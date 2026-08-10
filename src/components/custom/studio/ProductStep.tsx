import type { ReactElement } from 'react';
import { PRODUCT_FAMILIES } from '../../../data/productFamilies.ts';
import { CUSTOM_PRODUCT_TYPES } from '../../../data/customization.ts';
import '../../../styles/product-selector.css';

type PickFn = (value: { en?: string; ar?: string } | string) => string;

/** Development silhouette icons — concept only, not product photography. */
function Silhouette({ kind }: { kind: string }): ReactElement {
  const paths: Record<string, string> = {
    jersey:
      'M40 18 L55 8 L70 18 L78 32 L70 36 L68 90 L32 90 L30 36 L22 32 Z M40 18 L45 28 L55 28 L65 28 L70 18',
    shorts: 'M30 20 H70 V35 L62 78 H50 L50 35 H40 L40 78 H28 L20 35 Z',
    hoodie:
      'M35 22 L45 12 H55 L65 22 L78 34 L70 40 V88 H30 V40 L22 34 Z M45 12 Q50 4 55 12',
    bag: 'M32 30 H68 V82 H32 Z M40 30 V24 H60 V30 M38 48 H62',
    ball: 'M50 18 A32 32 0 1 1 49.9 18 M18 50 H82 M50 18 V82 M28 28 Q50 42 72 28 M28 72 Q50 58 72 72',
    pants: 'M36 16 H64 V40 L70 88 H54 L50 48 L46 88 H30 L36 40 Z',
    sleeve: 'M42 18 H58 V82 H42 Z M42 18 Q50 8 58 18',
    set: 'M28 20 L40 12 L52 20 L58 30 L52 34 V70 H28 V34 L22 30 Z M60 40 H78 V78 H60 Z',
  };
  const d = paths[kind] || paths.jersey;
  return (
    <svg className="gw-sil" viewBox="0 0 100 100" aria-hidden="true">
      <path d={d} fill="currentColor" opacity="0.88" />
    </svg>
  );
}

function kindFor(key: string): string {
  const k = key.toLowerCase();
  if (k.includes('short')) return 'shorts';
  if (k.includes('hoodie') || k.includes('shoot')) return 'hoodie';
  if (k.includes('pant') || k.includes('track')) return 'pants';
  if (k.includes('bag')) return 'bag';
  if (k.includes('ball')) return 'ball';
  if (k.includes('sleeve')) return 'sleeve';
  if (k.includes('set') || k.includes('kit') || k.includes('full')) return 'set';
  return 'jersey';
}

export default function ProductStep({
  pick,
  productFamily,
  setProductFamily,
  design,
  selectProduct,
  setStep,
}: {
  pick: PickFn;
  productFamily: string | null;
  setProductFamily: (family: string | null) => void;
  design: Record<string, unknown>;
  selectProduct: (product: string) => void;
  setStep: (step: string) => void;
}) {
  return (
    <section className="gw-product-pick" aria-labelledby="custom-product-title">
      <header className="gw-product-pick-head">
        <div>
          <p className="gw-kicker">{pick({ en: 'Custom Studio', ar: 'استوديو التخصيص' })}</p>
          <h2 id="custom-product-title" className="gw-product-pick-title">
            {productFamily
              ? pick({ en: 'Choose the garment', ar: 'اختر القطعة' })
              : pick({ en: 'What are you building?', ar: 'ماذا تبني؟' })}
          </h2>
          <p className="gw-product-pick-lede">
            {pick({
              en: 'Pick a form visually, then move into the concept 3D model stage.',
              ar: 'اختر الشكل بصريًا ثم انتقل إلى مرحلة النموذج ثلاثي الأبعاد المفاهيمي.',
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
        <ul className="gw-product-rail" role="list">
          {PRODUCT_FAMILIES.map((family) => (
            <li key={family.key}>
              <button
                type="button"
                className="gw-product-tile"
                onClick={() => setProductFamily(family.key)}
              >
                <Silhouette kind={kindFor(family.key)} />
                <span className="gw-product-tile-name">{pick(family.label)}</span>
                <span className="gw-product-tile-copy">{pick(family.copy)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="gw-product-rail gw-product-rail--dense" role="list">
          {CUSTOM_PRODUCT_TYPES.filter((item) =>
            (PRODUCT_FAMILIES.find((family) => family.key === productFamily)?.types || []).includes(
              item.key,
            ),
          ).map((item) => (
            <li key={item.key}>
              <button
                type="button"
                className={`gw-product-tile${design.productType === item.key ? ' is-active' : ''}`}
                onClick={() => {
                  selectProduct(item.key);
                  setStep('model');
                }}
              >
                <Silhouette kind={kindFor(item.key)} />
                <span className="gw-product-tile-meta">
                  {pick({ en: `Min ${item.minimum}`, ar: `الحد ${item.minimum}` })}
                </span>
                <span className="gw-product-tile-name">{pick(item.label)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

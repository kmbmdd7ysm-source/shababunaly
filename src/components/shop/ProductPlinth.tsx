import { Link } from 'react-router-dom';
import Price from '../common/Price';
import { useLanguage } from '../../context/LanguageContext';
import { resolveProductViewer } from '../../utils/productViewerTier';

/*
 * THE PLINTH — a product given a whole stage instead of a card slot.
 *
 * A catalogue made only of identical cards has no rhythm: every product claims
 * the same importance and the eye stops reading. The plinth breaks the run. It
 * takes the lead product of a set and presents it editorially — the image at
 * scale on its own ground, the name at display size, and the specification
 * (department, viewing tier, colourways, availability) as a drawn table.
 *
 * It carries no commerce logic of its own. Price comes from the shared <Price>,
 * the tier from the same resolver the product page uses, and the link is the
 * ordinary product URL — so pricing, currency and routing stay in one place.
 */
export default function ProductPlinth({
  product,
  index = 0,
  eager = false,
}: {
  product: Record<string, unknown> & {
    slug?: string;
    image?: string;
    brand?: string;
    name?: { en?: string; ar?: string } | string;
    colors?: Array<{ image?: string }>;
    [key: string]: unknown;
  };
  index?: number;
  eager?: boolean;
}) {
  const { pick } = useLanguage();
  const viewer = resolveProductViewer(product);
  // Same resolution ProductCard uses: the first colourway's image if the
  // product has one, otherwise the product image.
  const image = product.colors?.[0]?.image || product.image;
  const colours = product.colors?.length || 0;

  const tierLabel = {
    A: pick({ en: 'Real-time 3D', ar: 'ثلاثي الأبعاد' }),
    B: pick({ en: '360 spinset', ar: 'دوران ٣٦٠' }),
    C: pick({ en: 'Multi-angle', ar: 'زوايا متعددة' }),
    D: pick({ en: 'Single view', ar: 'صورة واحدة' }),
  }[viewer.tier];

  return (
    <article className="gw-plinth" data-flip={index % 2 === 1 ? 'yes' : 'no'}>
      <Link
        to={`/products/${product.slug}`}
        className="gw-plinth-frame"
        aria-label={pick(product.name)}
      >
        <img
          src={image}
          alt=""
          loading={eager ? 'eager' : 'lazy'}
          fetchPriority={eager ? 'high' : 'auto'}
          decoding="async"
          width="720"
          height="720"
        />
      </Link>

      <div className="gw-plinth-body">
        <p className="gw-spec gw-plinth-brand">{product.brand}</p>
        <h3 className="gw-plinth-name">
          <Link to={`/products/${product.slug}`}>{pick(product.name)}</Link>
        </h3>
        {/* Same three-way guard ProductCard uses. Quote-only and coming-soon
            products have no price to format, and passing one to <Price> throws
            "Invalid monetary amount". Money rules are not restated here. */}
        <p className="gw-plinth-price">
          {product.quoteOnly ? (
            <span className="status-pill">
              {pick({ en: 'Price by request', ar: 'السعر عند الطلب' })}
            </span>
          ) : product.comingSoon ? (
            <span className="status-pill">{pick({ en: 'Coming Soon', ar: 'قريباً' })}</span>
          ) : (
            <Price
              amount={Number(product.price) || 0}
              compareAt={
                product.compareAt == null ? null : Number(product.compareAt) || null
              }
            />
          )}
        </p>

        <dl className="gw-plinth-spec">
          <div>
            <dt>{pick({ en: 'Department', ar: 'القسم' })}</dt>
            <dd>{String(product.category || '')}</dd>
          </div>
          {colours > 0 && (
            <div>
              <dt>{pick({ en: 'Colourways', ar: 'الألوان' })}</dt>
              <dd className="gw-isolate-ltr">{colours}</dd>
            </div>
          )}
          <div>
            <dt>{pick({ en: 'Viewing', ar: 'العرض' })}</dt>
            <dd>{tierLabel}</dd>
          </div>
          <div>
            <dt>{pick({ en: 'Availability', ar: 'التوفر' })}</dt>
            <dd>
              {product.readyToShip
                ? pick({ en: 'Ready to ship', ar: 'تسليم فوري' })
                : pick({ en: 'Made to order', ar: 'حسب الطلب' })}
            </dd>
          </div>
        </dl>

        <Link className="gw-plinth-out" to={`/products/${product.slug}`}>
          {pick({ en: 'Open product', ar: 'افتح المنتج' })} →
        </Link>
      </div>
    </article>
  );
}

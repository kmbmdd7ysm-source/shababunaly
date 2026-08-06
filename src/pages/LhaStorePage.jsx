import { Link } from 'react-router-dom';
import Seo from '../components/common/Seo';
import ProductCard from '../components/shop/ProductCard';
import RouteMasthead from '../components/composition/RouteMasthead';
import { useCatalog } from '../context/CatalogContext';
import { useLanguage } from '../context/LanguageContext';
import '../styles/catalogue.css';

/*
 * The LHA store, rebuilt onto the shared catalogue architecture.
 *
 * WAS: a bespoke `.lha-store-hero` with a wordmark, then a `.store-toolbar`
 * repeating the same heading, then a grid. Two competing headings and a
 * one-off hero that existed nowhere else on the site.
 *
 * NOW: the shared route masthead carrying the partner mark and the live product
 * count as a figure, then the measured catalogue grid. One heading, and the
 * route now reads as part of Shababuna rather than a separate microsite -
 * which is exactly what it is: same prices, same account, same cart, same
 * delivery system.
 */
export default function LhaStorePage() {
  const { lhaStoreProducts } = useCatalog();
  const { pick } = useLanguage();
  const items = lhaStoreProducts();

  return (
    <>
      <Seo
        title="LHA Official Store"
        description="All Libya Hoops Academy clothing and accessories inside Shababuna."
        path="/lha-store"
      />
      <RouteMasthead
        eyebrow={pick({
          en: 'Official store · powered by Shababuna',
          ar: 'المتجر الرسمي · بدعم من شبابنا',
        })}
        title={pick({ en: 'LHA Clothing & Accessories', ar: 'ملابس وإكسسوارات LHA' })}
        lede={pick({
          en: 'The complete LHA product catalogue, with the same prices, account, cart and delivery system.',
          ar: 'كتالوج منتجات LHA بالكامل بنفس الأسعار والحساب والسلة ونظام التوصيل.',
        })}
        trail={[{ label: 'LHA' }]}
        figure={{ value: items.length, label: pick({ en: 'products', ar: 'منتج' }) }}
      >
        <img
          className="gw-partner-mark"
          src="/brand/lha-wordmark-white.svg"
          alt="Libya Hoops Academy"
          width="320"
          height="96"
        />
      </RouteMasthead>

      <section className="gw-partner-world" aria-label="LHA">
        <div className="gw-partner-world-inner">
          <p className="gw-spec">
            {pick({ en: 'Official partner collection', ar: 'مجموعة الشريك الرسمية' })}
          </p>
          <h2 className="gw-partner-world-title">
            {pick({ en: 'All LHA clothing and accessories', ar: 'جميع ملابس وإكسسوارات LHA' })}
          </h2>
        </div>
      </section>
      <div className="gw-catalogue">
        <div className="gw-catalogue-inner gw-catalogue-inner--full">
          <div className="gw-catalogue-bar">
            <p className="gw-spec">{pick({ en: 'Full collection', ar: 'المجموعة كاملة' })}</p>
            <Link to="/shop" className="gw-btn gw-btn--secondary">
              {pick({ en: 'Back to Shababuna Shop', ar: 'العودة لمتجر شبابنا' })}
            </Link>
          </div>
          <div className="gw-catalogue-grid">
            {items.map((product, index) => (
              <ProductCard key={product.id} product={product} eager={index < 4} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

import type { ReactElement } from 'react';
import Seo from '../components/common/Seo';
import ProductCard from '../components/shop/ProductCard';
import PublicPageHeader from '../components/content/PublicPageHeader';
import { useCatalog } from '../context/CatalogContext';
import { useLanguage } from '../context/LanguageContext';
import '../styles/catalog.css';

export default function LhaStorePage(): ReactElement {
  const { lhaStoreProducts } = useCatalog();
  const { pick } = useLanguage();
  const items = lhaStoreProducts() as Array<Record<string, unknown> & { id?: string }>;
  const availableNow = items.filter(
    (product) => product.comingSoon !== true && product.status !== 'coming_soon',
  );
  const comingSoon = items.filter(
    (product) => product.comingSoon === true || product.status === 'coming_soon',
  );

  return (
    <>
      <Seo
        title="LHA Official Store"
        description="Official Libya Hoops Academy products available through Shababuna."
        path="/lha-store"
      />

      <PublicPageHeader
        eyebrow={pick({
          en: 'Libya Hoops Academy · Shababuna',
          ar: 'أكاديمية ليبيا هوبس · شبابنا',
        })}
        title={pick({ en: 'LHA Official Store', ar: 'متجر LHA الرسمي' })}
        lede={pick({
          en: 'Official LHA products, ordered through Shababuna.',
          ar: 'منتجات LHA الرسمية، والطلب عبر شبابنا.',
        })}
        trail={[{ label: 'LHA' }]}
        figure={{ value: availableNow.length, label: pick({ en: 'available now', ar: 'متوفر الآن' }) }}
      >
        <img
          className="gw-partner-mark"
          src="/brand/lha-wordmark-white.svg"
          alt="Libya Hoops Academy"
          width="320"
          height="96"
        />
      </PublicPageHeader>

      <main className="lha-store-clean">
        <section className="lha-store-section" aria-labelledby="lha-available-title">
          <div className="lha-store-section__head">
            <h2 id="lha-available-title">{pick({ en: 'Available now', ar: 'متوفر الآن' })}</h2>
            <span>{availableNow.length}</span>
          </div>
          <div className="cc-product-grid">
            {availableNow.map((product, index) => (
              <ProductCard key={String(product.id)} product={product} eager={index < 4} />
            ))}
          </div>
        </section>

        {comingSoon.length ? (
          <section className="lha-store-section lha-store-section--soon" aria-labelledby="lha-soon-title">
            <div className="lha-store-section__head">
              <h2 id="lha-soon-title">{pick({ en: 'Coming soon', ar: 'قريباً' })}</h2>
              <span>{comingSoon.length}</span>
            </div>
            <div className="cc-product-grid">
              {comingSoon.map((product) => (
                <ProductCard key={String(product.id)} product={product} />
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </>
  );
}

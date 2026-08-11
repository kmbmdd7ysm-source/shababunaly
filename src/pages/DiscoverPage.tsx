import type { ReactElement } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import Seo from '../components/common/Seo';
import ProductCard from '../components/shop/ProductCard';
import EmptyState from '../components/common/EmptyState';
import { useCatalog, type CatalogProduct } from '../context/CatalogContext';
import { useLanguage } from '../context/LanguageContext';
import { DISCOVER_COLLECTIONS, type DiscoverCollection } from '../data/merchandising';
import { isReadyToShipEligible } from '../utils/productEligibility';
import '../styles/design/phase2-discovery.css';
import '../styles/design/phase2-commerce.css';

function uniqueProducts(products: CatalogProduct[]): CatalogProduct[] {
  const seen = new Set<string>();
  return products.filter((product) => {
    if (seen.has(product.id)) return false;
    seen.add(product.id);
    return true;
  });
}

function collectionProducts(collection: DiscoverCollection, products: CatalogProduct[]): CatalogProduct[] {
  if (collection.rule === 'new') return products.filter((product) => product.newArrival);
  if (collection.rule === 'best') return products.filter((product) => product.bestSeller);
  if (collection.rule === 'featured') return products.filter((product) => product.featured);
  if (collection.rule === 'performance') {
    return products.filter((product) =>
      product.category === 'footwear' ||
      product.category === 'clothing' ||
      String(product.productType || '').toLowerCase().includes('performance'),
    );
  }
  if (collection.rule === 'court') {
    return products.filter((product) =>
      ['basketballs', 'accessories', 'equipment'].includes(String(product.category || '')),
    );
  }
  if (collection.rule === 'ready') {
    return products.filter((product) => isReadyToShipEligible(product, 'LY'));
  }
  return products;
}

export default function DiscoverPage(): ReactElement {
  const { slug } = useParams();
  const { pick } = useLanguage();
  const { products } = useCatalog();
  const current = slug ? DISCOVER_COLLECTIONS.find((collection) => collection.slug === slug) : null;

  if (slug && !current) return <Navigate to="/discover" replace />;

  const readyCount = products.filter((product) => isReadyToShipEligible(product, 'LY')).length;
  const visibleCollections = DISCOVER_COLLECTIONS.filter((collection) => collection.rule !== 'ready' || readyCount > 0);

  if (!current) {
    return (
      <>
        <Seo
          title={pick({ en: 'Discover', ar: 'اكتشف' })}
          description={pick({
            en: 'Explore new arrivals, trending products, performance picks and Shababuna edits.',
            ar: 'اكتشف الجديد والرائج واختيارات الأداء ومختارات شبابنا.',
          })}
          path="/discover"
        />

        <header className="s2-discover-head">
          <div className="s2-container">
            <span className="s2-overline">Shababuna</span>
            <h1>{pick({ en: 'Discover', ar: 'اكتشف' })}</h1>
            <p>{pick({ en: 'Products, drops and the game around them.', ar: 'منتجات وإصدارات وكل ما يدور حول اللعبة.' })}</p>
          </div>
        </header>

        <main className="s2-discover-index s2-container">
          {visibleCollections.map((collection, index) => (
            <Link
              key={collection.slug}
              to={collection.to}
              className={`s2-discover-card s2-discover-card--${(index % 4) + 1}`}
            >
              <picture>
                {collection.mobileMedia ? <source media="(max-width: 699px)" srcSet={collection.mobileMedia} /> : null}
                <img src={collection.desktopMedia} alt="" width="1600" height="1067" loading={index < 2 ? 'eager' : 'lazy'} />
              </picture>
              <span className="s2-discover-card__shade" />
              <span className="s2-discover-card__copy">
                {collection.eyebrow ? <small>{pick(collection.eyebrow)}</small> : null}
                <strong>{pick(collection.title)}</strong>
              </span>
            </Link>
          ))}
        </main>
      </>
    );
  }

  const raw = collectionProducts(current, products);
  const selected = uniqueProducts(raw.length ? raw : current.rule === 'ready' ? [] : products.filter((product) => product.featured || product.newArrival)).slice(0, 24);
  const related = visibleCollections.filter((collection) => collection.slug !== current.slug).slice(0, 3);

  return (
    <>
      <Seo title={pick(current.title)} description={current.copy ? pick(current.copy) : pick(current.title)} path={`/discover/${current.slug}`} />

      <header className="s2-discover-hero">
        <picture>
          {current.mobileMedia ? <source media="(max-width: 699px)" srcSet={current.mobileMedia} /> : null}
          <img src={current.desktopMedia} alt="" width="1600" height="1067" />
        </picture>
        <span className="s2-discover-hero__shade" />
        <div className="s2-discover-hero__copy">
          {current.eyebrow ? <span className="s2-overline">{pick(current.eyebrow)}</span> : null}
          <h1>{pick(current.title)}</h1>
          {current.copy ? <p>{pick(current.copy)}</p> : null}
        </div>
      </header>

      <section className="s2-section" aria-labelledby="s2-discover-products-title">
        <div className="s2-section__head s2-container">
          <div>
            <span className="s2-overline">{pick({ en: 'The edit', ar: 'المختارات' })}</span>
            <h2 id="s2-discover-products-title">{pick({ en: 'Shop the selection', ar: 'تسوق الاختيارات' })}</h2>
          </div>
          <span className="s2-result-count">{selected.length}</span>
        </div>
        <div className="s2-container">
          {selected.length ? (
            <div className="s2-product-grid">
              {selected.map((product, index) => <ProductCard key={product.id} product={product} eager={index < 8} />)}
            </div>
          ) : (
            <EmptyState
              message={pick({ en: 'Nothing verified here yet.', ar: 'لا يوجد شيء موثق هنا حتى الآن.' })}
              hint={pick({ en: 'This collection will populate automatically when matching catalogue data is available.', ar: 'هذه المجموعة تتعبى تلقائياً لما تتوفر بيانات مطابقة في الكتالوج.' })}
              action={{ label: pick({ en: 'Browse shop', ar: 'تصفح المتجر' }), to: '/shop' }}
            />
          )}
        </div>
      </section>

      <section className="s2-section s2-section--soft" aria-labelledby="s2-more-discover">
        <div className="s2-section__head s2-container">
          <h2 id="s2-more-discover">{pick({ en: 'Keep discovering', ar: 'كمل اكتشاف' })}</h2>
        </div>
        <div className="s2-discover-more s2-container">
          {related.map((collection) => (
            <Link key={collection.slug} to={collection.to}>
              <img src={collection.mobileMedia || collection.desktopMedia} alt="" width="900" height="1200" loading="lazy" />
              <span>{pick(collection.title)}</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

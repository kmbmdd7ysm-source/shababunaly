import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import Seo from '../components/common/Seo';
import EditorialMedia from '../components/common/EditorialMedia';
import CinematicHero from '../components/experience/CinematicHero';
import ProductCard from '../components/shop/ProductCard';
import { useLanguage } from '../context/LanguageContext';
import { useCatalog } from '../context/CatalogContext';
import { useCinematicOpening } from '../hooks/useCinematicOpening';
import { SITE } from '../config';
import { CATEGORY_WORLDS, HOME_CAMPAIGN, HOME_TRENDS } from '../data/merchandising';
import { EDITORIAL as E } from '../data/editorialAssets.ts';
import '../styles/design/phase2-home.css';
import '../styles/design/phase2-commerce.css';

export default function HomePage(): ReactElement {
  const { pick } = useLanguage();
  const { newArrivals, featuredProducts, bestSellers, readyToShipProducts } = useCatalog();
  useCinematicOpening();

  const fresh = newArrivals().slice(0, 8);
  const featured = featuredProducts();
  const popular = bestSellers();
  const ready = readyToShipProducts().slice(0, 8);
  const productRail = fresh.length ? fresh : featured.slice(0, 8);
  const performance = [...popular, ...featured].filter(
    (product, index, list) => list.findIndex((entry) => entry.id === product.id) === index,
  ).slice(0, 6);

  return (
    <>
      <Seo
        title={`${SITE.name} — ${SITE.slogan.en}`}
        description="Basketball products, performance gear, custom design and culture from Shababuna."
        path="/"
      />
      <CinematicHero />

      <section id="s2-trending" className="s2-section s2-section--flush" aria-labelledby="s2-trending-title">
        <div className="s2-section__head s2-container">
          <div>
            <span className="s2-overline">{pick({ en: 'Discover', ar: 'اكتشف' })}</span>
            <h2 id="s2-trending-title">{pick({ en: 'Trending now', ar: 'الرائج الآن' })}</h2>
          </div>
          <Link className="s2-text-link" to="/discover">{pick({ en: 'View all', ar: 'عرض الكل' })}</Link>
        </div>
        <div className="s2-editorial-grid s2-container">
          {HOME_TRENDS.map((world, index) => (
            <Link key={world.slug} to={world.to} className={`s2-editorial-tile s2-editorial-tile--${index + 1}`}>
              <EditorialMedia
                desktopMedia={world.desktopMedia}
                mobileMedia={world.mobileMedia}
                loading={index === 0 ? 'eager' : 'lazy'}
              />
              <span className="s2-editorial-tile__shade" />
              <span className="s2-editorial-tile__copy">
                {world.eyebrow ? <small>{pick(world.eyebrow)}</small> : null}
                <strong>{pick(world.title)}</strong>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {productRail.length > 0 ? (
        <section className="s2-section" aria-labelledby="s2-new-title">
          <div className="s2-section__head s2-container">
            <div>
              <span className="s2-overline">{pick({ en: 'New in', ar: 'وصل حديثًا' })}</span>
              <h2 id="s2-new-title">{pick({ en: 'Latest products', ar: 'أحدث المنتجات' })}</h2>
            </div>
            <Link className="s2-text-link" to="/discover/new-this-week">{pick({ en: 'Shop new', ar: 'تسوق الجديد' })}</Link>
          </div>
          <div className="s2-product-rail s2-container">
            {productRail.map((product, index) => <ProductCard key={product.id} product={product} eager={index < 4} />)}
          </div>
        </section>
      ) : null}

      <section className="s2-campaign s2-campaign--dark" aria-labelledby="s2-drop-title">
        <div className="s2-campaign__media">
          <EditorialMedia
            desktopMedia={HOME_CAMPAIGN.desktopMedia}
            mobileMedia={HOME_CAMPAIGN.mobileMedia}
            loading="lazy"
          />
        </div>
        <span className="s2-campaign__shade" />
        <div className="s2-campaign__copy">
          <span className="s2-overline">{pick({ en: 'The edit', ar: 'مختاراتنا' })}</span>
          <h2 id="s2-drop-title">{pick({ en: 'Made to move.', ar: 'مصنوع للحركة.' })}</h2>
          <Link to="/discover/shababuna-selects">{pick({ en: 'Explore the selection', ar: 'اكتشف الاختيارات' })}</Link>
        </div>
      </section>

      <section className="s2-section" aria-labelledby="s2-category-title">
        <div className="s2-section__head s2-container">
          <div>
            <span className="s2-overline">{pick({ en: 'Shop', ar: 'تسوق' })}</span>
            <h2 id="s2-category-title">{pick({ en: 'By category', ar: 'حسب الفئة' })}</h2>
          </div>
        </div>
        <div className="s2-category-strip">
          {CATEGORY_WORLDS.map((world) => (
            <Link key={world.slug} to={world.to} className="s2-category-world">
              <EditorialMedia
                desktopMedia={world.desktopMedia}
                mobileMedia={world.mobileMedia}
              />
              <span className="s2-category-world__shade" />
              <strong>{pick(world.title)}</strong>
            </Link>
          ))}
        </div>
      </section>

      {performance.length > 0 ? (
        <section className="s2-section s2-section--soft" aria-labelledby="s2-performance-title">
          <div className="s2-section__head s2-container">
            <div>
              <span className="s2-overline">{pick({ en: 'For the game', ar: 'للملعب' })}</span>
              <h2 id="s2-performance-title">{pick({ en: 'Performance picks', ar: 'اختيارات الأداء' })}</h2>
            </div>
            <Link className="s2-text-link" to="/discover/performance-picks">{pick({ en: 'Explore', ar: 'اكتشف' })}</Link>
          </div>
          <div className="s2-product-rail s2-container">
            {performance.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        </section>
      ) : null}

      {ready.length > 0 ? (
        <section className="s2-section" aria-labelledby="s2-ready-title">
          <div className="s2-section__head s2-container">
            <div>
              <span className="s2-overline">{pick({ en: 'Verified stock', ar: 'مخزون موثق' })}</span>
              <h2 id="s2-ready-title">{pick({ en: 'Ready now', ar: 'جاهز الآن' })}</h2>
            </div>
            <Link className="s2-text-link" to="/shop/ready-to-ship">{pick({ en: 'Shop ready', ar: 'تسوق الجاهز' })}</Link>
          </div>
          <div className="s2-product-rail s2-container">
            {ready.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        </section>
      ) : null}

      <section className="s2-split-feature" aria-labelledby="s2-custom-title">
        <div className="s2-split-feature__media">
          <img src={E.shanghaiPlayers} alt="" width="1400" height="900" loading="lazy" />
        </div>
        <div className="s2-split-feature__copy">
          <span className="s2-overline">{pick({ en: 'Custom studio', ar: 'استوديو التخصيص' })}</span>
          <h2 id="s2-custom-title">{pick({ en: 'Make it yours.', ar: 'خليه متاعك.' })}</h2>
          <Link className="s2-dark-link" to="/customize">{pick({ en: 'Start customizing', ar: 'ابدأ التصميم' })}</Link>
        </div>
      </section>

      <section className="s2-section" aria-labelledby="s2-stories-title">
        <div className="s2-section__head s2-container">
          <div>
            <span className="s2-overline">{pick({ en: 'Culture', ar: 'الثقافة' })}</span>
            <h2 id="s2-stories-title">{pick({ en: 'Stories & work', ar: 'قصص وأعمال' })}</h2>
          </div>
          <Link className="s2-text-link" to="/stories">{pick({ en: 'View stories', ar: 'عرض القصص' })}</Link>
        </div>
        <div className="s2-story-pair s2-container">
          <Link to="/stories" className="s2-story-card">
            <img src={E.curryHeroBall} alt="" width="1400" height="900" loading="lazy" />
            <span><small>{pick({ en: 'Basketball', ar: 'كرة السلة' })}</small><strong>{pick({ en: 'Inside the game', ar: 'داخل اللعبة' })}</strong></span>
          </Link>
          <Link to="/stories" className="s2-story-card">
            <img src={E.lameloSpaceStanding} alt="" width="1400" height="900" loading="lazy" />
            <span><small>{pick({ en: 'Basketball culture', ar: 'ثقافة كرة السلة' })}</small><strong>{pick({ en: 'Beyond the game', ar: 'أبعد من اللعبة' })}</strong></span>
          </Link>
        </div>
      </section>

      <section className="s2-team-teaser" aria-labelledby="s2-team-teaser-title">
        <picture className="s2-team-teaser__media" aria-hidden="true">
          <source media="(max-width: 700px)" srcSet={E.tatumKids} />
          <img src={E.franceGroup} alt="" width="1600" height="1000" loading="lazy" />
        </picture>
        <span className="s2-team-teaser__shade" />
        <div className="s2-team-teaser__copy">
          <span className="s2-overline">{pick({ en: 'For clubs', ar: 'للأندية' })}</span>
          <h2 id="s2-team-teaser-title">{pick({ en: 'Outfit your team.', ar: 'جهّز فريقك.' })}</h2>
          <p>{pick({ en: 'Uniforms, training gear and club supply built around your program.', ar: 'أطقم وملابس تدريب وتجهيزات للأندية مبنية حول احتياجات فريقك.' })}</p>
          <Link to="/teams-wholesale">{pick({ en: 'Explore Teams & Wholesale', ar: 'اكتشف الأندية والجملة' })}</Link>
        </div>
      </section>
    </>
  );
}

import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import Seo from '../components/common/Seo';
import ProductCard from '../components/shop/ProductCard';
import EditorialMedia from '../components/common/EditorialMedia';
import { useCatalog, type CatalogProduct } from '../context/CatalogContext';
import { useLanguage } from '../context/LanguageContext';
import { LOCAL_HERO_MEDIA } from '../data/localHeroMedia';
import '../styles/design/phase2-discovery.css';
import '../styles/design/phase2-commerce.css';

type ReleaseRecord = CatalogProduct & {
  releaseDate?: string;
  releaseInfo?: { date?: string; verified?: boolean; status?: string };
};

const parseRelease = (product: CatalogProduct): Date | null => {
  const record = product as ReleaseRecord;
  const raw = record.releaseInfo?.verified ? record.releaseInfo.date : record.releaseDate;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
};

export default function ReleasesPage(): ReactElement {
  const { pick, lang } = useLanguage();
  const { products, newArrivals } = useCatalog();
  const now = Date.now();
  const dated = products
    .map((product) => ({ product, date: parseRelease(product) }))
    .filter((entry): entry is { product: CatalogProduct; date: Date } => Boolean(entry.date))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  const upcoming = dated.filter((entry) => entry.date.getTime() >= now);
  const previous = dated.filter((entry) => entry.date.getTime() < now).reverse().slice(0, 12);
  const recent = newArrivals().slice(0, 8);
  const locale = lang === 'ar' ? 'ar' : 'en-US';

  return (
    <>
      <Seo
        title={pick({ en: 'Releases', ar: 'الإصدارات' })}
        description={pick({ en: 'Verified product release dates and the newest additions to Shababuna.', ar: 'مواعيد الإصدارات الموثقة وأحدث إضافات شبابنا.' })}
        path="/releases"
      />

      <header className="s2-discover-hero">
        <EditorialMedia
          desktopMedia={LOCAL_HERO_MEDIA.releases.desktopPoster}
          mobileMedia={LOCAL_HERO_MEDIA.releases.mobilePoster}
          desktopVideo={LOCAL_HERO_MEDIA.releases.desktopVideo}
          mobileVideo={LOCAL_HERO_MEDIA.releases.mobileVideo}
          poster={LOCAL_HERO_MEDIA.releases.desktopPoster}
          loading="eager"
        />
        <span className="s2-discover-hero__shade" />
        <div className="s2-discover-hero__copy">
          <span className="s2-overline">{pick({ en: 'Calendar', ar: 'التقويم' })}</span>
          <h1>{pick({ en: 'Releases', ar: 'الإصدارات' })}</h1>
          <p>{pick({ en: 'Only verified dates appear on the release calendar.', ar: 'التقويم يعرض فقط المواعيد الموثقة.' })}</p>
        </div>
      </header>

      {upcoming.length ? (
        <section className="s2-section" aria-labelledby="s2-upcoming-title">
          <div className="s2-section__head s2-container">
            <h2 id="s2-upcoming-title">{pick({ en: 'Upcoming', ar: 'قريباً' })}</h2>
          </div>
          <div className="s2-release-list s2-container">
            {upcoming.map(({ product, date }) => (
              <Link key={product.id} to={`/products/${product.slug || ''}`} className="s2-release-row">
                <time dateTime={date.toISOString()}>
                  <b>{date.toLocaleDateString(locale, { day: '2-digit' })}</b>
                  <span>{date.toLocaleDateString(locale, { month: 'short' })}</span>
                </time>
                <span className="s2-release-row__name">{pick(product.name as { en?: string; ar?: string })}</span>
                <span className="s2-release-row__action">{pick({ en: 'View', ar: 'عرض' })}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <section className="s2-release-empty s2-container">
          <span className="s2-overline">{pick({ en: 'Upcoming', ar: 'قريباً' })}</span>
          <h2>{pick({ en: 'No verified drops scheduled.', ar: 'لا توجد إصدارات بموعد موثق حالياً.' })}</h2>
          <p>{pick({ en: 'When a verified release date is added to the catalogue, it will appear here automatically.', ar: 'لما يضاف موعد إصدار موثق للكتالوج، بيظهر هنا تلقائياً.' })}</p>
          <Link to="/discover/new-this-week">{pick({ en: 'See what’s new', ar: 'شوف الجديد' })}</Link>
        </section>
      )}

      {recent.length ? (
        <section className="s2-section s2-section--soft" aria-labelledby="s2-recent-title">
          <div className="s2-section__head s2-container">
            <div>
              <span className="s2-overline">{pick({ en: 'Recently added', ar: 'أضيف حديثاً' })}</span>
              <h2 id="s2-recent-title">{pick({ en: 'New in the shop', ar: 'جديد في المتجر' })}</h2>
            </div>
          </div>
          <div className="s2-product-rail s2-container">
            {recent.map((product, index) => <ProductCard key={product.id} product={product} eager={index < 4} />)}
          </div>
        </section>
      ) : null}

      {previous.length ? (
        <section className="s2-section" aria-labelledby="s2-previous-title">
          <div className="s2-section__head s2-container"><h2 id="s2-previous-title">{pick({ en: 'Previous', ar: 'السابق' })}</h2></div>
          <div className="s2-release-list s2-container">
            {previous.map(({ product, date }) => (
              <Link key={product.id} to={`/products/${product.slug || ''}`} className="s2-release-row">
                <time dateTime={date.toISOString()}>
                  <b>{date.toLocaleDateString(locale, { day: '2-digit' })}</b>
                  <span>{date.toLocaleDateString(locale, { month: 'short' })}</span>
                </time>
                <span className="s2-release-row__name">{pick(product.name as { en?: string; ar?: string })}</span>
                <span className="s2-release-row__action">{pick({ en: 'View', ar: 'عرض' })}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}

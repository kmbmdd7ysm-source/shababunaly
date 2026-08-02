import { useLanguage } from '../context/LanguageContext';
import { SITE } from '../config';
import Seo from '../components/common/Seo';
import PageHero from '../components/common/PageHero';
import Breadcrumbs from '../components/common/Breadcrumbs';
import { getLegal } from '../data/legal';
import NotFoundPage from './NotFoundPage';

export default function LegalPage({ docKey }) {
  const { t, pick } = useLanguage();
  const doc = getLegal(docKey);

  if (!doc) return <NotFoundPage />;

  return (
    <>
      <Seo title={pick(doc.title)} description={pick(doc.intro)} path={`/${docKey}`} />
      <PageHero label={t.footer.legal} title={pick(doc.title)} />
      <div className="container">
        <Breadcrumbs items={[{ label: pick(doc.title) }]} />
      </div>

      <section className="section">
        <div className="container legal-doc">
          <p className="legal-updated">
            {t.legal.lastUpdated}: {pick(SITE.legalUpdated)}
          </p>
          {doc.intro && <p className="lead">{pick(doc.intro)}</p>}
          {doc.sections.map((s, i) => (
            <section key={i} className="legal-section">
              <h2>{pick(s.h)}</h2>
              <p>{pick(s.p)}</p>
            </section>
          ))}
        </div>
      </section>
    </>
  );
}

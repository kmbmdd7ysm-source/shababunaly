import { useLanguage } from '../context/LanguageContext';
import { SITE } from '../config';
import Seo from '../components/common/Seo';
import RouteMasthead from '../components/composition/RouteMasthead';
import Dossier from '../components/composition/Dossier';
import { getLegal } from '../data/legal';
import NotFoundPage from './NotFoundPage';

/*
 * Legal documents, rebuilt as a DOSSIER.
 *
 * WAS: PageHero, a breadcrumb strip on its own band, then one uninterrupted
 * scrolling column of h2/p pairs with no way to see the document's shape or
 * jump inside it.
 *
 * NOW: a real document — a chapter masthead carrying the section count as a
 * figure, then a sticky numbered INDEX rail beside numbered chapters on
 * hairline rules, each with a stable anchor.
 *
 * The legal text itself is passed through untouched: same `getLegal(docKey)`
 * source, same headings, same paragraphs, same order, same last-updated date.
 * Only the reading structure around it changed.
 */
export default function LegalPage({ docKey }) {
  const { t, pick } = useLanguage();
  const doc = getLegal(docKey);

  if (!doc) return <NotFoundPage />;

  const chapters = doc.sections.map((section) => ({
    title: pick(section.h),
    body: <p>{pick(section.p)}</p>,
  }));

  return (
    <>
      <Seo title={pick(doc.title)} description={pick(doc.intro)} path={`/${docKey}`} />
      <RouteMasthead
        eyebrow={t.footer.legal}
        title={pick(doc.title)}
        trail={[{ label: t.footer.legal }, { label: pick(doc.title) }]}
        figure={{
          value: doc.sections.length,
          label: pick({ en: 'sections', ar: 'أقسام' }),
        }}
      />
      <Dossier
        meta={`${t.legal.lastUpdated}: ${pick(SITE.legalUpdated)}`}
        lede={doc.intro ? pick(doc.intro) : null}
        chapters={chapters}
      />
    </>
  );
}

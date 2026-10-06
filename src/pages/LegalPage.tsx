import { useLanguage } from '../context/LanguageContext';
import { SITE } from '../config.ts';
import Seo from '../components/common/Seo.tsx';
import PublicPageHeader from '../components/content/PublicPageHeader';
import ContentGuide from '../components/content/ContentGuide';
import { getLegal } from '../data/legal.ts';
import NotFoundPage from './NotFoundPage';
import '../styles/domain-content.css';
import '../styles/content.css';

export default function LegalPage({ docKey }: { docKey: string }) {
  const { pick } = useLanguage();
  const doc = getLegal(docKey);
  const legalLabel = pick({ en: 'Legal', ar: 'قانوني' });
  const lastUpdatedLabel = pick({ en: 'Last updated', ar: 'آخر تحديث' });

  if (!doc) return <NotFoundPage />;

  const chapters = (
    doc as { sections: Array<{ h: unknown; p: unknown }> }
  ).sections.map((section) => ({
    title: pick(section.h as { en?: string; ar?: string }),
    body: <p>{pick(section.p as { en?: string; ar?: string })}</p>,
  }));

  const typed = doc as {
    title: { en?: string; ar?: string };
    intro?: { en?: string; ar?: string };
    sections: unknown[];
  };

  return (
    <>
      <Seo
        title={pick(typed.title) || ''}
        description={pick(typed.intro) || ''}
        path={`/${docKey}`}
      />
      <PublicPageHeader
        eyebrow={legalLabel}
        title={pick(typed.title) || ''}
        trail={[
          { label: legalLabel },
          { label: pick(typed.title) || '' },
        ]}
        figure={{
          value: typed.sections.length,
          label: pick({ en: 'sections', ar: 'أقسام' }),
        }}
      />
      <ContentGuide
        meta={`${lastUpdatedLabel}: ${pick(SITE.legalUpdated)}`}
        lede={typed.intro ? pick(typed.intro) : null}
        chapters={chapters}
      />
    </>
  );
}

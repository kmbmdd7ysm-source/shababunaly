import { useLanguage } from '../context/LanguageContext';
import { SITE } from '../config.ts';
import Seo from '../components/common/Seo.tsx';
import RouteMasthead from '../components/composition/RouteMasthead';
import Dossier from '../components/composition/Dossier';
import { getLegal } from '../data/legal.ts';
import NotFoundPage from './NotFoundPage';
import '../styles/content.css';

export default function LegalPage({ docKey }: { docKey: string }) {
  const { t, pick } = useLanguage();
  const doc = getLegal(docKey);
  const footer = (t.footer || {}) as Record<string, string>;
  const legal = (t.legal || {}) as Record<string, string>;

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
      <RouteMasthead
        eyebrow={footer.legal}
        title={pick(typed.title) || ''}
        trail={[
          { label: footer.legal || 'Legal' },
          { label: pick(typed.title) || '' },
        ]}
        figure={{
          value: typed.sections.length,
          label: pick({ en: 'sections', ar: 'أقسام' }),
        }}
      />
      <Dossier
        meta={`${legal.lastUpdated}: ${pick(SITE.legalUpdated)}`}
        lede={typed.intro ? pick(typed.intro) : null}
        chapters={chapters}
      />
    </>
  );
}

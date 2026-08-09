import { useLanguage } from '../context/LanguageContext';
import Seo from '../components/common/Seo.tsx';
import RouteMasthead from '../components/composition/RouteMasthead';
import Dossier from '../components/composition/Dossier.jsx';
import Accordion from '../components/common/Accordion';
import EmptyState from '../components/common/EmptyState';
import { faqCategories } from '../data/faqs.ts';
import '../styles/content.css';

/*
 * FAQ, rebuilt as a DOSSIER.
 *
 * WAS: PageHero, a breadcrumb strip, then category headings each followed by an
 * accordion — with no way to see how many categories existed or reach one.
 *
 * NOW: a masthead carrying the question count as a figure, then a sticky
 * numbered index of categories beside numbered chapters. Each chapter keeps its
 * accordion, because a long list of questions genuinely benefits from
 * collapsing; the structure around it is what changed.
 *
 * Same `faqCategories` data, same questions, same order.
 */
export default function FaqPage() {
  const { t, pick } = useLanguage();
  const faq = (t.faq || {}) as Record<string, string>;
  const common = (t.common || {}) as Record<string, string>;
  const questionCount = faqCategories.reduce((total, cat) => total + cat.items.length, 0);

  if (faqCategories.length === 0) {
    return (
      <>
        <Seo title={faq.title || ''} description={faq.sub || ''} path="/faq" />
        <RouteMasthead
          eyebrow={faq.label}
          title={faq.title}
          lede={faq.sub}
          trail={[{ label: faq.title || 'FAQ' }]}
        />
        <div className="gw-terminal">
          <div className="gw-terminal-inner">
            <EmptyState
              message={faq.empty || ''}
              action={{ label: common.contactUs || 'Contact', to: '/contact' }}
            />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Seo title={faq.title || ''} description={faq.sub || ''} path="/faq" />
      <RouteMasthead
        eyebrow={faq.label}
        title={faq.title}
        lede={faq.sub}
        trail={[{ label: faq.title || 'FAQ' }]}
        figure={{ value: questionCount, label: pick({ en: 'answers', ar: 'إجابة' }) }}
      />
      <Dossier
        chapters={faqCategories.map((cat) => ({
          title: pick(cat.title),
          body: (
            <Accordion
              items={cat.items.map((item) => ({
                title: pick(item.q),
                content: <p>{pick(item.a)}</p>,
              }))}
            />
          ),
        }))}
      />
    </>
  );
}

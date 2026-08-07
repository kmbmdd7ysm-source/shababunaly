import { useLanguage } from '../context/LanguageContext';
import Seo from '../components/common/Seo';
import RouteMasthead from '../components/composition/RouteMasthead';
import Dossier from '../components/composition/Dossier';
import Accordion from '../components/common/Accordion';
import EmptyState from '../components/common/EmptyState';
import { faqCategories } from '../data/faqs';
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
  const questionCount = faqCategories.reduce((total, cat) => total + cat.items.length, 0);

  if (faqCategories.length === 0) {
    return (
      <>
        <Seo title={t.faq.title} description={t.faq.sub} path="/faq" />
        <RouteMasthead
          eyebrow={t.faq.label}
          title={t.faq.title}
          lede={t.faq.sub}
          trail={[{ label: t.faq.title }]}
        />
        <div className="gw-terminal">
          <div className="gw-terminal-inner">
            <EmptyState
              message={t.faq.empty}
              action={{ label: t.common.contactUs, to: '/contact' }}
            />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Seo title={t.faq.title} description={t.faq.sub} path="/faq" />
      <RouteMasthead
        eyebrow={t.faq.label}
        title={t.faq.title}
        lede={t.faq.sub}
        trail={[{ label: t.faq.title }]}
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
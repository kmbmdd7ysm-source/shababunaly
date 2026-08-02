import { useLanguage } from '../context/LanguageContext';
import Seo from '../components/common/Seo';
import PageHero from '../components/common/PageHero';
import Breadcrumbs from '../components/common/Breadcrumbs';
import Accordion from '../components/common/Accordion';
import EmptyState from '../components/common/EmptyState';
import { faqCategories } from '../data/faqs';

export default function FaqPage() {
  const { t, pick } = useLanguage();

  return (
    <>
      <Seo title={t.faq.title} description={t.faq.sub} path="/faq" />
      <PageHero label={t.faq.label} title={t.faq.title} description={t.faq.sub} />
      <div className="container">
        <Breadcrumbs items={[{ label: t.faq.title }]} />
      </div>

      <section className="section">
        <div className="container faq-layout">
          {faqCategories.length > 0 ? (
            faqCategories.map((cat) => (
              <div key={cat.key} className="faq-category">
                <h2 className="section-title">{pick(cat.title)}</h2>
                <Accordion
                  items={cat.items.map((item) => ({
                    title: pick(item.q),
                    content: <p>{pick(item.a)}</p>,
                  }))}
                />
              </div>
            ))
          ) : (
            <EmptyState
              message={t.faq.empty}
              action={{ label: t.common.contactUs, to: '/contact' }}
            />
          )}
        </div>
      </section>
    </>
  );
}

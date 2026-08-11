import Seo from '../components/common/Seo';
import PublicPageHeader from '../components/content/PublicPageHeader';
import { useLanguage } from '../context/LanguageContext';
import { Link } from 'react-router-dom';
import '../styles/composition.css';
import '../styles/content.css';

/** Dedicated Programs route — not an alias to LHA Store. */
export default function ProgramsPage() {
  const { pick } = useLanguage();
  return (
    <>
      <Seo
        title={pick({ en: 'Programs', ar: 'البرامج' })}
        description={pick({
          en: 'Basketball programs from Shababuna. Dedicated program pages — not a storefront alias.',
          ar: 'برامج كرة السلة من شبابنا. صفحات برامج مخصصة — وليست اسمًا مستعارًا للمتجر.',
        })}
        path="/programs"
      />
      <PublicPageHeader
        title={pick({ en: 'Programs', ar: 'البرامج' })}
        lede={pick({
          en: 'Program details will publish here as schedules are confirmed. Nothing is invented.',
          ar: 'تُنشر تفاصيل البرامج هنا عند تأكيد الجداول. لا نختلق محتوى.',
        })}
      />
      <section className="container section">
        <p className="lead">
          {pick({
            en: 'Coming soon — dedicated program content. Meanwhile explore training gear in the LHA Store or contact us for club programs.',
            ar: 'قريبًا — محتوى برامج مخصص. يمكنك الآن استكشاف معدات التدريب في متجر LHA أو مراسلتنا لبرامج الأندية.',
          })}
        </p>
        <div className="gw-teams-actions">
          <Link className="gw-btn gw-btn--primary" to="/lha-store">
            {pick({ en: 'Browse LHA Store', ar: 'تصفح متجر LHA' })}
          </Link>
          <Link className="gw-btn gw-btn--ghost" to="/contact">
            {pick({ en: 'Contact', ar: 'تواصل' })}
          </Link>
        </div>
      </section>
    </>
  );
}

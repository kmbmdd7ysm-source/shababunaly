import Seo from '../components/common/Seo';
import PublicPageHeader from '../components/content/PublicPageHeader';
import { useLanguage } from '../context/LanguageContext';
import { Link } from 'react-router-dom';
import '../styles/composition.css';
import '../styles/content.css';

export default function CoachesPage() {
  const { pick } = useLanguage();
  return (
    <>
      <Seo
        title={pick({ en: 'Coaches', ar: 'المدربون' })}
        description={pick({
          en: 'Shababuna coaching roster — dedicated route, not an About alias.',
          ar: 'قائمة مدربي شبابنا — مسار مخصص وليس اسمًا مستعارًا لصفحة من نحن.',
        })}
        path="/coaches"
      />
      <PublicPageHeader
        title={pick({ en: 'Coaches', ar: 'المدربون' })}
        lede={pick({
          en: 'Coach profiles publish here when approved. Coming soon until then.',
          ar: 'تُنشر ملفات المدربين هنا عند اعتمادها. قريبًا حتى ذلك الحين.',
        })}
      />
      <section className="container section">
        <p className="lead">
          {pick({
            en: 'Coming soon — no invented coach biographies. Learn more about the brand on About, or contact us.',
            ar: 'قريبًا — بلا سير ذاتية مختلقة. تعرف على العلامة من صفحة من نحن، أو تواصل معنا.',
          })}
        </p>
        <div className="gw-teams-actions">
          <Link className="gw-btn gw-btn--primary" to="/about">
            {pick({ en: 'About', ar: 'من نحن' })}
          </Link>
          <Link className="gw-btn gw-btn--ghost" to="/contact">
            {pick({ en: 'Contact', ar: 'تواصل' })}
          </Link>
        </div>
      </section>
    </>
  );
}

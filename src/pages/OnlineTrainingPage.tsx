import Seo from '../components/common/Seo';
import PublicPageHeader from '../components/content/PublicPageHeader';
import { useLanguage } from '../context/LanguageContext';
import { Link } from 'react-router-dom';
import '../styles/composition.css';
import '../styles/content.css';

export default function OnlineTrainingPage() {
  const { pick } = useLanguage();
  return (
    <>
      <Seo
        title={pick({ en: 'Online Training', ar: 'التدريب أونلاين' })}
        description={pick({
          en: 'Online basketball training from Shababuna — dedicated page identity.',
          ar: 'تدريب كرة السلة أونلاين من شبابنا — هوية صفحة مستقلة.',
        })}
        path="/online-training"
      />
      <PublicPageHeader
        title={pick({ en: 'Online Training', ar: 'التدريب أونلاين' })}
        lede={pick({
          en: 'Digital training products and sessions will list here. Source-backed only.',
          ar: 'ستُدرج هنا منتجات وجلسات التدريب الرقمية. من المصدر فقط.',
        })}
      />
      <section className="container section">
        <p className="lead">
          {pick({
            en: 'Coming soon. Explore related digital items in the LHA Store while programs are prepared.',
            ar: 'قريبًا. استكشف المنتجات الرقمية ذات الصلة في متجر LHA أثناء تجهيز البرامج.',
          })}
        </p>
        <Link className="gw-btn gw-btn--primary" to="/lha-store">
          {pick({ en: 'LHA Store', ar: 'متجر LHA' })}
        </Link>
      </section>
    </>
  );
}

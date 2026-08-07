import Seo from '../components/common/Seo';
import RouteMasthead from '../components/composition/RouteMasthead';
import { useLanguage } from '../context/LanguageContext';
import { Link } from 'react-router-dom';
import '../styles/composition.css';
import '../styles/content.css';

export default function EventsPage() {
  const { pick } = useLanguage();
  return (
    <>
      <Seo
        title={pick({ en: 'Events', ar: 'الفعاليات' })}
        description={pick({
          en: 'Shababuna basketball events. Dedicated route with source-backed listings only.',
          ar: 'فعاليات كرة السلة من شبابنا. مسار مخصص بإعلانات موثّقة فقط.',
        })}
        path="/events"
      />
      <RouteMasthead
        title={pick({ en: 'Events', ar: 'الفعاليات' })}
        lede={pick({
          en: 'Upcoming events appear here when confirmed. Coming soon if none are published yet.',
          ar: 'تظهر الفعاليات القادمة هنا عند تأكيدها. قريبًا إن لم تُنشر بعد.',
        })}
      />
      <section className="container section">
        <p className="lead">
          {pick({
            en: 'Coming soon — no unverified event listings. Contact us to host or join a session.',
            ar: 'قريبًا — بلا فعاليات غير موثّقة. تواصل معنا لاستضافة جلسة أو الانضمام إليها.',
          })}
        </p>
        <Link className="gw-btn gw-btn--primary" to="/contact">
          {pick({ en: 'Contact', ar: 'تواصل' })}
        </Link>
      </section>
    </>
  );
}

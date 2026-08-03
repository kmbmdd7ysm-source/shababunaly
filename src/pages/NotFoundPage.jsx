import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import Seo from '../components/common/Seo';
import '../styles/composition.css';

/*
 * The 404, rebuilt as a TERMINAL state.
 *
 * WAS: a section with a small code, a title, a paragraph and three stacked
 * full-width buttons.
 *
 * NOW: a drawn plate — the code set at display scale as the subject of the
 * page, closed by a measured rule, with the three routes onward as a single
 * horizontal cluster rather than a stack that reads as a form.
 *
 * Same three destinations, same translation keys, still `noindex`.
 */
export default function NotFoundPage() {
  const { t } = useLanguage();
  return (
    <>
      <Seo title={t.errors.notFoundTitle} description={t.errors.notFoundText} path="/404" noindex />
      <section className="gw-terminal">
        <div className="gw-terminal-inner">
          <span className="gw-terminal-code" aria-hidden="true">
            404
          </span>
          <span className="gw-terminal-rule" aria-hidden="true" />
          <h1 className="gw-terminal-title">{t.errors.notFoundTitle}</h1>
          <p className="gw-terminal-copy">{t.errors.notFoundText}</p>
          <div className="gw-terminal-actions">
            <Link to="/" className="gw-btn gw-btn--primary">
              {t.errors.returnHome}
            </Link>
            <Link to="/shop" className="gw-btn gw-btn--secondary">
              {t.errors.visitShop}
            </Link>
            <Link to="/search" className="gw-btn gw-btn--ghost">
              {t.errors.searchSite}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

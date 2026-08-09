import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import Seo from '../components/common/Seo.tsx';
import '../styles/composition.css';

export default function NotFoundPage() {
  const { t } = useLanguage();
  const errors = (t.errors || {}) as Record<string, string>;
  return (
    <>
      <Seo title={errors.notFoundTitle} description={errors.notFoundText} path="/404" noindex />
      <section className="gw-terminal">
        <div className="gw-terminal-inner">
          <span className="gw-terminal-code" aria-hidden="true">
            404
          </span>
          <span className="gw-terminal-rule" aria-hidden="true" />
          <h1 className="gw-terminal-title">{errors.notFoundTitle}</h1>
          <p className="gw-terminal-copy">{errors.notFoundText}</p>
          <div className="gw-terminal-actions">
            <Link to="/" className="gw-btn gw-btn--primary">
              {errors.returnHome}
            </Link>
            <Link to="/shop" className="gw-btn gw-btn--secondary">
              {errors.visitShop}
            </Link>
            <Link to="/search" className="gw-btn gw-btn--ghost">
              {errors.searchSite}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

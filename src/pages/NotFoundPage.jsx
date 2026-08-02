import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import Seo from '../components/common/Seo';

export default function NotFoundPage() {
  const { t } = useLanguage();
  return (
    <>
      <Seo title={t.errors.notFoundTitle} description={t.errors.notFoundText} path="/404" noindex />
      <section className="section notfound">
        <div className="container notfound-inner">
          <p className="notfound-code">404</p>
          <h1 className="display-title">{t.errors.notFoundTitle}</h1>
          <p>{t.errors.notFoundText}</p>
          <div className="notfound-links">
            <Link to="/" className="btn-primary block">
              {t.errors.returnHome}
            </Link>
            <Link to="/shop" className="btn-secondary block">
              {t.errors.visitShop}
            </Link>
            <Link to="/search" className="btn-ghost block">
              {t.errors.searchSite}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

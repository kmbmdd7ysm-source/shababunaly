import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';

// items: [{ label, to? }] — last item is the current page (no link).
export default function Breadcrumbs({ items }: {
  items?: Array<{ label?: string; to?: string }>;
}) {
  const { t } = useLanguage();
  return (
    <nav className="breadcrumbs" aria-label={t.a11y.breadcrumb}>
      <Link to="/">{t.nav.home}</Link>
      {items.map((item) => (
        <span key={item.label} className="crumb">
          <span aria-hidden="true" className="crumb-sep">
            /
          </span>
          {item.to ? (
            <Link to={item.to}>{item.label}</Link>
          ) : (
            <span aria-current="page">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

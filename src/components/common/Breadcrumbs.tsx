import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';

// items: [{ label, to? }] — last item is the current page (no link).
export default function Breadcrumbs({
  items = [],
}: {
  items?: Array<{ label: string; to?: string }>;
}) {
  const { t } = useLanguage();
  const a11y = (t.a11y as { breadcrumb?: string } | undefined) || {};
  const nav = (t.nav as { home?: string } | undefined) || {};
  return (
    <nav className="breadcrumbs" aria-label={a11y.breadcrumb}>
      <Link to="/">{nav.home}</Link>
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

import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';

export default function EmptyState({
  message = '',
  hint = '',
  action = null,
}: {
  message?: string;
  hint?: string;
  action?: { to?: string; label?: string; onClick?: () => void } | null;
}) {
  const { t } = useLanguage();
  const common = (t.common as { results?: string } | undefined) || {};
  return (
    <div className="empty-state" role="status">
      <span className="empty-mark" aria-hidden="true">
        🏀
      </span>
      <p className="empty-message">{message || common.results}</p>
      {hint && <p className="empty-hint">{hint}</p>}
      {action &&
        (action.to ? (
          <Link to={action.to} className="btn-secondary">
            {action.label}
          </Link>
        ) : (
          <button type="button" className="btn-secondary" onClick={action.onClick}>
            {action.label}
          </button>
        ))}
    </div>
  );
}

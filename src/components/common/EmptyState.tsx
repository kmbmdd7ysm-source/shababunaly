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
        <svg viewBox="0 0 120 120" width="56" height="56" fill="none">
          <circle cx="60" cy="60" r="52" stroke="currentColor" strokeWidth="2.5" />
          <path
            d="M60 8c18 16 28 34 28 52s-10 36-28 52"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M60 8c-18 16-28 34-28 52s10 36 28 52"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path d="M12 48c30 8 66 8 96 0" stroke="currentColor" strokeWidth="2" />
          <path d="M12 72c30-8 66-8 96 0" stroke="currentColor" strokeWidth="2" />
        </svg>
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

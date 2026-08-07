import { useLanguage } from '../../context/LanguageContext';

export default function AccountRegister({ sections, section, selectSection }) {
  const { pick } = useLanguage();
  return (
    <nav
      className="gw-account-register"
      aria-label={pick({ en: 'Account sections', ar: 'أقسام الحساب' })}
    >
      {Object.entries(sections).map(([k, v]) => (
        <button
          key={k}
          type="button"
          className={`gw-account-tab${section === k ? ' is-active' : ''}`}
          aria-current={section === k ? 'page' : undefined}
          onClick={() => selectSection(k)}
        >
          <span>{v}</span>
        </button>
      ))}
    </nav>
  );
}

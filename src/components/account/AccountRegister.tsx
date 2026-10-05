import { useLanguage } from '../../context/LanguageContext';
import Icon from '../icons/Icon';

const SECTION_ICONS: Record<string, string> = {
  overview: 'grid',
  profile: 'user',
  saved: 'heart',
  security: 'shield',
  addresses: 'pin',
  preferences: 'sliders',
  orders: 'orders',
  workspace: 'teams',
  returns: 'return',
  'special-requests': 'spark',
};

export default function AccountRegister({
  sections,
  section,
  selectSection,
}: {
  sections: Record<string, string>;
  section: string;
  selectSection: (id: string) => void;
}) {
  const { pick } = useLanguage();

  return (
    <nav
      className="gw-account-register"
      aria-label={pick({ en: 'Account sections', ar: 'أقسام الحساب' })}
    >
      {Object.entries(sections).map(([key, label]) => {
        const active = section === key;
        return (
          <button
            key={key}
            type="button"
            className={`gw-account-tab${active ? ' is-active' : ''}`}
            aria-current={active ? 'page' : undefined}
            onClick={() => selectSection(key)}
          >
            <span className="gw-account-tab__icon" aria-hidden="true">
              <Icon name={SECTION_ICONS[key] || 'grid'} size={18} strokeWidth={1.8} />
            </span>
            <span>{label}</span>
            <span className="gw-account-tab__chevron" aria-hidden="true">
              <Icon name="next" size={14} strokeWidth={1.8} />
            </span>
          </button>
        );
      })}
    </nav>
  );
}

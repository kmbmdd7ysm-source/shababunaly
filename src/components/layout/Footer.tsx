import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { SITE } from '../../config';
import { useLanguage } from '../../context/LanguageContext';
import { useCookies } from '../../context/CookieContext';
import { footerNav } from '../../data/navigation';
import { footerContacts } from '../../data/footerSocial';
import Newsletter from '../common/Newsletter';
import CurrencySelector from '../common/CurrencySelector';
import { trackEvent } from '../../utils/analytics';
import '../../styles/design/phase2-chrome.css';

type FooterItem = { to: string; label: { en?: string; ar?: string } };

export default function Footer(): ReactElement {
  const { pick, lang, setLang } = useLanguage();
  const { openPreferences } = useCookies();
  const wordmark = lang === 'ar' ? SITE.wordmarkArLight : SITE.wordmarkLight;
  const groups: Array<{ title: { en: string; ar: string }; items: FooterItem[] }> = [
    { title: { en: 'Shop', ar: 'تسوق' }, items: footerNav.shop },
    { title: { en: 'Discover', ar: 'اكتشف' }, items: footerNav.discover },
    { title: { en: 'Shababuna', ar: 'شبابنا' }, items: footerNav.company },
    { title: { en: 'Help', ar: 'المساعدة' }, items: footerNav.help },
  ];

  return (
    <footer className="s2-footer">
      <div className="s2-footer__top">
        <div className="s2-footer__brand-block">
          <Link to="/" aria-label={SITE.name} className="s2-footer__mark">
            <img src={wordmark} alt="" width="228" height="62" />
          </Link>
          <p>{pick({ en: 'Basketball. Product. Culture.', ar: 'كرة السلة. المنتج. الثقافة.' })}</p>
        </div>
        <div className="s2-footer__newsletter">
          <span className="s2-overline">{pick({ en: 'Stay in the game', ar: 'خليك في اللعبة' })}</span>
          <h2>{pick({ en: 'Drops, products and stories.', ar: 'إصدارات ومنتجات وقصص.' })}</h2>
          <Newsletter compact />
        </div>
      </div>

      <div className="s2-footer__links">
        {groups.map((group) => (
          <nav key={group.title.en} aria-label={pick(group.title)}>
            <span className="s2-overline">{pick(group.title)}</span>
            <ul>
              {group.items.map((item) => (
                <li key={item.to}><Link to={item.to}>{pick(item.label)}</Link></li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="s2-footer__utility">
        <div className="s2-footer__social" aria-label={pick({ en: 'Social links', ar: 'روابط التواصل' })}>
          {footerContacts.filter((item) => Boolean(item.href)).map((item) => (
            <a
              key={item.id}
              href={item.href}
              {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              aria-label={item.id}
              onClick={() => trackEvent('outbound_social', { network: item.id, source: 'footer' })}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">{item.icon}</svg>
            </a>
          ))}
        </div>
        <div className="s2-footer__locale">
          <CurrencySelector compact />
          <button type="button" onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}>
            {lang === 'en' ? 'العربية' : 'English'}
          </button>
        </div>
      </div>

      <div className="s2-footer__legal">
        <span>© {new Date().getFullYear()} Shababuna</span>
        <div>
          {footerNav.legal.map((item) => <Link key={item.to} to={item.to}>{pick(item.label)}</Link>)}
          <button type="button" onClick={openPreferences}>{pick({ en: 'Cookie settings', ar: 'إعدادات الكوكيز' })}</button>
        </div>
      </div>
    </footer>
  );
}

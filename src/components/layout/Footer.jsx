import { Link } from 'react-router-dom';
import { SITE } from '../../config';
import { useLanguage } from '../../context/LanguageContext';
import { useCookies } from '../../context/CookieContext';
import { useCommerce } from '../../context/CommerceContext';
import { trackEvent } from '../../utils/analytics';
import { footerNav } from '../../data/navigation';
import { footerContacts } from '../../data/footerSocial';
import Newsletter from '../common/Newsletter';

export default function Footer() {
  const { t, pick, lang } = useLanguage();
  const { openPreferences } = useCookies();
  const { countryCode } = useCommerce();
  const shopFooterLinks = footerNav.shop.filter((item) => countryCode === 'LY' || item.key !== 'readyToShip');

  const renderLinks = (items) =>
    items.map((l) => (
      <li key={l.to}>
        <Link to={l.to}>{l.key ? t.nav[l.key] : pick(l.label)}</Link>
      </li>
    ));

  return (
    <footer className="site-footer">
      <div className="container footer-top">
        <div className="footer-brand-col">
          <Link to="/" className="brand footer-brand" aria-label={SITE.name}>
            <img
              src={lang === 'ar' ? SITE.wordmarkArLight : SITE.wordmarkLight}
              alt=""
              width="244"
              height="68"
              className="footer-brand-wordmark"
            />
          </Link>
          <p className="footer-slogan">{pick(SITE.slogan)}</p>
          <p className="footer-tagline">{t.footer.tagline}</p>
          <div className="footer-social" aria-label={t.footer.socialLinks}>
            {footerContacts.filter((item) => item.href).map(({ id, href, labelKey, external, icon }) => (
              <a
                key={id}
                href={href}
                {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                aria-label={t.footer.socialLabels[labelKey]}
                onClick={() => trackEvent('outbound_social', { network: id, source: 'footer' })}
              >
                <svg
                  className={`footer-social-icon footer-social-icon--${id}`}
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  focusable="false"
                >
                  {icon}
                </svg>
              </a>
            ))}
          </div>
        </div>

        <nav className="footer-col" aria-label={t.footer.shop}>
          <h3>{t.footer.shop}</h3>
          <ul>{renderLinks(shopFooterLinks)}</ul>
        </nav>
        <nav className="footer-col" aria-label={t.footer.academy}>
          <h3>{pick({ en: 'Services', ar: 'الخدمات' })}</h3>
          <ul>{renderLinks(footerNav.academy)}</ul>
        </nav>
        <nav className="footer-col" aria-label={t.footer.help}>
          <h3>{t.footer.help}</h3>
          <ul>{renderLinks(footerNav.help)}</ul>
        </nav>

        <div className="footer-col footer-newsletter-col">
          <h3>{t.footer.newsletter}</h3>
          <p className="footer-nl-text">{t.newsletter.text}</p>
          <Newsletter compact />
        </div>
      </div>

      <div className="container footer-mid">
        <div className="footer-payments" aria-label={t.footer.payments}>
          {[
            ['visa', 'Visa', 443, 148],
            ['mastercard', 'Mastercard', 435, 260],
            ['apple-pay', 'Apple Pay', 512, 216],
            ['google-pay', 'Google Pay', 535, 260],
            ['samsung-pay', 'Samsung Pay', 602, 103],
            ['libyan-bank-card', 'Libyan Bank Card', 320, 120],
          ].map(([key, label, width, height]) => (
            <img
              key={key}
              src={`/images/payments/${key}.${key === 'libyan-bank-card' ? 'svg' : 'png'}`}
              alt={label}
              width={width}
              height={height}
              className={`payment-logo payment-logo--${key}`}
              loading="lazy"
            />
          ))}
        </div>
      </div>

      <div className="container footer-bottom">
        <nav className="footer-legal" aria-label={t.footer.legal}>
          {footerNav.legal.map((l) => (
            <Link key={l.to} to={l.to}>
              {t.nav[l.key]}
            </Link>
          ))}
          <button className="footer-link-button" onClick={openPreferences}>
            {t.common.changePreferences}
          </button>
        </nav>
        <p className="footer-copy">
          © {new Date().getFullYear()} {SITE.name}. {t.footer.rights}
        </p>
      </div>
    </footer>
  );
}

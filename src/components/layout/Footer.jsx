import { Link } from 'react-router-dom';
import { SITE } from '../../config';
import { useLanguage } from '../../context/LanguageContext';
import { useCookies } from '../../context/CookieContext';
import { useCommerce } from '../../context/CommerceContext';
import { trackEvent } from '../../utils/analytics';
import { footerNav } from '../../data/navigation';
import { footerContacts } from '../../data/footerSocial';
import Newsletter from '../common/Newsletter';
import '../../styles/colophon.css';

/*
 * THE COLOPHON — rebuilt composition, identical content and behaviour.
 *
 * The old footer was four link columns plus a brand block, all at the same
 * weight. This is the closing chapter of the page instead:
 *
 *   1  a full-bleed sign-off — the wordmark at display scale against the
 *      slogan, with the newsletter as the single call to action
 *   2  a drawn directory: three numbered indexes on hairline rules
 *   3  an instruments strip: payments and social, each a labelled specimen
 *   4  a datum line: legal, cookie preferences and the copyright
 *
 * Every link, every payment logo, the social outbound tracking event, the
 * Libya-conditional Ready-to-Ship link and the cookie-preferences trigger are
 * carried over exactly.
 */
export default function Footer() {
  const { t, pick, lang } = useLanguage();
  const { openPreferences } = useCookies();
  const { countryCode } = useCommerce();
  const shopFooterLinks = footerNav.shop.filter(
    (item) => countryCode === 'LY' || item.key !== 'readyToShip',
  );

  const renderLinks = (items) =>
    items.map((l) => (
      <li key={l.to}>
        <Link to={l.to} className="gw-colophon-link">
          {l.key ? t.nav[l.key] : pick(l.label)}
        </Link>
      </li>
    ));

  const directories = [
    { index: '01', title: t.footer.shop, label: t.footer.shop, items: shopFooterLinks },
    {
      index: '02',
      title: pick({ en: 'Services', ar: 'الخدمات' }),
      label: t.footer.academy,
      items: footerNav.academy,
    },
    { index: '03', title: t.footer.help, label: t.footer.help, items: footerNav.help },
  ];

  return (
    <footer className="gw-colophon">
      {/* 1 — the sign-off */}
      <div className="gw-colophon-signoff">
        <div className="gw-colophon-inner gw-colophon-signoff-grid">
          <div className="gw-colophon-identity">
            <Link to="/" className="gw-colophon-mark" aria-label={SITE.name}>
              <img
                src={lang === 'ar' ? SITE.wordmarkArLight : SITE.wordmarkLight}
                alt=""
                width="244"
                height="68"
              />
            </Link>
            <p className="gw-colophon-slogan">{pick(SITE.slogan)}</p>
            <p className="gw-colophon-tagline">{t.footer.tagline}</p>
          </div>

          <div className="gw-colophon-subscribe">
            <p className="gw-spec">{t.footer.newsletter}</p>
            <p className="gw-colophon-subscribe-text">{t.newsletter.text}</p>
            <Newsletter compact />
          </div>
        </div>
      </div>

      {/* 2 — the directory */}
      <div className="gw-colophon-inner gw-colophon-directory">
        {directories.map((column) => (
          <nav className="gw-colophon-column" aria-label={column.label} key={column.index}>
            <p className="gw-colophon-column-head">
              <span className="gw-colophon-index" aria-hidden="true">
                {column.index}
              </span>
              <span>{column.title}</span>
            </p>
            <ul>{renderLinks(column.items)}</ul>
          </nav>
        ))}

        <div className="gw-colophon-column gw-colophon-column--contact">
          <p className="gw-colophon-column-head">
            <span className="gw-colophon-index" aria-hidden="true">
              04
            </span>
            <span>{pick({ en: 'Contact', ar: 'تواصل' })}</span>
          </p>
          <p className="gw-colophon-place">{pick(SITE.address)}</p>
          <div className="gw-colophon-social" aria-label={t.footer.socialLinks}>
            {footerContacts
              .filter((item) => item.href)
              .map(({ id, href, labelKey, external, icon }) => (
                <a
                  key={id}
                  href={href}
                  {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  aria-label={t.footer.socialLabels[labelKey]}
                  onClick={() => trackEvent('outbound_social', { network: id, source: 'footer' })}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    {icon}
                  </svg>
                </a>
              ))}
          </div>
        </div>
      </div>

      {/* 3 — instruments */}
      <div className="gw-colophon-inner gw-colophon-instruments">
        <p className="gw-spec">{t.footer.payments}</p>
        <div className="gw-colophon-payments" aria-label={t.footer.payments}>
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
              className={`gw-colophon-payment gw-colophon-payment--${key}`}
              loading="lazy"
            />
          ))}
        </div>
      </div>

      {/* 4 — the datum */}
      <div className="gw-colophon-inner gw-colophon-datum">
        <nav className="gw-colophon-legal" aria-label={t.footer.legal}>
          {footerNav.legal.map((l) => (
            <Link key={l.to} to={l.to}>
              {t.nav[l.key]}
            </Link>
          ))}
          <button type="button" onClick={openPreferences}>
            {t.common.changePreferences}
          </button>
        </nav>
        <p className="gw-colophon-copy">
          © {new Date().getFullYear()} {SITE.name}. {t.footer.rights}
        </p>
      </div>
    </footer>
  );
}

import '../../styles/domain-chrome.css';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SITE } from '../../config.ts';
import { useLanguage } from '../../context/LanguageContext';
import { useCookies } from '../../context/CookieContext';
import { trackEvent } from '../../utils/analytics.ts';
import { footerNav } from '../../data/navigation.ts';
import { footerContacts } from '../../data/footerSocial';
import Newsletter from '../common/Newsletter';
import '../../styles/colophon.css';

type FooterLink = { to: string; key?: string; label?: { en?: string; ar?: string } };

/**
 * Premium commerce footer — hierarchy without dossier numbering.
 * Brand statement → discovery columns → payments/social → legal.
 */
export default function Footer() {
  const { t, pick, lang } = useLanguage();
  const { openPreferences } = useCookies();
  const nav = t.nav as Record<string, string>;
  const footer = t.footer as Record<string, string> & {
    socialLinks?: string;
    socialLabels?: Record<string, string>;
  };
  const common = t.common as Record<string, string>;
  const newsletter = t.newsletter as Record<string, string>;

  // Ready to Ship remains visible worldwide; destination page explains shipping.
  const shopFooterLinks = footerNav.shop as FooterLink[];

  const [openGroup, setOpenGroup] = useState<string | null>(null);

  const renderLinks = (items: FooterLink[]) =>
    items.map((l) => (
      <li key={l.to}>
        <Link to={l.to} className="gw-colophon-link">
          {l.key ? nav[l.key] : pick(l.label)}
        </Link>
      </li>
    ));

  const groups: Array<{ id: string; title: string; label: string; items: FooterLink[] }> = [
    {
      id: 'shop',
      title: footer.shop || 'Shop',
      label: footer.shop || 'Shop',
      items: shopFooterLinks,
    },
    {
      id: 'services',
      title: pick({ en: 'Customize & Teams', ar: 'التخصيص والفرق' }),
      label: footer.academy || 'Services',
      items: footerNav.academy as FooterLink[],
    },
    {
      id: 'help',
      title: footer.help || 'Help',
      label: footer.help || 'Help',
      items: footerNav.help as FooterLink[],
    },
  ];

  const toggleGroup = (id: string) => setOpenGroup((current) => (current === id ? null : id));

  return (
    <footer className="gw-colophon gw-colophon--commerce">
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
            <p className="gw-colophon-tagline">{footer.tagline}</p>
          </div>

          <div className="gw-colophon-subscribe">
            <p className="gw-colophon-subscribe-kicker">{footer.newsletter}</p>
            <p className="gw-colophon-subscribe-text">{newsletter.text}</p>
            <Newsletter compact />
          </div>
        </div>
      </div>

      <div className="gw-colophon-inner gw-colophon-directory">
        {groups.map((column) => (
          <nav className="gw-colophon-column" aria-label={column.label} key={column.id}>
            <button
              type="button"
              className="gw-colophon-column-toggle"
              aria-expanded={openGroup === column.id}
              onClick={() => toggleGroup(column.id)}
            >
              <span className="gw-colophon-column-title">{column.title}</span>
            </button>
            <p className="gw-colophon-column-head gw-colophon-column-head--desktop">
              <span>{column.title}</span>
            </p>
            <ul className={openGroup === column.id ? 'is-open' : undefined}>{renderLinks(column.items)}</ul>
          </nav>
        ))}

        <div className="gw-colophon-column gw-colophon-column--contact">
          <p className="gw-colophon-column-head">
            <span>{pick({ en: 'Contact', ar: 'تواصل' })}</span>
          </p>
          <p className="gw-colophon-place">{pick(SITE.address)}</p>
          <div className="gw-colophon-social" aria-label={footer.socialLinks}>
            {footerContacts
              .filter((item): item is typeof item & { href: string } => Boolean(item.href))
              .map(({ id, href, labelKey, external, icon }) => (
                <a
                  key={id}
                  href={href}
                  {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  aria-label={footer.socialLabels?.[labelKey] || id}
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

      <div className="gw-colophon-inner gw-colophon-instruments">
        <p className="gw-colophon-instruments-label">{footer.payments}</p>
        <div className="gw-colophon-payments" aria-label={footer.payments}>
          {(
            [
              ['visa', 'Visa', 443, 148],
              ['mastercard', 'Mastercard', 435, 260],
              ['apple-pay', 'Apple Pay', 512, 216],
              ['google-pay', 'Google Pay', 535, 260],
              ['samsung-pay', 'Samsung Pay', 602, 103],
              ['libyan-bank-card', 'Libyan Bank Card', 320, 120],
            ] as const
          ).map(([key, label, width, height]) => (
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

      <div className="gw-colophon-inner gw-colophon-datum">
        <nav className="gw-colophon-legal" aria-label={footer.legal}>
          {(footerNav.legal as FooterLink[]).map((l) => (
            <Link key={l.to} to={l.to}>
              {l.key ? nav[l.key] : pick(l.label)}
            </Link>
          ))}
          <button type="button" onClick={openPreferences}>
            {common.changePreferences}
          </button>
        </nav>
        <p className="gw-colophon-copy">
          © {new Date().getFullYear()} {SITE.name}. {footer.rights}
        </p>
      </div>
    </footer>
  );
}

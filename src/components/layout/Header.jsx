import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { SITE } from '../../config';
import { useLanguage } from '../../context/LanguageContext';
import { useCart } from '../../context/CartContext';
import { useCompare } from '../../context/CompareContext';
import { useAuth } from '../../context/AuthContext';
import { useCommerce } from '../../context/CommerceContext';
import { useWishlist } from '../../hooks/useWishlist';
import { trackEvent } from '../../utils/analytics';
import { lockDocumentScroll } from '../../utils/scrollLock';
import { mainNav, megaMenu } from '../../data/navigation';
import AnnouncementBar from './AnnouncementBar';
import CurrencySelector from '../common/CurrencySelector';

import Icon from '../icons/Icon';
import '../../styles/masthead.css';

const SearchOverlay = lazy(() => import('./SearchOverlay'));

/*
 * THE MASTHEAD — rebuilt composition, identical behaviour.
 *
 * The old header was a single flex row: brand, links, icons. This is a drawn
 * datum instead — the line the whole site is measured from.
 *
 *   row 1  the announcement rail
 *   row 2  a three-column grid: mark / register / instruments
 *          with a hairline baseline that thickens when the page leaves the top
 *   row 3  the mega plate, a full-bleed dark chapter rather than a dropdown
 *
 * Navigation entries carry a two-digit index, so the nav reads as a numbered
 * register of the site rather than a row of words, and the active entry is
 * marked by a rule drawn from the leading edge — which means it starts on the
 * right in Arabic without a single directional override.
 *
 * Mobile is not the desktop header collapsed. It is a full-screen dark chapter
 * with display-scale numbered entries, a drawn instrument grid and the
 * language and currency controls on their own plate.
 *
 * Every behaviour is carried over untouched: mega hover intent and its timer,
 * the lazy search overlay, cart drawer opening, the three analytics events,
 * scroll state, route-change close, scroll lock, the focus trap, Escape, and
 * focus return to the trigger.
 */
export default function Header() {
  const { t, pick, lang, setLang } = useLanguage();
  const { count, openDrawer } = useCart();
  const compare = useCompare();
  const wishlist = useWishlist();
  const auth = useAuth();
  const { countryCode } = useCommerce();
  const isLibya = countryCode === 'LY';
  const featuredShopLinks = megaMenu.featured.filter(
    (item) => isLibya || item.key !== 'readyToShip',
  );
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileShopOpen, setMobileShopOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchButton = useRef(null);
  const menuButton = useRef(null),
    menuPanel = useRef(null),
    megaTimer = useRef(null);

  useEffect(() => {
    setMobileOpen(false);
    setMegaOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });
    return () => removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => {
    if (!mobileOpen) return undefined;
    const unlock = lockDocumentScroll();
    const focusable = () => [
      ...menuPanel.current.querySelectorAll('a[href],button:not([disabled]),select'),
    ];
    focusable()[0]?.focus();
    const key = (e) => {
      if (e.key === 'Escape') {
        setMobileOpen(false);
        return;
      }
      if (e.key === 'Tab') {
        const f = focusable();
        if (!f.length) return;
        const first = f[0],
          last = f.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('keydown', key);
      unlock();
      // Restore focus AFTER the paint that hides the drawer. Calling focus()
      // synchronously here loses: hiding the panel blurs whatever inside it
      // still held focus, and the browser resets to <body> during the same
      // style recalculation, so the trigger never actually receives it.
      const trigger = menuButton.current;
      requestAnimationFrame(() => trigger?.focus());
    };
  }, [mobileOpen]);
  const toggleLang = () => {
    const next = lang === 'en' ? 'ar' : 'en';
    setLang(next);
    trackEvent('language_change', { language: next });
  };
  const navLabel = (item) => t.nav[item.key] || pick(item.label || { en: item.key, ar: item.key });
  const headerWordmark = lang === 'ar' ? SITE.wordmarkAr : SITE.wordmark;
  const close = () => setMobileOpen(false);
  const index = (position) => String(position + 1).padStart(2, '0');

  return (
    <>
      <AnnouncementBar />
      <header
        className={`gw-masthead${scrolled ? ' is-scrolled' : ''}`}
        data-mega={megaOpen ? 'open' : 'closed'}
      >
        <div className="gw-masthead-bar">
          <Link to="/" className="gw-mark" aria-label={SITE.name}>
            <img
              src={headerWordmark}
              alt=""
              width="460"
              height="130"
              className="gw-mark-wordmark"
            />
          </Link>

          <nav className="gw-register" aria-label={t.a11y.mainNav}>
            {mainNav.map((item, position) =>
              item.mega ? (
                <div
                  key={item.to}
                  className="gw-register-item gw-register-item--mega"
                  onMouseEnter={() => {
                    clearTimeout(megaTimer.current);
                    setMegaOpen(true);
                  }}
                  onMouseLeave={() =>
                    (megaTimer.current = setTimeout(() => setMegaOpen(false), 120))
                  }
                >
                  <NavLink
                    to={item.to}
                    className="gw-register-link"
                    aria-haspopup="true"
                    aria-expanded={megaOpen}
                  >
                    <span className="gw-register-index" aria-hidden="true">
                      {index(position)}
                    </span>
                    <span className="gw-register-label">{navLabel(item)}</span>
                  </NavLink>
                </div>
              ) : (
                <div key={item.to} className="gw-register-item">
                  <NavLink to={item.to} end={item.to === '/'} className="gw-register-link">
                    <span className="gw-register-index" aria-hidden="true">
                      {index(position)}
                    </span>
                    <span className="gw-register-label">{navLabel(item)}</span>
                  </NavLink>
                </div>
              ),
            )}
          </nav>

          <div className="gw-instruments">
            <button
              className="gw-instrument"
              ref={searchButton}
              onClick={() => {
                setMobileOpen(false);
                setSearchOpen(true);
              }}
              aria-label={t.a11y.openSearch}
            >
              <Icon name="search" />
            </button>

            <div className="gw-instruments-desktop">
              <span className="gw-instrument-rule" aria-hidden="true" />
              <CurrencySelector compact />
              <button className="gw-instrument gw-instrument--text" onClick={toggleLang}>
                {lang === 'en' ? 'العربية' : 'English'}
              </button>
              <span className="gw-instrument-rule" aria-hidden="true" />
              <Link
                className="gw-instrument"
                to="/favorites"
                aria-label={pick({
                  en: `Favorites, ${wishlist.ids.length} items`,
                  ar: `المفضلة، ${wishlist.ids.length}`,
                })}
              >
                <Icon name="heart" />
              </Link>
              <Link
                className="gw-instrument"
                to="/compare"
                aria-label={pick({ en: 'Compare products', ar: 'مقارنة المنتجات' })}
              >
                <Icon name="compare" />
                {compare.count > 0 && <span className="gw-tally">{compare.count}</span>}
              </Link>
              <Link
                className="gw-instrument"
                to="/account"
                aria-label={pick({ en: 'Account', ar: 'الحساب' })}
              >
                <Icon name="user" />
              </Link>
            </div>

            <Link
              className="gw-instrument gw-instrument--mobile"
              to="/account"
              aria-label={pick({ en: 'Account', ar: 'الحساب' })}
              onClick={() => trackEvent('account_header_click')}
            >
              <Icon name="user" />
            </Link>
            <button
              className="gw-instrument"
              onClick={() => {
                trackEvent('bag_header_click');
                openDrawer();
              }}
              aria-label={`${t.a11y.openCart}${count ? `, ${count}` : ''}`}
            >
              <Icon name="bag" />
              {count > 0 && <span className="gw-tally">{count}</span>}
            </button>
            <button
              ref={menuButton}
              className="gw-instrument gw-instrument--mobile"
              onClick={() => {
                setSearchOpen(false);
                setMobileOpen(true);
              }}
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
              aria-label={t.a11y.openMenu}
            >
              <Icon name="menu" />
            </button>
          </div>
        </div>

        {/* The baseline. It is the datum the page hangs from, and it thickens
            when the page leaves the top rather than a shadow appearing. */}
        <span className="gw-masthead-datum" aria-hidden="true" />

        <div className="gw-megaplate" hidden={!megaOpen}>
          <div className="gw-megaplate-inner">
            <div className="gw-megaplate-col gw-megaplate-col--featured">
              <p className="gw-spec">{pick({ en: 'Departments', ar: 'الأقسام' })}</p>
              {featuredShopLinks.map((l) => (
                <Link key={l.to} to={l.to} className="gw-megaplate-link gw-megaplate-link--lead">
                  {t.nav[l.key]}
                </Link>
              ))}
            </div>
            {megaMenu.columns.map((col) => (
              <div className="gw-megaplate-col" key={pick(col.title)}>
                <h3 className="gw-spec">{pick(col.title)}</h3>
                {col.links.map((l) => (
                  <Link key={l.to} to={l.to} className="gw-megaplate-link">
                    {pick(l.label)}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
      </header>

      <div
        className={`gw-scrim${mobileOpen ? ' is-open' : ''}`}
        onClick={close}
        aria-hidden="true"
      />

      <nav
        ref={menuPanel}
        id="mobile-menu"
        className={`gw-drawer${mobileOpen ? ' is-open' : ''}`}
        aria-label={t.a11y.mobileNav}
        aria-hidden={!mobileOpen}
      >
        <div className="gw-drawer-head">
          <Link to="/" className="gw-mark" onClick={close} aria-label={SITE.name}>
            <img
              src={headerWordmark}
              alt=""
              width="460"
              height="130"
              className="gw-mark-wordmark"
            />
          </Link>
          <button className="gw-instrument" onClick={close} aria-label={t.a11y.closeMenu}>
            <Icon name="close" />
          </button>
        </div>

        <div className="gw-drawer-body">
          {mainNav.map((item, position) =>
            item.mega ? (
              <div key={item.to} className="gw-drawer-group">
                <button
                  className="gw-drawer-link gw-drawer-link--toggle"
                  aria-expanded={mobileShopOpen}
                  onClick={() => setMobileShopOpen((v) => !v)}
                >
                  <span className="gw-drawer-index" aria-hidden="true">
                    {index(position)}
                  </span>
                  <span className="gw-drawer-label">{navLabel(item)}</span>
                  <Icon name="chevron" className={mobileShopOpen ? 'rotated' : ''} />
                </button>
                {mobileShopOpen && (
                  <div className="gw-drawer-sublist">
                    {featuredShopLinks.map((l) => (
                      <NavLink key={l.to} to={l.to} onClick={close} className="gw-drawer-sublink">
                        {t.nav[l.key]}
                      </NavLink>
                    ))}
                    {megaMenu.columns
                      .flatMap((col) => col.links)
                      .map((l) => (
                        <NavLink key={l.to} to={l.to} onClick={close} className="gw-drawer-sublink">
                          {pick(l.label)}
                        </NavLink>
                      ))}
                  </div>
                )}
              </div>
            ) : (
              <NavLink key={item.to} to={item.to} onClick={close} className="gw-drawer-link">
                <span className="gw-drawer-index" aria-hidden="true">
                  {index(position)}
                </span>
                <span className="gw-drawer-label">{navLabel(item)}</span>
              </NavLink>
            ),
          )}
          <NavLink to="/favorites" onClick={close} className="gw-drawer-link gw-drawer-link--minor">
            <span className="gw-drawer-label">
              {pick({
                en: `Favorites (${wishlist.ids.length})`,
                ar: `المفضلة (${wishlist.ids.length})`,
              })}
            </span>
          </NavLink>
          <NavLink to="/compare" onClick={close} className="gw-drawer-link gw-drawer-link--minor">
            <span className="gw-drawer-label">
              {pick({ en: `Compare (${compare.count})`, ar: `المقارنة (${compare.count})` })}
            </span>
          </NavLink>

          {auth.user ? (
            <div className="gw-drawer-account">
              <p className="gw-spec">{pick({ en: 'Signed in', ar: 'مسجّل الدخول' })}</p>
              <span className="gw-drawer-identity">
                {auth.user.user_metadata?.display_name || auth.user.email}
              </span>
              <Link to="/account" onClick={close} className="gw-drawer-sublink">
                {pick({ en: 'View Account', ar: 'عرض الحساب' })}
              </Link>
              <button
                type="button"
                className="gw-drawer-sublink"
                onClick={async () => {
                  await auth.signOut();
                  close();
                }}
              >
                {pick({ en: 'Sign Out', ar: 'تسجيل الخروج' })}
              </button>
            </div>
          ) : (
            <div
              className="gw-drawer-account"
              aria-label={pick({ en: 'Account access', ar: 'الدخول إلى الحساب' })}
            >
              <p className="gw-spec">{pick({ en: 'Account', ar: 'الحساب' })}</p>
              <Link to="/account?mode=signup" onClick={close} className="gw-drawer-sublink">
                {pick({ en: 'Join Us', ar: 'انضم إلينا' })}
              </Link>
              <Link to="/account" onClick={close} className="gw-drawer-sublink">
                {pick({ en: 'Sign In', ar: 'تسجيل الدخول' })}
              </Link>
            </div>
          )}
        </div>

        {/* Instruments as a drawn grid, not a toolbar. */}
        <div className="gw-drawer-instruments">
          <NavLink to="/account" onClick={close}>
            <Icon name="user" />
            <span>{pick({ en: 'Account', ar: 'الحساب' })}</span>
          </NavLink>
          <button
            onClick={() => {
              close();
              openDrawer();
            }}
          >
            <Icon name="bag" />
            <span>{pick({ en: 'Bag', ar: 'الحقيبة' })}</span>
            {count > 0 && <b className="gw-tally">{count}</b>}
          </button>
          <NavLink to="/order-tracking" onClick={close}>
            <Icon name="orders" />
            <span>{pick({ en: 'Orders', ar: 'الطلبات' })}</span>
          </NavLink>
          <NavLink to="/help" onClick={close}>
            <Icon name="help" />
            <span>{pick({ en: 'Help', ar: 'المساعدة' })}</span>
          </NavLink>
        </div>

        <div className="gw-drawer-foot">
          <CurrencySelector />
          <button className="gw-drawer-lang" onClick={toggleLang}>
            {lang === 'en' ? 'العربية' : 'English'}
          </button>
        </div>
      </nav>

      {searchOpen && (
        <Suspense fallback={null}>
          <SearchOverlay open onClose={() => setSearchOpen(false)} triggerRef={searchButton} />
        </Suspense>
      )}
    </>
  );
}

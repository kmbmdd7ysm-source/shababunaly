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

const SearchOverlay = lazy(() => import('./SearchOverlay'));

export default function Header() {
  const { t, pick, lang, setLang } = useLanguage();
  const { count, openDrawer } = useCart();
  const compare = useCompare();
  const wishlist = useWishlist();
  const auth = useAuth();
  const { countryCode } = useCommerce();
  const isLibya = countryCode === 'LY';
  const featuredShopLinks = megaMenu.featured.filter((item) => isLibya || item.key !== 'readyToShip');
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
      menuButton.current?.focus();
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
  return (
    <>
      <AnnouncementBar />
      <header className={`site-header${scrolled ? ' scrolled' : ''}`}>
        <div className="container header-inner">
          <Link to="/" className="brand" aria-label={SITE.name}>
            <img src={headerWordmark} alt="" width="460" height="130" className="brand-logo brand-logo--header brand-wordmark--header" />
          </Link>
          <nav className="desktop-nav" aria-label={t.a11y.mainNav}>
            {mainNav.map((item) =>
              item.mega ? (
                <div
                  key={item.to}
                  className="nav-mega-wrap"
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
                    className="nav-link"
                    aria-haspopup="true"
                    aria-expanded={megaOpen}
                  >
                    {navLabel(item)}
                  </NavLink>
                </div>
              ) : (
                <NavLink key={item.to} to={item.to} end={item.to === '/'} className="nav-link">
                  {navLabel(item)}
                </NavLink>
              ),
            )}
          </nav>
          <div className="header-actions">
            <button
              className="icon-btn"
              ref={searchButton}
              onClick={() => {
                setMobileOpen(false);
                setSearchOpen(true);
              }}
              aria-label={t.a11y.openSearch}
            >
              <Icon name="search" />
            </button>
            <div className="desktop-utilities">
              <CurrencySelector compact />
              <button className="lang-text-btn" onClick={toggleLang}>
                {lang === 'en' ? 'العربية' : 'English'}
              </button>
              <Link
                className="icon-btn"
                to="/favorites"
                aria-label={pick({
                  en: `Favorites, ${wishlist.ids.length} items`,
                  ar: `المفضلة، ${wishlist.ids.length}`,
                })}
              >
                <Icon name="heart" />
              </Link>
              <Link
                className="icon-btn"
                to="/compare"
                aria-label={pick({ en: 'Compare products', ar: 'مقارنة المنتجات' })}
              >
                <Icon name="compare" />
                {compare.count > 0 && <span className="cart-count">{compare.count}</span>}
              </Link>
              <Link
                className="icon-btn"
                to="/account"
                aria-label={pick({ en: 'Account', ar: 'الحساب' })}
              >
                <Icon name="user" />
              </Link>
            </div>
            <Link
              className="icon-btn mobile-account-action"
              to="/account"
              aria-label={pick({ en: 'Account', ar: 'الحساب' })}
              onClick={() => trackEvent('account_header_click')}
            >
              <Icon name="user" />
            </Link>
            <button
              className="icon-btn cart-btn"
              onClick={() => {
                trackEvent('bag_header_click');
                openDrawer();
              }}
              aria-label={`${t.a11y.openCart}${count ? `, ${count}` : ''}`}
            >
              <Icon name="bag" />
              {count > 0 && <span className="cart-count">{count}</span>}
            </button>
            <button
              ref={menuButton}
              className="icon-btn mobile-more-action"
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
        <div className={`mega-menu${megaOpen ? ' open' : ''}`} hidden={!megaOpen}>
          <div className="container mega-inner">
            <div className="mega-col mega-featured">
              {featuredShopLinks.map((l) => (
                <Link key={l.to} to={l.to}>
                  {t.nav[l.key]}
                </Link>
              ))}
            </div>
            {megaMenu.columns.map((col) => (
              <div className="mega-col" key={pick(col.title)}>
                <h3>{pick(col.title)}</h3>
                {col.links.map((l) => (
                  <Link key={l.to} to={l.to}>
                    {pick(l.label)}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
      </header>
      <div
        className={`mobile-overlay${mobileOpen ? ' open' : ''}`}
        onClick={close}
        aria-hidden="true"
      />
      <nav
        ref={menuPanel}
        id="mobile-menu"
        className={`mobile-menu${mobileOpen ? ' open' : ''}`}
        aria-label={t.a11y.mobileNav}
        aria-hidden={!mobileOpen}
      >
        <div className="mobile-menu-head">
          <Link to="/" className="brand" onClick={close} aria-label={SITE.name}>
            <img src={headerWordmark} alt="" width="460" height="130" className="brand-logo brand-logo--header brand-wordmark--header" />
          </Link>
          <button className="icon-btn" onClick={close} aria-label={t.a11y.closeMenu}>
            <Icon name="close" />
          </button>
        </div>
        <div className="mobile-menu-body">
          {mainNav.map((item) =>
            item.mega ? (
              <div key={item.to} className="mobile-accordion">
                <button
                  className="mobile-accordion-btn"
                  aria-expanded={mobileShopOpen}
                  onClick={() => setMobileShopOpen((v) => !v)}
                >
                  <span>{navLabel(item)}</span>
                  <Icon name="chevron" className={mobileShopOpen ? 'rotated' : ''} />
                </button>
                {mobileShopOpen && (
                  <div className="mobile-accordion-panel">
                    {featuredShopLinks.map((l) => (
                      <NavLink key={l.to} to={l.to} onClick={close} className="mobile-sublink">
                        {t.nav[l.key]}
                      </NavLink>
                    ))}
                    {megaMenu.columns
                      .flatMap((col) => col.links)
                      .map((l) => (
                        <NavLink key={l.to} to={l.to} onClick={close} className="mobile-sublink">
                          {pick(l.label)}
                        </NavLink>
                      ))}
                  </div>
                )}
              </div>
            ) : (
              <NavLink key={item.to} to={item.to} onClick={close} className="mobile-link">
                {navLabel(item)}
              </NavLink>
            ),
          )}
          <NavLink to="/favorites" onClick={close} className="mobile-link">
            {pick({
              en: `Favorites (${wishlist.ids.length})`,
              ar: `المفضلة (${wishlist.ids.length})`,
            })}
          </NavLink>
          <NavLink to="/compare" onClick={close} className="mobile-link">
            {pick({ en: `Compare (${compare.count})`, ar: `المقارنة (${compare.count})` })}
          </NavLink>
          <div className="mobile-menu-divider" aria-hidden="true" />
          {auth.user ? (
            <div className="mobile-account-signed-in mobile-menu-integrated-account">
              <span className="mobile-account-identity">
                {auth.user.user_metadata?.display_name || auth.user.email}
              </span>
              <Link to="/account" onClick={close}>
                {pick({ en: 'View Account', ar: 'عرض الحساب' })}
              </Link>
              <button
                type="button"
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
              className="mobile-auth-links mobile-menu-integrated-account"
              aria-label={pick({ en: 'Account access', ar: 'الدخول إلى الحساب' })}
            >
              <Link to="/account?mode=signup" onClick={close}>
                {pick({ en: 'Join Us', ar: 'انضم إلينا' })}
              </Link>
              <Link to="/account" onClick={close}>
                {pick({ en: 'Sign In', ar: 'تسجيل الدخول' })}
              </Link>
            </div>
          )}
        </div>
        <div className="mobile-quick-actions">
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
            {count > 0 && <b>{count}</b>}
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
        <div className="mobile-menu-foot">
          <CurrencySelector />
          <button className="btn-secondary block" onClick={toggleLang}>
            {lang === 'en' ? 'العربية' : 'English'}
          </button>
        </div>
      </nav>
      {searchOpen && (
        <Suspense fallback={null}>
          <SearchOverlay
            open
            onClose={() => setSearchOpen(false)}
            triggerRef={searchButton}
          />
        </Suspense>
      )}
    </>
  );
}

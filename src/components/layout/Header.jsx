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
import '../../styles/rail.css';

const SearchOverlay = lazy(() => import('./SearchOverlay'));

/*
 * THE RAIL — a different frame, not a restyled header.
 *
 * Every previous version of this was the same archetype every commerce site
 * uses: a horizontal bar across the top, mark on one side, links in the middle,
 * icons on the other. Changing its type and rules did not change what it *is*.
 *
 * This replaces the archetype:
 *
 *   DESKTOP  a persistent VERTICAL rail on the inline-start edge. The wordmark
 *            reads bottom-to-top along it, navigation is a vertical numbered
 *            column, and the instruments stack at the foot. The rail expands on
 *            hover or focus to reveal labels. Content gets the entire viewport
 *            height beside it — which is what makes full-bleed cinematic
 *            chapters possible at all.
 *
 *   MOBILE   no top bar. A BOTTOM COMMAND BAR within thumb reach carries the
 *            five things a phone user actually touches, and the index opens as
 *            a full-screen chapter.
 *
 *   ANNOUNCEMENT  no longer a strip pushing the page down. It docks into the
 *            rail on desktop and above the command bar on mobile.
 *
 * Behaviour is carried over exactly: mega hover intent and its timer, the lazy
 * search overlay, cart drawer, all three analytics events, route-change close,
 * scroll lock, focus trap, Escape, and focus return to the trigger.
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
  const [indexOpen, setIndexOpen] = useState(false);
  const [mobileShopOpen, setMobileShopOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchButton = useRef(null);
  const menuButton = useRef(null),
    menuPanel = useRef(null),
    megaTimer = useRef(null);

  useEffect(() => {
    setIndexOpen(false);
    setMegaOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!indexOpen) return undefined;
    const unlock = lockDocumentScroll();
    const focusable = () => [
      ...menuPanel.current.querySelectorAll('a[href],button:not([disabled]),select'),
    ];
    focusable()[0]?.focus();
    const key = (e) => {
      if (e.key === 'Escape') {
        setIndexOpen(false);
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
      const trigger = menuButton.current;
      requestAnimationFrame(() => trigger?.focus());
    };
  }, [indexOpen]);

  const toggleLang = () => {
    const next = lang === 'en' ? 'ar' : 'en';
    setLang(next);
    trackEvent('language_change', { language: next });
  };
  const navLabel = (item) => t.nav[item.key] || pick(item.label || { en: item.key, ar: item.key });
  const close = () => setIndexOpen(false);
  const idx = (n) => String(n + 1).padStart(2, '0');

  return (
    <>
      {/* ── DESKTOP: the vertical rail ─────────────────────────────────── */}
      <div className="gw-rail" data-mega={megaOpen ? 'open' : 'closed'}>
        <Link to="/" className="gw-rail-mark" aria-label={SITE.name}>
          <span className="gw-rail-mark-text" aria-hidden="true">
            SHABABUNA
          </span>
        </Link>

        <nav className="gw-rail-nav" aria-label={t.a11y.mainNav}>
          {mainNav.map((item, position) =>
            item.mega ? (
              <div
                key={item.to}
                className="gw-rail-entry"
                onMouseEnter={() => {
                  clearTimeout(megaTimer.current);
                  setMegaOpen(true);
                }}
                onMouseLeave={() => (megaTimer.current = setTimeout(() => setMegaOpen(false), 140))}
              >
                <NavLink
                  to={item.to}
                  className="gw-rail-link"
                  aria-haspopup="true"
                  aria-expanded={megaOpen}
                >
                  <span className="gw-rail-index" aria-hidden="true">
                    {idx(position)}
                  </span>
                  <span className="gw-rail-label">{navLabel(item)}</span>
                </NavLink>
              </div>
            ) : (
              <div key={item.to} className="gw-rail-entry">
                <NavLink to={item.to} end={item.to === '/'} className="gw-rail-link">
                  <span className="gw-rail-index" aria-hidden="true">
                    {idx(position)}
                  </span>
                  <span className="gw-rail-label">{navLabel(item)}</span>
                </NavLink>
              </div>
            ),
          )}
        </nav>

        <div className="gw-rail-instruments">
          <button
            className="gw-rail-tool"
            ref={searchButton}
            onClick={() => setSearchOpen(true)}
            aria-label={t.a11y.openSearch}
          >
            <Icon name="search" />
            <span className="gw-rail-label">{t.common.search}</span>
          </button>
          <Link
            className="gw-rail-tool"
            to="/favorites"
            aria-label={pick({
              en: `Favorites, ${wishlist.ids.length} items`,
              ar: `المفضلة، ${wishlist.ids.length}`,
            })}
          >
            <Icon name="heart" />
            <span className="gw-rail-label">{pick({ en: 'Favorites', ar: 'المفضلة' })}</span>
          </Link>
          <Link
            className="gw-rail-tool"
            to="/compare"
            aria-label={pick({ en: 'Compare products', ar: 'مقارنة المنتجات' })}
          >
            <Icon name="compare" />
            <span className="gw-rail-label">{pick({ en: 'Compare', ar: 'المقارنة' })}</span>
            {compare.count > 0 && <b className="gw-rail-tally">{compare.count}</b>}
          </Link>
          <Link
            className="gw-rail-tool"
            to="/account"
            aria-label={pick({ en: 'Account', ar: 'الحساب' })}
          >
            <Icon name="user" />
            <span className="gw-rail-label">{pick({ en: 'Account', ar: 'الحساب' })}</span>
          </Link>
          <button
            className="gw-rail-tool"
            onClick={() => {
              trackEvent('bag_header_click');
              openDrawer();
            }}
            aria-label={`${t.a11y.openCart}${count ? `, ${count}` : ''}`}
          >
            <Icon name="bag" />
            <span className="gw-rail-label">{pick({ en: 'Bag', ar: 'الحقيبة' })}</span>
            {count > 0 && <b className="gw-rail-tally">{count}</b>}
          </button>

          <div className="gw-rail-locale">
            <button className="gw-rail-lang" onClick={toggleLang}>
              {lang === 'en' ? 'ع' : 'EN'}
            </button>
            <CurrencySelector compact />
          </div>
        </div>

        {/* The announcement docks into the rail instead of pushing the page down. */}
        <div className="gw-rail-notice">
          <AnnouncementBar />
        </div>
      </div>

      {/* The mega plate opens as a full-height panel beside the rail. */}
      <div className="gw-megapanel" hidden={!megaOpen}>
        <div className="gw-megapanel-inner">
          <div className="gw-megapanel-col">
            <p className="gw-spec">{pick({ en: 'Departments', ar: 'الأقسام' })}</p>
            {featuredShopLinks.map((l) => (
              <Link key={l.to} to={l.to} className="gw-megapanel-link gw-megapanel-link--lead">
                {t.nav[l.key]}
              </Link>
            ))}
          </div>
          {megaMenu.columns.map((col) => (
            <div className="gw-megapanel-col" key={pick(col.title)}>
              <p className="gw-spec">{pick(col.title)}</p>
              {col.links.map((l) => (
                <Link key={l.to} to={l.to} className="gw-megapanel-link">
                  {pick(l.label)}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── MOBILE: bottom command bar, within thumb reach ─────────────── */}
      <div className="gw-command-bar">
        <Link to="/" className="gw-command-key" aria-label={SITE.name}>
          <Icon name="home" />
          <span>{t.nav.home}</span>
        </Link>
        <button
          className="gw-command-key"
          onClick={() => setSearchOpen(true)}
          aria-label={t.a11y.openSearch}
        >
          <Icon name="search" />
          <span>{t.common.search}</span>
        </button>
        <button
          ref={menuButton}
          className="gw-command-key gw-command-key--primary"
          onClick={() => {
            setSearchOpen(false);
            setIndexOpen(true);
          }}
          aria-expanded={indexOpen}
          aria-controls="mobile-menu"
          aria-label={t.a11y.openMenu}
        >
          <Icon name="menu" />
          <span>{pick({ en: 'Index', ar: 'الفهرس' })}</span>
        </button>
        <button
          className="gw-command-key"
          onClick={() => {
            trackEvent('bag_header_click');
            openDrawer();
          }}
          aria-label={`${t.a11y.openCart}${count ? `, ${count}` : ''}`}
        >
          <Icon name="bag" />
          <span>{pick({ en: 'Bag', ar: 'الحقيبة' })}</span>
          {count > 0 && <b className="gw-rail-tally">{count}</b>}
        </button>
        <Link
          className="gw-command-key"
          to="/account"
          aria-label={pick({ en: 'Account', ar: 'الحساب' })}
          onClick={() => trackEvent('account_header_click')}
        >
          <Icon name="user" />
          <span>{pick({ en: 'Account', ar: 'الحساب' })}</span>
        </Link>
      </div>

      <div
        className={`gw-scrim${indexOpen ? ' is-open' : ''}`}
        onClick={close}
        aria-hidden="true"
      />

      {/* The index: a full-screen chapter, not a side drawer. */}
      <nav
        ref={menuPanel}
        id="mobile-menu"
        className={`gw-index${indexOpen ? ' is-open' : ''}`}
        aria-label={t.a11y.mobileNav}
        aria-hidden={!indexOpen}
      >
        <div className="gw-index-head">
          <p className="gw-spec">{pick({ en: 'Index', ar: 'الفهرس' })}</p>
          <button className="gw-index-close" onClick={close} aria-label={t.a11y.closeMenu}>
            <Icon name="close" />
          </button>
        </div>

        <div className="gw-index-body">
          {mainNav.map((item, position) =>
            item.mega ? (
              <div key={item.to}>
                <button
                  className="gw-index-link gw-index-link--toggle"
                  aria-expanded={mobileShopOpen}
                  onClick={() => setMobileShopOpen((v) => !v)}
                >
                  <span className="gw-index-num" aria-hidden="true">
                    {idx(position)}
                  </span>
                  <span className="gw-index-label">{navLabel(item)}</span>
                  <Icon name="chevron" className={mobileShopOpen ? 'rotated' : ''} />
                </button>
                {mobileShopOpen && (
                  <div className="gw-index-sub">
                    {featuredShopLinks.map((l) => (
                      <NavLink key={l.to} to={l.to} onClick={close} className="gw-index-sublink">
                        {t.nav[l.key]}
                      </NavLink>
                    ))}
                    {megaMenu.columns
                      .flatMap((col) => col.links)
                      .map((l) => (
                        <NavLink key={l.to} to={l.to} onClick={close} className="gw-index-sublink">
                          {pick(l.label)}
                        </NavLink>
                      ))}
                  </div>
                )}
              </div>
            ) : (
              <NavLink key={item.to} to={item.to} onClick={close} className="gw-index-link">
                <span className="gw-index-num" aria-hidden="true">
                  {idx(position)}
                </span>
                <span className="gw-index-label">{navLabel(item)}</span>
              </NavLink>
            ),
          )}

          <div className="gw-index-minor">
            <NavLink to="/favorites" onClick={close}>
              {pick({
                en: `Favorites (${wishlist.ids.length})`,
                ar: `المفضلة (${wishlist.ids.length})`,
              })}
            </NavLink>
            <NavLink to="/compare" onClick={close}>
              {pick({ en: `Compare (${compare.count})`, ar: `المقارنة (${compare.count})` })}
            </NavLink>
            <NavLink to="/order-tracking" onClick={close}>
              {pick({ en: 'Track order', ar: 'تتبع الطلب' })}
            </NavLink>
            <NavLink to="/help" onClick={close}>
              {pick({ en: 'Help', ar: 'المساعدة' })}
            </NavLink>
          </div>

          {auth.user ? (
            <div className="gw-index-account">
              <p className="gw-spec">{pick({ en: 'Signed in', ar: 'مسجّل الدخول' })}</p>
              <span>{auth.user.user_metadata?.display_name || auth.user.email}</span>
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
            <div className="gw-index-account">
              <p className="gw-spec">{pick({ en: 'Account', ar: 'الحساب' })}</p>
              <Link to="/account?mode=signup" onClick={close}>
                {pick({ en: 'Join Us', ar: 'انضم إلينا' })}
              </Link>
              <Link to="/account" onClick={close}>
                {pick({ en: 'Sign In', ar: 'تسجيل الدخول' })}
              </Link>
            </div>
          )}
        </div>

        <div className="gw-index-foot">
          <CurrencySelector />
          <button className="gw-index-lang" onClick={toggleLang}>
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

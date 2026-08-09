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
import CurrencySelector from '../common/CurrencySelector';
import Icon from '../icons/Icon';
import '../../styles/shell.nav.css';

const SearchOverlay = lazy(() => import('./SearchOverlay'));

/*
 * THE SHELL — a floating header over a cinematic navigation overlay.
 *
 * The previous shell was a permanent 76px vertical rail carrying a rotated
 * wordmark and a stack of icons. It was rejected, correctly: the wordmark was
 * cramped into a column too narrow to read, the icon stack collided with its
 * own labels, and a fixed rail on the inline-start edge dominated every page it
 * framed. On mobile the bottom command bar had no brand on it at all and its
 * labels collided with anything pinned to the lower edge.
 *
 * This replaces the archetype rather than resizing it:
 *
 *   DESKTOP  a FLOATING HEADER that begins transparent over a cinematic
 *            opening and condenses into a solid bar once you scroll past it.
 *            The wordmark sits at readable size. Primary destinations sit
 *            inline. Utilities are a compact cluster. Nothing is permanently
 *            occupying an edge of the viewport, so full-bleed compositions
 *            stay full-bleed.
 *
 *   OVERLAY  the full catalogue opens as a CINEMATIC FULL-SCREEN OVERLAY —
 *            departments at display scale, the whole shop tree beside them, and
 *            the account state at the foot. Navigation becomes a moment rather
 *            than a dropdown.
 *
 *   MOBILE   designed on its own terms, not compressed from desktop. A slim
 *            floating bar carries the brand, search, bag and the menu trigger;
 *            everything else lives in the overlay at thumb-reachable size.
 *
 * Behaviour carried over exactly: the lazy search overlay, cart drawer, all
 * three analytics events, route-change close, scroll lock, focus trap, Escape,
 * and the rAF focus restore to the trigger.
 */
export default function MainHeader() {
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

  const [navOpen, setNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [condensed, setCondensed] = useState(true);

  const searchButton = useRef(null);
  const menuButton = useRef(null);
  const navPanel = useRef(null);

  useEffect(() => setNavOpen(false), [location.pathname]);

  /*
   * The header is transparent only where a route has declared a full-bleed dark
   * opening (see hooks/useCinematicOpening). Its ink is light, so over a light
   * page a transparent header would be invisible — solid is the safe default
   * and the exception has to be earned. rAF-throttled so scrolling stays cheap.
   */
  useEffect(() => {
    let frame = 0;
    const evaluate = () => {
      const cinematic = document.documentElement.dataset.cinematicOpen === 'yes';
      setCondensed(!cinematic || window.scrollY > 24);
    };
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        evaluate();
      });
    };
    // The route paints after this effect, so re-read on the next frame too.
    evaluate();
    const settle = requestAnimationFrame(evaluate);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(settle);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [location.pathname]);

  useEffect(() => {
    if (!navOpen) return undefined;
    const unlock = lockDocumentScroll();
    const focusable = () => [
      ...navPanel.current.querySelectorAll('a[href],button:not([disabled]),select'),
    ];
    focusable()[0]?.focus();
    const key = (event) => {
      if (event.key === 'Escape') {
        setNavOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', key);
    const trigger = menuButton.current;
    return () => {
      document.removeEventListener('keydown', key);
      unlock();
      // The panel is still visible on this tick; focus lands nowhere unless we
      // wait for it to be hidden.
      requestAnimationFrame(() => trigger?.focus());
    };
  }, [navOpen]);

  const toggleLang = () => {
    const next = lang === 'en' ? 'ar' : 'en';
    setLang(next);
    trackEvent('language_change', { language: next });
  };
  const navLabel = (item) => t.nav[item.key] || pick(item.label || { en: item.key, ar: item.key });
  const close = () => setNavOpen(false);

  const wordmark = pick({
    en: '/brand/shababuna-wordmark-white.png',
    ar: '/brand/shababuna-wordmark-ar-white.png',
  });
  const wordmarkDark = pick({
    en: '/brand/shababuna-wordmark-black.png',
    ar: '/brand/shababuna-wordmark-ar-black.png',
  });

  return (
    <>
      <header className="gw-head" data-condensed={condensed ? 'yes' : 'no'}>
        <div className="gw-head-inner">
          <Link to="/" className="gw-head-brand" aria-label={SITE.name}>
            {/* Two files rather than a CSS filter: the wordmark is a raster, and
                  inverting it produces grey mush against both grounds. */}
            <img className="gw-head-brand-light" src={wordmark} alt="" width="168" height="42" />
            <img className="gw-head-brand-dark" src={wordmarkDark} alt="" width="168" height="42" />
          </Link>

          <nav className="gw-head-nav" aria-label={t.a11y.mainNav}>
            {mainNav
              .filter((item) => item.key !== 'home')
              .map((item) => (
                <NavLink key={item.to} to={item.to} className="gw-head-link">
                  {navLabel(item)}
                </NavLink>
              ))}
          </nav>

          <div className="gw-head-tools">
            <button
              ref={searchButton}
              className="gw-tool"
              onClick={() => setSearchOpen(true)}
              aria-label={t.a11y.openSearch}
            >
              <Icon name="search" />
            </button>
            <Link
              className="gw-tool gw-tool--wide"
              to="/favorites"
              aria-label={pick({
                en: `Favorites, ${wishlist.ids.length} items`,
                ar: `المفضلة، ${wishlist.ids.length}`,
              })}
            >
              <Icon name="heart" />
            </Link>
            <Link
              className="gw-tool gw-tool--wide"
              to="/compare"
              aria-label={pick({ en: 'Compare products', ar: 'مقارنة المنتجات' })}
            >
              <Icon name="compare" />
              {compare.count > 0 && <b className="gw-tally">{compare.count}</b>}
            </Link>
            <Link
              className="gw-tool gw-tool--wide"
              to="/account"
              aria-label={pick({ en: 'Account', ar: 'الحساب' })}
              onClick={() => trackEvent('account_header_click')}
            >
              <Icon name="user" />
            </Link>
            <button
              className="gw-tool"
              onClick={() => {
                trackEvent('bag_header_click');
                openDrawer();
              }}
              aria-label={`${t.a11y.openCart}${count ? `, ${count}` : ''}`}
            >
              <Icon name="bag" />
              {count > 0 && <b className="gw-tally">{count}</b>}
            </button>

            <button
              ref={menuButton}
              className="gw-menu-key"
              onClick={() => {
                setSearchOpen(false);
                setNavOpen(true);
              }}
              aria-expanded={navOpen}
              aria-controls="gw-nav-overlay"
              aria-label={t.a11y.openMenu}
            >
              <span className="gw-menu-key-bars" aria-hidden="true">
                <i />
                <i />
              </span>
              <span className="gw-menu-key-word">{pick({ en: 'Menu', ar: 'القائمة' })}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── THE OVERLAY ────────────────────────────────────────────────── */}
      <div
        ref={navPanel}
        id="gw-nav-overlay"
        className={`gw-nav${navOpen ? ' is-open' : ''}`}
        aria-hidden={!navOpen}
      >
        <div className="gw-nav-bar">
          <Link to="/" className="gw-nav-brand" onClick={close} aria-label={SITE.name}>
            <img src={wordmark} alt="" width="168" height="42" />
          </Link>
          <button className="gw-nav-close" onClick={close} aria-label={t.a11y.closeMenu}>
            <Icon name="close" />
            <span>{pick({ en: 'Close', ar: 'إغلاق' })}</span>
          </button>
        </div>

        <nav className="gw-nav-body" aria-label={t.a11y.mobileNav}>
          <div className="gw-nav-primary">
            {mainNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={close}
                className="gw-nav-major"
              >
                <Icon name={item.icon || 'grid'} />
                <span>{navLabel(item)}</span>
              </NavLink>
            ))}
          </div>

          <div className="gw-nav-tree">
            <div className="gw-nav-col">
              <p className="gw-spec">{pick({ en: 'Departments', ar: 'الأقسام' })}</p>
              {featuredShopLinks.map((link) => (
                <Link key={link.to} to={link.to} onClick={close} className="gw-nav-minor">
                  {t.nav[link.key]}
                </Link>
              ))}
            </div>
            {megaMenu.columns.map((column) => (
              <div className="gw-nav-col" key={pick(column.title)}>
                <p className="gw-spec">{pick(column.title)}</p>
                {column.links.map((link) => (
                  <Link key={link.to} to={link.to} onClick={close} className="gw-nav-minor">
                    {pick(link.label)}
                  </Link>
                ))}
              </div>
            ))}
            <div className="gw-nav-col">
              <p className="gw-spec">{pick({ en: 'Your account', ar: 'حسابك' })}</p>
              <Link to="/favorites" onClick={close} className="gw-nav-minor">
                {pick({ en: 'Favorites', ar: 'المفضلة' })} ({wishlist.ids.length})
              </Link>
              <Link to="/compare" onClick={close} className="gw-nav-minor">
                {pick({ en: 'Compare', ar: 'المقارنة' })} ({compare.count})
              </Link>
              <Link to="/order-tracking" onClick={close} className="gw-nav-minor">
                {pick({ en: 'Track order', ar: 'تتبع الطلب' })}
              </Link>
              <Link to="/help" onClick={close} className="gw-nav-minor">
                {pick({ en: 'Help', ar: 'المساعدة' })}
              </Link>
              {auth.user ? (
                <>
                  <Link to="/account" onClick={close} className="gw-nav-minor">
                    {pick({ en: 'View account', ar: 'عرض الحساب' })}
                  </Link>
                  <button
                    type="button"
                    className="gw-nav-minor gw-nav-minor--button"
                    onClick={async () => {
                      await auth.signOut();
                      close();
                    }}
                  >
                    {pick({ en: 'Sign out', ar: 'تسجيل الخروج' })}
                  </button>
                </>
              ) : (
                <>
                  <Link to="/account" onClick={close} className="gw-nav-minor">
                    {pick({ en: 'Sign in', ar: 'تسجيل الدخول' })}
                  </Link>
                  <Link to="/account?mode=signup" onClick={close} className="gw-nav-minor">
                    {pick({ en: 'Create account', ar: 'إنشاء حساب' })}
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>

        <div className="gw-nav-foot">
          <CurrencySelector />
          <button className="gw-nav-lang" onClick={toggleLang}>
            {lang === 'en' ? 'العربية' : 'English'}
          </button>
          <p className="gw-spec gw-nav-place">{pick(SITE.address)}</p>
        </div>
      </div>

      {searchOpen && (
        <Suspense fallback={null}>
          <SearchOverlay open onClose={() => setSearchOpen(false)} triggerRef={searchButton} />
        </Suspense>
      )}
    </>
  );
}

import type { ReactElement } from 'react';
import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { SITE } from '../../config';
import { useLanguage } from '../../context/LanguageContext';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useWishlist } from '../../hooks/useWishlist';
import { useCatalog } from '../../context/CatalogContext';
import { trackEvent } from '../../utils/analytics';
import { lockDocumentScroll } from '../../utils/scrollLock';
import { mainNav, megaMenu } from '../../data/navigation';
import CurrencySelector from '../common/CurrencySelector';
import Icon from '../icons/Icon';
import '../../styles/design/phase2-chrome.css';

const SearchOverlay = lazy(() => import('./SearchOverlay'));

type NavItem = {
  key?: string;
  to?: string;
  label?: { en?: string; ar?: string } | string;
  icon?: string;
  mega?: boolean;
};

export default function MainHeader(): ReactElement {
  const { t, pick, lang, setLang } = useLanguage();
  const a11y = (t.a11y || {}) as Record<string, string>;
  const { count, openDrawer } = useCart();
  const wishlist = useWishlist();
  const auth = useAuth();
  const { readyToShipProducts } = useCatalog();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const hasReadyToShip = readyToShipProducts().length > 0;
  const [shopOpen, setShopOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [localeOpen, setLocaleOpen] = useState(false);
  const [solid, setSolid] = useState(() => {
    if (typeof document === 'undefined') return true;
    return document.documentElement.dataset.cinematicOpen !== 'yes';
  });
  const searchButton = useRef<HTMLButtonElement | null>(null);
  const menuButton = useRef<HTMLButtonElement | null>(null);
  const menuPanel = useRef<HTMLDivElement | null>(null);
  const localePanel = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMenuOpen(false);
    setShopOpen(false);
    setLocaleOpen(false);
  }, [location.pathname]);

  useLayoutEffect(() => {
    let frame = 0;
    const evaluate = () => {
      const cinematic = document.documentElement.dataset.cinematicOpen === 'yes';
      setSolid(!cinematic || window.scrollY > 18);
    };
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        evaluate();
      });
    };
    evaluate();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const unlock = lockDocumentScroll();
    const focusable = () =>
      menuPanel.current
        ? ([...menuPanel.current.querySelectorAll('a[href],button:not([disabled]),select')] as HTMLElement[])
        : [];
    requestAnimationFrame(() => focusable()[0]?.focus());
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusable();
      const first = items[0];
      const last = items.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    const trigger = menuButton.current;
    return () => {
      document.removeEventListener('keydown', onKey);
      unlock();
      requestAnimationFrame(() => trigger?.focus());
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!localeOpen) return undefined;
    const onPointer = (event: MouseEvent | TouchEvent) => {
      if (!localePanel.current?.contains(event.target as Node)) setLocaleOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLocaleOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer, { passive: true });
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [localeOpen]);

  const toggleLang = () => {
    const next = lang === 'en' ? 'ar' : 'en';
    setLang(next);
    trackEvent('language_change', { language: next });
  };
  const label = (item: NavItem) =>
    pick(
      typeof item.label === 'object'
        ? item.label
        : { en: String(item.label || item.key || ''), ar: String(item.label || item.key || '') },
    );
  const wordmarkLight = pick({
    en: '/brand/shababuna-wordmark-white.png',
    ar: '/brand/shababuna-wordmark-ar-white.png',
  });
  const wordmarkDark = pick({
    en: '/brand/shababuna-wordmark-black.png',
    ar: '/brand/shababuna-wordmark-ar-black.png',
  });

  return (
    <>
      <header className="s2-header" data-solid={solid ? 'yes' : 'no'}>
        <div className="s2-header__inner">
          <Link className="s2-header__brand" to="/" aria-label={SITE.name}>
            <img className="s2-header__brand--light" src={wordmarkLight} alt="" width="154" height="40" />
            <img className="s2-header__brand--dark" src={wordmarkDark} alt="" width="154" height="40" />
          </Link>

          <nav className="s2-header__nav" aria-label={a11y.mainNav || 'Main navigation'}>
            {mainNav.map((item) => (
              <div
                className="s2-header__nav-item"
                key={String(item.to)}
                onMouseEnter={() => item.mega && setShopOpen(true)}
                onMouseLeave={() => item.mega && setShopOpen(false)}
                onBlur={(event) => {
                  if (
                    item.mega &&
                    !event.currentTarget.contains(event.relatedTarget as Node | null)
                  ) {
                    setShopOpen(false);
                  }
                }}
                onKeyDown={(event) => {
                  if (item.mega && event.key === 'Escape') {
                    event.preventDefault();
                    setShopOpen(false);
                    (event.currentTarget.querySelector('a[href]') as HTMLElement | null)?.focus();
                  }
                }}
              >
                <NavLink
                  to={String(item.to || '/')}
                  className={({ isActive }) => `s2-header__link${isActive ? ' is-active' : ''}`}
                  onFocus={() => item.mega && setShopOpen(true)}
                >
                  {label(item)}
                </NavLink>
                {item.mega && shopOpen ? (
                  <div className="s2-mega" onMouseEnter={() => setShopOpen(true)} onMouseLeave={() => setShopOpen(false)}>
                    <div className="s2-mega__inner">
                      <div className="s2-mega__feature">
                        <span className="s2-overline">{pick({ en: 'Start here', ar: 'ابدأ من هنا' })}</span>
                        <div className="s2-mega__feature-links">
                          {megaMenu.featured.filter((entry) => entry.to !== '/shop/ready-to-ship' || hasReadyToShip).map((entry) => (
                            <Link key={entry.to} to={entry.to} onClick={() => setShopOpen(false)}>
                              {pick(entry.label)}
                              <Icon name="arrow" size={18} />
                            </Link>
                          ))}
                        </div>
                      </div>
                      {megaMenu.columns.map((column) => (
                        <div className="s2-mega__column" key={pick(column.title)}>
                          <span className="s2-overline">{pick(column.title)}</span>
                          <div className="s2-mega__links">
                            {column.links.map((entry) => (
                              <Link key={entry.to} to={entry.to} onClick={() => setShopOpen(false)}>
                                {pick(entry.label)}
                              </Link>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </nav>

          <div className="s2-header__tools">
            <button
              ref={searchButton}
              className="s2-icon-action"
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label={a11y.openSearch || pick({ en: 'Search', ar: 'بحث' })}
            >
              <Icon name="search" />
            </button>
            <Link
              className="s2-icon-action s2-header__desktop-tool"
              to="/favorites"
              aria-label={pick({ en: `Favorites, ${wishlist.ids.length}`, ar: `المفضلة، ${wishlist.ids.length}` })}
            >
              <Icon name="heart" />
              {wishlist.ids.length > 0 ? <span className="s2-count">{wishlist.ids.length}</span> : null}
            </Link>
            <Link
              className="s2-icon-action s2-header__desktop-tool"
              to="/account"
              aria-label={pick({ en: 'Account', ar: 'الحساب' })}
              onClick={() => trackEvent('account_header_click')}
            >
              <Icon name="user" />
            </Link>
            <div className="s2-locale-control" ref={localePanel}>
              <button
                className="s2-icon-action s2-locale-control__trigger"
                type="button"
                aria-expanded={localeOpen}
                aria-controls="s2-locale-popover"
                aria-label={pick({ en: 'Language and currency', ar: 'اللغة والعملة' })}
                onClick={() => setLocaleOpen((open) => !open)}
              >
                <Icon name="globe" />
              </button>
              {localeOpen ? (
                <div id="s2-locale-popover" className="s2-locale-popover" role="group" aria-label={pick({ en: 'Language and currency', ar: 'اللغة والعملة' })}>
                  <span className="s2-overline">{pick({ en: 'Region settings', ar: 'إعدادات المنطقة' })}</span>
                  <label className="s2-locale-popover__row">
                    <span>{pick({ en: 'Currency', ar: 'العملة' })}</span>
                    <CurrencySelector compact />
                  </label>
                  <button type="button" className="s2-locale-popover__row s2-locale-popover__language" onClick={toggleLang}>
                    <span>{pick({ en: 'Language', ar: 'اللغة' })}</span>
                    <strong>{lang === 'en' ? 'العربية' : 'English'}</strong>
                  </button>
                </div>
              ) : null}
            </div>
            <button
              className="s2-icon-action"
              type="button"
              onClick={() => {
                trackEvent('bag_header_click');
                openDrawer();
              }}
              aria-label={pick({ en: `Bag, ${count} items`, ar: `الحقيبة، ${count}` })}
            >
              <Icon name="bag" />
              {count > 0 ? <span className="s2-count">{count}</span> : null}
            </button>
            <button
              ref={menuButton}
              className="s2-menu-trigger"
              type="button"
              aria-expanded={menuOpen}
              aria-controls="s2-mobile-menu"
              aria-label={a11y.openMenu || pick({ en: 'Open menu', ar: 'فتح القائمة' })}
              onClick={() => setMenuOpen(true)}
            >
              <Icon name="menu" />
              <span>{pick({ en: 'Menu', ar: 'القائمة' })}</span>
            </button>
          </div>
        </div>
      </header>

      <div
        id="s2-mobile-menu"
        ref={menuPanel}
        className={`s2-menu${menuOpen ? ' is-open' : ''}`}
        aria-hidden={!menuOpen}
      >
        <div className="s2-menu__top">
          <Link to="/" className="s2-menu__brand" onClick={() => setMenuOpen(false)} aria-label={SITE.name}>
            <img src={wordmarkDark} alt="" width="154" height="40" />
          </Link>
          <button className="s2-icon-action" type="button" onClick={() => setMenuOpen(false)} aria-label={a11y.closeMenu || pick({ en: 'Close menu', ar: 'إغلاق القائمة' })}>
            <Icon name="close" />
          </button>
        </div>

        <div className="s2-menu__body">
          <nav className="s2-menu__primary" aria-label={a11y.mobileNav || 'Mobile navigation'}>
            {mainNav.map((item) => (
              <NavLink key={String(item.to)} to={String(item.to || '/')} onClick={() => setMenuOpen(false)}>
                <span>{label(item)}</span>
                <Icon name="arrow" size={20} />
              </NavLink>
            ))}
          </nav>

          <div className="s2-menu__grid">
            {megaMenu.columns.map((column) => (
              <section key={pick(column.title)}>
                <span className="s2-overline">{pick(column.title)}</span>
                {column.links.map((entry) => (
                  <Link key={entry.to} to={entry.to} onClick={() => setMenuOpen(false)}>
                    {pick(entry.label)}
                  </Link>
                ))}
              </section>
            ))}
            <section>
              <span className="s2-overline">{pick({ en: 'Your account', ar: 'حسابك' })}</span>
              <Link to="/favorites" onClick={() => setMenuOpen(false)}>{pick({ en: 'Favorites', ar: 'المفضلة' })}</Link>
              <Link to="/order-tracking" onClick={() => setMenuOpen(false)}>{pick({ en: 'Track order', ar: 'تتبع الطلب' })}</Link>
              <Link to="/help" onClick={() => setMenuOpen(false)}>{pick({ en: 'Help', ar: 'المساعدة' })}</Link>
              <Link to="/account" onClick={() => setMenuOpen(false)}>{auth.user ? pick({ en: 'Account', ar: 'الحساب' }) : pick({ en: 'Sign in', ar: 'تسجيل الدخول' })}</Link>
            </section>
          </div>
        </div>

        <div className="s2-menu__foot">
          <CurrencySelector />
          <button type="button" className="s2-menu__language" onClick={toggleLang}>{lang === 'en' ? 'العربية' : 'English'}</button>
        </div>
      </div>

      {searchOpen ? (
        <Suspense fallback={null}>
          <SearchOverlay open onClose={() => setSearchOpen(false)} triggerRef={searchButton} />
        </Suspense>
      ) : null}
    </>
  );
}

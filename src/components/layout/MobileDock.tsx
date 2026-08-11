import type { ReactElement } from 'react';
import { lazy, Suspense, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useCart } from '../../context/CartContext';
import Icon from '../icons/Icon';
import '../../styles/design/phase2-chrome.css';

const SearchOverlay = lazy(() => import('./SearchOverlay'));

export default function MobileDock(): ReactElement {
  const { pick } = useLanguage();
  const { count, openDrawer } = useCart();
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLButtonElement | null>(null);

  return (
    <>
      <nav className="s2-dock" aria-label={pick({ en: 'Quick navigation', ar: 'تنقل سريع' })}>
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'is-active' : '')}>
          <Icon name="home" />
          <span>{pick({ en: 'Home', ar: 'الرئيسية' })}</span>
        </NavLink>
        <NavLink to="/shop" className={({ isActive }) => (isActive ? 'is-active' : '')}>
          <Icon name="shop" />
          <span>{pick({ en: 'Shop', ar: 'تسوق' })}</span>
        </NavLink>
        <NavLink to="/discover" className={({ isActive }) => (isActive ? 'is-active' : '')}>
          <Icon name="compass" />
          <span>{pick({ en: 'Discover', ar: 'اكتشف' })}</span>
        </NavLink>
        <button ref={searchRef} type="button" onClick={() => setSearchOpen(true)}>
          <Icon name="search" />
          <span>{pick({ en: 'Search', ar: 'بحث' })}</span>
        </button>
        <button type="button" onClick={openDrawer}>
          <span className="s2-dock__bag"><Icon name="bag" />{count > 0 ? <b>{count}</b> : null}</span>
          <span>{pick({ en: 'Bag', ar: 'الحقيبة' })}</span>
        </button>
      </nav>
      {searchOpen ? (
        <Suspense fallback={null}>
          <SearchOverlay open onClose={() => setSearchOpen(false)} triggerRef={searchRef} />
        </Suspense>
      ) : null}
    </>
  );
}

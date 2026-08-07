import { describe, expect, test, vi } from 'vitest';

/*
 * Regression tests for menu focus management.
 *
 * The defect: closing the drawer left focus on `<body>`. Hiding the panel blurs
 * whatever inside it still held focus, and the browser resets to the document
 * during the same style recalculation — so a synchronous `focus()` call in the
 * effect cleanup was always overwritten.
 *
 * The fix defers the restore to the next frame. These tests pin the behaviour
 * for every way the drawer can close: Escape, the close button, the scrim, and
 * a navigation link.
 */

let activeLanguage = 'en';

vi.mock('../../src/context/LanguageContext', () => ({
  useLanguage: () => ({
    lang: activeLanguage,
    dir: activeLanguage === 'ar' ? 'rtl' : 'ltr',
    setLang: vi.fn(),
    pick: (value) =>
      value && typeof value === 'object' ? (value[activeLanguage] ?? value.en) : value,
    t: {
      common: { search: 'Search' },
      nav: { home: 'Home', shop: 'Shop' },
      a11y: {
        mainNav: 'Main navigation',
        mobileNav: 'Mobile navigation',
        openSearch: 'Open search',
        openCart: 'Open bag',
        openMenu: 'Open menu',
        closeMenu: 'Close menu',
      },
    },
  }),
}));
vi.mock('../../src/context/CartContext', () => ({
  useCart: () => ({ count: 0, openDrawer: vi.fn() }),
}));
vi.mock('../../src/context/CompareContext', () => ({ useCompare: () => ({ count: 0 }) }));
vi.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({ user: null, signOut: vi.fn() }),
}));
vi.mock('../../src/context/CommerceContext', () => ({
  useCommerce: () => ({ countryCode: 'LY' }),
}));
vi.mock('../../src/hooks/useWishlist', () => ({ useWishlist: () => ({ ids: [] }) }));
vi.mock('../../src/utils/analytics', () => ({ trackEvent: vi.fn() }));
vi.mock('../../src/components/layout/AnnouncementBar', () => ({ default: () => null }));
vi.mock('../../src/components/common/CurrencySelector', () => ({
  default: () => <select aria-label="Currency" />,
}));

import { fireEvent, render, screen } from '@testing-library/react';
import { waitFor } from '@testing-library/dom';
import { MemoryRouter } from 'react-router-dom';
import MainHeader from '../../src/components/layout/MainHeader';

const renderHeader = () =>
  render(
    <MemoryRouter>
      <MainHeader />
    </MemoryRouter>,
  );

const trigger = () => screen.getByRole('button', { name: 'Open menu' });
// The shell moved from a side drawer to a full-screen index opened from the
// bottom command bar. Same behaviour contract, different architecture.
/*
 * The shell moved from a side drawer to a full-screen navigation overlay opened
 * from a floating header. The behaviour contract under test is unchanged —
 * focus moves in, Tab is trapped and wraps, Escape closes, focus returns to the
 * trigger — only the selectors and the trigger's label changed.
 */
const drawer = () => document.querySelector('.gw-nav');

/** jsdom runs rAF, but the restore is one frame out, so waitFor is required. */
const expectFocusReturned = async () => {
  await waitFor(() => expect(document.activeElement).toBe(trigger()));
};

describe('navigation overlay focus management', () => {
  test('opening moves focus into the overlay', async () => {
    activeLanguage = 'en';
    renderHeader();
    fireEvent.click(trigger());
    await waitFor(() => expect(drawer().contains(document.activeElement)).toBe(true));
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
  });

  test('Escape closes and returns focus to the trigger', async () => {
    activeLanguage = 'en';
    renderHeader();
    fireEvent.click(trigger());
    await waitFor(() => expect(drawer().contains(document.activeElement)).toBe(true));

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    await expectFocusReturned();
  });

  test('the close button returns focus to the trigger', async () => {
    activeLanguage = 'en';
    renderHeader();
    fireEvent.click(trigger());
    await waitFor(() => expect(drawer().contains(document.activeElement)).toBe(true));

    fireEvent.click(screen.getByRole('button', { name: 'Close menu' }));

    await expectFocusReturned();
  });

  test('the close control returns focus to the trigger', async () => {
    // The full-screen overlay is opaque, so there is no scrim to click past —
    // the explicit Close control is the only dismissal besides Escape.
    activeLanguage = 'en';
    renderHeader();
    fireEvent.click(trigger());
    await waitFor(() => expect(drawer().contains(document.activeElement)).toBe(true));

    fireEvent.click(screen.getByRole('button', { name: 'Close menu' }));

    await expectFocusReturned();
  });

  test('the focus trap keeps Tab inside the drawer and wraps at both ends', async () => {
    activeLanguage = 'en';
    renderHeader();
    fireEvent.click(trigger());
    await waitFor(() => expect(drawer().contains(document.activeElement)).toBe(true));

    /** @type {HTMLElement[]} */
    const focusables = [...drawer().querySelectorAll('a[href],button:not([disabled]),select')].map(
      (node) => /** @type {HTMLElement} */ (node),
    );
    expect(focusables.length).toBeGreaterThan(4);

    // Forward from the last element wraps to the first.
    focusables[focusables.length - 1].focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(focusables[0]);

    // Backward from the first wraps to the last.
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(focusables[focusables.length - 1]);
  });

  test('the closed drawer is hidden from assistive technology', () => {
    activeLanguage = 'en';
    renderHeader();
    expect(drawer()).toHaveAttribute('aria-hidden', 'true');
    fireEvent.click(trigger());
    expect(drawer()).toHaveAttribute('aria-hidden', 'false');
  });

  test('focus returns correctly in Arabic too', async () => {
    activeLanguage = 'ar';
    renderHeader();
    fireEvent.click(trigger());
    await waitFor(() => expect(drawer().contains(document.activeElement)).toBe(true));

    fireEvent.keyDown(document, { key: 'Escape' });
    await expectFocusReturned();
    activeLanguage = 'en';
  });
});

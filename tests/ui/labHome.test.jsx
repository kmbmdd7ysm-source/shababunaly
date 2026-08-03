import { describe, expect, test, vi } from 'vitest';

let activeLanguage = 'en';
vi.mock('../../src/context/LanguageContext', () => ({
  useLanguage: () => ({
    lang: activeLanguage,
    dir: activeLanguage === 'ar' ? 'rtl' : 'ltr',
    pick: (value) =>
      value && typeof value === 'object' ? (value[activeLanguage] ?? value.en) : value,
    t: { a11y: { skip: 'Skip to content' } },
  }),
}));

import { render, screen } from '@testing-library/react';
import { within } from '@testing-library/dom';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import LabHomePage from '../../src/pages/LabHomePage';
import { shippingConfig } from '../../src/config/shipping';
import { categories } from '../../src/data/categories';
import { CUSTOM_PRODUCT_TYPES } from '../../src/data/customization';

const renderPage = (language) => {
  activeLanguage = language;
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <LabHomePage />
      </MemoryRouter>
    </HelmetProvider>,
  );
};

describe('GROUNDWORK homepage prototype', () => {
  test('renders the storyboard in English with the commercial path intact', () => {
    const { container } = renderPage('en');

    // The prototype is clearly marked and isolated from the live homepage.
    const scope = container.querySelector('.lab-scope');
    expect(scope).toHaveAttribute('data-prototype', 'groundwork');

    // 01 THE LINE — one h1, carrying the locked brand slogan.
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent('BUILT');
    expect(headings[0]).toHaveTextContent('DIFFERENT.');

    // Commercial destinations are unchanged and reachable.
    const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    for (const target of ['/shop', '/customize', '/teams-wholesale']) {
      expect(hrefs).toContain(target);
    }

    // 03 THE PLAN — one plate per real department, Ready-to-Ship excluded
    // because it is a Libya-only virtual category.
    const departments = categories.filter((category) => category.slug !== 'ready-to-ship');
    for (const department of departments) {
      expect(hrefs).toContain(`/shop/${department.slug}`);
      expect(screen.getByText(department.name.en)).toBeVisible();
    }
    expect(hrefs).not.toContain('/shop/ready-to-ship');

    // 04 IN STOCK — every delivery figure is read from config/shipping.js, and
    // every numeric range is bidi-isolated so it cannot reorder inside Arabic.
    const libya = shippingConfig.libya;
    const delivery = screen.getByRole('table', { name: 'Delivery specification' });
    for (const range of [
      `${libya.readyDelivery.minHours}–${libya.readyDelivery.maxHours}`,
      `${libya.standardDelivery.minDays}–${libya.standardDelivery.maxDays}`,
      `${shippingConfig.custom.minDays}–${shippingConfig.custom.maxDays}`,
    ]) {
      expect(within(delivery).getByText(range)).toHaveClass('gw-isolate-ltr');
    }
    expect(within(delivery).getByText('hours', { exact: false })).toBeVisible();
    expect(screen.getByText(`${libya.deliveryFee.amount} LYD`)).toBeVisible();
    expect(screen.getByText(`${libya.freeThreshold.amount} LYD`)).toBeVisible();

    // 05 THE WORKSHOP — minimums come from data/customization.js, not prose.
    const minimum = (key) => CUSTOM_PRODUCT_TYPES.find((type) => type.key === key).minimum;
    const minimums = screen.getByRole('table', { name: 'Minimum order' });
    for (const key of ['game-set', 'basketball', 'hoop-padding']) {
      expect(within(minimums).getByText(String(minimum(key)))).toHaveClass('gw-isolate-ltr');
    }
    expect(within(minimums).getByText('pieces', { exact: false })).toBeVisible();
    expect(within(minimums).getByText(String(CUSTOM_PRODUCT_TYPES.length))).toBeVisible();

    // 06 THE ROSTER — the staged-payment terms are stated exactly as the
    // commerce layer enforces them.
    const terms = screen.getByRole('table', { name: 'Commercial terms' });
    expect(within(terms).getAllByText('50%')).toHaveLength(2);
  });

  test('renders a native Arabic cut of the same page', () => {
    const { container } = renderPage('ar');

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('BUILT');
    // Arabic copy is present, not a Latin fallback.
    expect(screen.getByText('كل ما تحتاجه كرة السلة')).toBeVisible();
    expect(screen.getByText('صمّم كل شيء.')).toBeVisible();
    expect(screen.getByText('تسليم فوري')).toBeVisible();
    expect(screen.getByText('طلب واحد. المؤسسة كاملة.')).toBeVisible();
    expect(screen.getByText('طرابلس، ليبيا')).toBeVisible();

    // Arabic department names come from the real catalogue.
    for (const department of categories.filter((c) => c.slug !== 'ready-to-ship')) {
      expect(screen.getByText(department.name.ar)).toBeVisible();
    }

    // Currency AND every numeric range stay LTR-isolated inside Arabic, so a
    // delivery window can never render as "72–24" and promise something else.
    const fee = screen.getByText(`${shippingConfig.libya.deliveryFee.amount} LYD`);
    expect(fee).toHaveClass('gw-isolate-ltr');
    const libya = shippingConfig.libya;
    for (const range of [
      `${libya.readyDelivery.minHours}–${libya.readyDelivery.maxHours}`,
      `${libya.standardDelivery.minDays}–${libya.standardDelivery.maxDays}`,
    ]) {
      expect(screen.getAllByText(range)[0]).toHaveClass('gw-isolate-ltr');
    }
    expect(screen.getByText('ساعة', { exact: false })).toBeVisible();

    // Destinations are identical across locales — Arabic is a cut, not a fork.
    const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/customize');
    expect(hrefs).toContain('/teams-wholesale');
  });

  test('is accessible by structure: landmarks, decorative art hidden, no orphan controls', () => {
    const { container } = renderPage('en');

    // The court drawing is decoration and must never reach assistive tech.
    const court = container.querySelector('.gw-court');
    expect(court).toHaveAttribute('aria-hidden', 'true');
    expect(court.querySelector('svg')).toBeTruthy();

    // Every section is a labelled region so the page is navigable by landmark.
    const sections = [...container.querySelectorAll('section')];
    expect(sections.length).toBeGreaterThanOrEqual(6);
    for (const section of sections) {
      expect(section.hasAttribute('aria-label') || section.hasAttribute('aria-labelledby')).toBe(
        true,
      );
    }

    // Decorative images carry an empty alt; meaningful ones carry real text.
    const departmentArt = [...container.querySelectorAll('.gw-department img')];
    expect(departmentArt.length).toBeGreaterThan(0);
    for (const image of departmentArt) {
      expect(image).toHaveAttribute('alt', '');
      expect(image).toHaveAttribute('width');
      expect(image).toHaveAttribute('height');
    }
    expect(container.querySelector('.gw-workshop-art')).toHaveAttribute(
      'alt',
      'Shababuna custom jersey drawing',
    );

    // The hover-revealed rule is decorative only; nothing is hover-gated.
    for (const rule of container.querySelectorAll('.gw-rule-extend')) {
      expect(rule).toHaveAttribute('aria-hidden', 'true');
    }
  });
});

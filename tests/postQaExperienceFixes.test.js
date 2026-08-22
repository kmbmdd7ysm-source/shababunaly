import { readFileSync } from 'node:fs';
import { describe, expect, it } from './test-api.js';
import { products } from '../src/data/products.ts';
import { getCompareAction } from '../src/utils/productOptions.ts';

const read = (path) => readFileSync(path, 'utf8');

describe('post-QA experience fixes', () => {
  it('uses the shared portal country picker across public country forms', () => {
    const picker = read('src/components/common/CountrySelect.tsx');
    expect(picker).toContain("createPortal(");
    expect(picker).toContain('country-picker-sheet');
    expect(picker).toContain('Search country or code');

    for (const file of [
      'src/pages/ContactPage.tsx',
      'src/pages/CustomizePage.tsx',
      'src/pages/TeamsWholesalePage.tsx',
      'src/pages/SpecialRequestPage.tsx',
      'src/pages/checkout/CheckoutAddressStage.tsx',
      'src/components/account/AddressesSection.tsx',
    ]) {
      expect(read(file)).toContain('CountrySelect');
    }
  });

  it('keeps gift-card personalisation controls inside the shared icon family', () => {
    const page = read('src/pages/GiftCardsPage.tsx');
    const icons = read('src/components/icons/Icon.tsx');
    expect(page).toContain('<Icon name="user"');
    expect(page).toContain('<Icon name="mail"');
    expect(page).toContain('<Icon name="calendar"');
    expect(page).toContain('<Icon name="message"');
    expect(icons).toContain('mail: (');
    expect(icons).toContain('message: (');
    expect(icons).toContain('upload: (');
  });

  it('replaces the public custom 3D placeholder with editorial media', () => {
    const showcase = read('src/components/custom/CustomProductShowcase.tsx');
    expect(showcase).toContain('cx-media-stage');
    expect(showcase).toContain('EDITORIAL as E');
    expect(showcase.includes('Interactive 3D preview')).toBe(false);
    expect(showcase.includes('Concept preview')).toBe(false);
  });

  it('submits customization and contact data as one complete quote request', () => {
    const page = read('src/pages/CustomizePage.tsx');
    expect(page).toContain('className="cx-custom-flow"');
    expect(page).toContain('bodyColorName');
    expect(page).toContain('trimColorName');
    expect(page).toContain('sizeBreakdown');
    expect(page).toContain('logoAssetId');
    expect(page).toContain('requirements:');
    expect(page).toContain('submitPublicQuote');
    expect((page.match(/<form\b/g) || []).length).toBe(1);
  });

  it('turns the old favorites gap into a responsive editorial slot', () => {
    const page = read('src/pages/FavoritesPage.tsx');
    const css = read('src/styles/consumer-commerce.css');
    expect(page).toContain('cc-favorites-editorial');
    expect(page).toContain('E.curryHeroBall');
    expect(css).toContain('.cc-favorites-page{min-height:0!important');
    expect(css).toContain('.cc-favorites-editorial');
  });

  it('never falls back to unavailable for reservable Kobe variants', () => {
    const kobe = products.filter((product) => String(product.collection || '') === 'kobe');
    expect(kobe).toHaveLength(50);
    for (const product of kobe) {
      expect(product.reservationAvailable).toBe(true);
      const action = getCompareAction(product);
      expect(action.type === 'unavailable').toBe(false);
    }
  });
});

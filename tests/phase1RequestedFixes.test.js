import { readFileSync } from 'node:fs';
import { describe, expect, it } from './test-api.js';
import { products } from '../src/data/products.ts';

const read = (path) => readFileSync(path, 'utf8');

describe('requested Phase 1 storefront fixes', () => {
  it('keeps mobile shop subcategories as a non-shrinking horizontal rail', () => {
    const css = read('src/styles/design/phase2-shop.css');
    expect(css).toContain('@media (max-width: 800px)');
    expect(css).toContain('.s2-subcategory-row button');
    expect(css).toContain('flex: 0 0 auto');
    expect(css).toContain('min-inline-size: max-content');
  });

  it('makes language and currency discoverable from the main header', () => {
    const header = read('src/components/layout/MainHeader.tsx');
    expect(header).toContain('s2-locale-control');
    expect(header).toContain('<CurrencySelector compact />');
    expect(header).toContain("<Icon name=\"globe\"");
  });

  it('routes the empty bag primary action to the full shop', () => {
    const drawer = read('src/components/layout/CartDrawer.tsx');
    expect(drawer).toContain("navigate('/shop')");
    expect(drawer).toContain('cart-drawer-empty__icon');
  });

  it('does not persist wishlist state until hydration has completed', () => {
    const userData = read('src/context/UserDataContext.tsx');
    expect(userData).toContain('hydrationReady');
    expect(userData).toContain('if (!hydrationReady || !hydrated.current) return;');
    expect(userData).toContain('if (!uid || !hydrationReady || !hydrated.current) return undefined;');
  });

  it('uses a compact horizontal Keep Discovering rail on mobile only', () => {
    const css = read('src/styles/design/phase2-discovery.css');
    expect(css).toContain('grid-auto-flow: column');
    expect(css).toContain('grid-auto-columns: minmax(210px, 72vw)');
    expect(css).toContain('scroll-snap-type: inline mandatory');
  });

  it('gives the Home Teams and Wholesale callout real media and a direct CTA', () => {
    const home = read('src/pages/HomePage.tsx');
    expect(home).toContain('s2-team-teaser__media');
    expect(home).toContain('E.tatumKids');
    expect(home).toContain('E.franceGroup');
    expect(home).toContain('to="/teams-wholesale"');
  });

  it('keeps custom 3D code in the package but hides its public entry points', () => {
    const custom = read('src/pages/CustomizePage.tsx');
    const app = read('src/App.tsx');
    const dormant3d = read('src/components/custom/CustomJerseyShowcase.tsx');
    expect(custom.includes('/customize/advanced')).toBe(false);
    expect(app).toContain('<Route path="/customize/advanced" element={<Navigate to="/customize" replace />} />');
    expect(dormant3d).toContain('modelRequested');
  });

  it('publishes a bilingual Gift Cards route and footer entry', () => {
    const app = read('src/App.tsx');
    const nav = read('src/data/navigation.ts');
    const page = read('src/pages/GiftCardsPage.tsx');
    expect(app).toContain('path="/gift-cards"');
    expect(nav).toContain("to: '/gift-cards'");
    expect(page).toContain('بطاقات الهدايا');
    expect(page).toContain("formType: 'gift_card_request'");
  });

  it('marks every Kobe as reservable rather than unavailable', () => {
    const kobe = products.filter((product) => String(product.collection || '') === 'kobe');
    expect(kobe).toHaveLength(50);
    expect(kobe.every((product) => product.reservationAvailable === true)).toBe(true);
    expect(kobe.every((product) => product.available !== false && product.comingSoon !== true)).toBe(true);
  });

  it('keeps priced LHA clothing ready and unpriced LHA clothing Coming Soon', () => {
    const clothing = products.filter((product) => product.legacyLha === true && product.category === 'clothing');
    const priced = clothing.filter((product) => Number(product.price || 0) > 0);
    const unpriced = clothing.filter((product) => Number(product.price || 0) <= 0);
    expect(priced.length).toBeGreaterThan(0);
    expect(unpriced.length).toBeGreaterThan(0);
    expect(priced.every((product) => product.readyToShip === true && product.comingSoon !== true)).toBe(true);
    expect(unpriced.every((product) => product.comingSoon === true && product.readyToShip !== true && product.available === false)).toBe(true);
  });

  it('keeps every supplied editorial image represented in the live source mapping', () => {
    const assets = read('src/data/editorialAssets.ts');
    const keys = [...assets.matchAll(/^\s{2}([A-Za-z0-9]+):/gm)].map((match) => match[1]);
    const liveSource = [
      'src/data/merchandising.ts',
      'src/data/categories.ts',
      'src/data/departmentArtDirection.ts',
      'src/pages/HomePage.tsx',
      'src/pages/CustomizePage.tsx',
      'src/pages/TeamsWholesalePage.tsx',
      'src/pages/OurWorkPage.tsx',
    ].map(read).join('\n');
    expect(keys).toHaveLength(51);
    expect(keys.every((key) => liveSource.includes(`E.${key}`))).toBe(true);
  });
});

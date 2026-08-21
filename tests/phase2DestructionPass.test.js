import { readFileSync } from 'node:fs';
import { describe, expect, it } from './test-api.js';
import { products } from '../src/data/products.ts';
import { buildCatalog } from '../scripts/catalog/build-catalog.mjs';

const read = (path) => readFileSync(path, 'utf8');

const subject = (key = '') => {
  const lower = String(key).toLowerCase();
  for (const athlete of ['curry', 'lamelo', 'lebron', 'jordan', 'luka', 'tatum']) {
    if (lower.startsWith(athlete)) return athlete;
  }
  return lower;
};

describe('Phase 2 destruction-pass regressions', () => {
  it('does not overwrite a scoped cart before hydration completes', () => {
    const cart = read('src/context/CartContext.tsx');
    expect(cart).toContain('hydrationReady');
    expect(cart).toContain('queueMicrotask');
    expect(cart).toContain('if (!hydrationReady || !ready.current) return;');
    expect(cart).toContain('[catalog.products, hydrationReady]');
  });

  it('keeps the bag full-width across the complete phone/mobile breakpoint', () => {
    const css = read('src/styles/customer-experience.css');
    expect(css).toContain('@media(max-width:760px){\n  .cart-drawer{inline-size:100vw!important;max-inline-size:100vw!important}');
  });

  it('keeps gift-card submission gated until request verification resolves', () => {
    const gift = read('src/pages/GiftCardsPage.tsx');
    expect(gift).toContain('const valid = Boolean(token) && validAmount');
    expect(gift).toContain('<TurnstileWidget onToken={setToken}');
  });

  it('keeps every Kobe reservation as preorder semantics in storefront and trusted catalog rows', () => {
    const kobes = products.filter((product) => String(product.collection || '') === 'kobe');
    expect(kobes).toHaveLength(50);
    expect(kobes.every((product) => product.reservationAvailable === true && product.availability === 'preorder')).toBe(true);
    expect(kobes.every((product) => (product.variants || []).every((variant) => variant.availabilityState === 'preorder'))).toBe(true);

    const rows = buildCatalog(kobes);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.availability_state === 'preorder' && row.inventory_tracking === false)).toBe(true);

    const trusted = read('api/_trusted-static-catalog.ts');
    expect(trusted).toContain('product.reservationAvailable === true || product.quoteOnly === true');
  });

  it('does not place the same named athlete in consecutive category-art slots', () => {
    const categories = read('src/data/categories.ts');
    const groups = [...categories.matchAll(/subcategories:\[(.*?)\]\s*\}/gs)].map((match) => match[1]);
    for (const group of groups) {
      const keys = [...group.matchAll(/image:E\.([A-Za-z0-9]+)/g)].map((match) => match[1]);
      for (let index = 1; index < keys.length; index += 1) {
        const previous = subject(keys[index - 1]);
        const current = subject(keys[index]);
        const namedAthlete = ['curry', 'lamelo', 'lebron', 'jordan', 'luka', 'tatum'].includes(current);
        if (namedAthlete) expect(current === previous).toBe(false);
      }
    }
  });
});

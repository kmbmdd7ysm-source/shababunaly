import { describe, expect, it } from './test-api.js';
import { catalogProducts, products, lhaStoreProducts } from '../src/data/products.js';
import { categories } from '../src/data/categories.ts';
import { products as sourceLhaProducts } from '../src/data/lhaProducts.js';
import { getProductPublishIssues, isProductVisible } from '../src/utils/productEligibility.ts';

describe('SHABABUNA catalogue', () => {
  it('contains every required shop department', () => {
    expect(categories.map((category) => category.slug)).toEqual(
      expect.arrayContaining([
        'ready-to-ship',
        'clothing',
        'footwear',
        'accessories',
        'basketballs',
        'equipment',
      ]),
    );
  });

  it('keeps product names English in both interfaces while descriptions are bilingual', () => {
    for (const product of catalogProducts) {
      expect(product.name.ar).toBe(product.name.en);
      expect(product.description.en.trim()).not.toBe('');
      expect(product.description.ar.trim()).not.toBe('');
    }
  });

  it('publishes every catalogue brand with safe supplier-order handling', () => {
    const visibleBrands = new Set(
      catalogProducts.filter(isProductVisible).map((item) => item.brand),
    );
    for (const brand of [
      'Nike',
      'Jordan',
      'adidas',
      'Under Armour',
      'Puma',
      'New Balance',
      'Li-Ning',
      'ANTA',
      'Peak',
      '361°',
      'Shababuna',
      'LHA',
    ]) {
      expect(visibleBrands.has(brand)).toBe(true);
    }
    expect(products).toHaveLength(catalogProducts.length);
    expect(products.every(isProductVisible)).toBe(true);
  });

  it('preserves product-specific wholesale minimums on customizable manufacturing products', () => {
    for (const product of catalogProducts.filter((item) => item.wholesaleAvailable)) {
      expect(product.wholesalePrice).toBeLessThan(product.price);
      expect(product.wholesaleMin).toBeGreaterThan(0);
    }
    expect(
      catalogProducts.find((item) => item.slug === 'shababuna-pro-game-set').wholesaleMin,
    ).toBe(10);
    expect(
      catalogProducts.find((item) => item.slug === 'shababuna-custom-team-basketball').wholesaleMin,
    ).toBe(6);
  });

  it('never exposes an unverified manufacturing claim', () => {
    for (const product of products)
      expect(getProductPublishIssues(product)).not.toContain('unverified_manufacturing_claim');
    expect(products.filter((item) => item.madeInUSA)).toHaveLength(0);
  });

  it('copies the entire LHA shop with unchanged retail prices', () => {
    const lha = lhaStoreProducts();
    expect(lha).toHaveLength(sourceLhaProducts.length);
    for (const source of sourceLhaProducts) {
      const copy = lha.find((item) => item.legacySourceId === source.id);
      expect(copy).toBeTruthy();
      expect(copy.price).toBe(source.price);
    }
  });
});

import { describe, expect, it } from './test-api.js';
import {
  getPerformanceProfile,
  hasVerifiedPerformanceData,
  isBasketballPerformanceShoe,
  rankBasketballShoes,
} from '../src/utils/productIntelligence.ts';

describe('phase 3 basketball intelligence', () => {
  it('never treats naked performance numbers as verified', () => {
    const product = {
      id: 'shoe',
      category: 'footwear',
      subcategory: 'in-court',
      performanceProfile: { cushioning: 9, traction: { value: 8, verified: false } },
    };
    const profile = getPerformanceProfile(product);
    expect(profile.cushioning).toBe(undefined);
    expect(profile.traction).toBe(undefined);
    expect(hasVerifiedPerformanceData(product)).toBe(false);
  });

  it('accepts metrics only with explicit verified provenance state', () => {
    const product = {
      id: 'shoe',
      category: 'footwear',
      subcategory: 'in-court',
      performanceProfile: {
        cushioning: { value: 8.5, verified: true, source: 'verified test' },
        positions: ['PG'],
        courtTypes: ['indoor'],
        provenance: 'verified test',
      },
    };
    const profile = getPerformanceProfile(product);
    expect(profile.cushioning.value).toBe(8.5);
    expect(profile.cushioning.source).toBe('verified test');
    expect(hasVerifiedPerformanceData(product)).toBe(true);
  });

  it('limits shoe-finder candidates to in-court basketball footwear', () => {
    expect(isBasketballPerformanceShoe({ category: 'footwear', subcategory: 'in-court' })).toBe(true);
    expect(isBasketballPerformanceShoe({ category: 'footwear', subcategory: 'off-court' })).toBe(false);
    expect(isBasketballPerformanceShoe({ category: 'clothing', subcategory: 'in-court' })).toBe(false);
  });

  it('does not award a match for unknown attributes', () => {
    const unknown = { id: 'a', price: 100, category: 'footwear', subcategory: 'in-court' };
    const verified = {
      id: 'b', price: 130, category: 'footwear', subcategory: 'in-court',
      performanceProfile: { positions: ['PG'], courtTypes: ['indoor'], traction: { value: 9, verified: true, source: 'test' } },
    };
    const results = rankBasketballShoes([unknown, verified], { position: 'PG', court: 'indoor', priority: 'traction' });
    expect(results[0].product.id).toBe('b');
    expect(results[1].score).toBe(0);
    expect(results[1].unverified).toEqual(expect.arrayContaining(['position', 'court', 'traction']));
  });

  it('uses first-party price as a safe hard filter', () => {
    const products = [
      { id: 'a', price: 100, category: 'footwear', subcategory: 'in-court' },
      { id: 'b', price: 180, category: 'footwear', subcategory: 'in-court' },
    ];
    const results = rankBasketballShoes(products, { maxPrice: 120 });
    expect(results.map((item) => item.product.id)).toEqual(['a']);
  });
});

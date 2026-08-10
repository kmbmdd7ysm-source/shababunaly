import { describe, expect, it } from './test-api.js';
import {
  CUSTOM_PRODUCT_TYPES,
  normalizeRoster,
  parseRosterCsv,
  rosterToCsv,
} from '../src/data/customization.ts';

describe('custom manufacturing studio', () => {
  it('enforces product-specific minimums', () => {
    const byKey = Object.fromEntries(CUSTOM_PRODUCT_TYPES.map((item) => [item.key, item.minimum]));
    expect(byKey['game-set']).toBe(10);
    expect(byKey.hoodie).toBe(10);
    expect(byKey['game-shorts']).toBe(10);
    expect(byKey['team-pants']).toBe(10);
    expect(byKey.basketball).toBe(6);
    expect(byKey['hoop-padding']).toBe(1);
  });

  it('supports a purpose-built preview for every custom product', () => {
    const supported = new Set([
      'uniform',
      'jersey',
      'shorts',
      'shirt',
      'hoodie',
      'pants',
      'tracksuit',
      'bag',
      'sleeve',
      'ball',
      'padding',
    ]);
    for (const product of CUSTOM_PRODUCT_TYPES) expect(supported.has(product.preview)).toBe(true);
  });

  it('detects duplicate numbers and missing fields', () => {
    const rows = normalizeRoster([
      { name: 'One', number: '7', jerseySize: 'L', shortsSize: 'L' },
      { name: 'Two', number: '7', jerseySize: '', shortsSize: 'XL' },
    ]);
    expect(rows[0].errors).toEqual([]);
    expect(rows[1].errors).toEqual(expect.arrayContaining(['duplicateNumber', 'jerseySize']));
  });

  it('round-trips a roster through CSV without losing essential fields', () => {
    const initial = [
      {
        name: 'Seddig Etorki',
        jerseyName: 'ETORKI',
        number: '20',
        jerseySize: 'L',
        shortsSize: 'L',
      },
    ];
    const parsed = parseRosterCsv(rosterToCsv(initial));
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({
      name: 'Seddig Etorki',
      jerseyName: 'ETORKI',
      number: '20',
      jerseySize: 'L',
      shortsSize: 'L',
    });
  });
});

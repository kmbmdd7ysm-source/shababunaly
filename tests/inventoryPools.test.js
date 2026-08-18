import { describe, expect, it } from './test-api.js';
import {
  enforceInventoryPools,
  getInventoryPoolUsage,
  getMaxInventoryPoolQuantity,
} from '../src/utils/inventoryPools.ts';

const item = (key, color, quantity, extra = {}) => ({
  key,
  id: 'lha-shirt',
  type: 'product',
  quantity,
  maxStock: 5,
  minQuantity: 1,
  inventoryPoolKey: `color:${color}`,
  inventoryPoolStock: 5,
  ...extra,
});

describe('shared color inventory pools', () => {
  it('caps the combined quantity across sizes of the same color at five', () => {
    const state = [item('black-m', 'black', 3)];
    const nextSize = item('black-l', 'black', 1);
    expect(getInventoryPoolUsage(state, nextSize)).toBe(3);
    expect(getMaxInventoryPoolQuantity(state, nextSize)).toBe(2);
  });

  it('keeps different colors in independent five-piece pools', () => {
    const state = [item('black-m', 'black', 5)];
    const white = item('white-m', 'white', 1);
    expect(getMaxInventoryPoolQuantity(state, white)).toBe(5);
  });

  it('clamps overfilled carts and removes entries with no remaining pool stock', () => {
    const result = enforceInventoryPools([
      item('black-s', 'black', 4),
      item('black-m', 'black', 4),
      item('black-l', 'black', 2),
    ]);
    expect(result.length).toBe(2);
    expect(result[0].quantity).toBe(4);
    expect(result[1].quantity).toBe(1);
    expect(result.reduce((sum, entry) => sum + entry.quantity, 0)).toBe(5);
  });

  it('does not constrain products that do not use a shared pool', () => {
    const plain = { key: 'plain', id: 'shoe', type: 'product', quantity: 7, maxStock: 10 };
    expect(getMaxInventoryPoolQuantity([], plain)).toBe(10);
    expect(enforceInventoryPools([plain])[0].quantity).toBe(7);
  });
});

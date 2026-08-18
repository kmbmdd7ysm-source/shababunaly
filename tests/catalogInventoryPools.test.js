import { describe, expect, it } from './test-api.js';
import { buildCatalog } from '../scripts/catalog/build-catalog.mjs';
import { products } from '../src/data/products.ts';

describe('trusted catalogue shared inventory pools', () => {
  it('serializes LHA color-pool metadata into every trusted variant row', () => {
    const rows = buildCatalog(products);
    const lhaRows = rows.filter((row) => row.variant_data?.inventorySource === 'owner_confirmed_lha_color_stock');
    expect(lhaRows.length > 0).toBe(true);
    expect(lhaRows.every((row) => row.inventory_tracking === true)).toBe(true);
    expect(lhaRows.every((row) => row.inventory_quantity === 5)).toBe(true);
    expect(lhaRows.every((row) => String(row.variant_data.inventoryPoolKey || '').startsWith('color:'))).toBe(true);
    expect(lhaRows.every((row) => row.variant_data.inventoryPoolStock === 5)).toBe(true);
    expect(lhaRows.every((row) => row.variant_data.inventoryVerified === true)).toBe(true);
    expect(lhaRows.every((row) => row.variant_data.inventoryLocation === 'LY')).toBe(true);
  });

  it('keeps all Kobe trusted rows at the clean site-rate price and max US 12', () => {
    const rows = buildCatalog(products);
    const kobeRows = rows.filter((row) => String(row.sku).startsWith('GOAT-K'));
    expect(kobeRows.length).toBe(500);
    expect(kobeRows.every((row) => row.unit_price === 135)).toBe(true);
    expect(kobeRows.every((row) => Number(row.size) <= 12)).toBe(true);
  });
});

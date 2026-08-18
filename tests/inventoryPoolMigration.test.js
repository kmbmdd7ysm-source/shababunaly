import { readFileSync } from 'node:fs';
import { describe, expect, it } from './test-api.js';

const sql = readFileSync('supabase/migrations/20260818010000_lha_color_inventory_pools.sql', 'utf8');
const generated = readFileSync('supabase/generated/product_catalog.sql', 'utf8');

describe('LHA shared color-pool transactional inventory', () => {
  it('serializes concurrent orders for one product/color before locking stock rows', () => {
    expect(sql).toContain('pg_advisory_xact_lock');
    expect(sql).toContain("v_requested.product_id || ':' || v_pool_key");
    expect(sql).toContain("variant_data->>'inventoryPoolKey' = v_pool_key");
    expect(sql).toContain('order by variant_id');
    expect(sql).toContain('for update');
  });

  it('aggregates all requested sizes in a color before validating and decrementing stock', () => {
    expect(sql).toContain('requested_pools');
    expect(sql).toContain("sum((x->>'quantity')::integer)::integer as quantity");
    expect(sql).toContain('min(pc.inventory_quantity) as available');
    expect(sql).toContain('pc.inventory_quantity - rp.quantity');
  });

  it('generates only the 786 trusted variants for the 75 production-media products', () => {
    const rows = generated.split('\n').filter((line) => line.startsWith("('")).length;
    expect(rows).toBe(786);
    expect(generated.includes('owner_confirmed_lha_ready')).toBe(false);
    expect(generated).toContain('owner_confirmed_lha_color_stock');
    expect(generated).toContain('inventory_quantity=case');
    expect(generated).toContain('when pc.inventory_tracking=true and pc.inventory_quantity is not null then pc.inventory_quantity');
    expect(generated).toContain('with pool_floor as');
    expect(generated).toContain("variant_data->>'inventorySource'='owner_confirmed_lha_color_stock'");
  });
});

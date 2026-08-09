import { readFileSync } from 'node:fs';
import { describe, expect, it } from './test-api.js';

describe('fulfillment consistency', () => {
  it('does not turn every customizable retail product into a 30–60 day custom order', () => {
    const source = readFileSync('src/pages/ProductPage.jsx', 'utf8');
    expect(source).toContain("purchaseMode === 'wholesale'");
    expect(source).not.toContain('product.customizable ? shippingConfig.custom');
  });

  it('keeps international shipping pending until a staff quote is added', () => {
    const checkout = readFileSync('src/pages/CheckoutPage.jsx', 'utf8');
    const migration = readFileSync(
      'supabase/migrations/20260731050000_shababuna_final_hardening.sql',
      'utf8',
    );
    expect(checkout).toContain('pending_shipping_quote');
    expect(migration).toContain('staff_set_shipping_quote');
    expect(migration).toContain(
      "v_plan=case when before_row.deposit_required then 'half' else 'full' end",
    );
  });

  it('requires full electronic payment while preserving staged cash/custom rules', () => {
    const sql = readFileSync(
      'supabase/migrations/20260731020000_shababuna_global_commerce.sql',
      'utf8',
    );
    expect(sql).toContain("v_payment_plan := 'half'");
    expect(sql).toContain("v_payment_plan := 'full'");
    expect(sql).toContain("v_payment_plan := 'pending_shipping_quote'");
  });
});

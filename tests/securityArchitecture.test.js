import { describe, expect, it } from './test-api.js';
import fs from 'node:fs';

describe('trusted checkout architecture', () => {
  it('saves the trusted order before creating a hosted payment session', () => {
    const source = fs.readFileSync('src/pages/CheckoutPage.tsx', 'utf8');
    const saveIndex = source.indexOf('await savePendingOrder(payload');
    expect(saveIndex).toBeGreaterThan(-1);
    expect(source.indexOf('createCheckoutSession({')).toBeGreaterThan(saveIndex);
  });

  it('reloads the trusted Supabase order on the server', () => {
    const source = fs.readFileSync('api/create-session.ts', 'utf8');
    expect(source).toContain('loadTrustedOrder');
    expect(source).toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(source).toContain('order_not_payable');
    expect(source).not.toMatch(/\.\.\.body/);
  });

  it('enforces shipping, wholesale and staged payment in SQL', () => {
    const sql = fs.readFileSync(
      'supabase/migrations/20260731020000_shababuna_global_commerce.sql',
      'utf8',
    );
    expect(sql).toContain('invalid_wholesale_quantity');
    expect(sql).toContain('invalid_custom_quantity');
    expect(sql).toContain("v_payment_plan := 'half'");
    expect(sql).toContain("v_payment_plan := 'pending_shipping_quote'");
    expect(sql).toContain("v_order_number := 'SHB-'");
  });
});

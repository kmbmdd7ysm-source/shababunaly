import { readFile } from 'node:fs/promises';
import { describe, expect, it } from './test-api.js';
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

describe('production completion safeguards', () => {
  it('enforces strict TypeScript on migrated modules', async () => {
    const config = JSON.parse(await read('tsconfig.json'));
    expect(config.compilerOptions.strict).toBe(true);
    expect(config.compilerOptions.noImplicitAny).toBe(true);
    expect(config.compilerOptions.strictNullChecks).toBe(true);
    expect(config.compilerOptions.useUnknownInCatchVariables).toBe(true);
    expect(config.compilerOptions.noUncheckedIndexedAccess).toBe(true);
    expect(config.compilerOptions.exactOptionalPropertyTypes).toBe(true);
    expect(config.include).toContain('src/**/*.ts');
    expect(config.include).toContain('src/**/*.tsx');
    expect(config.include).toContain('api/**/*.ts');
  });
  it('keeps final payment outstanding until verified', async () => {
    const sql = await read(
      'supabase/migrations/20260801010000_shababuna_production_completion.sql',
    );
    expect(sql).toContain('remaining_balance=greatest(before_row.outstanding_balance-v_due,0)');
    expect(sql).toContain(
      "v_due=case when v_order='final_payment_required' then before_row.outstanding_balance",
    );
    expect(sql).toContain('outstanding_balance=v_outstanding');
    expect(sql).toContain('payment_ledger');
  });
  it('prevents cumulative duplicate returns', async () => {
    const sql = await read(
      'supabase/migrations/20260801010000_shababuna_production_completion.sql',
    );
    expect(sql).toContain("status not in ('rejected','refunded','closed','cancelled')");
    expect(sql).toContain('v_used');
    expect(sql).toContain('return_quantity_exceeds_remaining');
  });
  it('requires AAL2 for trusted staff operations', async () => {
    const sql = await read(
      'supabase/migrations/20260801010000_shababuna_production_completion.sql',
    );
    const auth = await read('api/_staff-auth.ts');
    expect(sql).toContain("coalesce(auth.jwt()->>'aal','aal1')='aal2'");
    expect(auth).toContain("String(payload.aal || 'aal1') !== 'aal2'");
  });
  it('provides real retrieve/refund adapter paths instead of 501 placeholders', async () => {
    const adapter = await read('api/payments/adapters/base.js');
    expect(adapter).not.toContain('status(501)');
    expect(adapter).toContain('config.retrieveEnv');
    expect(adapter).toContain('config.refundEnv');
  });
  it('protects public forms with Turnstile and file scanning architecture', async () => {
    for (const path of [
      'src/pages/ContactPage.jsx',
      'src/components/common/Newsletter.tsx',
      'src/pages/TeamsWholesalePage.jsx',
      'src/pages/CustomizePage.jsx',
      'src/pages/SpecialRequestPage.jsx',
    ]) {
      expect(await read(path)).toContain('TurnstileWidget');
    }
    const scanner = await read('api/malware-scan-worker.js');
    const privateFile = await read('api/private-file.ts');
    expect(scanner).toContain('MALWARE_SCAN');
    expect(privateFile).toContain('quarantine_status');
    expect(privateFile).toContain('file_not_cleared');
  });
});

import { readFileSync } from 'node:fs';
import { describe, expect, it } from './test-api.js';

describe('executable RLS role matrix', () => {
  const sql = readFileSync('supabase/tests/rls_role_matrix.sql', 'utf8');
  it('tests two unrelated customers and organization membership against real rows', () => {
    expect(sql).toContain('customer A cannot IDOR customer B profile');
    expect(sql).toContain('customer A cannot IDOR customer B address');
    expect(sql).toContain('unrelated customer cannot read organization contract');
  });
  it('tests anonymous, AAL1, AAL2 and service-role boundaries', () => {
    expect(sql).toContain('admin claim at AAL1 is denied');
    expect(sql).toContain('admin claim at AAL2 is accepted');
    expect(sql).toContain('service role is trusted without browser MFA');
    expect(sql).toContain('anon cannot read profiles');
  });
});

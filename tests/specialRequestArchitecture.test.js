import { readFileSync } from 'node:fs';
import { describe, expect, it } from './test-api.js';

describe('special request production architecture', () => {
  const migration = readFileSync('supabase/migrations/20260731090000_special_requests_and_catalog_safety.sql', 'utf8');
  const api = readFileSync('api/special-request.js', 'utf8');
  it('uses idempotent database creation and private quarantine storage', () => {
    expect(migration).toContain('create_special_request_api');
    expect(migration).toContain('special-request-quarantine');
    expect(migration).toContain('quarantine_status');
    expect(api).toContain('idempotencyKey');
    expect(api).toContain('validateEncodedFiles');
  });
  it('supports customer decisions and protected staff updates', () => {
    expect(migration).toContain('customer_respond_special_request');
    expect(migration).toContain('staff_update_special_request');
    expect(migration).toContain('public.is_shababuna_staff()');
  });
});

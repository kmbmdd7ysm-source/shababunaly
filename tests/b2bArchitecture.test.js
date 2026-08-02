import { readFileSync } from 'node:fs';
import { describe, expect, it } from './test-api.js';

describe('teams, wholesale and operations architecture', () => {
  const migration = readFileSync('supabase/migrations/20260731040000_shababuna_b2b_operations.sql', 'utf8');
  const app = readFileSync('src/App.jsx', 'utf8');
  const operations = readFileSync('src/services/operations.js', 'utf8');

  it('creates the full B2B data model with RLS', () => {
    for (const table of ['organizations', 'organization_members', 'custom_designs', 'custom_design_versions', 'team_rosters', 'quote_requests', 'production_updates', 'operations_audit_log']) {
      expect(migration).toContain(table);
    }
    expect(migration).toContain('enable row level security');
    expect(migration).toContain('is_shababuna_staff');
  });

  it('uses staff-only RPCs for commercial mutations', () => {
    for (const rpc of ['staff_set_shipping_quote', 'staff_update_order_workflow', 'staff_update_quote', 'staff_set_exchange_rate', 'staff_publish_design_proof']) {
      expect(migration).toContain(rpc);
      expect(operations).toContain(rpc);
    }
  });

  it('supports customer design and quote approval through guarded RPCs', () => {
    expect(migration).toContain('customer_respond_to_design');
    expect(migration).toContain('customer_respond_to_quote');
    expect(migration).toContain('archive_custom_design_version');
  });

  it('keeps staff operations out of public navigation but exposes a guarded route', () => {
    expect(app).toContain('path="/operations/*"');
    expect(app).toContain('OperationsPage');
    const operationsPage = readFileSync('src/pages/OperationsPage.jsx', 'utf8');
    expect(operationsPage).toContain('lazy(');
    expect(operationsPage).toContain('OperationsDashboardPage');
    expect(operationsPage).toContain('path="orders"');
    const navigation = readFileSync('src/data/navigation.js', 'utf8');
    expect(navigation).not.toContain('/operations');
  });
});

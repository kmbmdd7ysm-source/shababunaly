import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test.describe('operations control center', () => {
  test('provides audited notification retry and security resolution', async () => {
    const sql = await read(
      'supabase/migrations/20260801023000_shababuna_operations_control_center.sql',
    );
    assert.match(sql, /staff_retry_commerce_notification/);
    assert.match(sql, /retry_notification/);
    assert.match(sql, /staff_resolve_security_event/);
    assert.match(sql, /staff_mfa_required/);
  });

  test('blocks public media until a clean malware verdict', async () => {
    const sql = await read(
      'supabase/migrations/20260801023000_shababuna_operations_control_center.sql',
    );
    const worker = await read('api/media-scan-worker.ts');
    assert.match(sql, /v_visibility='public' and before_row\.scan_status<>'clean'/);
    assert.match(worker, /MALWARE_SCAN_API_URL/);
    assert.match(worker, /EICAR-STANDARD-ANTIVIRUS-TEST-FILE/);
  });

  test('enforces a shipment state machine and queues customer notifications', async () => {
    const sql = await read(
      'supabase/migrations/20260801023000_shababuna_operations_control_center.sql',
    );
    assert.match(sql, /is_valid_shipment_status_transition/);
    assert.match(sql, /invalid_shipment_status_transition/);
    assert.match(sql, /enqueue_commerce_notification/);
    assert.match(sql, /delivered_at=case when after_row\.status='delivered'/);
  });

  test('adds collections, coupons, taxes, billing and fulfillment operations UI', async () => {
    const page = [
      await read('src/components/operations/OperationsControlCenter.tsx'),
      await read('src/components/operations/control/MerchandisingManager.jsx'),
      await read('src/components/operations/control/ProcurementAndBilling.jsx'),
      await read('src/components/operations/control/FulfillmentManager.jsx'),
    ].join('\n');
    const service = await read('src/services/operations.ts');
    assert.match(page, /Collections, coupons & tax rules/);
    assert.match(page, /Procurement & billing/);
    assert.match(page, /Shipments, tracking & partial fulfillment/);
    assert.match(service, /retryCommerceNotification/);
    assert.match(service, /upsertShipment/);
  });

  test('creates only safe draft products and audited draft variants', async () => {
    const sql = await read('supabase/migrations/20260801024000_shababuna_catalog_crud.sql');
    const ui = [
      await read('src/components/operations/OperationsControlCenter.tsx'),
      await read('src/components/operations/control/CatalogDraftManager.jsx'),
    ].join('\n');
    assert.match(sql, /staff_create_catalog_product_draft/);
    assert.match(sql, /'draft',false/);
    assert.match(sql, /'unverified_catalog'/);
    assert.match(sql, /staff_add_catalog_variant_draft/);
    assert.match(sql, /staff_archive_catalog_product/);
    assert.match(ui, /Safe product & variant creation/);
  });

  test('supports atomic inventory CSV preview, apply and rollback', async () => {
    const sql = await read('supabase/migrations/20260801022000_shababuna_inventory_imports.sql');
    const service = await read('src/services/operations.ts');
    assert.match(sql, /staff_apply_inventory_batch/);
    assert.match(sql, /staff_rollback_inventory_batch/);
    assert.match(sql, /inventory_changed_after_import/);
    assert.match(service, /parseInventoryCsv/);
    assert.match(service, /previewInventoryImport/);
    assert.match(service, /rollbackInventoryImport/);
  });
});

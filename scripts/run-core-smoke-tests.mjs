import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  catalogProducts,
  products,
  allBrands,
  lhaStoreProducts,
  readyToShipProducts,
} from '../src/data/products.ts';
import { isProductPurchasable, isProductVisible } from '../src/utils/productEligibility.ts';
import {
  CUSTOM_PRODUCT_TYPES,
  normalizeRoster,
  parseRosterCsv,
  rosterToCsv,
} from '../src/data/customization.ts';
import { ROSTER_FILE_ACCEPT } from '../src/utils/rosterSpreadsheet.ts';
import { buildProductionPackage } from '../src/utils/designExports.ts';

const byType = Object.fromEntries(CUSTOM_PRODUCT_TYPES.map((item) => [item.key, item]));
assert.equal(byType['game-set'].minimum, 10);
assert.equal(byType.basketball.minimum, 6);
assert.equal(byType['hoop-padding'].minimum, 1);
assert.equal(CUSTOM_PRODUCT_TYPES.length, 12);
assert.equal(new Set(CUSTOM_PRODUCT_TYPES.map((item) => item.preview)).size >= 10, true);
assert.match(ROSTER_FILE_ACCEPT, /xlsx/);

const roster = normalizeRoster([
  { name: 'Player One', number: '12', jerseySize: 'L', shortsSize: 'L' },
  { name: 'Player Two', number: '12', jerseySize: 'XL', shortsSize: 'XL' },
]);
assert.deepEqual(roster[0].errors, []);
assert.equal(roster[1].errors.includes('duplicateNumber'), true);
const csvRoundTrip = parseRosterCsv(
  rosterToCsv([
    { name: 'Player', jerseyName: 'PLAYER', number: '20', jerseySize: 'L', shortsSize: 'L' },
  ]),
);
assert.equal(csvRoundTrip[0].number, '20');
assert.equal(csvRoundTrip[0].jerseySize, 'L');

assert.equal(catalogProducts.length, 119);
assert.equal(products.length, 119);
assert.equal(lhaStoreProducts().length, 25);
assert.equal(readyToShipProducts().length, 15);
assert.equal(readyToShipProducts().every((item) => item.legacyLha === true && item.inventorySource === 'owner_confirmed_lha_ready' && item.inventoryLocation === 'LY' && item.comingSoon !== true), true);
assert.equal(products.every(isProductVisible), true);
assert.equal(
  products
    .filter((item) => item.status === 'active' && item.quoteOnly !== true)
    .every(isProductPurchasable),
  true,
);
assert.equal(products.filter((item) => item.quoteOnly === true).every(isProductVisible), true);
assert.equal(
  products.every((item) => item.name.en === item.name.ar),
  true,
);
assert.equal(allBrands.length, 15);
assert.equal(allBrands.includes('Shababuna'), true);
assert.equal(allBrands.includes('LHA'), true);

const checkout = readFileSync('src/pages/CheckoutPage.tsx', 'utf8');
assert.match(checkout, /paymentPlan = shippingQuoteRequired \? 'pending_shipping_quote'/);
assert.match(checkout, /const immediateLibyaCash = isLibya && allReady && !stagedOrder/);
assert.match(checkout, /const allowCashPlanChoice = isLibya && !allReady/);
assert.match(checkout, /immediateLibyaCash \? 'full' : allowCashPlanChoice \? cashPlan : 'full'/);
const migration = [
  readFileSync('supabase/migrations/20260731040000_shababuna_b2b_operations.sql', 'utf8'),
  readFileSync('supabase/migrations/20260731050000_shababuna_final_hardening.sql', 'utf8'),
  readFileSync('supabase/migrations/20260731060000_shababuna_returns_refunds.sql', 'utf8'),
  readFileSync('supabase/migrations/20260731070000_shababuna_operational_resilience.sql', 'utf8'),
  readFileSync(
    'supabase/migrations/20260731080000_shababuna_country_shipping_and_content.sql',
    'utf8',
  ),
  readFileSync(
    'supabase/migrations/20260731090000_special_requests_and_catalog_safety.sql',
    'utf8',
  ),
  readFileSync('supabase/migrations/20260801010000_shababuna_production_completion.sql', 'utf8'),
  readFileSync('supabase/migrations/20260801020000_shababuna_enterprise_workflows.sql', 'utf8'),
  readFileSync('supabase/migrations/20260801021000_shababuna_customer_enterprise_rpcs.sql', 'utf8'),
  readFileSync('supabase/migrations/20260801022000_shababuna_inventory_imports.sql', 'utf8'),
  readFileSync(
    'supabase/migrations/20260801023000_shababuna_operations_control_center.sql',
    'utf8',
  ),
  readFileSync('supabase/migrations/20260801024000_shababuna_catalog_crud.sql', 'utf8'),
  readFileSync('supabase/migrations/20260801025000_secure_design_sharing.sql', 'utf8'),
].join('\n');
for (const invariant of [
  'create_or_get_my_organization',
  'archive_custom_design_version',
  'staff_publish_design_proof',
  'customer_respond_to_design',
  'customer_respond_to_quote',
  'staff_set_shipping_quote',
  'staff_record_quote_payment',
  'create_return_request',
  'staff_record_refund',
  'expire_stale_commerce_orders',
  'apply_verified_quote_payment_event',
  'shipping_country_rates',
  'get_public_shipping_rates',
  'staff_set_country_shipping_rate',
  'staff_update_site_content',
  'cash_available_only_in_libya',
  'create_special_request_api',
  'special-request-quarantine',
  'request_my_privacy_export',
  'staff_apply_inventory_batch',
  'staff_create_catalog_product_draft',
  'create_design_share_link',
  'get_shared_design',
  'respond_to_shared_design',
])
  assert.equal(migration.includes(invariant), true, invariant);

const artworkZip = buildProductionPackage({
  design: {
    id: 'smoke-design',
    name: 'Smoke Uniform',
    productType: 'game-set',
    primary: '#000000',
    secondary: '#ffffff',
    accent: '#d4af37',
  },
  studio: { layers: [], comments: [] },
  roster: [
    { name: 'Player', jerseyName: 'PLAYER', number: '20', jerseySize: 'L', shortsSize: 'L' },
  ],
});
assert.equal(artworkZip.type, 'application/zip');
assert.equal(artworkZip.size > 500, true);
const app = readFileSync('src/App.tsx', 'utf8');
assert.equal(app.includes('/design-share/:token'), true);
const readiness = readFileSync('api/readiness.ts', 'utf8');
assert.match(readiness, /requiredEnvironment/);
assert.match(readiness, /MALWARE_SCAN_API_URL/);

const orderService = readFileSync('src/services/orders.ts', 'utf8');
assert.match(orderService, /deliveredAt: row\.delivered_at/);
assert.match(orderService, /paymentExpiresAt: row\.payment_expires_at/);
const resilience = readFileSync(
  'supabase/migrations/20260731070000_shababuna_operational_resilience.sql',
  'utf8',
);
assert.match(resilience, /variant_snapshot'->>'customizable/);
const adminApi = readFileSync('api/admin-users.ts', 'utf8');
assert.match(adminApi, /appMeta\.role|app_metadata\?\.role|app_metadata\.role/);
assert.doesNotMatch(adminApi, /user_metadata\?\.role|user_metadata\.role/);
console.info(
  'Core smoke tests passed: catalogue safety, 12-type production customization, CSV/XLSX readiness, artwork ZIP export, secure design sharing, trusted shipping, returns, B2B approvals, staff authorization, readiness gates and operations invariants.',
);

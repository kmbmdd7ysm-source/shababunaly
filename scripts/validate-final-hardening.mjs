import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import {
  catalogProducts,
  products,
  lhaStoreProducts,
  readyToShipProducts,
} from '../src/data/products.js';
import { isProductVisible, isProductPurchasable } from '../src/utils/productEligibility.ts';

const fail = [];
const read = (file) => {
  if (!existsSync(file)) {
    fail.push(`Missing ${file}`);
    return '';
  }
  return readFileSync(file, 'utf8');
};
const has = (source, token, label = token) => {
  if (!source.includes(token)) fail.push(`Missing ${label}`);
};

const migrations = readdirSync('supabase/migrations')
  .filter((name) => name.endsWith('.sql'))
  .sort();
const versions = migrations.map((name) => name.match(/^(\d{14})_/u)?.[1]).filter(Boolean);
if (versions.length !== migrations.length)
  fail.push('Every migration must use a unique 14-digit timestamp prefix');
if (new Set(versions).size !== versions.length)
  fail.push('Migration timestamp prefixes are not unique');
if (versions.some((value, index) => index && value <= versions[index - 1]))
  fail.push('Migrations are not strictly ordered');
for (const required of [
  '20260731050000_shababuna_final_hardening.sql',
  '20260731060000_shababuna_returns_refunds.sql',
  '20260731070000_shababuna_operational_resilience.sql',
  '20260731080000_shababuna_country_shipping_and_content.sql',
  '20260731090000_special_requests_and_catalog_safety.sql',
  '20260801010000_shababuna_production_completion.sql',
  '20260801020000_shababuna_enterprise_workflows.sql',
  '20260801021000_shababuna_customer_enterprise_rpcs.sql',
  '20260801022000_shababuna_inventory_imports.sql',
  '20260801023000_shababuna_operations_control_center.sql',
  '20260801024000_shababuna_catalog_crud.sql',
  '20260801025000_secure_design_sharing.sql',
  '20260802001000_business_intelligence.sql',
  '20260802002000_external_signature_provider.sql',
  '20260802003000_malware_quarantine_lifecycle.sql',
])
  if (!migrations.includes(required)) fail.push(`Missing final migration ${required}`);

const env = read('.env.example');
for (const token of [
  'FORMSPREE_ORDER_ENDPOINT=',
  'SITE_URL=https://shababuna.ly',
  'PAYMENTS_WEBHOOK_SECRET=',
  'LIBYAN_BANK_CARD_WEBHOOK_SECRET=',
  'PAYMENTS_WEBHOOK_AMOUNT_UNIT=minor',
  'CRON_SECRET=',
])
  has(env, token, `.env ${token}`);

const ordersService = read('src/services/orders.js');
for (const token of [
  'allowLocalPendingQuote',
  'online_payment_requires_server',
  'cloud_order_creation_failed',
])
  has(ordersService, token, `order fail-closed ${token}`);
const operations = read('src/services/operations.js');
if (/user_metadata\?\.role|user_metadata\.role/u.test(operations))
  fail.push('Staff authorization still trusts user_metadata.role');
for (const token of [
  'recordQuotePayment',
  'updateReturnRequest',
  'recordRefund',
  'return_requests',
  'refund_events',
])
  has(operations, token, `operations ${token}`);

const returns = read('src/components/account/ReturnsSection.jsx');
for (const token of [
  'createReturnRequest',
  'cancelReturnRequest',
  'RETURN_WINDOW_DAYS',
  'returnableItems',
])
  has(returns, token, `returns UI ${token}`);
const account = read('src/pages/AccountPage.jsx');
for (const token of ["'returns'", '<ReturnsSection orders={ordersState.orders} />'])
  has(account, token, `account returns ${token}`);

const hardening = read('supabase/migrations/20260731050000_shababuna_final_hardening.sql');
const refunds = read('supabase/migrations/20260731060000_shababuna_returns_refunds.sql');
const resilience = read('supabase/migrations/20260731070000_shababuna_operational_resilience.sql');
const globalShipping = read(
  'supabase/migrations/20260731080000_shababuna_country_shipping_and_content.sql',
);
for (const token of [
  'amount_paid + amount_due_now + remaining_balance = total',
  'apply_verified_payment_event',
  'staff_record_quote_payment',
  'quote_price_locked_after_payment',
])
  has(hardening, token, `hardening ${token}`);
for (const token of [
  'return_requests',
  'refund_events',
  'staff_record_refund',
  'apply_verified_refund_event',
])
  has(refunds, token, `returns/refunds ${token}`);
for (const token of [
  'delivered_at',
  'payment_expires_at',
  'expire_stale_commerce_orders',
  'customer_cancel_return_request',
  'apply_verified_quote_payment_event',
  'quote_verified_payment_events',
])
  has(resilience, token, `resilience ${token}`);
if (resilience.split('$$').length % 2 === 0)
  fail.push('Operational resilience migration has unbalanced dollar-quoted bodies');
for (const token of [
  'shipping_country_rates',
  'get_public_shipping_rates',
  'staff_set_country_shipping_rate',
  'cash_available_only_in_libya',
  'v_all_ready_to_ship',
  'site_content',
  'staff_update_site_content',
  'international_configured',
])
  has(globalShipping, token, `global shipping/content ${token}`);
if (globalShipping.split('$$').length % 2 === 0)
  fail.push('Country shipping/content migration has unbalanced dollar-quoted bodies');
for (const token of [
  'v_requires_shipping_quote := v_has_large_equipment',
  "v_shipping_country='LY'",
  'shipping_quote_required',
  'round(v_subtotal * v_usd_to_lyd_rate, 2) >= 500.00',
  'staff read all shipping rates',
  'staff read all site content',
])
  has(globalShipping, token, `authoritative shipping ${token}`);

const webhook = read('api/payment-webhook.ts');
for (const token of [
  'getPaymentAdapter',
  'verifyWebhook',
  'normalizeEvent',
  'apply_verified_quote_payment_event',
  'apply_verified_refund_event',
  'apply_verified_payment_event',
])
  has(webhook, token, `webhook ${token}`);
const quoteSession = read('api/create-quote-session.ts');
for (const token of [
  'loadQuote',
  'amount_due_now',
  'getPaymentAdapter',
  'idempotencyKey',
  "entityType: 'quote'",
])
  has(quoteSession, token, `quote session ${token}`);
const worker = read('api/notification-worker.ts');
for (const token of [
  'expire_stale_commerce_orders',
  'claim_commerce_notifications',
  'CRON_SECRET',
  'formspree',
])
  has(worker.toLowerCase(), token.toLowerCase(), `notification worker ${token}`);
const adminUsersApi = read('api/admin-users.ts');
for (const token of [
  'requireSuperAdmin',
  'app_metadata?.role',
  'SUPABASE_SERVICE_ROLE_KEY',
  'cannot_remove_own_super_admin_role',
])
  has(adminUsersApi, token, `admin users ${token}`);
if (/user_metadata\?\.role|user_metadata\.role/u.test(adminUsersApi))
  fail.push('Admin authorization trusts editable user_metadata.role');
const formApi = read('api/formspree.ts');
const orderApi = read('api/order-notification.ts');
for (const source of [formApi, orderApi]) {
  has(source, 'guardPublicPost', 'public API security guard');
  has(source, 'formspree_not_configured', 'fail-closed Formspree configuration');
  if (source.includes('https://formspree.io/f/'))
    fail.push('Formspree runtime API still embeds a default endpoint');
}

has(orderApi, 'loadTrustedOrder', 'trusted order email notification');
has(orderApi, 'trusted_order_not_found', 'production order email fail-closed behavior');
const createSession = read('api/create-session.ts');
for (const token of ['payment_expires_at', 'shipping_quote_expires_at', 'loadTrustedOrder'])
  has(createSession, token, `payment session ${token}`);
const checkout = read('src/pages/CheckoutPage.jsx');
for (const token of [
  'shippingRates',
  'customOrder: stagedOrder',
  "deliveryProfile === 'international'",
])
  has(checkout, token, `checkout shipping ${token}`);
const commerceContext = read('src/context/CommerceContext.jsx');
has(commerceContext, 'fetchPublicShippingRates', 'public country shipping rates');
const hero = read('src/components/experience/CinematicHero.jsx');
for (const token of ['home_hero', 'mobileVideoUrl', 'useReducedMotion', 'saveData'])
  has(hero, token, `hero runtime ${token}`);

for (const file of readdirSync('api').filter((name) => name.endsWith('.js'))) {
  try {
    execFileSync(process.execPath, ['--check', `api/${file}`], { stdio: 'pipe' });
  } catch (error) {
    fail.push(
      `API syntax failed: api/${file}: ${String(error.stderr || error.message).slice(0, 300)}`,
    );
  }
}

if (products.some((product) => Number(product.stock || 0) > 30))
  fail.push('Static catalogue contains implausibly high launch inventory');
if (read('src/data/products.js').includes('index < 10'))
  fail.push('Ready-to-ship still uses automatic first-ten logic');
if (read('src/data/products.js').includes('stockPerVariant = 25'))
  fail.push('Legacy generated 25-per-variant inventory remains');

const specialMigration = read(
  'supabase/migrations/20260731090000_special_requests_and_catalog_safety.sql',
);
for (const token of [
  'special_requests',
  'special_request_files',
  'special-request-quarantine',
  'create_special_request_api',
  'customer_respond_special_request',
  'staff_update_special_request',
  'inventory_movements',
])
  has(specialMigration, token, `special request/catalog safety ${token}`);
const specialApi = read('api/special-request.ts');
for (const token of [
  'guardPublicPost',
  'verifyTurnstile',
  'validateEncodedFiles',
  'special-request-quarantine',
  'create_special_request_api',
])
  has(specialApi, token, `special request API ${token}`);
const packageJson = read('package.json');
for (const token of [
  '"test:db"',
  '"security:audit"',
  '"visual"',
  'npm run test:db',
  'node scripts/run-coverage.mjs',
])
  has(packageJson, token, `quality script ${token}`);
const coverageRunner = read('scripts/run-coverage.mjs');
for (const token of [
  '--test-coverage-lines=100',
  '--test-coverage-functions=100',
  '--test-coverage-branches=100',
  'Number(value) !== 100',
])
  has(coverageRunner, token, `runtime coverage gate ${token}`);

const preflight = read('src/services/productionPreflight.ts');
for (const token of [
  'FACTORY_TEMPLATE_SPECS',
  'minimumRasterDpi',
  'buildColorSpecificationsCsv',
  'runProductionPreflight',
  'readyForManufacturing',
  'manual_factory_match_required',
])
  has(preflight, token, `production preflight ${token}`);
const customizePage = read('src/pages/CustomizePage.jsx');
for (const token of ['productionPreflight', 'readyForQuote'])
  has(customizePage, token, `preflight quote gate ${token}`);

const shareMigration =
  read('supabase/migrations/20260801010000_shababuna_production_completion.sql') +
  '\n' +
  read('supabase/migrations/20260801025000_secure_design_sharing.sql');
for (const token of [
  'create_design_share_link',
  'get_shared_design',
  'add_shared_design_comment',
  'respond_to_shared_design',
  'token_hash',
  'expires_at',
])
  has(shareMigration, token, `secure design sharing ${token}`);
const app = read('src/App.jsx');
has(app, '/design-share/:token', 'secure design-share route');
const spreadsheet = read('src/utils/rosterSpreadsheet.js');
for (const token of [
  'parseRosterXlsxBuffer',
  'parseRosterFile',
  'ROSTER_FILE_ACCEPT',
  'DecompressionStream',
])
  has(spreadsheet, token, `XLSX roster ${token}`);
const designExports = read('src/utils/designExports.js');
for (const token of [
  'buildProductionPackage',
  'artwork/${view}.svg',
  'manifest.json',
  'roster.csv',
])
  has(designExports, token, `production export ${token}`);
const readiness = read('api/readiness.ts');
for (const token of [
  'requiredEnvironment',
  'optionalCapabilities',
  'MALWARE_SCAN_API_URL',
  'Cache-Control',
])
  has(readiness, token, `readiness API ${token}`);
const readinessGate = read('src/context/ReadinessContext.jsx');
for (const token of ['/api/readiness', "credentials: 'same-origin'", 'localReadiness'])
  has(readinessGate, token, `production readiness gate ${token}`);
const chrome = read('src/components/layout/GlobalChrome.jsx');
for (const token of ['ReadinessBanner', 'AnnouncementBar', 'MainHeader'])
  has(chrome, token, `global chrome ${token}`);

try {
  assert.equal(catalogProducts.length, 69);
  assert.equal(products.length, 69);
  assert.equal(lhaStoreProducts().length, 25);
  assert.equal(readyToShipProducts().length, 0);
  assert.equal(products.every(isProductVisible), true);
  assert.equal(
    products
      .filter((item) => item.status === 'active' && item.quoteOnly !== true)
      .every(isProductPurchasable),
    true,
  );
  assert.equal(products.filter((item) => item.quoteOnly === true).every(isProductVisible), true);
} catch (error) {
  fail.push(error.message);
}

if (fail.length) {
  console.error(`Final hardening failed:\n${fail.map((item) => `- ${item}`).join('\n')}`);
  process.exit(1);
}
console.info(
  `Source hardening passed: ${migrations.length} ordered migrations and required secure source implementations are present. Production verification still requires fresh build, database, browser, provider, catalog, factory and human-review evidence.`,
);

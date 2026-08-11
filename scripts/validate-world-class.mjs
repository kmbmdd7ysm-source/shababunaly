import { existsSync, readFileSync } from 'node:fs';
import { catalogProducts, products, readyToShipProducts } from '../src/data/products.ts';
import { isProductVisible } from '../src/utils/productEligibility.ts';
import { CUSTOM_PRODUCT_TYPES } from '../src/data/customization.ts';

const failures = [];
const requireFile = (file) => {
  if (!existsSync(file)) failures.push(`Missing required file: ${file}`);
  return existsSync(file) ? readFileSync(file, 'utf8') : '';
};
const requireText = (source, value, label = value) => {
  if (!source.includes(value)) failures.push(`Missing required implementation: ${label}`);
};

const config = requireFile('src/config.ts');
const shipping = requireFile('src/config/shipping.ts');
const app = requireFile('src/App.tsx');
const customize = requireFile('src/pages/CustomizePage.tsx');
const preview = requireFile('src/components/custom/DesignPreview.tsx');
const productionEditor = requireFile('src/components/custom/ProductionDesignEditor.tsx');
const workspace = requireFile('src/components/account/OrganizationWorkspace.tsx');
const teams = requireFile('src/pages/TeamsWholesalePage.tsx');
const operations = requireFile('src/pages/OperationsPage.tsx');
const migration = requireFile('supabase/migrations/20260731040000_shababuna_b2b_operations.sql');
const checkout = requireFile('src/pages/CheckoutPage.tsx');
const productPage = requireFile('src/pages/ProductPage.tsx');
const lighthouse = requireFile('scripts/lighthouse/validate-lighthouse.mjs');
const sharePage = requireFile('src/pages/DesignSharePage.tsx');
const shareApi = requireFile('api/design-share.ts');
const spreadsheet = requireFile('src/utils/rosterSpreadsheet.ts');
const exportsSource = requireFile('src/utils/designExports.ts');
const readinessApi = requireFile('api/readiness.ts');
const secureShareMigration = requireFile(
  'supabase/migrations/20260801025000_secure_design_sharing.sql',
);
const packageJson = requireFile('package.json');
const vitestConfig = requireFile('vitest.config.mjs');
const coverageAudit = requireFile('scripts/audit-coverage-scope.mjs');
const source = [
  app,
  customize,
  preview,
  productionEditor,
  workspace,
  teams,
  operations,
  migration,
  checkout,
  productPage,
  sharePage,
  shareApi,
  spreadsheet,
  exportsSource,
  readinessApi,
].join('\n');

for (const route of [
  '/shop',
  '/discover',
  '/releases',
  '/basketball/shoe-finder',
  '/customize',
  '/teams-wholesale',
  '/lha-store',
  '/our-work',
  '/stories',
  '/operations',
  '/design-share/:token',
])
  requireText(app, route, `route ${route}`);
for (const feature of [
  'CUSTOM_PRODUCT_TYPES',
  'ProductionDesignEditor',
  'parseRosterFile',
  'rosterToCsv',
  'saveCustomDesign',
  'submitPublicQuote',
])
  requireText(customize, feature);
for (const feature of ['parseRosterXlsxBuffer', 'ROSTER_FILE_ACCEPT', 'DecompressionStream'])
  requireText(spreadsheet, feature, `roster spreadsheet ${feature}`);
for (const feature of [
  'buildProductionPackage',
  'artwork/${view}.svg',
  'manifest.json',
  'roster.csv',
])
  requireText(exportsSource, feature, `production artwork ${feature}`);
for (const feature of [
  'get_shared_design',
  'add_shared_design_comment',
  'respond_to_shared_design',
])
  requireText(secureShareMigration, feature, `secure sharing ${feature}`);
for (const feature of ['ProductionDesignEditor', 'Proof decision', 'Turnstile'])
  requireText(sharePage, feature, `design share page ${feature}`);
for (const feature of ['guardPublicPost', 'verifyTurnstile', 'get_shared_design'])
  requireText(shareApi, feature, `design share API ${feature}`);
for (const feature of ['requiredEnvironment', 'optionalCapabilities', 'Cache-Control'])
  requireText(readinessApi, feature, `production readiness ${feature}`);
for (const type of CUSTOM_PRODUCT_TYPES) {
  requireText(preview, type.preview, `preview type ${type.preview}`);
  requireText(productionEditor, type.preview, `production editor type ${type.preview}`);
}
for (const tab of ['designs', 'rosters', 'quotes', 'production'])
  requireText(workspace, tab, `organization workspace ${tab}`);
for (const feature of ['50%', '30–60', 'submitPublicQuote'])
  requireText(teams, feature, `Teams & Wholesale ${feature}`);
for (const rpc of [
  'create_or_get_my_organization',
  'staff_set_shipping_quote',
  'staff_update_order_workflow',
  'staff_update_quote',
  'staff_set_exchange_rate',
  'staff_publish_design_proof',
  'customer_respond_to_design',
  'customer_respond_to_quote',
])
  requireText(migration, rpc, `database RPC ${rpc}`);
for (const table of [
  'custom_designs',
  'custom_design_versions',
  'team_rosters',
  'quote_requests',
  'production_updates',
  'operations_audit_log',
])
  requireText(migration, table, `database table ${table}`);
for (const rule of ['pending_shipping_quote', 'half', 'full'])
  requireText(checkout, rule, `checkout flow ${rule}`);
for (const token of [
  'LH_MOBILE_PERFORMANCE',
  '0.99',
  'report.runCount',
  'report.metrics?.lcpMs',
  'report.metrics?.cls',
  'report.metrics?.tbtMs',
])
  requireText(lighthouse, token, `repeated Lighthouse gate ${token}`);
if (!/Number\(report\.runCount\)\s*<\s*3/.test(lighthouse))
  failures.push('Missing required implementation: repeated Lighthouse gate runCount < 3');
requireText(lighthouse, 'desktop', 'desktop Lighthouse gate');
for (const threshold of [
  '--test-coverage-lines=100',
  '--test-coverage-functions=100',
  '--test-coverage-branches=100',
])
  requireText(requireFile('scripts/run-coverage.mjs'), threshold, `real coverage ${threshold}`);
for (const token of [
  'all: true',
  'lines: 100',
  'branches: 100',
  'functions: 100',
  'statements: 100',
])
  requireText(vitestConfig, token, `full-project coverage ${token}`);
requireText(vitestConfig, "'src/**/*.{js,jsx,ts,tsx}'", 'all src files included in coverage');
requireText(vitestConfig, "'api/**/*.{js,ts}'", 'all API files included in coverage');
requireText(coverageAudit, 'missingFromCoverage', 'coverage scope audit');
requireText(
  packageJson,
  '"coverage": "npm run coverage:node && npm run coverage:project"',
  'full-project runtime coverage command',
);

requireText(config, "name: 'Shababuna'", 'English brand name');
requireText(config, "nameAr: 'شبابنا'", 'Arabic brand name');
requireText(config, "en: 'BUILT DIFFERENT.'", 'brand slogan');
requireText(shipping, 'amount: 20', '20 LYD Libya delivery fee');
requireText(shipping, 'LIBYA_FREE_SHIPPING_USD = 70', '70 USD free-delivery threshold');
requireText(
  shipping,
  'fallbackUsdToLydRate',
  'canonical USD to LYD rate reference for 630 LYD display',
);
requireText(shipping, 'minHours: 24, maxHours: 72', '24–72 hour ready delivery');
requireText(shipping, 'minDays: 14, maxDays: 18', '14–18 day standard Libya delivery');
requireText(shipping, 'minDays: 30, maxDays: 60', '30–60 day custom production');

const customMinimums = Object.fromEntries(
  CUSTOM_PRODUCT_TYPES.map((item) => [item.key, item.minimum]),
);
if (CUSTOM_PRODUCT_TYPES.length < 12)
  failures.push('All 12 required custom product types are not registered');
if (
  customMinimums['game-set'] !== 10 ||
  customMinimums.basketball !== 6 ||
  customMinimums['hoop-padding'] !== 1
)
  failures.push('Custom minimums do not match apparel 10, basketballs 6, hoop padding 1');
if (
  readyToShipProducts().some(
    (product) => !product.inventoryVerified || product.inventoryLocation !== 'LY',
  )
)
  failures.push('Ready-to-ship exposes unverified or non-Libya inventory');
if (
  !products.some((product) => product.wholesaleAvailable && product.wholesalePrice < product.price)
)
  failures.push('Wholesale catalogue and lower pricing are missing');
if (
  products.some(
    (product) => product.madeInUSA && (!product.claimVerified || !product.claimEvidenceReference),
  )
)
  failures.push('Unverified Made in USA claim is visible');
if (catalogProducts.some((product) => product.customizable && !isProductVisible(product)))
  failures.push('Custom product definitions must not remain hidden');

for (const forbidden of [
  'HERO VIDEO SLOT',
  'MEDIA SLOT',
  'PRODUCT MEDIA PLACEHOLDER',
  'TO' + 'DO',
  'FIX' + 'ME',
]) {
  if (source.includes(forbidden))
    failures.push(`Visible or unfinished marker remains in active source: ${forbidden}`);
}

if (failures.length) {
  console.error(
    `Source architecture validation failed:\n${failures.map((item) => `- ${item}`).join('\n')}`,
  );
  process.exit(1);
}
console.info(
  `Source architecture validation passed: ${products.length} active storefront products, ${CUSTOM_PRODUCT_TYPES.length} custom product types, B2B and operations source paths, and enforced external release gates. This is not a Production Verified result.`,
);

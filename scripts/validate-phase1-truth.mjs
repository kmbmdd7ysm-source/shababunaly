import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { products, catalogProducts } from '../src/data/products.ts';
import { products as sourceLhaProducts } from '../src/data/lhaProducts.ts';
import { kobeGoatProducts } from '../src/data/kobeGoatProducts.ts';
import { commerceConfig, roundStorePrice } from '../src/config/commerce.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const checks = [];
const check = (condition, label, details = '') => {
  checks.push({ label, ok: Boolean(condition), details });
  if (!condition) failures.push(`${label}${details ? ` — ${details}` : ''}`);
};
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const cleanPrice = (value) => Number(value) === 0 || (Number.isInteger(Number(value)) && Number(value) % 5 === 0);

const lha = products.filter((product) => String(product.brand || '').toUpperCase() === 'LHA');
const kobe = products.filter((product) => String(product.collection || '') === 'kobe');
const expectedKobeUsd = roundStorePrice(1200 / commerceConfig.fallbackUsdToLydRate);

check(sourceLhaProducts.length === 25, 'LHA source product count is 25', `found ${sourceLhaProducts.length}`);
check(!read('src/data/lhaProducts.ts').includes('stockPerVariant:'), 'LHA source has no stale per-variant stock declaration');
check(lha.length === 25, 'Published LHA product count is 25', `found ${lha.length}`);
for (const product of lha) {
  const colors = Array.isArray(product.colors) ? product.colors : [];
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const stockByColor = product.stockByColor && typeof product.stockByColor === 'object' ? product.stockByColor : {};
  const colorKeys = colors.map((color) => String(color?.key || '')).filter(Boolean);
  check(product.status === 'active' && product.comingSoon !== true, `LHA ${product.id} is active`);
  check(product.inventoryVerified === true && product.inventoryTracking === true, `LHA ${product.id} inventory is verified/tracked`);
  check(product.inventorySource === 'owner_confirmed_lha_color_stock', `LHA ${product.id} uses owner-confirmed stock source`);
  check(product.inventoryLocation === 'LY', `LHA ${product.id} inventory location is Libya`);
  check(product.readyToShip === true, `LHA ${product.id} is ready-to-ship from verified stock`);
  check(Number(product.stockPerColor) === 5, `LHA ${product.id} has five pieces per color`);
  check(Number(product.stock) === colorKeys.length * 5, `LHA ${product.id} total stock equals colors × 5`, `stock=${product.stock}, colors=${colorKeys.length}`);
  for (const colorKey of colorKeys) {
    check(Number(stockByColor[colorKey]) === 5, `LHA ${product.id}/${colorKey} pool equals 5`);
    const colorVariants = variants.filter((variant) => String(variant.color || '') === colorKey);
    check(colorVariants.length > 0, `LHA ${product.id}/${colorKey} has variants`);
    for (const variant of colorVariants) {
      check(variant.inventoryPoolKey === `color:${colorKey}`, `LHA ${product.id}/${variant.sku} shares the correct color pool`);
      check(Number(variant.inventoryPoolStock) === 5, `LHA ${product.id}/${variant.sku} pool stock equals 5`);
      check(variant.inventoryVerified === true && variant.inventoryTracking === true, `LHA ${product.id}/${variant.sku} inventory is verified/tracked`);
    }
  }
}

check(kobeGoatProducts.length === 50, 'Kobe source product count is 50', `found ${kobeGoatProducts.length}`);
check(kobe.length === 50, 'Published Kobe product count is 50', `found ${kobe.length}`);
for (const product of kobe) {
  const sizes = Array.isArray(product.sizes) ? product.sizes.map(Number) : [];
  check(Number(product.priceLydSource) === 1200, `Kobe ${product.id} source price is 1200 LYD`);
  check(product.pricingRateSource === 'site_exchange_rate', `Kobe ${product.id} uses site exchange-rate source`);
  check(Number(product.price) === expectedKobeUsd, `Kobe ${product.id} USD price uses site rate + clean rounding`, `expected ${expectedKobeUsd}, found ${product.price}`);
  check(product.quoteOnly === false, `Kobe ${product.id} is directly priced, not quote-only`);
  check(product.sizeSystem === 'US Men', `Kobe ${product.id} size system is US Men`);
  check(Number(product.maxUsMensSize) === 12 && Number(product.maxEuSize) === 46, `Kobe ${product.id} max size is US 12 / EU 46`);
  check(sizes.length > 0 && Math.max(...sizes) <= 12, `Kobe ${product.id} has no size above US 12`, `sizes=${sizes.join(',')}`);
}

const dirtyRetail = products.filter((product) => !cleanPrice(product.price));
check(dirtyRetail.length === 0, 'Every published retail price is a clean whole 5-unit step', dirtyRetail.map((p) => `${p.id}:${p.price}`).slice(0, 10).join(', '));
const dirtyWholesale = products.filter((product) => Number(product.wholesalePrice || 0) > 0 && !cleanPrice(product.wholesalePrice));
check(dirtyWholesale.length === 0, 'Every published wholesale price is a clean whole 5-unit step', dirtyWholesale.map((p) => `${p.id}:${p.wholesalePrice}`).slice(0, 10).join(', '));

const about = read('src/pages/AboutPage.tsx');
for (const forbidden of ['Brand film · reserved', 'No final footage exists yet', 'Libyan bank-card options', 'manufacturing in the United States']) {
  check(!about.includes(forbidden), `About page does not expose unsupported claim/placeholder: ${forbidden}`);
}

const app = read('src/App.tsx');
for (const route of ['/programs', '/events', '/online-training', '/coaches']) {
  check(!new RegExp(`<Route\\s+path=["']${route.replace('/', '\\/')}`).test(app), `Incomplete route ${route} is not published`);
}
const safeReturnPaths = read('src/utils/safeReturnPath.ts');
for (const route of ['/programs', '/events', '/online-training', '/coaches']) {
  check(!safeReturnPaths.includes(`'${route}'`), `Unpublished route ${route} is removed from safe return targets`);
}

check(/path=["']\/our-work["'][^>]*Navigate to=["']\/stories["']/.test(app) || /path=["']\/our-work["'][\s\S]{0,180}to=["']\/stories["']/.test(app), '/our-work redirects to /stories');
check(/path=["']\/basketball["'][\s\S]{0,180}to=["']\/shop\/basketballs["']/.test(app), '/basketball redirects to the basketball shop hub');

const navigation = read('src/data/navigation.ts');
check(navigation.includes("to:'/shop/basketballs'") || navigation.includes("to: '/shop/basketballs'"), 'Main navigation sends Basketball to /shop/basketballs');
check(navigation.includes("'/refund-policy'") || navigation.includes('"/refund-policy"'), 'Footer navigation includes Refund Policy');

const releases = read('src/pages/ReleasesPage.tsx');
check(/releaseInfo\?\.verified\s*!==\s*true/.test(releases), 'Release dates require verified === true');
check(!/releaseInfo\?\.date\s*\|\|\s*product\.releaseDate/.test(releases), 'Release dates do not fall back to legacy unverified releaseDate');

const money = read('src/services/money.ts');
check(money.includes('roundStorePrice'), 'Money conversion uses shared clean-price rounding');
check(commerceConfig.fallbackUsdToLydRate === 9, 'Site exchange-rate source remains the project rate (1 USD = 9 LYD)', `rate=${commerceConfig.fallbackUsdToLydRate}`);

const generatedCatalog = read('supabase/generated/product_catalog.sql');
check(!generatedCatalog.includes('owner_confirmed_lha_ready'), 'Generated trusted catalogue contains no stale LHA inventory source');
check(generatedCatalog.includes('owner_confirmed_lha_color_stock'), 'Generated trusted catalogue contains owner-confirmed LHA color stock');
check(generatedCatalog.includes('\"inventoryPoolKey\":\"color:'), 'Generated trusted catalogue serializes shared color-pool keys');
check(generatedCatalog.includes('inventory_quantity=case') && generatedCatalog.includes('when pc.inventory_tracking=true and pc.inventory_quantity is not null then pc.inventory_quantity') && generatedCatalog.includes('with pool_floor as') && generatedCatalog.includes("variant_data->>'inventorySource'='owner_confirmed_lha_color_stock'"), 'Catalogue deploy preserves and reconciles already-decremented tracked LHA pool inventory');

const poolMigration = read('supabase/migrations/20260818010000_lha_color_inventory_pools.sql');
check(poolMigration.includes('pg_advisory_xact_lock'), 'Transactional checkout serializes concurrent shared-pool orders');
check(poolMigration.includes('requested_pools'), 'Transactional checkout aggregates quantities by shared color pool');
check(poolMigration.includes("variant_data->>'inventoryPoolKey'"), 'Transactional checkout reads trusted inventory pool metadata');
check(poolMigration.includes('pc.inventory_quantity - rp.quantity'), 'Transactional checkout decrements every size row in the shared color pool');

const report = {
  generatedAt: new Date().toISOString(),
  phase: 1,
  sourceOfTruth: 'user-confirmed business rules + current project data',
  counts: {
    catalogRecords: catalogProducts.length,
    publishedProducts: products.length,
    lhaProducts: lha.length,
    kobeProducts: kobe.length,
    siteUsdToLydRate: commerceConfig.fallbackUsdToLydRate,
    kobeSourcePriceLyd: 1200,
    kobeStorePriceUsd: expectedKobeUsd,
  },
  passed: failures.length === 0,
  checks,
  failures,
};

const outDir = path.join(root, 'reports', 'phase1');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'truth-audit.json'), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(outDir, 'truth-audit.md'), [
  '# Phase 1 Truth Audit',
  '',
  `Generated: ${report.generatedAt}`,
  `Result: **${report.passed ? 'PASS' : 'FAIL'}**`,
  '',
  `- Published products: ${products.length}`,
  `- LHA products: ${lha.length}; verified owner stock: 5 pieces per listed color`,
  `- Kobe products: ${kobe.length}; source price: 1200 LYD; site rate: ${commerceConfig.fallbackUsdToLydRate}; clean USD store price: ${expectedKobeUsd}`,
  `- Checks executed: ${checks.length}`,
  `- Failures: ${failures.length}`,
  '',
  ...(failures.length ? ['## Failures', ...failures.map((failure) => `- ${failure}`)] : ['All Phase 1 hard assertions passed.']),
  '',
].join('\n'));

console.log(`Phase 1 truth audit: ${checks.length} checks, ${failures.length} failure(s).`);
console.log(`Kobe price: 1200 LYD / site rate ${commerceConfig.fallbackUsdToLydRate} => ${expectedKobeUsd} USD clean store price.`);
if (failures.length) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exit(1);
}
console.log('PASS: Phase 1 business truth is enforced in runtime data and public-route source.');

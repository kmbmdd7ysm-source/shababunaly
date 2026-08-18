import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { catalogProducts, products, lhaStoreProducts, readyToShipProducts } from '../src/data/products.ts';
import { hasRealProductMedia, isProductPurchasable } from '../src/utils/productEligibility.ts';
import { getSiteRateStorePrice } from '../src/utils/siteRatePricing.ts';

const ROOT = process.cwd();
const failures = [];
const checks = [];
const record = (name, ok, detail = '') => {
  checks.push({ name, ok, detail });
  if (!ok) failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
};
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(ROOT, file));

record('catalog:master-119', catalogProducts.length === 119, `found ${catalogProducts.length}`);
record('catalog:published-75', products.length === 75, `found ${products.length}`);
record('catalog:hidden-incomplete-44', catalogProducts.length - products.length === 44);
record('catalog:published-media-real', products.every(hasRealProductMedia));
record('catalog:ready-lha-25', readyToShipProducts().length === 25);
record('lha:products-25', lhaStoreProducts().length === 25);

const lha = lhaStoreProducts();
for (const product of lha) {
  record(`lha:${product.id}:capacity`, Number(product.stockPerColor) === 5);
  const byPool = new Map();
  for (const variant of product.variants || []) {
    const key = String(variant.inventoryPoolKey || '');
    if (!key) continue;
    if (!byPool.has(key)) byPool.set(key, []);
    byPool.get(key).push(variant);
  }
  for (const [pool, variants] of byPool) {
    record(`lha:${product.id}:${pool}:five`, variants.every((variant) => Number(variant.inventoryPoolStock) === 5));
  }
}
record('lha:no-stale-stockPerVariant', !read('src/data/lhaProducts.ts').includes('stockPerVariant:'));
const zeroPricePublished = products.filter((product) => Number(product.price) <= 0);
record('commerce:zero-price-is-quote-only', zeroPricePublished.length > 0 && zeroPricePublished.every((product) => product.quoteOnly === true));
record('commerce:zero-price-not-retail', zeroPricePublished.every((product) => product.retailAvailable === false && product.wholesaleAvailable === false));
record('commerce:zero-price-not-purchasable', zeroPricePublished.every((product) => !isProductPurchasable(product)));

const kobe = catalogProducts.filter((product) => product.pricingRateSource === 'site_exchange_rate');
record('kobe:count-50', kobe.length === 50, `found ${kobe.length}`);
for (const product of kobe) {
  const sizes = (product.variants || []).map((variant) => Number(variant.size)).filter(Number.isFinite);
  record(`kobe:${product.id}:1200-lyd`, Number(product.priceLydSource) === 1200);
  record(`kobe:${product.id}:max-us12`, !sizes.length || Math.max(...sizes) <= 12);
}
record('kobe:rate-9-clean-135', getSiteRateStorePrice(1200, 9) === 135);
record('kobe:rate-8-clean-150', getSiteRateStorePrice(1200, 8) === 150);

const generated = read('supabase/generated/product_catalog.sql');
const trustedRows = generated.split('\n').filter((line) => line.startsWith("('")).length;
record('catalog:trusted-rows-786', trustedRows === 786, `found ${trustedRows}`);
record('catalog:deploy-preserves-tracked-stock', generated.includes('inventory_quantity=case') && generated.includes('when pc.inventory_tracking=true and pc.inventory_quantity is not null then pc.inventory_quantity') && generated.includes('with pool_floor as') && generated.includes("variant_data->>'inventorySource'='owner_confirmed_lha_color_stock'"));
record('catalog:deploy-reprices-site-rate', generated.includes("variant_data->>'pricingRateSource'='site_exchange_rate'") && generated.includes("variant_data->>'priceLydSource'"));

const catalogContext = read('src/context/CatalogContext.tsx');
record('cloud:authoritative-no-static-resurrection', catalogContext.includes('{ authoritative: true }') && catalogContext.includes('return authoritative ? [] : baseProducts'));
record('cloud:lha-stock-from-db', catalogContext.includes('Number(row.inventory_quantity)') && catalogContext.includes('stockByColor'));
record('cloud:local-product-media-trusted', catalogContext.includes('trustedLocalMediaPath') && read('src/services/operations.ts').includes('product_image_must_be_local'));

const formspree = read('src/services/formspree.ts');
const quoteClient = read('src/services/publicQuotes.ts');
const specialClient = read('src/services/specialRequests.ts');
record('forms:no-browser-third-party-post', !formspree.includes('fetch(FORMSPREE_ENDPOINT') && formspree.includes("fetch('/api/formspree'") && !read('src/context/ReadinessContext.tsx').includes('https://formspree.io/'));
record('quotes:server-only-fallback', !quoteClient.includes('sendFormspree') && quoteClient.includes("fetch('/api/public-quote-request'"));
record('special:server-only-fallback', !specialClient.includes('sendFormspree') && specialClient.includes("fetch('/api/special-request'"));
record('quotes:email-only-explicit', read('api/public-quote-request.ts').includes("status: 'email_only'"));
record('special:email-only-explicit', read('api/special-request.ts').includes("status: 'email_only'"));

const showcase = read('src/components/custom/CustomJerseyShowcase.tsx');
record('custom3d:no-eager-model-viewer-import', !showcase.startsWith("import '../product/engines/loadModelViewer.ts'"));
record('custom3d:explicit-opt-in', showcase.includes("import(" + "'../product/engines/loadModelViewer.ts')") && showcase.includes('modelRequested') && showcase.includes('Open 3D preview'));

const migration = read('supabase/migrations/20260818030000_independent_catalog_hardening.sql');
const poolReconciliation = read('supabase/migrations/20260818040000_lha_pool_reconciliation.sql');
record('db:staff-color-pool-lock', migration.includes('pg_advisory_xact_lock') && migration.includes("variant_data->>'inventoryPoolKey'") && poolReconciliation.includes('with pool_floor as') && poolReconciliation.includes('min(inventory_quantity) as available'));
record('db:manual-kobe-price-locked', migration.includes('site_rate_price_locked'));
record('db:rate-change-reprices-kobe', migration.includes("variant_data->>'pricingRateSource'='site_exchange_rate'") && migration.includes("variant_data->>'priceLydSource'"));

// Customer-visible product media must be local, present and primary images unique by bytes.
const mediaRefs = [];
const pushMedia = (product, key, value) => {
  if (typeof value === 'string' && value.trim()) mediaRefs.push({ product: product.id, key, value });
};
for (const product of products) {
  pushMedia(product, 'image', product.image);
  pushMedia(product, 'hoverImage', product.hoverImage);
  pushMedia(product, 'socialImage', product.socialImage);
  for (const [index, entry] of (product.gallery || []).entries())
    pushMedia(product, `gallery:${index}`, typeof entry === 'string' ? entry : entry?.src);
  for (const [index, entry] of (product.spin360 || []).entries?.() || [])
    pushMedia(product, `spin360:${index}`, typeof entry === 'string' ? entry : entry?.src);
}
const externalMedia = mediaRefs.filter(({ value }) => /^https?:/i.test(value));
const localMedia = mediaRefs.filter(({ value }) => value.startsWith('/'));
const missingMedia = localMedia.filter(({ value }) => !exists(`public${value}`));
record('media:visible-no-hotlinks', externalMedia.length === 0, `found ${externalMedia.length}`);
record('media:visible-local-present', missingMedia.length === 0, `missing ${missingMedia.length}`);
const primaryHashes = new Map();
for (const product of products) {
  const file = path.join(ROOT, `public${product.image}`);
  if (!fs.existsSync(file)) continue;
  const hash = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  if (!primaryHashes.has(hash)) primaryHashes.set(hash, []);
  primaryHashes.get(hash).push(product.id);
}
const duplicatePrimaryGroups = [...primaryHashes.values()].filter((group) => group.length > 1);
record('media:primary-byte-unique', duplicatePrimaryGroups.length === 0, `duplicate groups ${duplicatePrimaryGroups.length}`);

// Independent source integrity: relative imports resolve, JSON parses, no merge markers.
const sourceRoots = ['src', 'api', 'scripts', 'tests', 'e2e', 'supabase/functions'];
const sourceExtensions = new Set(['.js','.jsx','.ts','.tsx','.mjs','.cjs']);
const sourceFiles = [];
const jsonFiles = [];
const walkSource = (dir) => {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkSource(full);
    else if (sourceExtensions.has(path.extname(entry.name))) sourceFiles.push(full);
  }
};
for (const root of sourceRoots) walkSource(path.join(ROOT, root));

// Parse every active JSON payload in the package, not only JSON colocated with source.
// Historical archives and generated dependency/build folders are intentionally excluded
// because they are not part of the active release surface.
const skippedJsonDirs = new Set(['node_modules', '.git', 'dist', '.vite', 'coverage']);
const walkJson = (dir) => {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && skippedJsonDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (path.relative(ROOT, full).replaceAll('\\','/').startsWith('reports/archive/')) continue;
      walkJson(full);
    } else if (entry.name.endsWith('.json')) jsonFiles.push(full);
  }
};
walkJson(ROOT);
let mergeMarkers = 0;
let missingImports = 0;
const importRe = /(?:from\s*|import\s*\()(['"])(\.[^'"]+)\1/g;
const candidatesFor = (base) => [
  base,
  ...['.ts','.tsx','.js','.jsx','.mjs','.cjs','.json','.css'].map((ext) => `${base}${ext}`),
  ...(base.endsWith('.js') ? [base.slice(0, -3) + '.ts', base.slice(0, -3) + '.tsx'] : []),
  ...['index.ts','index.tsx','index.js','index.jsx','index.mjs'].map((name) => path.join(base,name)),
];
for (const file of sourceFiles) {
  const text = fs.readFileSync(file, 'utf8');
  if (/^(<<<<<<<|=======|>>>>>>>)/m.test(text)) mergeMarkers += 1;
  let match;
  while ((match = importRe.exec(text))) {
    const spec = match[2];
    const base = path.resolve(path.dirname(file), spec);
    if (!candidatesFor(base).some((candidate) => fs.existsSync(candidate))) missingImports += 1;
  }
}
let invalidJson = 0;
for (const file of jsonFiles) {
  try { JSON.parse(fs.readFileSync(file, 'utf8')); } catch { invalidJson += 1; }
}
record('source:no-merge-markers', mergeMarkers === 0, `files ${mergeMarkers}`);
record('source:relative-imports-resolve', missingImports === 0, `missing ${missingImports}`);
record('source:json-valid', invalidJson === 0, `invalid ${invalidJson}`);

const report = {
  generatedAt: new Date().toISOString(),
  status: failures.length ? 'FAIL' : 'PASS',
  checks: checks.length,
  failures: failures.length,
  metrics: {
    sourceFilesAudited: sourceFiles.length,
    jsonFilesAudited: jsonFiles.length,
    masterProducts: catalogProducts.length,
    publishedProducts: products.length,
    hiddenProducts: catalogProducts.length - products.length,
    masterVariants: catalogProducts.reduce((sum,p) => sum + (p.variants?.length || 0), 0),
    trustedVariants: trustedRows,
    visibleMediaReferences: mediaRefs.length,
    uniqueVisibleMediaPaths: new Set(mediaRefs.map(({value}) => value)).size,
    primaryImages: products.length,
    primaryImageDuplicateGroups: duplicatePrimaryGroups.length,
  },
  results: checks,
};
fs.mkdirSync(path.join(ROOT, 'reports/final-independent'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'reports/final-independent/independent-hardening-audit.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`Independent final audit: ${checks.length} checks, ${failures.length} failure(s); ${sourceFiles.length} source files and ${jsonFiles.length} JSON files inspected.`);
console.log(`Catalogue: ${catalogProducts.length} master / ${products.length} published / ${trustedRows} trusted variants.`);
console.log(`Visible product media: ${mediaRefs.length} refs / ${new Set(mediaRefs.map(({value}) => value)).size} unique paths / ${duplicatePrimaryGroups.length} duplicate primary groups.`);
if (failures.length) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exit(1);
}
console.log('PASS: independent source, business-truth and storefront hardening invariants hold.');

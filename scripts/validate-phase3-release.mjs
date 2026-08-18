import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { catalogProducts, products, readyToShipProducts } from '../src/data/products.ts';
import { commerceConfig, roundStorePrice } from '../src/config/commerce.ts';
import { hasRealProductMedia } from '../src/utils/productEligibility.ts';
import { getSiteRateStorePrice } from '../src/utils/siteRatePricing.ts';

const ROOT = process.cwd();
const failures = [];
const warnings = [];
const checks = [];
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(ROOT, file));
const record = (name, ok, detail = '') => {
  checks.push({ name, ok: Boolean(ok), detail });
  if (!ok) failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
};
const warn = (name, detail = '') => warnings.push(`${name}${detail ? ` — ${detail}` : ''}`);

const app = read('src/App.tsx');
const index = read('index.html');
const bootstrap = read('public/locale-bootstrap.js');
const foundation = read('src/styles/foundation.css');
const miscCss = read('src/styles/domain-misc.css');
const homeCss = read('src/styles/home.css');
const heroMap = read('src/data/localHeroMedia.ts');
const heroPlayer = read('src/components/experience/CinematicHero.tsx');
const editorial = read('src/components/common/EditorialMedia.tsx');
const generator = read('scripts/generate-static-pages.mjs');
const sitemap = read('public/sitemap.xml');
const teams = read('src/pages/TeamsWholesalePage.tsx');
const product = read('src/pages/ProductPage.tsx');
const help = read('src/pages/HelpPage.tsx');
const faqs = read('src/data/faqs.ts');
const legal = read('src/data/legal.ts');
const checkout = read('src/pages/CheckoutPage.tsx');
const advanced = read('src/pages/AdvancedCustomizePage.tsx');
const orgWorkspace = read('src/components/account/OrganizationWorkspace.tsx');
const manifest = read('public/site.webmanifest');
const llms = read('public/llms.txt');
const structuredData = read('scripts/structured-data.mjs');
const shippingConfig = read('src/config/shipping.ts');
const simplePdf = read('src/utils/simplePdf.ts');
const homePage = read('src/pages/HomePage.tsx');
const translations = read('src/data/translations.ts');

// Route target integrity.
const lazyImports = [...app.matchAll(/const\s+(\w+)\s*=\s*lazy\(\(\)\s*=>\s*import\(['"]\.\/pages\/([^'"]+)['"]\)\)/g)];
record('routes:lazy-imports-found', lazyImports.length >= 20, `found ${lazyImports.length}`);
for (const [, name, target] of lazyImports) {
  const candidates = [
    `src/pages/${target}.tsx`,
    `src/pages/${target}.ts`,
    `src/pages/${target}.jsx`,
    `src/pages/${target}.js`,
  ];
  record(`route-target:${name}`, candidates.some(exists), target);
}
for (const route of ['/programs', '/events', '/online-training', '/coaches']) {
  record(`route-unpublished:${route}`, !new RegExp(`<Route\\s+path=["']${route.replace('/', '\\/')}`).test(app));
  record(`sitemap-unpublished:${route}`, !sitemap.includes(`<loc>https://shababuna.ly${route}</loc>`));
}
record('route:our-work-redirects', /path=["']\/our-work["'][\s\S]{0,180}to=["']\/stories["']/.test(app));
record('sitemap:stories-current', sitemap.includes('<loc>https://shababuna.ly/stories</loc>'));
record('sitemap:no-our-work-duplicate', !sitemap.includes('<loc>https://shababuna.ly/our-work</loc>'));

// Sitemap has no duplicate URL entries.
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
record('sitemap:no-duplicates', sitemapUrls.length === new Set(sitemapUrls).size, `${sitemapUrls.length} urls`);

// Static route generator must not repeat a literal prerender path.
const generatorPaths = [...generator.matchAll(/\bpath:\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
const repeatedGeneratorPaths = [...new Set(generatorPaths.filter((value, index) => generatorPaths.indexOf(value) !== index))];
record('prerender:no-duplicate-static-paths', repeatedGeneratorPaths.length === 0, repeatedGeneratorPaths.join(', '));

// Customer-facing claims must not imply an unverified factory/payment contract.
const publicClaimSource = [index, teams, product, help, faqs, legal, checkout, advanced, orgWorkspace].join('\n');
for (const phrase of [
  '50% before production / 50% on arrival',
  '50% before production and 50% when the goods arrive',
  '50% deposit / 50% on arrival',
  '50% confirms production',
  'Standard custom terms: 50%',
  'Estimated production window: 30–60',
  'Wholesale estimate: 30–60',
]) {
  record(`claims:no-fixed-contract:${phrase}`, !publicClaimSource.includes(phrase));
}
record('seo:no-unverified-custom-manufacturing-claim', !/custom manufacturing/i.test(index));
record('seo:manifest-no-unverified-manufacturing-claim', !/custom manufacturing/i.test(manifest));
record('seo:llms-no-unverified-manufacturing-claim', !/custom manufacturing/i.test(llms));
record('seo:structured-data-no-unverified-manufacturing-claim', !/custom manufacturing/i.test(structuredData));
record('seo:generator-no-unverified-manufacturing-claim', !/custom manufacturing/i.test(generator));
record('customer-copy:footer-no-unverified-manufacturing-claim', !/custom manufacturing/i.test(translations));
record('customer-copy:no-fixed-custom-30-60-shipping', !/30[–-]60\s*days/i.test(shippingConfig));
record('customer-copy:no-fixed-custom-30-60-pdf', !/30[–-]60\s*days/i.test(simplePdf));
record('home:stories-direct-link', !homePage.includes('to="/our-work"'));
record('llms:stories-current-route', llms.includes('- /stories') && !llms.includes('- /our-work'));
record('schema:clean-integer-price', structuredData.includes('price: String(Math.round(Number(product.price)))'));
record('teams:quote-specific-payment-terms', teams.includes("paymentTerms: 'Confirmed in the approved quote'"));
record('advanced:quote-specific-payment-terms', advanced.includes("paymentTerms: 'Confirmed in the approved quote'"));

// Hero runtime: native browser video, no player chrome, optimized local posters.
const heroKeys = ['home','shop','footwear','clothing','accessories','basketballs','equipment','shoeFinder','custom','discover','teams','stories','releases'];
for (const key of heroKeys) record(`hero:${key}`, new RegExp(`\\b${key}: entry\\(`).test(heroMap));
const remoteVideos = [...heroMap.matchAll(/https:\/\/underarmour\.scene7\.com\/is\/content\/Underarmour\/[A-Za-z0-9_-]+/g)].map((m) => m[0]);
record('hero:13-direct-video-sources', remoteVideos.length === 13, `found ${remoteVideos.length}`);
record('hero:13-unique-video-sources', new Set(remoteVideos).size === 13, `unique ${new Set(remoteVideos).size}`);
record('hero:native-video-components', heroPlayer.includes('<video') && editorial.includes('<video') && heroPlayer.includes('autoPlay') && editorial.includes('autoPlay'));
record('hero:no-youtube-vimeo-runtime', !/(youtube|youtu\.be|ytimg|vimeo|<iframe)/i.test(`${heroMap}\n${heroPlayer}\n${editorial}`));
record('hero:no-decorative-infinite-scroll-loop', !/gw-hero-scroll-tick[\s\S]{0,220}infinite/.test(homeCss));

const posterRefs = [...heroMap.matchAll(/['"](\/media\/hero-posters\/[^'"]+)['"]/g)].map((m) => m[1]);
const uniquePosters = [...new Set(posterRefs)];
record('hero:13-local-posters', uniquePosters.length === 13, `found ${uniquePosters.length}`);
let posterBytes = 0;
for (const ref of uniquePosters) {
  const file = `public${ref}`;
  record(`hero-poster:exists:${path.basename(ref)}`, exists(file));
  record(`hero-poster:webp:${path.basename(ref)}`, ref.endsWith('.webp'));
  if (exists(file)) {
    const size = fs.statSync(path.join(ROOT, file)).size;
    posterBytes += size;
    record(`hero-poster:budget:${path.basename(ref)}`, size <= 200 * 1024, `${size} bytes`);
  }
}
record('hero-poster:aggregate-budget', posterBytes <= 800 * 1024, `${posterBytes} bytes`);
if (remoteVideos.some((url) => /^https:\/\//.test(url))) {
  warn('hero-video-first-party-ownership', '13 hero videos remain direct external MP4 sources; local licensed video payloads were not present in the user ZIP.');
}

// First-paint locale, keyboard entry and responsive invariants.
record('locale:first-paint-lang-dir', bootstrap.includes('root.lang = language') && bootstrap.includes("root.dir = language === 'ar' ? 'rtl' : 'ltr'"));
record('a11y:skip-link-localized', bootstrap.includes("'تخطَّ إلى المحتوى'") && index.includes('id="skip-link"'));
record('a11y:skip-link-logical-position', /#skip-link[\s\S]{0,260}inset-inline-start:\s*50%/.test(miscCss));
record('responsive:viewport-meta', /name="viewport"\s+content="width=device-width, initial-scale=1\.0"/.test(index));
record('responsive:root-inline-guard', foundation.includes('max-inline-size: 100%') && foundation.includes('min-inline-size: 0'));
record('responsive:media-inline-guard', /img,[\s\S]{0,160}video,[\s\S]{0,160}max-inline-size:\s*100%/.test(foundation));
record('responsive:main-overflow-guard', foundation.includes('#main-content') && /overflow-x:\s*clip/.test(foundation));
record('a11y:reduced-motion-global', /@media \(prefers-reduced-motion: reduce\)[\s\S]{0,500}animation-iteration-count:\s*1/.test(foundation));

// Phase 1 business truth is still intact in the exact runtime catalogue.
const lha = products.filter((item) => String(item.brand || '').toUpperCase() === 'LHA');
const kobe = products.filter((item) => String(item.collection || '') === 'kobe');
record('truth:lha-count-25', lha.length === 25, `found ${lha.length}`);
record('truth:lha-stock-five-per-color', lha.every((item) => Number(item.stockPerColor) === 5));
record('truth:kobe-count-50', kobe.length === 50, `found ${kobe.length}`);
const expectedKobe = roundStorePrice(1200 / commerceConfig.fallbackUsdToLydRate);
record('truth:kobe-site-rate-price', kobe.every((item) => Number(item.price) === expectedKobe), `expected ${expectedKobe}`);
record('truth:kobe-max-us12', kobe.every((item) => Math.max(...(item.sizes || []).map(Number)) <= 12));
record('truth:clean-retail-prices', products.every((item) => Number.isInteger(Number(item.price)) && Number(item.price) % 5 === 0));


// Independent hardening invariants added after rebuilding the expired final package.
// These checks deliberately overlap runtime, deploy, server and customer-facing layers
// so a future refactor cannot silently re-introduce the exact failures found in the
// independent audit. 47 assertions are added here on top of the original Phase 3 set.
const masterVariantCount = catalogProducts.reduce((sum, item) => sum + (item.variants?.length || 0), 0);
const trustedCatalogSql = read('supabase/generated/product_catalog.sql');
const trustedRowCount = trustedCatalogSql.split('\n').filter((line) => line.startsWith("('")).length;
const lhaSource = read('src/data/lhaProducts.ts');
const commerceContext = read('src/context/CommerceContext.tsx');
const catalogContext = read('src/context/CatalogContext.tsx');
const formspreeService = read('src/services/formspree.ts');
const quoteService = read('src/services/publicQuotes.ts');
const specialService = read('src/services/specialRequests.ts');
const quoteApi = read('api/public-quote-request.ts');
const specialApi = read('api/special-request.ts');
const customizePage = read('src/pages/CustomizePage.tsx');
const showcase = read('src/components/custom/CustomJerseyShowcase.tsx');
const hardeningMigration = read('supabase/migrations/20260818030000_independent_catalog_hardening.sql');
const poolReconciliationMigration = read('supabase/migrations/20260818040000_lha_pool_reconciliation.sql');
const trustedStaticCatalog = read('api/_trusted-static-catalog.ts');

record('independent:catalog-master-119', catalogProducts.length === 119, `found ${catalogProducts.length}`); // 1
record('independent:catalog-published-75', products.length === 75, `found ${products.length}`); // 2
record('independent:catalog-hidden-44', catalogProducts.length - products.length === 44, `hidden ${catalogProducts.length - products.length}`); // 3
record('independent:published-media-real', products.every(hasRealProductMedia)); // 4
record('independent:master-variants-1482', masterVariantCount === 1482, `found ${masterVariantCount}`); // 5
record('independent:trusted-variants-786', trustedRowCount === 786, `found ${trustedRowCount}`); // 6
record('independent:generated-trusted-rows-786', trustedRowCount === 786 && trustedCatalogSql.includes('insert into public.product_catalog')); // 7
record('independent:deploy-preserves-tracked-inventory', trustedCatalogSql.includes('inventory_quantity=case') && trustedCatalogSql.includes('when pc.inventory_tracking=true and pc.inventory_quantity is not null then pc.inventory_quantity') && trustedCatalogSql.includes('with pool_floor as')); // 8
record('independent:deploy-reprices-site-rate', trustedCatalogSql.includes("variant_data->>'pricingRateSource'='site_exchange_rate'") && trustedCatalogSql.includes("variant_data->>'priceLydSource'")); // 9
record('independent:no-stale-stockPerVariant', !lhaSource.includes('stockPerVariant:')); // 10
record('independent:lha-25', lha.length === 25); // 11
record('independent:lha-capacity-five', lha.every((item) => Number(item.stockPerColor) === 5)); // 12
record('independent:lha-every-pool-five', lha.every((item) => (item.variants || []).every((variant) => !variant.inventoryPoolKey || Number(variant.inventoryPoolStock) === 5))); // 13
record('independent:ready-to-ship-25', readyToShipProducts().length === 25, `found ${readyToShipProducts().length}`); // 14
record('independent:kobe-50', kobe.length === 50); // 15
record('independent:kobe-source-1200', kobe.every((item) => Number(item.priceLydSource) === 1200)); // 16
record('independent:kobe-max-us12', kobe.every((item) => Math.max(...(item.sizes || []).map(Number)) <= 12)); // 17
record('independent:kobe-site-rate-source', kobe.every((item) => item.pricingRateSource === 'site_exchange_rate')); // 18
record('independent:kobe-clean-current-price', kobe.every((item) => Number(item.price) === getSiteRateStorePrice(1200, commerceConfig.fallbackUsdToLydRate))); // 19
record('independent:commerce-rate-all-sessions', commerceContext.includes('const refreshRate = async () =>') && commerceContext.includes('await fetchUsdToLydRate()') && commerceContext.includes('USD visitors need the authoritative rate too')); // 20
record('independent:commerce-retains-verified-rate', commerceContext.includes('hasVerifiedRate') && commerceContext.includes("setRateStatus('stale')")); // 21
record('independent:rate-ready-excludes-fallback', commerceContext.includes("rateReady: rateStatus === 'ready' || rateStatus === 'stale'")); // 22
record('independent:site-rate-fail-closed', catalogContext.includes('pricingRateUnavailable: true') && catalogContext.includes('!commerce.rateReady')); // 23
record('independent:tracked-stock-safe-fallback', catalogContext.includes('SAFE_FALLBACK_PRODUCTS') && catalogContext.includes('failClosedTrackedInventory')); // 24
record('independent:cloud-catalog-authoritative', catalogContext.includes('{ authoritative: true }')); // 25
record('independent:no-static-resurrection', catalogContext.includes('return authoritative ? [] : baseProducts')); // 26
record('independent:lha-stock-from-cloud-quantity', catalogContext.includes('Number(row.inventory_quantity)')); // 27
record('independent:lha-stock-by-color-pool', catalogContext.includes('stockByColor') && catalogContext.includes('inventoryPoolKey')); // 28
record('independent:cloud-media-local-trust', catalogContext.includes('trustedLocalMediaPath') && read('src/services/operations.ts').includes('product_image_must_be_local')); // 29
record('independent:lha-ready-requires-positive-stock', /readyToShip[\s\S]{0,220}Number\(row\.inventory_quantity\)\s*>\s*0/.test(catalogContext)); // 30
record('independent:formspree-same-origin-only', formspreeService.includes("fetch('/api/formspree'") && !formspreeService.includes('fetch(FORMSPREE_ENDPOINT')); // 31
record('independent:quote-client-no-formspree-bypass', !quoteService.includes('sendFormspree') && quoteService.includes("fetch('/api/public-quote-request'")); // 32
record('independent:special-client-no-formspree-bypass', !specialService.includes('sendFormspree') && specialService.includes("fetch('/api/special-request'")); // 33
record('independent:quote-api-email-only-status', quoteApi.includes("status: 'email_only'") && quoteApi.includes('persisted: false')); // 34
record('independent:special-api-email-only-status', specialApi.includes("status: 'email_only'") && specialApi.includes('persisted: false')); // 35
record('independent:teams-email-only-truthful', teams.includes('result.persisted === false') && /email/i.test(teams)); // 36
record('independent:custom-email-only-truthful', customizePage.includes('result.persisted === false') && /email/i.test(customizePage)); // 37
record('independent:advanced-email-only-truthful', advanced.includes('result.persisted === false') && /email/i.test(advanced)); // 38
record('independent:custom3d-no-eager-loader', !/^import\s+['\"]\.\.\/product\/engines\/loadModelViewer\.ts['\"];?/m.test(showcase)); // 39
record('independent:custom3d-explicit-opt-in', showcase.includes('modelRequested') && showcase.includes('Open 3D preview') && showcase.includes("import(" + "'../product/engines/loadModelViewer.ts')")); // 40
record('independent:db-color-pool-advisory-lock', hardeningMigration.includes('pg_advisory_xact_lock') && hardeningMigration.includes("variant_data->>'inventoryPoolKey'") && poolReconciliationMigration.includes('with pool_floor as') && poolReconciliationMigration.includes('min(inventory_quantity) as available')); // 41
record('independent:db-site-rate-price-locked', hardeningMigration.includes('site_rate_price_locked')); // 42
record('independent:db-rate-update-reprices', hardeningMigration.includes('staff_set_exchange_rate') && hardeningMigration.includes("variant_data->>'priceLydSource'")); // 43
record('independent:trusted-api-reads-authoritative-rate', trustedStaticCatalog.includes('fetchAuthoritativeSiteRate') && trustedStaticCatalog.includes('usd_to_lyd_rate')); // 44
record('independent:trusted-api-fails-closed-without-rate', trustedStaticCatalog.includes("product.pricingRateSource === 'site_exchange_rate' && siteRate == null") && trustedStaticCatalog.includes('continue;')); // 45

const publishedPrimary = [];
let publishedMediaMissing = 0;
let publishedMediaExternal = 0;
for (const item of products) {
  const refs = [item.image, item.hoverImage, item.socialImage, ...(item.gallery || []).map((entry) => typeof entry === 'string' ? entry : entry?.src)].filter(Boolean);
  for (const ref of refs) {
    if (/^https?:/i.test(String(ref))) publishedMediaExternal += 1;
    else if (String(ref).startsWith('/') && !exists(`public${ref}`)) publishedMediaMissing += 1;
  }
  if (item.image && String(item.image).startsWith('/') && exists(`public${item.image}`)) publishedPrimary.push({ id: item.id, file: `public${item.image}` });
}
record('independent:published-media-local-and-present', publishedMediaExternal === 0 && publishedMediaMissing === 0, `external ${publishedMediaExternal}, missing ${publishedMediaMissing}`); // 46
const primaryHashGroups = new Map();
for (const entry of publishedPrimary) {
  const hash = crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, entry.file))).digest('hex');
  const group = primaryHashGroups.get(hash) || [];
  group.push(entry.id);
  primaryHashGroups.set(hash, group);
}
const duplicatePrimaryGroups = [...primaryHashGroups.values()].filter((group) => group.length > 1);
record('independent:primary-media-byte-unique', duplicatePrimaryGroups.length === 0, `duplicate groups ${duplicatePrimaryGroups.length}`); // 47

// Current external release gates: record them as blockers, never manufacture evidence.
const provider = JSON.parse(read('reports/providers/provider-readiness.json'));
const factory = JSON.parse(read('reports/factory/factory-readiness.json'));
const arabic = JSON.parse(read('reports/localization/arabic-review.json'));
const visuals = JSON.parse(read('visual-baselines.json'));
if (!provider.productionReady) warn('provider-readiness', 'Payment/signature provider selection and live evidence are still external inputs.');
if (!factory.productionReady) warn('factory-readiness', 'No approved manufacturer evidence is present; quote flows must remain quote-specific.');
if (!arabic.productionReady) warn('arabic-human-review', 'Arabic keys are structurally complete but human approval is not current.');
if (!visuals.reviewed) warn('visual-human-review', 'Visual baselines are not marked as human-reviewed.');
if (!exists('node_modules/.bin/vite')) warn('browser-build-current-environment', 'No installed Vite toolchain exists in this ZIP/environment, so no fresh browser-build claim is made.');

// CSS debt is measured, not hidden.
const cssFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name.endsWith('.css')) cssFiles.push(full);
  }
}
walk(path.join(ROOT, 'src/styles'));
let cssLines = 0;
let importantCount = 0;
for (const file of cssFiles) {
  const text = fs.readFileSync(file, 'utf8');
  cssLines += text.split(/\r?\n/).length;
  importantCount += (text.match(/!important/g) || []).length;
}

const report = {
  generatedAt: new Date().toISOString(),
  phase: 3,
  scope: 'destruction source QA and release-honesty pass',
  sourcePassed: failures.length === 0,
  releaseVerdict: failures.length === 0 ? (warnings.length ? 'SOURCE_VERIFIED_EXTERNAL_GATES_PENDING' : 'SOURCE_VERIFIED') : 'SOURCE_FAILED',
  checks: checks.length,
  failures,
  warnings,
  metrics: {
    publishedProducts: products.length,
    lhaProducts: lha.length,
    kobeProducts: kobe.length,
    heroPosterBytes: posterBytes,
    cssFiles: cssFiles.length,
    cssLines,
    importantCount,
    nodeModulesPresent: exists('node_modules'),
  },
  results: checks,
};
fs.mkdirSync(path.join(ROOT, 'reports/phase3-final'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'reports/phase3-final/source-audit.json'), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(ROOT, 'reports/phase3-final/source-audit.md'), [
  '# Phase 3 — Destruction Source QA',
  '',
  `Generated: ${report.generatedAt}`,
  `Verdict: **${report.releaseVerdict}**`,
  '',
  `- Checks: ${checks.length}`,
  `- Failures: ${failures.length}`,
  `- External/current-environment warnings: ${warnings.length}`,
  `- Published products: ${products.length}`,
  `- LHA: ${lha.length}; Kobe: ${kobe.length}`,
  `- Hero poster payload: ${(posterBytes / 1024).toFixed(1)} KiB across ${uniquePosters.length} posters`,
  `- CSS: ${cssFiles.length} files / ${cssLines} lines / ${importantCount} !important declarations`,
  '',
  ...(failures.length ? ['## Failures', ...failures.map((item) => `- ${item}`), ''] : ['All Phase 3 source assertions passed.', '']),
  ...(warnings.length ? ['## Gates not fabricated', ...warnings.map((item) => `- ${item}`), ''] : []),
].join('\n'));

console.log(`Phase 3 source audit: ${checks.length} checks, ${failures.length} failure(s), ${warnings.length} external/environment warning(s).`);
if (failures.length) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exit(1);
}
for (const warning of warnings) console.warn(`WARN: ${warning}`);
console.log(`PASS: ${report.releaseVerdict}`);

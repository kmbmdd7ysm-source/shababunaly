import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const failures = [];
const checks = [];
const record = (name, ok, detail = '') => {
  checks.push({ name, ok, detail });
  if (!ok) failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
};
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(ROOT, file));

const heroMap = read('src/data/localHeroMedia.ts');
const heroPlayer = read('src/components/experience/CinematicHero.tsx');
const editorialMedia = read('src/components/common/EditorialMedia.tsx');
const index = read('index.html');
const homeCss = read('src/styles/design/phase2-home.css');
const customPage = read('src/pages/CustomizePage.tsx');
const customClient = read('src/services/customDesignAssets.ts');
const customApi = read('api/custom-design-asset.ts');
const quoteApi = read('api/public-quote-request.ts');
const quoteClient = read('src/services/publicQuotes.ts');
const checkout = read('src/pages/CheckoutPage.tsx');
const paymentStage = read('src/pages/checkout/CheckoutPaymentStage.tsx');
const searchPage = read('src/pages/SearchPage.tsx');
const searchUtil = read('src/utils/search.ts');
const shoeIntel = read('src/utils/productIntelligence.ts');
const shoePage = read('src/pages/ShoeFinderPage.tsx');
const sw = read('public/sw.js');
const productViewer = read('src/components/product/ProductMediaViewer.tsx');
const spinEngine = read('src/components/product/engines/SpinsetEngine.tsx');

// Hero/media architecture.
const heroKeys = ['home','shop','footwear','clothing','accessories','basketballs','equipment','shoeFinder','custom','discover','teams','stories','releases'];
for (const key of heroKeys) record(`hero:${key}`, new RegExp(`\\b${key}: entry\\(`).test(heroMap));
const mp4s = [...heroMap.matchAll(/\/media\/hero-videos\/[a-z-]+\.mp4/g)].map((m) => m[0]);
record('hero:13-local-mp4s', mp4s.length === 13, `found ${mp4s.length}`);
record('hero:13-unique-mp4s', new Set(mp4s).size === 13, `unique ${new Set(mp4s).size}`);
record('hero:all-local-mp4-files-exist', mp4s.every((url) => exists(`public${url}`)), `missing ${mp4s.filter((url) => !exists(`public${url}`)).length}`);
record('hero:native-home-video', heroPlayer.includes('<video') && heroPlayer.includes('autoPlay') && heroPlayer.includes('muted') && heroPlayer.includes('playsInline'));
record('hero:native-editorial-video', editorialMedia.includes('<video') && editorialMedia.includes('autoPlay') && editorialMedia.includes('muted') && editorialMedia.includes('playsInline'));
record('hero:no-youtube-player-runtime', !/(youtube-nocookie|youtube\.com\/embed|youtu\.be|i\.ytimg\.com|vimeo\.com)/i.test(`${heroMap}\n${heroPlayer}\n${editorialMedia}\n${index}`));
record('hero:no-fake-drift', !/s2-hero-drift|@keyframes\s+[^}]*hero[^}]*scale\(/i.test(homeCss));
record('hero:local-first-paint-poster', index.includes('/media/hero-posters/home.webp') && exists('public/media/hero-posters/home.webp'));
record('hero:no-legacy-youtube-component', !exists('src/components/common/YouTubeBackground.tsx'));

// Real custom logo upload, quarantine and quote association.
record('custom:file-object-state', /useState<File\s*\|\s*null>/.test(customPage) || customPage.includes('setLogoFile(file)'));
record('custom:client-upload', customPage.includes('uploadCustomDesignAsset') && customClient.includes("fetch('/api/custom-design-asset'"));
record('custom:magic-validation', customApi.includes('validateEncodedFiles'));
record('custom:quarantine-bucket', customApi.includes('media-quarantine'));
record('custom:malware-fail-closed', customApi.includes("NODE_ENV==='production'") && customApi.includes('secure_file_scanning_unavailable'));
record('custom:media-assets-row', customApi.includes('media_assets') && customApi.includes("entity_type:'custom_design_logo'"));
record('custom:quote-asset-id', customPage.includes('logoAssetId') && quoteApi.includes('verifyCustomLogoAsset'));
record('custom:quote-reassociation', quoteApi.includes("entity_type:'quote_logo'") || quoteApi.includes("entity_type: 'quote_logo'"));
record('custom:no-4xx-email-fallback', quoteClient.includes("fetch('/api/public-quote-request'") && !quoteClient.includes('sendFormspree') && quoteClient.includes('throw error'));

// Checkout/payment gating and international quote mode.
record('checkout:pending-method-supported', checkout.includes("paymentMethod === 'pending'"));
record('checkout:provider-gates', checkout.includes('onlineCardConfigured') && checkout.includes('libyanCardConfigured'));
record('checkout:international-quote-without-provider', checkout.includes('onlineCardConfigured ? SHIPPING_RATES : {}') || checkout.includes('onlineCardConfigured\n      ? SHIPPING_RATES') || checkout.includes('onlineCardConfigured ? shippingRates : {}'));
record('checkout:quote-no-payment-collection', checkout.includes('No payment is collected until the shipping quote is confirmed.'));
record('checkout:hidden-unconfigured-methods', paymentStage.includes('onlineCardConfigured') && paymentStage.includes('libyanCardConfigured') && !/disabled=.*online_card/i.test(paymentStage));

// Search quality and URL-preserved state.
record('search:url-query-state', searchPage.includes("params.get('q')") && searchPage.includes("parseCsvParam(params, 'type')") && searchPage.includes("parseCsvParam(params, 'brand')"));
record('search:url-filter-updates', searchPage.includes('setSearchParams') || searchPage.includes('setParams'));
record('search:arabic-normalization', /replace\(\/\[أإآ[^\]]*\]\/g,\s*'ا'\)/.test(searchUtil) && searchUtil.includes("replace(/ى/g, 'ي')"));
record('search:alias-expansion', searchUtil.includes('SEARCH_ALIASES') || searchUtil.includes('ALIAS'));
record('search:fuzzy-edit-distance', /editDistance|levenshtein/i.test(searchUtil));
record('search:canonical-stories-route', searchUtil.includes("to: '/stories'") && !searchUtil.includes("to: '/our-work'"));
record('search:category-routing', searchUtil.includes('CATEGORY_ROUTES') && searchUtil.includes("footwear: '/shop/footwear'") && searchUtil.includes("equipment: '/shop/equipment'"));

// Shoe finder must never rank unknown evidence.
record('shoe-finder:verified-filter', /isBasketballPerformanceShoe\([^)]*\).*hasVerifiedPerformanceData/s.test(shoeIntel) || shoeIntel.includes('hasVerifiedPerformanceData(product)'));
record('shoe-finder:honest-copy', /verified evidence|موث/i.test(shoePage));

// First-paint language/RTL and safe PWA caching.
record('locale:bootstrap-exists', exists('public/locale-bootstrap.js'));
record('locale:bootstrap-loaded-early', index.includes('<script src="/locale-bootstrap.js"></script>'));
record('pwa:private-routes-network-only', ['/account','/checkout','/order-tracking','/operations','/team-locker','/design-share','/special-request'].every((route) => sw.includes(route.replace('/', '\\/')) || sw.includes(route)));
record('pwa:cross-origin-not-cached', sw.includes('url.origin !== self.location.origin'));
record('pwa:html-no-store', sw.includes("cache: 'no-store'"));

// Fake product viewing must not be customer accessible in production.
record('viewer:dev-fixture-dev-only', productViewer.includes('import.meta.env.DEV') && productViewer.includes('devSpin'));
record('viewer:fixture-default-off', spinEngine.includes('allowDevelopmentFixture = false'));

const report = {
  generatedAt: new Date().toISOString(),
  phase: 2,
  scope: 'production systems and customer experience source audit',
  checks: checks.length,
  failures: failures.length,
  passed: failures.length === 0,
  results: checks,
};
fs.mkdirSync(path.join(ROOT, 'reports/phase2'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'reports/phase2/phase2-systems-audit.json'), `${JSON.stringify(report, null, 2)}\n`);

console.log(`Phase 2 systems audit: ${checks.length} checks, ${failures.length} failure(s).`);
if (failures.length) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exit(1);
}
console.log('PASS: Phase 2 runtime systems are wired to the hardened source architecture.');

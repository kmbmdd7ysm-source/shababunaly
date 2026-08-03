// Audits every catalogue product and assigns a product-viewing tier.
//
// The tiers describe what the ASSETS can honestly support, never what we wish
// they supported. Nothing here fabricates geometry, duplicates frames or
// promotes a single image into a fake rotation.
//
//   A  real-time 3D      a verified, optimised model exists
//   B  true 360 spinset  >= MIN_SPIN_FRAMES real photographed angles exist
//   C  multi-angle       several verified images, not enough for a true 360
//   D  asset-blocked     one image, or placeholder concept art
//
// Writes a machine-readable matrix for the runtime and a human-readable table
// for whoever has to commission the photography.
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { products } from '../src/data/products.js';

const MIN_SPIN_FRAMES = 24;
const MODELS_MANIFEST = 'public/models/manifest.json';

const placeholder = (src) => String(src || '').startsWith('/images/catalog/');

/** Every distinct, verified (non-placeholder) image a product owns. */
function realImages(product) {
  const all = [product.image, product.hoverImage, ...(product.gallery || [])].filter(Boolean);
  return [...new Set(all)].filter((src) => !placeholder(src));
}

/** Products already carrying a turntable sequence declare it explicitly. */
const spinFrames = (product) => (Array.isArray(product.spin360) ? product.spin360.length : 0);

/** A model is only real if the manifest says so AND the file is on disk. */
function modelFor(product, manifest) {
  const entry = manifest?.products?.[product.id];
  if (!entry?.model) return null;
  return existsSync(`public${entry.model}`) ? entry : null;
}

const COMPLEXITY = {
  A: 'high — 3D modelling, UVs, bakes, LODs',
  B: 'medium — turntable rig session, 24–36 frames, optimisation',
  C: 'low — studio session, 3–6 angles',
  D: 'low — studio session, first verified image set',
};

const PERFORMANCE = {
  A: 'lazy three.js chunk (~190 KB gz) + model, on explicit intent only',
  B: '24–36 AVIF/WebP frames, ~1.0 MB total, loaded on interaction',
  C: 'existing responsive images, no additional payload',
  D: 'existing single image, no additional payload',
};

function assess(product, manifest) {
  const images = realImages(product);
  const frames = spinFrames(product);
  const model = modelFor(product, manifest);

  let tier = 'D';
  if (model) tier = 'A';
  else if (frames >= MIN_SPIN_FRAMES) tier = 'B';
  else if (images.length >= 2) tier = 'C';

  // The target is the highest tier this product type can justify commercially.
  // Custom-manufactured and hero categories earn a real model; the rest earn a
  // true spin, which converts better per pound spent than a WebGL scene.
  const target =
    product.customizable === true ||
    product.category === 'basketballs' ||
    product.category === 'footwear'
      ? 'A'
      : 'B';

  const missing = [];
  const photography = [];
  const modelling = [];

  if (tier === 'D') {
    missing.push(
      images.length === 0 ? 'no verified photography at all' : 'only one verified image',
    );
    photography.push('front, back, side and one macro detail on a chalk-white sweep');
  }
  if (tier === 'C') {
    missing.push(`${MIN_SPIN_FRAMES - frames} more turntable frames for a true 360`);
    photography.push(`turntable sequence, ${MIN_SPIN_FRAMES}–36 frames at 1200 px`);
  }
  if (tier === 'B' && target === 'A') {
    missing.push('no 3D model');
  }
  if (target === 'A' && tier !== 'A') {
    modelling.push('base mesh, UV layout, AO bake, desktop + mobile LOD, quantised .glb');
    if (product.customizable) {
      modelling.push('panel separation matching FACTORY_TEMPLATE_SPECS, print-zone UVs');
    }
  }

  return {
    id: product.id,
    slug: product.slug,
    name: product.name.en,
    category: product.category,
    brand: product.brand,
    customizable: product.customizable === true,
    assetCount: images.length,
    placeholderMedia: placeholder(product.image),
    spinFrames: frames,
    currentTier: tier,
    targetTier: target,
    missingAssets: missing,
    requiredPhotography: photography,
    required3dModelling: modelling,
    complexity: COMPLEXITY[tier === 'A' ? 'A' : target === 'A' ? 'A' : 'B'],
    performanceImpact: PERFORMANCE[tier],
    recommendedPhase:
      tier === 'D' ? 'P5 — photography intake' : tier === 'C' ? 'P6 — spin capture' : 'P12 — 3D',
  };
}

let manifest = null;
if (existsSync(MODELS_MANIFEST)) {
  try {
    manifest = JSON.parse(
      await import('node:fs').then((fs) => fs.readFileSync(MODELS_MANIFEST, 'utf8')),
    );
  } catch {
    manifest = null;
  }
}

const rows = products.map((product) => assess(product, manifest));
const counts = { A: 0, B: 0, C: 0, D: 0 };
const targets = { A: 0, B: 0, C: 0, D: 0 };
for (const row of rows) {
  counts[row.currentTier] += 1;
  targets[row.targetTier] += 1;
}

// Level D is not one problem but two, and they cost very different amounts.
const blockedWithRealPhoto = rows.filter(
  (r) => r.currentTier === 'D' && !r.placeholderMedia,
).length;
const blockedOnPlaceholder = rows.filter((r) => r.currentTier === 'D' && r.placeholderMedia).length;

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  minimumSpinFrames: MIN_SPIN_FRAMES,
  totalProducts: rows.length,
  currentTierCounts: { ...counts },
  targetTierCounts: { A: targets.A, B: targets.B },
  levelDBreakdown: {
    oneVerifiedPhotograph: blockedWithRealPhoto,
    placeholderConceptArtOnly: blockedOnPlaceholder,
  },
  modelsManifestPresent: Boolean(manifest),
  products: rows,
};

mkdirSync('reports/product-viewer', { recursive: true });
writeFileSync('reports/product-viewer/matrix.json', `${JSON.stringify(report, null, 2)}\n`);

const esc = (value) => String(value).replace(/\|/g, '\\|');
const md = [
  '# Product-viewing tier matrix',
  '',
  `Generated by \`scripts/generate-product-viewer-matrix.mjs\` from the live catalogue on ${report.generatedAt.slice(0, 10)}.`,
  'Tiers describe what the **assets** can honestly support. No geometry is fabricated, no frame is duplicated,',
  'and a single image is never presented as a rotation.',
  '',
  '| Tier | Meaning | Count |',
  '| --- | --- | ---: |',
  `| **A** | Real-time 3D — verified optimised model | **${report.currentTierCounts.A}** |`,
  `| **B** | True 360 spinset — ≥ ${MIN_SPIN_FRAMES} real frames | **${report.currentTierCounts.B}** |`,
  `| **C** | Premium multi-angle — ≥ 2 verified images | **${report.currentTierCounts.C}** |`,
  `| **D** | Asset-blocked — one image or placeholder art | **${report.currentTierCounts.D}** |`,
  '',
  'Level D is two different problems with very different costs:',
  '',
  `- **${blockedWithRealPhoto}** products have exactly one *real* photograph. They need additional angles only.`,
  `- **${blockedOnPlaceholder}** products have no photography at all and are showing purpose-built concept artwork.`,
  '  They need a first shoot before any viewer tier is possible.',
  '',
  `Target distribution once assets land: **${report.targetTierCounts.A}** at Level A, **${report.targetTierCounts.B}** at Level B.`,
  '',
  '## Every product',
  '',
  '| ID | Product | Category | Assets | Spin frames | Now | Target | Missing | Complexity | Phase |',
  '| --- | --- | --- | ---: | ---: | :-: | :-: | --- | --- | --- |',
  ...rows.map(
    (r) =>
      `| ${r.id} | ${esc(r.name)} | ${r.category} | ${r.assetCount}${r.placeholderMedia ? ' *(placeholder)*' : ''} | ${r.spinFrames} | **${r.currentTier}** | ${r.targetTier} | ${esc(r.missingAssets.join('; ') || '—')} | ${esc(r.complexity)} | ${r.recommendedPhase} |`,
  ),
  '',
  '## What unlocks each tier',
  '',
  '- **D → C**: a studio session producing front, back, side and one macro detail per product.',
  `- **C → B**: a turntable session producing ${MIN_SPIN_FRAMES}–36 frames at 1200 px, AVIF + WebP, ≤ 28 KB each.`,
  '- **B → A**: base mesh, UV layout, AO bake, desktop and mobile LOD, quantised `.glb` served same-origin,',
  '  plus a `public/models/manifest.json` entry. Custom products additionally need panel separation matching',
  '  `FACTORY_TEMPLATE_SPECS` and print-zone UVs.',
  '',
  '## Rules the generator enforces',
  '',
  '- Placeholder concept art in `/images/catalog/` never counts as a verified asset.',
  '- A product is Level B only when it declares a real frame sequence; frames are never synthesised.',
  '- A product is Level A only when the models manifest names a file **and** that file exists on disk.',
  '- Tier assignment is data-driven, so re-running this after any asset delivery updates the plan automatically.',
  '',
];
writeFileSync('docs/PRODUCT_VIEWER_MATRIX.md', `${md.join('\n')}\n`);

console.info(
  `Product-viewing matrix: ${rows.length} products — A ${report.currentTierCounts.A}, B ${report.currentTierCounts.B}, C ${report.currentTierCounts.C}, D ${report.currentTierCounts.D}.`,
);

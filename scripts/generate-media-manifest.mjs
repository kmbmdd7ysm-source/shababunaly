#!/usr/bin/env node
/**
 * Authoritative product-media manifest (single source of truth).
 * Derivative encodings of the same stem do not count as unique views.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { execSync } from 'node:child_process';

const sha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
const outDir = 'reports/products';
mkdirSync(outDir, { recursive: true });

function extractArray(file, marker) {
  const t = readFileSync(file, 'utf8');
  const i = t.indexOf(marker);
  if (i < 0) return [];
  const j = t.indexOf('[', i);
  let depth = 0;
  let end = -1;
  for (let k = j; k < t.length; k += 1) {
    if (t[k] === '[') depth += 1;
    else if (t[k] === ']') {
      depth -= 1;
      if (depth === 0) {
        end = k;
        break;
      }
    }
  }
  const body = t.slice(j + 1, end);
  const objs = [];
  depth = 0;
  let start = -1;
  for (let k = 0; k < body.length; k += 1) {
    const ch = body[k];
    if (ch === '{') {
      if (depth === 0) start = k;
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        objs.push(body.slice(start, k + 1));
        start = -1;
      }
    }
  }
  return objs
    .map((o) => {
      const slug = o.match(/slug:\s*['"]([^'"]+)['"]/)?.[1];
      const id = o.match(/\bid:\s*['"]([^'"]+)['"]/)?.[1] || slug;
      if (!slug) return null;
      const images = [...o.matchAll(/['"]((?:\/|https?:\/\/)[^'"]+\.(?:jpe?g|png|webp|avif|glb|gltf))['"]/gi)].map(
        (m) => m[1],
      );
      return { id, slug, images };
    })
    .filter(Boolean);
}

function canon(path) {
  let stem = basename(path.split('?')[0]).replace(/\.(opt\.)?(webp|avif|jpe?g|png|glb|gltf)$/i, '');
  stem = stem.replace(/-(1024|640|900|1200|1400|1600|2048|opt)$/i, '');
  return stem.toLowerCase();
}

function classify(name) {
  const n = name.toLowerCase();
  if (/\b(spin|360|frame[-_]?\d+)\b/.test(n)) return 'SPIN_FRAME';
  if (/\.(glb|gltf)$/.test(n)) return 'REAL_3D';
  if (/placeholder|concept|silhouette/.test(n)) return 'PLACEHOLDER';
  if (/\bback\b/.test(n)) return 'BACK';
  if (/\bleft\b/.test(n)) return 'LEFT';
  if (/\bright\b/.test(n)) return 'RIGHT';
  if (/detail|macro/.test(n)) return 'DETAIL';
  if (/lifestyle|on[-_]?court|athlete/.test(n)) return 'LIFESTYLE';
  if (/front|hero|main|primary/.test(n)) return 'FRONT';
  return 'ANGLE';
}

const products = [];
const seen = new Set();
for (const p of [
  ...extractArray('src/data/products.ts', 'shababunaProducts'),
  ...extractArray('src/data/lhaProducts.ts', 'export const products'),
]) {
  if (seen.has(p.slug)) continue;
  seen.add(p.slug);
  products.push(p);
}

const rows = [];
let placeholderHeavy = 0;
for (const p of products) {
  const keys = new Set();
  const classes = {};
  const assets = [];
  for (const img of p.images) {
    const key = canon(img);
    const cls = classify(basename(img.split('?')[0]));
    const derivative = keys.has(key);
    if (!derivative) {
      keys.add(key);
      classes[cls] = (classes[cls] || 0) + 1;
    }
    assets.push({ path: img, class: cls, derivative, key });
  }
  const realUniqueViews = keys.size;
  const spinFrames = classes.SPIN_FRAME || 0;
  const real3D = (classes.REAL_3D || 0) > 0;
  const heavy = realUniqueViews < 2 && !real3D && spinFrames < 12;
  if (heavy) placeholderHeavy += 1;
  rows.push({
    id: p.id,
    slug: p.slug,
    realUniqueViews,
    front: (classes.FRONT || 0) > 0 || realUniqueViews > 0,
    back: (classes.BACK || 0) > 0,
    left: (classes.LEFT || 0) > 0,
    right: (classes.RIGHT || 0) > 0,
    detail: (classes.DETAIL || 0) > 0,
    lifestyle: (classes.LIFESTYLE || 0) > 0,
    spinFrames,
    real3D,
    conceptOnly: realUniqueViews === 0 && !real3D && spinFrames === 0,
    placeholderHeavy: heavy,
    finalMediaComplete: realUniqueViews >= 4 && (spinFrames >= 24 || real3D),
    assets,
  });
}

const manifest = {
  schema: 'shababuna.product.media.manifest.v1',
  sha,
  generatedAt: new Date().toISOString(),
  productCount: rows.length,
  totals: {
    placeholderHeavy,
    missingFinalMedia: rows.filter((r) => r.placeholderHeavy || r.conceptOnly).length,
    withReal3D: rows.filter((r) => r.real3D).length,
    withSpinset: rows.filter((r) => r.spinFrames >= 12).length,
    finalMediaComplete: rows.filter((r) => r.finalMediaComplete).length,
  },
  products: rows,
};

writeFileSync(join(outDir, 'media-manifest-current.json'), JSON.stringify(manifest, null, 2) + '\n');
writeFileSync(
  join(outDir, 'MISSING_FINAL_PRODUCT_MEDIA.md'),
  `# Missing final product media\n\nSHA: \`${sha}\`\n\nPlaceholder-heavy: **${placeholderHeavy}** / ${rows.length}\n\nSource: \`reports/products/media-manifest-current.json\`\n\n` +
    rows
      .filter((r) => r.placeholderHeavy)
      .map((r) => `- \`${r.slug}\` uniqueViews=${r.realUniqueViews}`)
      .join('\n') +
    '\n',
);
console.info(JSON.stringify({ sha, productCount: rows.length, ...manifest.totals }));

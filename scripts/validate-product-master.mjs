import { mkdirSync, writeFileSync } from 'node:fs';
import { products } from '../src/data/products.js';
import {
  normalizeProductMaster,
  missingMasterFields,
  normalizeVariantInventory,
} from '../src/domain/productMaster.ts';

const ids = new Set();
const skus = new Set();
const slugs = new Set();
const duplicates = [];
const structural = [];
const missingCommercial = [];

let variantCount = 0;

for (const product of products) {
  const issues = [];
  if (!product.id) issues.push('missing_id');
  if (!product.sku) issues.push('missing_sku');
  if (!product.slug) issues.push('missing_slug');
  if (!product.name?.en && !product.name) issues.push('missing_english_title');
  if (!product.category) issues.push('missing_category');
  if (!Number.isFinite(Number(product.price)) && product.quoteOnly !== true)
    issues.push('missing_price');
  if (!product.image) issues.push('missing_image');
  if (!Array.isArray(product.variants) || product.variants.length === 0)
    issues.push('missing_variants');

  if (product.id) {
    if (ids.has(product.id)) duplicates.push({ type: 'id', value: product.id });
    ids.add(product.id);
  }
  if (product.sku) {
    if (skus.has(product.sku)) duplicates.push({ type: 'sku', value: product.sku });
    skus.add(product.sku);
  }
  if (product.slug) {
    if (slugs.has(product.slug)) duplicates.push({ type: 'slug', value: product.slug });
    slugs.add(product.slug);
  }

  const master = normalizeProductMaster(product);
  const missing = missingMasterFields(master);
  if (missing.length) {
    missingCommercial.push({
      id: product.id,
      sku: product.sku,
      slug: product.slug,
      missing,
    });
  }

  for (const variant of product.variants || []) {
    variantCount += 1;
    if (!variant.sku)
      issues.push(`variant_missing_sku:${variant.size || ''}:${variant.color || ''}`);
    if (variant.sku) {
      if (skus.has(variant.sku)) duplicates.push({ type: 'variant_sku', value: variant.sku });
      skus.add(variant.sku);
    }
    normalizeVariantInventory(product, variant);
  }

  if (issues.length)
    structural.push({ id: product.id, slug: product.slug, issues: [...new Set(issues)] });
}

const report = {
  generatedAt: new Date().toISOString(),
  products: products.length,
  variants: variantCount,
  duplicates,
  structuralIssueCount: structural.length,
  structural,
  missingCommercialFieldProducts: missingCommercial.length,
  missingCommercial,
  notes: [
    'Commercial fields use pending_verification when unknown — values are never fabricated.',
    'Ready-to-Ship requires inventoryVerified + inventoryTracking; current catalog may honestly report zero ready items.',
  ],
};

mkdirSync('reports/product-master', { recursive: true });
writeFileSync('reports/product-master/audit.json', `${JSON.stringify(report, null, 2)}\n`);
console.log(
  `Product master audit: ${products.length} products, ${variantCount} variants, ${duplicates.length} duplicate key(s), ${structural.length} structural issue row(s), ${missingCommercial.length} products with pending commercial fields.`,
);
if (duplicates.length) {
  console.error('Duplicate IDs/SKUs/slugs detected.');
  process.exit(1);
}

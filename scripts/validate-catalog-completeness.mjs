import { mkdirSync, writeFileSync } from 'node:fs';
import { products } from '../src/data/products.js';

const placeholder = (value = '') =>
  value.startsWith('/images/catalog/') || /placeholder/i.test(value);
const productIssues = [];
const variantRows = [];
for (const product of products) {
  const issues = [];
  if (product.status !== 'active' || !product.available) issues.push('not_active');
  if (!product.image || placeholder(product.image) || product.mediaStatus !== 'supplied')
    issues.push('final_media_missing');
  if (!Number.isFinite(Number(product.price)) && !product.quoteOnly)
    issues.push('retail_price_missing');
  if (!product.sku) issues.push('product_sku_missing');
  if (!product.inventoryVerified) issues.push('inventory_not_verified');
  if (product.readyToShip && !product.inventoryVerified)
    issues.push('ready_to_ship_without_verified_inventory');
  if (!product.inventoryLocation) issues.push('inventory_location_missing');
  if (!product.manufacturingCountry) issues.push('country_of_origin_missing');
  for (const variant of product.variants || []) {
    const row = {
      productId: product.id,
      slug: product.slug,
      productSku: product.sku,
      sku: variant.sku || '',
      supplierSku: variant.supplierSku || '',
      size: variant.size || '',
      color: variant.color || '',
      cost: variant.cost ?? '',
      retailPrice: variant.unitPrice ?? product.price ?? '',
      wholesalePrice: variant.wholesalePrice ?? product.wholesalePrice ?? '',
      barcode: variant.barcode || '',
      verifiedStock: product.inventoryVerified ? Number(variant.stock || 0) : '',
      warehouse: variant.warehouse || product.inventoryLocation || '',
      reorderPoint: variant.reorderPoint ?? product.lowStockThreshold ?? '',
      leadTimeDays: variant.leadTimeDays ?? '',
      weightKg: variant.weightKg ?? '',
      lengthCm: variant.lengthCm ?? '',
      widthCm: variant.widthCm ?? '',
      heightCm: variant.heightCm ?? '',
      hsCode: variant.hsCode || '',
      countryOfOrigin: variant.countryOfOrigin || product.manufacturingCountry || '',
      readyToShip: Boolean(variant.readyToShip && product.readyToShip && product.inventoryVerified),
    };
    variantRows.push(row);
    for (const field of [
      'sku',
      'supplierSku',
      'cost',
      'retailPrice',
      'barcode',
      'warehouse',
      'leadTimeDays',
      'weightKg',
      'lengthCm',
      'widthCm',
      'heightCm',
      'hsCode',
      'countryOfOrigin',
    ]) {
      if (row[field] === '' || row[field] == null) issues.push(`variant_${field}_missing`);
    }
  }
  productIssues.push({ id: product.id, slug: product.slug, issues: [...new Set(issues)] });
}
const incomplete = productIssues.filter((item) => item.issues.length);
const placeholders = productIssues.filter((item) =>
  item.issues.includes('final_media_missing'),
).length;
const verifiedStockProducts = products.filter(
  (product) =>
    product.inventoryVerified &&
    (product.variants || []).some((variant) => Number(variant.stock || 0) > 0),
).length;
const readyToShipProducts = products.filter(
  (product) =>
    product.readyToShip &&
    product.inventoryVerified &&
    (product.variants || []).some((variant) => Number(variant.stock || 0) > 0),
).length;
const report = {
  status: incomplete.length ? 'incomplete' : 'passed',
  generatedAt: new Date().toISOString(),
  productionReady: incomplete.length === 0,
  totals: {
    products: products.length,
    variants: variantRows.length,
    incompleteProducts: incomplete.length,
    placeholderProducts: placeholders,
    verifiedStockProducts,
    readyToShipProducts,
  },
  products: productIssues,
};
mkdirSync('reports/catalog', { recursive: true });
writeFileSync('reports/catalog/catalog-completeness.json', `${JSON.stringify(report, null, 2)}\n`);
const fields = Object.keys(variantRows[0] || {});
const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
writeFileSync(
  'reports/catalog/catalog-commercial-data-template.csv',
  `${fields.map(quote).join(',')}\n${variantRows.map((row) => fields.map((field) => quote(row[field])).join(',')).join('\n')}\n`,
);
writeFileSync(
  'reports/catalog/media-backlog.csv',
  `"productId","slug","currentImage","requiredViews"\n${products
    .filter(
      (product) =>
        !product.image || placeholder(product.image) || product.mediaStatus !== 'supplied',
    )
    .map((product) =>
      [product.id, product.slug, product.image || '', 'front|back|detail|packaging']
        .map(quote)
        .join(','),
    )
    .join('\n')}\n`,
);
console.info(
  `Catalog completeness: ${products.length - incomplete.length}/${products.length} products production-complete; ${variantRows.length} variants audited.`,
);
if (process.env.REQUIRE_PRODUCTION_CATALOG === 'true' && incomplete.length) process.exit(1);

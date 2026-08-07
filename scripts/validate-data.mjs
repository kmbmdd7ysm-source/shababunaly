import { catalogProducts, products, allBrands, lhaStoreProducts, readyToShipProducts } from '../src/data/products.js';
import { getProductPublishIssues, isProductVisible } from '../src/utils/productEligibility.ts';
import { products as sourceLhaProducts } from '../src/data/lhaProducts.js';
import { categories } from '../src/data/categories.js';

let errors = 0;
let warnings = 0;
const err = (message) => { console.error(`  ✗ ${message}`); errors += 1; };
const nonEmpty = (value) => typeof value === 'string' && value.trim().length > 0;
const bilingual = (value) => value && typeof value === 'object' && nonEmpty(value.en) && nonEmpty(value.ar);
const unique = (values, label) => {
  const seen = new Set();
  for (const value of values) {
    if (!value) err(`${label}: missing value`);
    else if (seen.has(value)) err(`${label}: duplicate "${value}"`);
    else seen.add(value);
  }
};

console.info('\nValidating SHABABUNA catalogue and commerce data...\n');

unique(catalogProducts.map((product) => product.id), 'catalog product id');
unique(catalogProducts.map((product) => product.slug), 'catalog product slug');
unique(catalogProducts.flatMap((product) => product.variants || []).map((variant) => variant.sku), 'catalog variant sku');

const categorySlugs = new Set(categories.map((category) => category.slug));
const subcategorySlugs = new Map(categories.map((category) => [category.slug, new Set((category.subcategories || []).map((sub) => sub.slug))]));
for (const required of ['ready-to-ship', 'clothing', 'footwear', 'accessories', 'basketballs', 'equipment']) {
  if (!categorySlugs.has(required)) err(`required shop category is missing: ${required}`);
}

for (const category of categories) {
  if (!/^[a-z0-9-]+$/.test(category.slug || '')) err(`invalid category slug: ${category.slug}`);
  if (!bilingual(category.name)) err(`category ${category.slug}: bilingual name is required`);
  unique((category.subcategories || []).map((sub) => sub.slug), `subcategory slug in ${category.slug}`);
  for (const sub of category.subcategories || []) if (!bilingual(sub.name)) err(`subcategory ${sub.slug}: bilingual name is required`);
}

for (const product of catalogProducts) {
  const label = `${product.id}/${product.slug}`;
  if (!/^[a-z0-9-]+$/.test(product.slug || '')) err(`${label}: invalid slug`);
  if (!bilingual(product.name) || product.name.en !== product.name.ar) err(`${label}: product name must stay English in both languages`);
  if (!bilingual(product.description)) err(`${label}: natural English and Arabic descriptions are required`);
  if (!bilingual(product.alt)) err(`${label}: bilingual alternative text is required`);
  if (!categorySlugs.has(product.category)) err(`${label}: unknown category ${product.category}`);
  if (product.category !== 'ready-to-ship' && product.subcategory && !subcategorySlugs.get(product.category)?.has(product.subcategory)) err(`${label}: unknown subcategory ${product.category}/${product.subcategory}`);
  if (!Number.isFinite(product.price) || product.price < 0) err(`${label}: invalid USD retail price`);
  if (isProductVisible(product) && getProductPublishIssues(product).length) err(`${label}: visible product has publish blockers: ${getProductPublishIssues(product).join(', ')}`);
  if (product.currency !== 'USD') err(`${label}: base currency must be USD`);
  if (!Array.isArray(product.variants) || product.variants.length === 0) err(`${label}: at least one variant is required`);
  if (!Array.isArray(product.storefronts) || product.storefronts.length === 0) err(`${label}: storefront assignment is required`);
  if (product.wholesaleAvailable) {
    if (!Number.isInteger(product.wholesaleMin) || product.wholesaleMin < 1) err(`${label}: wholesale minimum must be a positive integer`);
    if (!Number.isFinite(product.wholesalePrice) || product.wholesalePrice < 0 || product.wholesalePrice >= product.price) err(`${label}: wholesale price must be lower than retail`);
  }
  if (product.customizable) {
    const expected = product.category === 'basketballs' ? 6 : product.category === 'equipment' ? 1 : 10;
    if (product.minimumOrder < expected && !product.legacyLha) err(`${label}: custom minimum must be at least ${expected}`);
  }
  if (product.madeInUSA && (product.category !== 'clothing' || product.brand !== 'Shababuna')) err(`${label}: Made in USA may only be applied to Shababuna apparel`);
  if (product.largeEquipment && product.category !== 'equipment') err(`${label}: largeEquipment is restricted to equipment`);
  for (const variant of product.variants || []) {
    if (!nonEmpty(variant.sku)) err(`${label}: variant SKU is required`);
    if (!Number.isInteger(variant.stock) || variant.stock < 0) err(`${label}: variant stock must be a non-negative integer`);
  }
}

const catalogBrands = Array.from(new Set(catalogProducts.map((product) => product.brand).filter(Boolean)));
for (const requiredBrand of ['Shababuna', 'Nike', 'Jordan', 'adidas', 'Under Armour', 'Puma', 'New Balance', 'Li-Ning', 'ANTA', 'Peak', '361°', 'LHA']) {
  if (!catalogBrands.includes(requiredBrand)) err(`catalogue brand is missing: ${requiredBrand}`);
}
if (allBrands.length !== catalogBrands.length || !catalogBrands.every((brand) => allBrands.includes(brand))) err('storefront brand filter is missing active catalogue brands');

const lha = lhaStoreProducts();
if (lha.length !== sourceLhaProducts.length) err(`LHA store must contain all ${sourceLhaProducts.length} source products; received ${lha.length}`);
for (const source of sourceLhaProducts) {
  const copied = lha.find((product) => product.legacySourceId === source.id || product.slug === `lha-${source.slug}`);
  if (!copied) err(`LHA product not copied: ${source.slug}`);
  else if (copied.price !== source.price) err(`LHA price changed for ${source.slug}: ${source.price} -> ${copied.price}`);
}

const readyCount = readyToShipProducts().length;
const customCount = products.filter((product) => product.customizable).length;
const wholesaleCount = products.filter((product) => product.wholesaleAvailable).length;
const draftCustomCount = catalogProducts.filter((product) => product.customizable && !isProductVisible(product)).length;
if (!readyCount) console.info('  i Ready to Ship remains intentionally empty until verified Libya inventory is entered.');
if (draftCustomCount) err('custom product catalogue definitions must not remain hidden');
if (!wholesaleCount) err('verified wholesale catalogue is empty');

console.info(`Published products: ${products.length}`);
console.info(`All catalog records: ${catalogProducts.length}`);
console.info(`Brands: ${allBrands.length}`);
console.info(`Ready to ship: ${readyCount}`);
console.info(`Published customizable: ${customCount}`);
console.info(`Hidden customizable definitions: ${draftCustomCount}`);
console.info(`Wholesale-enabled: ${wholesaleCount}`);
console.info(`LHA store products: ${lha.length}`);
console.info(`\n${errors ? '✗' : '✓'} Validation finished — ${errors} error(s), ${warnings} warning(s).\n`);
process.exit(errors ? 1 : 0);

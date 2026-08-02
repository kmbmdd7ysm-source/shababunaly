/**
 * @typedef {object} VariantLike
 * @property {unknown} [sku]
 * @property {unknown} [active]
 * @property {unknown} [availabilityState]
 * @property {unknown} [inventoryTracking]
 * @property {unknown} [readyToShip]
 * @property {unknown} [stock]
 *
 * @typedef {object} ProductLike
 * @property {unknown} [image]
 * @property {unknown} [mediaStatus]
 * @property {unknown} [price]
 * @property {unknown} [sku]
 * @property {unknown} [status]
 * @property {unknown} [quoteOnly]
 * @property {unknown} [inventorySource]
 * @property {unknown} [available]
 * @property {unknown} [comingSoon]
 * @property {unknown} [inventoryTracking]
 * @property {unknown} [readyToShip]
 * @property {unknown} [inventoryLocation]
 * @property {unknown} [stock]
 * @property {unknown} [madeInUSA]
 * @property {unknown} [claimVerified]
 * @property {VariantLike[]} [variants]
 */

export const PRODUCT_STATUSES = Object.freeze({
  DRAFT: 'draft',
  ACTIVE: 'active',
  COMING_SOON: 'coming_soon',
  ARCHIVED: 'archived',
  OUT_OF_STOCK: 'out_of_stock',
});

const TRUSTED_MEDIA_STATES = new Set(['supplied', 'verified', 'approved']);
const USABLE_MEDIA_STATES = new Set(['supplied', 'verified', 'approved', 'concept', 'placeholder', 'generated']);
const NON_SELLABLE_INVENTORY_SOURCES = new Set(['unverified_catalog', 'concept_only', 'sample_data']);

/** @param {ProductLike|null|undefined} product */
export function hasRealProductMedia(product) {
  return Boolean(
    product?.image &&
    TRUSTED_MEDIA_STATES.has(String(product.mediaStatus || '').toLowerCase()) &&
    !String(product.image).startsWith('/images/catalog/'),
  );
}

/**
 * A product can be published with an approved placeholder while final photography
 * is pending. Placeholder media is never presented as verified product photography.
 * @param {ProductLike|null|undefined} product
 */
export function hasUsableProductMedia(product) {
  if (!product?.image || typeof product.image !== 'string') return false;
  const state = String(product.mediaStatus || '').toLowerCase();
  return USABLE_MEDIA_STATES.has(state) || product.image.startsWith('/images/catalog/');
}

/** @param {ProductLike|null|undefined} product */
export function hasSellablePrice(product) {
  if (!product) return false;
  return Number.isFinite(Number(product.price)) && Number(product.price) > 0;
}

/** @param {ProductLike|null|undefined} product */
export function hasValidSku(product) {
  return typeof product?.sku === 'string' && /^[A-Z0-9][A-Z0-9._-]{2,79}$/i.test(product.sku.trim());
}

/** @param {ProductLike|null|undefined} product */
export function isProductPublishable(product) {
  if (!product || product.status !== PRODUCT_STATUSES.ACTIVE) return false;
  if (!hasValidSku(product) || !hasUsableProductMedia(product)) return false;
  if (!hasSellablePrice(product) && product.quoteOnly !== true) return false;
  if (NON_SELLABLE_INVENTORY_SOURCES.has(String(product.inventorySource || '').toLowerCase())) return false;
  return product.available !== false && product.comingSoon !== true;
}

/** @param {ProductLike|null|undefined} product */
export function isProductVisible(product) {
  if (!product) return false;
  if (product.status === PRODUCT_STATUSES.COMING_SOON) {
    return hasValidSku(product) && hasUsableProductMedia(product);
  }
  return isProductPublishable(product);
}

/** @param {ProductLike|null|undefined} product */
export function isProductPurchasable(product) {
  if (!product || !isProductPublishable(product) || product.quoteOnly === true) return false;
  if (!Array.isArray(product.variants) || product.variants.length === 0) return false;
  return product.variants.some((variant) => isVariantPurchasable(product, variant));
}

/** @param {ProductLike|null|undefined} product @param {VariantLike|null|undefined} variant */
export function isVariantPurchasable(product, variant) {
  if (!product || !isProductPublishable(product) || product.quoteOnly === true || !variant?.sku) return false;
  if (variant.active === false) return false;
  if (['out_of_stock', 'unavailable', 'archived'].includes(String(variant.availabilityState || '').toLowerCase())) return false;
  if (variant.inventoryTracking === false || product.inventoryTracking === false) return true;
  return Number(variant.stock) > 0;
}

/** @param {VariantLike|null|undefined} variant @param {number} [fallback] */
export function getVariantPurchaseLimit(variant, fallback = 99) {
  if (!variant) return 0;
  return variant.inventoryTracking === false ? fallback : Math.max(0, Number(variant.stock) || 0);
}

/** @param {ProductLike|null|undefined} product @param {string} [countryCode] */
export function isReadyToShipEligible(product, countryCode = 'LY') {
  if (!product || countryCode !== 'LY' || !isProductPublishable(product)) return false;
  if (product.readyToShip !== true || product.inventoryTracking !== true) return false;
  if (String(product.inventoryLocation || '').toUpperCase() !== 'LY') return false;
  return Array.isArray(product.variants)
    ? product.variants.some((variant) => variant.inventoryTracking === true && variant.readyToShip !== false && Number(variant.stock) > 0)
    : Number(product.stock) > 0;
}

/** @param {ProductLike|null|undefined} product */
export function getProductPublishIssues(product) {
  const issues = [];
  if (!hasValidSku(product)) issues.push('missing_or_invalid_sku');
  if (!hasUsableProductMedia(product)) issues.push('missing_usable_media');
  if (!hasSellablePrice(product) && product?.quoteOnly !== true && product?.status !== PRODUCT_STATUSES.COMING_SOON) issues.push('missing_price');
  if (NON_SELLABLE_INVENTORY_SOURCES.has(String(product?.inventorySource || '').toLowerCase())) issues.push('unverified_inventory_source');
  if (product?.madeInUSA === true && product?.claimVerified !== true) issues.push('unverified_manufacturing_claim');
  return issues;
}

import type { AvailabilityState } from '../domain/types.ts';

export interface VariantLike {
  sku?: unknown;
  active?: unknown;
  availabilityState?: unknown;
  inventoryTracking?: unknown;
  readyToShip?: unknown;
  stock?: unknown;
  size?: unknown;
  color?: unknown;
  unitPrice?: unknown;
}

export interface ProductLike {
  image?: unknown;
  mediaStatus?: unknown;
  price?: unknown;
  sku?: unknown;
  status?: unknown;
  quoteOnly?: unknown;
  inventorySource?: unknown;
  available?: unknown;
  comingSoon?: unknown;
  inventoryTracking?: unknown;
  inventoryVerified?: unknown;
  readyToShip?: unknown;
  inventoryLocation?: unknown;
  stock?: unknown;
  madeInUSA?: unknown;
  claimVerified?: unknown;
  claimEvidenceReference?: unknown;
  customizable?: unknown;
  madeToOrder?: unknown;
  variants?: VariantLike[];
  availability?: AvailabilityState | string;
}

export const PRODUCT_STATUSES = Object.freeze({
  DRAFT: 'draft',
  ACTIVE: 'active',
  COMING_SOON: 'coming_soon',
  ARCHIVED: 'archived',
  OUT_OF_STOCK: 'out_of_stock',
});

const TRUSTED_MEDIA_STATES = new Set(['supplied', 'verified', 'approved']);
const USABLE_MEDIA_STATES = new Set([
  'supplied',
  'verified',
  'approved',
  'concept',
  'placeholder',
  'generated',
]);
const NON_SELLABLE_INVENTORY_SOURCES = new Set([
  'unverified_catalog',
  'concept_only',
  'sample_data',
]);

export function hasRealProductMedia(product: ProductLike | null | undefined): boolean {
  return Boolean(
    product?.image &&
    TRUSTED_MEDIA_STATES.has(String(product.mediaStatus || '').toLowerCase()) &&
    !String(product.image).startsWith('/images/catalog/'),
  );
}

export function hasUsableProductMedia(product: ProductLike | null | undefined): boolean {
  if (!product?.image || typeof product.image !== 'string') return false;
  const state = String(product.mediaStatus || '').toLowerCase();
  return USABLE_MEDIA_STATES.has(state) || product.image.startsWith('/images/catalog/');
}

export function hasSellablePrice(product: ProductLike | null | undefined): boolean {
  if (!product) return false;
  return Number.isFinite(Number(product.price)) && Number(product.price) > 0;
}

export function hasValidSku(product: ProductLike | null | undefined): boolean {
  return (
    typeof product?.sku === 'string' && /^[A-Z0-9][A-Z0-9._-]{2,79}$/i.test(product.sku.trim())
  );
}

export function isProductPublishable(product: ProductLike | null | undefined): boolean {
  if (!product || product.status !== PRODUCT_STATUSES.ACTIVE) return false;
  if (!hasValidSku(product) || !hasUsableProductMedia(product)) return false;
  if (!hasSellablePrice(product) && product.quoteOnly !== true) return false;
  if (NON_SELLABLE_INVENTORY_SOURCES.has(String(product.inventorySource || '').toLowerCase()))
    return false;
  return product.available !== false && product.comingSoon !== true;
}

export function isProductVisible(product: ProductLike | null | undefined): boolean {
  if (!product) return false;
  if (product.status === PRODUCT_STATUSES.COMING_SOON) {
    return hasValidSku(product) && hasUsableProductMedia(product);
  }
  return isProductPublishable(product);
}

export function isProductPurchasable(product: ProductLike | null | undefined): boolean {
  if (!product || !isProductPublishable(product) || product.quoteOnly === true) return false;
  if (!Array.isArray(product.variants) || product.variants.length === 0) return false;
  return product.variants.some((variant) => isVariantPurchasable(product, variant));
}

export function isVariantPurchasable(
  product: ProductLike | null | undefined,
  variant: VariantLike | null | undefined,
): boolean {
  if (!product || !isProductPublishable(product) || product.quoteOnly === true || !variant?.sku)
    return false;
  if (variant.active === false) return false;
  if (
    ['out_of_stock', 'unavailable', 'archived'].includes(
      String(variant.availabilityState || '').toLowerCase(),
    )
  ) {
    return false;
  }
  if (variant.inventoryTracking === false || product.inventoryTracking === false) return true;
  return Number(variant.stock) > 0;
}

export function getVariantPurchaseLimit(
  variant: VariantLike | null | undefined,
  fallback = 99,
): number {
  if (!variant) return 0;
  return variant.inventoryTracking === false ? fallback : Math.max(0, Number(variant.stock) || 0);
}

export function isReadyToShipEligible(
  product: ProductLike | null | undefined,
  _countryCode = 'LY',
): boolean {
  // Destination remains globally discoverable. Inventory is Libya-held; shipping
  // caveats are UX copy — do not hide eligible stock from international shoppers.
  void _countryCode;
  if (!product || !isProductPublishable(product)) return false;
  if (product.readyToShip !== true || product.inventoryTracking !== true) return false;
  if (String(product.inventoryLocation || '').toUpperCase() !== 'LY') return false;
  // Prefer explicit verification when present; never invent stock.
  if (product.inventoryVerified === false) return false;
  return Array.isArray(product.variants)
    ? product.variants.some(
        (variant) =>
          variant.inventoryTracking === true &&
          variant.readyToShip !== false &&
          Number(variant.stock) > 0,
      )
    : Number(product.stock) > 0;
}

export function getProductPublishIssues(product: ProductLike | null | undefined): string[] {
  const issues: string[] = [];
  if (!hasValidSku(product)) issues.push('missing_or_invalid_sku');
  if (!hasUsableProductMedia(product)) issues.push('missing_usable_media');
  if (
    !hasSellablePrice(product) &&
    product?.quoteOnly !== true &&
    product?.status !== PRODUCT_STATUSES.COMING_SOON
  ) {
    issues.push('missing_price');
  }
  if (NON_SELLABLE_INVENTORY_SOURCES.has(String(product?.inventorySource || '').toLowerCase())) {
    issues.push('unverified_inventory_source');
  }
  if (product?.madeInUSA === true && product?.claimVerified !== true) {
    issues.push('unverified_manufacturing_claim');
  }
  return issues;
}

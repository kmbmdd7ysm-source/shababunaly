import type { ProductMasterFields, UnknownCommercialField, VariantInventory } from './types.ts';

export type { ProductMasterFields };
export type MasterValue<T> = T | UnknownCommercialField;

const UNKNOWN: UnknownCommercialField = 'pending_verification';

function presentString(value: unknown): string | UnknownCommercialField {
  if (typeof value === 'string' && value.trim()) return value.trim();
  return UNKNOWN;
}

function presentNumber(value: unknown): number | UnknownCommercialField {
  const n = Number(value);
  return Number.isFinite(n) ? n : UNKNOWN;
}

/**
 * Normalize Product Master commercial fields without inventing business values.
 * Missing values become `pending_verification` (or null where quantity is unknown).
 */
export function normalizeProductMaster(
  product: Record<string, unknown> | null | undefined,
): ProductMasterFields {
  const source = product ?? {};
  return {
    supplierSKU: presentString(source.supplierSKU ?? source.supplierSku),
    cost: presentNumber(source.cost),
    barcode: presentString(source.barcode),
    warehouse: presentString(source.warehouse ?? source.inventoryLocation),
    leadTime: presentString(source.leadTime ?? source.leadTimeDays),
    weight: presentNumber(source.weight ?? source.weightKg),
    dimensions:
      source.dimensions && typeof source.dimensions === 'object'
        ? (source.dimensions as ProductMasterFields['dimensions'])
        : UNKNOWN,
    HSCode: presentString(source.HSCode ?? source.hsCode),
    countryOfOrigin: presentString(source.countryOfOrigin ?? source.manufacturingCountry),
    variantOrigin: presentString(source.variantOrigin),
    inventoryLocation: presentString(source.inventoryLocation),
  };
}

export function normalizeVariantInventory(
  product: Record<string, unknown> | null | undefined,
  variant: Record<string, unknown> | null | undefined = {},
): VariantInventory {
  const tracking = product?.inventoryTracking === true;
  const verified = product?.inventoryVerified === true;
  const stock = Number(variant?.stock ?? product?.stock);
  return {
    quantity: tracking && verified && Number.isFinite(stock) ? stock : null,
    inventoryVerified: verified,
    inventoryTracking: tracking,
    inventoryLocation: presentString(variant?.inventoryLocation ?? product?.inventoryLocation),
    warehouse: presentString(
      variant?.warehouse ?? product?.warehouse ?? product?.inventoryLocation,
    ),
    readyToShip: Boolean(
      product?.readyToShip === true && verified && tracking && variant?.readyToShip !== false,
    ),
    lastVerifiedAt:
      typeof product?.lastVerifiedAt === 'string'
        ? product.lastVerifiedAt
        : typeof variant?.lastVerifiedAt === 'string'
          ? variant.lastVerifiedAt
          : null,
  };
}

export function missingMasterFields(master: ProductMasterFields): string[] {
  return Object.entries(master)
    .filter(
      ([, value]) => value === null || value === 'unknown' || value === 'pending_verification',
    )
    .map(([key]) => key);
}

/**
 * Canonical inventory / availability statuses.
 * Ready-to-Ship requires verified on-hand quantity — never inferred.
 */

export const INVENTORY_STATUSES = [
  'READY_TO_SHIP',
  'MADE_TO_ORDER',
  'SUPPLIER_ORDER',
  'QUOTE_ONLY',
  'COMING_SOON',
  'OUT_OF_STOCK',
] as const;

export type InventoryStatus = (typeof INVENTORY_STATUSES)[number];

export type VariantInventory = {
  quantityOnHand?: number | null;
  quantityReserved?: number | null;
  quantityAvailable?: number | null;
  inventoryTracking?: boolean;
  inventoryVerified?: boolean;
  warehouse?: string | null;
  inventoryLocation?: string | null;
  readyToShip?: boolean;
  verifiedAt?: string | null;
};

/** Structural helper — does not invent stock. */
export function isVerifiedReadyToShip(variant: VariantInventory): boolean {
  if (variant.inventoryVerified !== true) return false;
  if (variant.readyToShip !== true) return false;
  const available =
    variant.quantityAvailable ??
    (variant.quantityOnHand == null
      ? null
      : Number(variant.quantityOnHand) - Number(variant.quantityReserved || 0));
  return available != null && Number.isFinite(available) && available > 0;
}

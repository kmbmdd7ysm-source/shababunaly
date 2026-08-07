export const FULFILLMENT_TYPES = Object.freeze({
  PHYSICAL: 'physical',
  DIGITAL_TRAINING: 'digital_training',
  EVENT_REGISTRATION: 'event_registration',
});

export interface FulfillmentItem {
  fulfillmentType?: unknown;
  fulfillment_type?: unknown;
  type?: unknown;
}

export function getCartItemFulfillmentType(item: FulfillmentItem | null | undefined): string {
  const explicit = String(item?.fulfillmentType || item?.fulfillment_type || '').toLowerCase();
  if ((Object.values(FULFILLMENT_TYPES) as string[]).some((value) => value === explicit)) return explicit;
  if (item?.type === 'product') return FULFILLMENT_TYPES.PHYSICAL;
  if (item?.type === 'training') return FULFILLMENT_TYPES.DIGITAL_TRAINING;
  if (item?.type === 'event') return FULFILLMENT_TYPES.EVENT_REGISTRATION;
  return FULFILLMENT_TYPES.PHYSICAL;
}

export function requiresPhysicalShipping(item: FulfillmentItem | null | undefined): boolean {
  return getCartItemFulfillmentType(item) === FULFILLMENT_TYPES.PHYSICAL;
}

export function cartRequiresPhysicalShipping(items: FulfillmentItem[] | null | undefined): boolean {
  return Array.isArray(items) && items.some(requiresPhysicalShipping);
}

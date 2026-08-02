export const FULFILLMENT_TYPES = Object.freeze({
  PHYSICAL: 'physical',
  DIGITAL_TRAINING: 'digital_training',
  EVENT_REGISTRATION: 'event_registration',
});

/** @typedef {{ fulfillmentType?: unknown, fulfillment_type?: unknown, type?: unknown }} FulfillmentItem */

/** @param {FulfillmentItem|null|undefined} item */
export function getCartItemFulfillmentType(item) {
  const explicit = String(item?.fulfillmentType || item?.fulfillment_type || '').toLowerCase();
  if (Object.values(FULFILLMENT_TYPES).some((value) => value === explicit)) return explicit;
  if (item?.type === 'product') return FULFILLMENT_TYPES.PHYSICAL;
  if (item?.type === 'training') return FULFILLMENT_TYPES.DIGITAL_TRAINING;
  if (item?.type === 'event') return FULFILLMENT_TYPES.EVENT_REGISTRATION;
  return FULFILLMENT_TYPES.PHYSICAL;
}

/** @param {FulfillmentItem|null|undefined} item */
export function requiresPhysicalShipping(item) {
  return getCartItemFulfillmentType(item) === FULFILLMENT_TYPES.PHYSICAL;
}

/** @param {FulfillmentItem[]|null|undefined} items */
export function cartRequiresPhysicalShipping(items) {
  return Array.isArray(items) && items.some(requiresPhysicalShipping);
}

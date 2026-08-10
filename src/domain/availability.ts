import type { AvailabilityState } from './types.ts';
import {
  isProductPublishable,
  isReadyToShipEligible,
  type ProductLike,
} from '../utils/productEligibility.ts';

/**
 * Canonical customer-facing availability. Never label “In Stock” without verified inventory.
 */
export function resolveAvailabilityState(
  product: ProductLike | null | undefined,
  options: { countryCode?: string } = {},
): AvailabilityState {
  if (!product) return 'OUT_OF_STOCK';
  if (product.quoteOnly === true) return 'QUOTE_ONLY';
  if (product.status === 'coming_soon' || product.comingSoon === true) return 'COMING_SOON';
  if (!isProductPublishable(product)) return 'OUT_OF_STOCK';

  const tracking = product.inventoryTracking === true;
  const verified = tracking && product.inventoryVerified === true;

  if (verified && isReadyToShipEligible(product, options.countryCode ?? 'LY')) {
    return 'READY_TO_SHIP';
  }

  if (tracking && verified) {
    const variants = product.variants ?? [];
    const anyStock =
      variants.some((variant) => Number(variant.stock) > 0) || Number(product.stock) > 0;
    return anyStock ? 'READY_TO_SHIP' : 'OUT_OF_STOCK';
  }

  if (product.customizable === true || product.madeToOrder === true) {
    return 'MADE_TO_ORDER';
  }

  return 'SUPPLIER_ORDER';
}

export function availabilityLabel(
  state: AvailabilityState,
  lang: 'en' | 'ar' = 'en',
): { label: string; honest: boolean } {
  const map: Record<AvailabilityState, { en: string; ar: string }> = {
    READY_TO_SHIP: { en: 'Ready to Ship', ar: 'تسليم فوري' },
    MADE_TO_ORDER: { en: 'Made to Order', ar: 'تصنيع حسب الطلب' },
    SUPPLIER_ORDER: { en: 'Supplier Order', ar: 'طلب من المورد' },
    QUOTE_ONLY: { en: 'Quote Only', ar: 'عرض سعر فقط' },
    COMING_SOON: { en: 'Coming Soon', ar: 'قريبًا' },
    OUT_OF_STOCK: { en: 'Unavailable', ar: 'غير متاح' },
  };
  return { label: map[state][lang], honest: true };
}

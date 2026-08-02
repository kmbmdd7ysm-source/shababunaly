import { isVariantPurchasable } from './productEligibility.js';

export function getPurchasableVariants(product) {
  return (product?.variants || []).filter((variant) => isVariantPurchasable(product, variant));
}

export function productRequiresOptionChoice(product, variants = getPurchasableVariants(product)) {
  if (!variants.length) return false;
  const sizes = new Set(variants.map((variant) => variant.size).filter(Boolean));
  const colors = new Set(variants.map((variant) => variant.color).filter(Boolean));
  return sizes.size > 1 || colors.size > 1;
}

export function getCompareAction(product) {
  if (product?.quoteOnly === true) return { type: 'quote', variant: null };
  const available = getPurchasableVariants(product);
  if (!available.length) return { type: 'unavailable', variant: null };
  return productRequiresOptionChoice(product, available)
    ? { type: 'choose-options', variant: null }
    : { type: 'add', variant: available[0] };
}

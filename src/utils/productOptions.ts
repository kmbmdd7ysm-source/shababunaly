import { isVariantPurchasable, type ProductLike, type VariantLike } from './productEligibility.ts';

export function getPurchasableVariants(product: ProductLike | null | undefined): VariantLike[] {
  return (product?.variants || []).filter((variant) => isVariantPurchasable(product, variant));
}

export function productRequiresOptionChoice(
  product: ProductLike | null | undefined,
  variants: VariantLike[] = getPurchasableVariants(product),
): boolean {
  if (!variants.length) return false;
  const sizes = new Set(variants.map((variant) => variant.size).filter(Boolean));
  const colors = new Set(variants.map((variant) => variant.color).filter(Boolean));
  return sizes.size > 1 || colors.size > 1;
}

export function getCompareAction(product: ProductLike | null | undefined): {
  type: 'quote' | 'unavailable' | 'choose-options' | 'add';
  variant: VariantLike | null;
} {
  if (product?.quoteOnly === true) return { type: 'quote', variant: null };
  const available = getPurchasableVariants(product);
  if (!available.length) return { type: 'unavailable', variant: null };
  return productRequiresOptionChoice(product, available)
    ? { type: 'choose-options', variant: null }
    : { type: 'add', variant: available[0] ?? null };
}

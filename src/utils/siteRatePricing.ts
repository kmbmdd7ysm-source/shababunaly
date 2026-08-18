import { roundStorePrice } from '../config/commerce.ts';

export type SiteRatePricedProduct = Record<string, unknown> & {
  price?: unknown;
  priceLydSource?: unknown;
  pricingRateSource?: unknown;
  variants?: Array<Record<string, unknown>>;
};

export const SITE_RATE_PRICING_SOURCE = 'site_exchange_rate';

export function getSiteRateStorePrice(
  sourcePriceLyd: unknown,
  usdToLydRate: unknown,
): number | null {
  const source = Number(sourcePriceLyd);
  const rate = Number(usdToLydRate);
  if (!Number.isFinite(source) || source <= 0 || !Number.isFinite(rate) || rate <= 0) return null;
  return roundStorePrice(source / rate);
}

export function isSiteRatePricedProduct(
  product: SiteRatePricedProduct | null | undefined,
): boolean {
  return Boolean(
    product &&
      product.pricingRateSource === SITE_RATE_PRICING_SOURCE &&
      Number(product.priceLydSource) > 0,
  );
}

/**
 * Applies Shababuna's editable USD→LYD store rate to products whose business
 * source price is denominated in LYD (currently the Kobe catalogue). The
 * source LYD amount remains the immutable business truth; the USD store price
 * is a derived clean five-dollar step and therefore updates whenever the site
 * rate changes.
 */
export function applySiteRatePricing<T extends SiteRatePricedProduct>(
  product: T,
  usdToLydRate: unknown,
): T {
  if (!isSiteRatePricedProduct(product)) return product;
  const price = getSiteRateStorePrice(product.priceLydSource, usdToLydRate);
  if (price == null) return product;
  const variants = Array.isArray(product.variants)
    ? product.variants.map((variant) => ({ ...variant, unitPrice: price }))
    : product.variants;
  return {
    ...product,
    price,
    variants,
    pricingRateSnapshot: Number(usdToLydRate),
  } as T;
}

import { products } from '../src/data/products.ts';
import { supabaseAdminRequest } from './_supabase-admin.ts';
import { roundStorePrice } from '../src/config/commerce.ts';

type RequestedLine = {
  productId: string;
  variantId: string;
  quantity: number;
  purchaseMode: string;
};

type ProductRow = Record<string, unknown> & {
  id?: unknown;
  slug?: unknown;
  sku?: unknown;
  name?: unknown;
  price?: unknown;
  compareAt?: unknown;
  currency?: unknown;
  status?: unknown;
  available?: unknown;
  comingSoon?: unknown;
  quoteOnly?: unknown;
  inventoryTracking?: unknown;
  lowStockThreshold?: unknown;
  variants?: unknown;
};

const text = (value: unknown): string => String(value ?? '').trim();
const num = (value: unknown): number | null => {
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
};
const nameEn = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'en' in value)
    return text((value as { en?: unknown }).en);
  return '';
};

function trustedRow(
  product: ProductRow,
  variant: Record<string, unknown>,
  siteRate: number | null = null,
) {
  const inventoryTracking =
    variant.inventoryTracking === true ||
    (variant.inventoryTracking == null && product.inventoryTracking === true);
  const stock = inventoryTracking ? Math.max(0, Math.trunc(Number(variant.stock) || 0)) : null;
  const readyToShip = product.readyToShip === true || variant.readyToShip === true;
  const unavailable =
    product.available === false ||
    product.comingSoon === true ||
    ['out_of_stock', 'unavailable', 'archived'].includes(text(variant.availabilityState).toLowerCase());
  const lowStockThreshold = Math.max(0, Number(product.lowStockThreshold) || 0);
  const availabilityState = inventoryTracking
    ? (stock || 0) <= 0
      ? 'out_of_stock'
      : (stock || 0) <= lowStockThreshold
        ? 'low_stock'
        : 'in_stock'
    : unavailable
      ? 'unavailable'
      : product.quoteOnly === true || product.customizable === true
        ? 'preorder'
        : 'in_stock';
  const productId = text(product.id);
  const sku = text(variant.sku);
  const siteRatePrice =
    product.pricingRateSource === 'site_exchange_rate' &&
    Number(product.priceLydSource) > 0 &&
    siteRate != null &&
    siteRate > 0
      ? roundStorePrice(Number(product.priceLydSource) / siteRate)
      : null;
  return {
    variant_id: `${productId}:${sku}`,
    product_id: productId,
    canonical_slug: text(product.slug),
    sku,
    product_name: nameEn(product.name),
    product_status: product.comingSoon === true ? 'coming_soon' : text(product.status || 'active'),
    active: product.available !== false && product.comingSoon !== true && variant.active !== false,
    color: text(variant.color) || null,
    size: text(variant.size) || null,
    currency: text(product.currency || 'USD'),
    unit_price: siteRatePrice ?? num(variant.unitPrice) ?? num(product.price) ?? 0,
    compare_at_price: num(variant.compareAt) ?? num(product.compareAt),
    availability_state: availabilityState,
    inventory_tracking: inventoryTracking,
    inventory_quantity: stock,
    variant_data: {
      color: text(variant.color) || null,
      size: text(variant.size) || null,
      sku,
      brand: text(product.brand) || null,
      category: text(product.category) || null,
      subcategory: text(product.subcategory) || null,
      productType: text(product.productType) || null,
      quoteOnly: product.quoteOnly === true,
      retailAvailable: product.quoteOnly !== true && product.retailAvailable !== false,
      wholesaleAvailable: product.quoteOnly !== true && product.wholesaleAvailable === true,
      wholesalePrice: num(variant.wholesalePrice) ?? num(product.wholesalePrice),
      wholesaleMin: num(product.wholesaleMin),
      minimumOrder: num(product.minimumOrder) ?? 1,
      customizable: product.customizable === true,
      largeEquipment: product.largeEquipment === true,
      readyToShip,
      deliveryProfile: text(product.deliveryProfile || (readyToShip ? 'ready' : 'standard')),
      inventorySource: text(product.inventorySource || (inventoryTracking ? 'catalog' : 'supplier-order')),
      inventoryPoolKey: text(variant.inventoryPoolKey) || null,
      inventoryPoolStock: num(variant.inventoryPoolStock),
      inventoryVerified: variant.inventoryVerified === true || product.inventoryVerified === true,
      inventoryLocation: text(product.inventoryLocation) || null,
      mediaStatus: text(product.mediaStatus) || null,
      pricingRateSource: text(product.pricingRateSource) || null,
      priceLydSource: num(product.priceLydSource),
      madeInUSA: product.madeInUSA === true,
      storefronts: Array.isArray(product.storefronts) ? product.storefronts : ['shop'],
    },
  };
}

async function fetchAuthoritativeSiteRate(): Promise<number | null> {
  try {
    const rows = (await supabaseAdminRequest(
      '/rest/v1/commerce_settings?setting_key=eq.usd_to_lyd_rate&select=numeric_value&limit=1',
      { method: 'GET' },
    )) as Array<{ numeric_value?: unknown }>;
    const rate = Number(rows?.[0]?.numeric_value);
    return Number.isFinite(rate) && rate > 0 ? rate : null;
  } catch {
    return null;
  }
}

/**
 * Refresh only untracked requested variants from the code-shipped catalogue.
 * Tracked inventory is deliberately never reset here: stock decrements remain
 * authoritative in Supabase. This primarily keeps owner-confirmed LHA and
 * supplier-order variants aligned with the current storefront on deploys where
 * the generated catalogue SQL has not been applied yet.
 */
export async function syncUntrackedRequestedCatalog(lines: RequestedLine[]): Promise<number> {
  const rows: ReturnType<typeof trustedRow>[] = [];
  const siteRate = await fetchAuthoritativeSiteRate();
  for (const line of lines) {
    const product = (products as ProductRow[]).find((entry) => text(entry.id) === line.productId);
    if (!product || product.available === false || product.comingSoon === true) continue;
    const variants = Array.isArray(product.variants)
      ? (product.variants as Array<Record<string, unknown>>)
      : [];
    const variant = variants.find(
      (entry) => `${text(product.id)}:${text(entry.sku)}` === line.variantId,
    );
    if (!variant || variant.active === false) continue;
    // Never restore a site-rate product using the code fallback price. If the
    // authoritative cloud rate cannot be read, let the transactional catalogue
    // remain untouched and fail closed rather than charging a stale amount.
    if (product.pricingRateSource === 'site_exchange_rate' && siteRate == null) continue;
    const tracking =
      variant.inventoryTracking === true ||
      (variant.inventoryTracking == null && product.inventoryTracking === true);
    if (tracking) continue;
    rows.push(trustedRow(product, variant, siteRate));
  }
  if (!rows.length) return 0;
  await supabaseAdminRequest('/rest/v1/product_catalog?on_conflict=variant_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(rows),
  });
  return rows.length;
}

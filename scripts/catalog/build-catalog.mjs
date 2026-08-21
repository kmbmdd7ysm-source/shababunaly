import { products } from '../../src/data/products.ts';

const currencies = new Set(['USD', 'LYD']);
export function buildCatalog(input = products) {
  const seen = new Set();
  return input
    .flatMap((product) => {
      if (!product?.id || !product?.slug || !product?.sku)
        throw new Error('Product missing stable id, slug, or SKU');
      if (!currencies.has(product.currency))
        throw new Error(`Unsupported currency for ${product.id}`);
      if (!Number.isFinite(product.price) || product.price < 0)
        throw new Error(`Invalid price for ${product.id}`);
      return (product.variants || []).map((variant) => {
        if (!variant?.sku) throw new Error(`Variant missing SKU for ${product.id}`);
        const variantId = `${product.id}:${variant.sku}`;
        if (seen.has(variantId)) throw new Error(`Duplicate variant id ${variantId}`);
        seen.add(variantId);
        const inventoryTracking = variant.inventoryTracking ?? product.inventoryTracking ?? true;
        if (inventoryTracking && !Number.isInteger(variant.stock))
          throw new Error(`Tracked variant requires integer stock for ${variantId}`);
        return {
          variant_id: variantId,
          product_id: product.id,
          canonical_slug: product.slug,
          sku: variant.sku,
          product_name: product.name.en,
          product_status: product.comingSoon === true ? 'coming_soon' : (product.status || 'active'),
          active:
            product.available !== false &&
            product.comingSoon !== true &&
            variant.active !== false &&
            product.availability !== 'sold-out',
          color: variant.color || null,
          size: variant.size || null,
          currency: product.currency,
          unit_price: product.price,
          compare_at_price: product.compareAt ?? null,
          availability_state: inventoryTracking
            ? variant.stock > 0
              ? variant.stock <= product.lowStockThreshold
                ? 'low_stock'
                : 'in_stock'
              : 'out_of_stock'
            : product.available === false || product.comingSoon
              ? 'unavailable'
              : product.reservationAvailable === true || product.quoteOnly || product.customizable
                ? 'preorder'
                : 'in_stock',
          inventory_tracking: inventoryTracking,
          inventory_quantity: inventoryTracking ? variant.stock : null,
          variant_data: {
            color: variant.color || null,
            size: variant.size || null,
            sku: variant.sku,
            brand: product.brand || null,
            category: product.category || null,
            subcategory: product.subcategory || null,
            productType: product.productType || null,
            quoteOnly: product.quoteOnly === true,
            retailAvailable: product.quoteOnly !== true && product.retailAvailable !== false,
            wholesaleAvailable: product.quoteOnly !== true && Boolean(product.wholesaleAvailable),
            wholesalePrice: Number.isFinite(Number(product.wholesalePrice))
              ? Number(product.wholesalePrice)
              : null,
            wholesaleMin: Number.isFinite(Number(product.wholesaleMin))
              ? Number(product.wholesaleMin)
              : null,
            minimumOrder: Number.isFinite(Number(product.minimumOrder))
              ? Number(product.minimumOrder)
              : 1,
            customizable: Boolean(product.customizable),
            largeEquipment: Boolean(product.largeEquipment),
            readyToShip: Boolean(product.readyToShip),
            reservationAvailable: product.reservationAvailable === true,
            deliveryProfile:
              product.deliveryProfile || (product.readyToShip ? 'ready' : 'standard'),
            inventorySource:
              product.inventorySource || (inventoryTracking ? 'catalog' : 'supplier-order'),
            inventoryPoolKey: variant.inventoryPoolKey || null,
            inventoryPoolStock: Number.isFinite(Number(variant.inventoryPoolStock))
              ? Number(variant.inventoryPoolStock)
              : null,
            inventoryVerified: variant.inventoryVerified === true || product.inventoryVerified === true,
            inventoryLocation: product.inventoryLocation || null,
            mediaStatus: product.mediaStatus || null,
            // Preserve source-currency pricing metadata in the trusted DB row.
            // This lets the server recompute the store price atomically when
            // the editable site exchange rate changes.
            pricingRateSource: product.pricingRateSource || null,
            priceLydSource: Number.isFinite(Number(product.priceLydSource))
              ? Number(product.priceLydSource)
              : null,
            madeInUSA: Boolean(product.madeInUSA),
            storefronts: Array.isArray(product.storefronts) ? product.storefronts : ['shop'],
          },
        };
      });
    })
    .sort((a, b) => a.variant_id.localeCompare(b.variant_id));
}

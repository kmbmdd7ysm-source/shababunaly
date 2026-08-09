import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  products as staticProducts,
  allBrands as staticBrands,
  allColors as staticColors,
  allProductTypes as staticProductTypes,
  allSizes as staticSizes,
} from '../data/products';
import { getSupabase } from '../services/supabase';
import { getRelatedProducts } from '../utils/relatedProducts.ts';
import { isReadyToShipEligible } from '../utils/productEligibility.ts';

const CatalogContext = createContext(null);
const REFRESH_MS = 5 * 60 * 1000;

function rowData(row) {
  return row?.variant_data && typeof row.variant_data === 'object' ? row.variant_data : {};
}

function overlayProduct(product, rows) {
  const activeRows = rows.filter((row) => row && row.variant_id && row.sku);
  if (!activeRows.length) return product;
  const variants = activeRows.map((row) => {
    const data = rowData(row);
    const unitPrice = Number(row.unit_price);
    const compareAt = row.compare_at_price == null ? null : Number(row.compare_at_price);
    const wholesalePrice = data.wholesalePrice == null ? null : Number(data.wholesalePrice);
    return {
      size: row.size || 'OS',
      color: row.color || 'black',
      sku: row.sku,
      stock: row.inventory_tracking ? Math.max(0, Number(row.inventory_quantity) || 0) : 0,
      inventoryTracking: Boolean(row.inventory_tracking),
      availabilityState: row.availability_state || 'in_stock',
      unitPrice: Number.isFinite(unitPrice) ? unitPrice : Number(product.price),
      compareAt: Number.isFinite(compareAt) ? compareAt : null,
      wholesalePrice: Number.isFinite(wholesalePrice)
        ? wholesalePrice
        : Number(product.wholesalePrice || 0) || null,
      readyToShip:
        Boolean(data.readyToShip) &&
        Boolean(row.inventory_tracking) &&
        Number(row.inventory_quantity) > 0,
      catalogUpdatedAt: row.updated_at || null,
    };
  });
  const tracked = variants.some((variant) => variant.inventoryTracking);
  const stock = tracked
    ? variants.reduce((sum, variant) => sum + (variant.inventoryTracking ? variant.stock : 0), 0)
    : 0;
  const data = rowData(activeRows[0]);
  const readyToShip = activeRows.some((row) => {
    const variant = rowData(row);
    return (
      Boolean(variant.readyToShip) &&
      Boolean(row.inventory_tracking) &&
      Number(row.inventory_quantity) > 0
    );
  });
  const hasAvailableVariant = activeRows.some((row) =>
    row.inventory_tracking
      ? Number(row.inventory_quantity) > 0
      : !['out_of_stock', 'unavailable'].includes(row.availability_state),
  );
  const retailPrices = variants.map((variant) => variant.unitPrice).filter(Number.isFinite);
  const comparePrices = variants.map((variant) => variant.compareAt).filter(Number.isFinite);
  const wholesalePrices = variants
    .map((variant) => variant.wholesalePrice)
    .filter((value) => Number.isFinite(value) && value > 0);
  const unitPrice = retailPrices.length ? Math.min(...retailPrices) : Number(product.price);
  const compareAt = comparePrices.length ? Math.min(...comparePrices) : product.compareAt;
  const wholesalePrice = wholesalePrices.length
    ? Math.min(...wholesalePrices)
    : Number(product.wholesalePrice);

  const comingSoon = data.comingSoon == null ? product.comingSoon : Boolean(data.comingSoon);
  const productName =
    data.nameEn || data.nameAr
      ? {
          en: data.nameEn || product.name?.en || product.name,
          ar: data.nameAr || data.nameEn || product.name?.ar || product.name?.en || product.name,
        }
      : product.name;
  const description =
    data.descriptionEn || data.descriptionAr
      ? {
          en: data.descriptionEn || product.description?.en || '',
          ar:
            data.descriptionAr ||
            data.descriptionEn ||
            product.description?.ar ||
            product.description?.en ||
            '',
        }
      : product.description;

  return {
    ...product,
    name: productName,
    description,
    brand: data.brand || product.brand,
    category: data.category || product.category,
    subcategory: data.subcategory || product.subcategory,
    productType: data.productType || product.productType,
    image: data.imageUrl || product.image,
    socialImage: data.socialImageUrl || product.socialImage,
    featured: data.featured == null ? product.featured : Boolean(data.featured),
    newArrival: data.newArrival == null ? product.newArrival : Boolean(data.newArrival),
    bestSeller: data.bestSeller == null ? product.bestSeller : Boolean(data.bestSeller),
    comingSoon,
    quoteOnly: data.quoteOnly == null ? product.quoteOnly : Boolean(data.quoteOnly),
    price: Number.isFinite(unitPrice) ? unitPrice : product.price,
    priceVaries: new Set(retailPrices.map((value) => value.toFixed(2))).size > 1,
    compareAt: Number.isFinite(Number(compareAt)) ? Number(compareAt) : product.compareAt,
    wholesalePrice: Number.isFinite(wholesalePrice) ? wholesalePrice : product.wholesalePrice,
    wholesalePriceVaries: new Set(wholesalePrices.map((value) => value.toFixed(2))).size > 1,
    wholesaleMin: Number(data.wholesaleMin ?? product.wholesaleMin),
    minimumOrder: Number(data.minimumOrder ?? product.minimumOrder),
    wholesaleAvailable:
      data.wholesaleAvailable == null
        ? product.wholesaleAvailable
        : Boolean(data.wholesaleAvailable),
    retailAvailable:
      data.retailAvailable == null ? product.retailAvailable : Boolean(data.retailAvailable),
    customizable: data.customizable == null ? product.customizable : Boolean(data.customizable),
    largeEquipment:
      data.largeEquipment == null ? product.largeEquipment : Boolean(data.largeEquipment),
    madeInUSA: data.madeInUSA == null ? product.madeInUSA : Boolean(data.madeInUSA),
    readyToShip,
    deliveryProfile: readyToShip
      ? 'ready'
      : data.deliveryProfile || product.deliveryProfile || 'standard',
    inventoryTracking: tracked,
    inventorySource: data.inventorySource || product.inventorySource,
    variants,
    stock,
    availability: !comingSoon && hasAvailableVariant ? 'in-stock' : 'sold-out',
    available: !comingSoon && hasAvailableVariant,
    catalogUpdatedAt: activeRows.reduce(
      (latest, row) =>
        !latest || String(row.updated_at || '') > String(latest) ? row.updated_at : latest,
      null,
    ),
  };
}

export function mergeCatalogProducts(baseProducts, rows) {
  if (!Array.isArray(rows) || !rows.length) return baseProducts;
  const grouped = new Map();
  for (const row of rows) {
    if (!row?.product_id) continue;
    const group = grouped.get(row.product_id) || [];
    group.push(row);
    grouped.set(row.product_id, group);
  }
  return baseProducts.map((product) => overlayProduct(product, grouped.get(product.id) || []));
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

export function CatalogProvider({ children }) {
  const [products, setProducts] = useState(staticProducts);
  const [status, setStatus] = useState('static');
  const [error, setError] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);

  const refresh = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setStatus((current) => (current === 'ready' ? 'refreshing' : 'loading'));
    try {
      const client = await getSupabase();
      if (!client) {
        setStatus('static');
        return staticProducts;
      }
      const { data, error: queryError } = await client.rpc('get_public_product_catalog');
      if (queryError) throw queryError;
      if (!Array.isArray(data) || !data.length) throw new Error('catalog_empty');
      const merged = mergeCatalogProducts(staticProducts, data);
      if (!merged.length) throw new Error('catalog_empty');
      setProducts(merged);
      setStatus('ready');
      setError(null);
      setUpdatedAt(new Date().toISOString());
      return merged;
    } catch (nextError) {
      setError(nextError);
      setStatus('static');
      return staticProducts;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer;
    let idleId = 0;
    const start = () => {
      if (cancelled) return;
      refresh({ quiet: true });
      timer = window.setInterval(() => {
        if (document.visibilityState === 'visible') refresh({ quiet: true });
      }, REFRESH_MS);
    };
    if (typeof window.requestIdleCallback === 'function')
      idleId = window.requestIdleCallback(start, { timeout: 1800 });
    else timer = window.setTimeout(start, 900);
    return () => {
      cancelled = true;
      if (typeof window.cancelIdleCallback === 'function' && idleId)
        window.cancelIdleCallback(idleId);
      window.clearTimeout(timer);
      window.clearInterval(timer);
    };
  }, [refresh]);

  const value = useMemo(() => {
    const byId = new Map(products.map((product) => [product.id, product]));
    const bySlug = new Map(products.map((product) => [product.slug, product]));
    const colors = Array.from(
      new Map(
        products.flatMap((product) => product.colors || []).map((color) => [color.key, color]),
      ).values(),
    );
    const brands = unique(products.map((product) => product.brand)).sort((a, b) => {
      const ai = staticBrands.indexOf(a);
      const bi = staticBrands.indexOf(b);
      if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      return a.localeCompare(b);
    });
    return {
      products,
      status,
      error,
      updatedAt,
      refresh,
      getProduct: (slug) => bySlug.get(slug),
      getProductById: (id) => byId.get(id),
      featuredProducts: () => products.filter((product) => product.featured && !product.legacyLha),
      newArrivals: () => products.filter((product) => product.newArrival && !product.legacyLha),
      bestSellers: () => products.filter((product) => product.bestSeller && !product.legacyLha),
      readyToShipProducts: () => products.filter((product) => isReadyToShipEligible(product, 'LY')),
      lhaStoreProducts: () => products.filter((product) => product.storefronts?.includes('lha')),
      productsByCategory: (category) =>
        category === 'ready-to-ship'
          ? products.filter((product) => isReadyToShipEligible(product, 'LY'))
          : products.filter((product) => product.category === category),
      productsBySubcategory: (category, subcategory) =>
        products.filter(
          (product) => product.category === category && product.subcategory === subcategory,
        ),
      relatedProducts: (item, limit = 4) => getRelatedProducts(item, products, limit),
      isLowStock: (product) =>
        Boolean(product?.inventoryTracking) &&
        product.inventoryVerified === true &&
        Number(product.stock) > 0 &&
        Number(product.stock) <= Number(product.lowStockThreshold || 0),
      allColors: colors.length ? colors : staticColors,
      allSizes: unique(products.flatMap((product) => product.sizes || [])).length
        ? unique(products.flatMap((product) => product.sizes || []))
        : staticSizes,
      allBrands: brands.length ? brands : staticBrands,
      allProductTypes: unique(products.map((product) => product.productType)).sort().length
        ? unique(products.map((product) => product.productType)).sort()
        : staticProductTypes,
    };
  }, [products, status, error, updatedAt, refresh]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const value = useContext(CatalogContext);
  if (!value) throw new Error('useCatalog must be used inside CatalogProvider');
  return value;
}

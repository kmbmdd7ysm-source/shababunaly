import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  products as staticProducts,
  allBrands as staticBrands,
  allColors as staticColors,
  allProductTypes as staticProductTypes,
  allSizes as staticSizes,
} from '../data/products.ts';
import { getSupabase } from '../services/supabase.ts';
import { spaldingOfficialProducts } from '../data/spaldingOfficialProducts.ts';
import { getRelatedProducts } from '../utils/relatedProducts.ts';
import { hasRealProductMedia, isReadyToShipEligible, type ProductLike } from '../utils/productEligibility.ts';

type LocaleText = { en?: string; ar?: string } | string | null | undefined;

export type CatalogProduct = Record<string, unknown> & {
  id: string;
  slug?: string;
  price?: number;
  compareAt?: number | null;
  wholesalePrice?: number | null;
  name?: LocaleText;
  description?: LocaleText;
  brand?: string;
  category?: string;
  subcategory?: string;
  productType?: string;
  colors?: Array<Record<string, unknown>>;
  sizes?: unknown[];
  variants?: Array<Record<string, unknown>>;
  storefronts?: string[];
  featured?: boolean;
  newArrival?: boolean;
  bestSeller?: boolean;
  comingSoon?: boolean;
  readyToShip?: boolean;
  inventoryTracking?: boolean;
  inventoryVerified?: boolean;
  stock?: number;
  lowStockThreshold?: number;
  legacyLha?: boolean;
};

type CatalogRow = Record<string, unknown> & {
  variant_id?: unknown;
  sku?: unknown;
  product_id?: unknown;
  unit_price?: unknown;
  compare_at_price?: unknown;
  size?: unknown;
  color?: unknown;
  inventory_tracking?: unknown;
  inventory_quantity?: unknown;
  availability_state?: unknown;
  updated_at?: unknown;
  variant_data?: unknown;
};

export type CatalogContextValue = {
  products: CatalogProduct[];
  status: string;
  error: unknown;
  updatedAt: string | null;
  refresh: (options?: { quiet?: boolean }) => Promise<CatalogProduct[]>;
  getProduct: (slug: string) => CatalogProduct | undefined;
  getProductById: (id: string) => CatalogProduct | undefined;
  featuredProducts: () => CatalogProduct[];
  newArrivals: () => CatalogProduct[];
  bestSellers: () => CatalogProduct[];
  readyToShipProducts: () => CatalogProduct[];
  lhaStoreProducts: () => CatalogProduct[];
  productsByCategory: (category: string) => CatalogProduct[];
  productsBySubcategory: (category: string, subcategory: string) => CatalogProduct[];
  relatedProducts: (item: unknown, limit?: number) => CatalogProduct[];
  isLowStock: (product: unknown) => boolean;
  allColors: unknown;
  allSizes: unknown;
  allBrands: unknown;
  allProductTypes: unknown;
};

const CatalogContext = createContext<CatalogContextValue | null>(null);
const REFRESH_MS = 5 * 60 * 1000;
const BASE_PRODUCTS = [...(staticProducts as CatalogProduct[]), ...(spaldingOfficialProducts as CatalogProduct[])];

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};


const finiteNumber = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

function rowData(row: CatalogRow | null | undefined): Record<string, unknown> {
  return row?.variant_data && typeof row.variant_data === 'object'
    ? (row.variant_data as Record<string, unknown>)
    : {};
}

function overlayProduct(product: CatalogProduct, rows: CatalogRow[]): CatalogProduct {
  const ownerConfirmedLhaReady =
    product.legacyLha === true &&
    product.comingSoon !== true &&
    product.available !== false &&
    product.quoteOnly !== true;
  const activeRows = rows.filter((row) => row && row.variant_id && row.sku);
  if (!activeRows.length) return product;
  const variants = activeRows.map((row) => {
    const data = rowData(row);
    const unitPrice = Number(row.unit_price);
    const compareAt = row.compare_at_price == null ? null : Number(row.compare_at_price);
    const wholesalePrice = data.wholesalePrice == null ? null : Number(data.wholesalePrice);
    return {
      size: String(row.size || 'OS'),
      color: String(row.color || 'black'),
      sku: String(row.sku),
      stock: ownerConfirmedLhaReady
        ? 0
        : row.inventory_tracking
          ? Math.max(0, Number(row.inventory_quantity) || 0)
          : 0,
      inventoryTracking: ownerConfirmedLhaReady ? false : Boolean(row.inventory_tracking),
      availabilityState: ownerConfirmedLhaReady
        ? 'in_stock'
        : String(row.availability_state || 'in_stock'),
      unitPrice: ownerConfirmedLhaReady
        ? Number(product.price)
        : Number.isFinite(unitPrice)
          ? unitPrice
          : Number(product.price),
      compareAt: Number.isFinite(compareAt) ? compareAt : null,
      wholesalePrice: Number.isFinite(wholesalePrice)
        ? wholesalePrice
        : Number(product.wholesalePrice || 0) || null,
      readyToShip:
        ownerConfirmedLhaReady ||
        (Boolean(data.readyToShip) &&
          Boolean(row.inventory_tracking) &&
          Number(row.inventory_quantity) > 0),
      catalogUpdatedAt: row.updated_at || null,
    };
  });
  const tracked = variants.some((variant) => variant.inventoryTracking);
  const stock = tracked
    ? variants.reduce((sum, variant) => sum + (variant.inventoryTracking ? variant.stock : 0), 0)
    : 0;
  const firstRow = activeRows[0];
  const data = rowData(firstRow);
  const readyToShip = ownerConfirmedLhaReady || activeRows.some((row) => {
    const variant = rowData(row);
    return (
      Boolean(variant.readyToShip) &&
      Boolean(row.inventory_tracking) &&
      Number(row.inventory_quantity) > 0
    );
  });
  const hasAvailableVariant = ownerConfirmedLhaReady || activeRows.some((row) =>
    row.inventory_tracking
      ? Number(row.inventory_quantity) > 0
      : !['out_of_stock', 'unavailable'].includes(String(row.availability_state || '')),
  );
  const retailPrices = variants
    .map((variant) => variant.unitPrice)
    .filter((value): value is number => Number.isFinite(value));
  const comparePrices = variants
    .map((variant) => variant.compareAt)
    .filter((value): value is number => value != null && Number.isFinite(value));
  const wholesalePrices = variants
    .map((variant) => variant.wholesalePrice)
    .filter((value): value is number => value != null && Number.isFinite(value) && value > 0);
  const unitPrice = retailPrices.length
    ? Math.min(...retailPrices)
    : Number(product.price);
  const compareAt = comparePrices.length ? Math.min(...comparePrices) : product.compareAt;
  const wholesalePrice = wholesalePrices.length
    ? Math.min(...wholesalePrices)
    : Number(product.wholesalePrice);

  const comingSoon = product.legacyLha === true
    ? Boolean(product.comingSoon)
    : data.comingSoon == null
      ? Boolean(product.comingSoon)
      : Boolean(data.comingSoon);
  const productName =
    data.nameEn || data.nameAr
      ? {
          en: String(data.nameEn || asRecord(product.name).en || product.name || ''),
          ar: String(
            data.nameAr ||
              data.nameEn ||
              asRecord(product.name).ar ||
              asRecord(product.name).en ||
              product.name ||
              '',
          ),
        }
      : product.name;
  const description =
    data.descriptionEn || data.descriptionAr
      ? {
          en: String(data.descriptionEn || asRecord(product.description).en || ''),
          ar: String(
            data.descriptionAr ||
              data.descriptionEn ||
              asRecord(product.description).ar ||
              asRecord(product.description).en ||
              '',
          ),
        }
      : product.description;

  const compareAtFinite = finiteNumber(compareAt);
  const wholesaleFinite = finiteNumber(wholesalePrice);

  const next: CatalogProduct = {
    ...product,
    name: productName,
    description,
    comingSoon,
    readyToShip,
    inventoryTracking: ownerConfirmedLhaReady ? false : tracked,
    variants,
    stock: ownerConfirmedLhaReady ? 0 : stock,
    availability: !comingSoon && hasAvailableVariant ? 'in-stock' : 'sold-out',
    available: !comingSoon && hasAvailableVariant,
    priceVaries: new Set(retailPrices.map((value) => value.toFixed(2))).size > 1,
    wholesalePriceVaries: new Set(wholesalePrices.map((value) => value.toFixed(2))).size > 1,
    wholesaleMin: Number(data.wholesaleMin ?? product.wholesaleMin),
    minimumOrder: Number(data.minimumOrder ?? product.minimumOrder),
    catalogUpdatedAt: activeRows.reduce<unknown>((latest, row) => {
      const stamp = row.updated_at;
      return !latest || String(stamp || '') > String(latest) ? stamp : latest;
    }, null),
  };
  if ((data.brand as string | undefined) || product.brand)
    next.brand = String(data.brand || product.brand || '');
  if ((data.category as string | undefined) || product.category)
    next.category = String(data.category || product.category || '');
  if ((data.subcategory as string | undefined) || product.subcategory)
    next.subcategory = String(data.subcategory || product.subcategory || '');
  if ((data.productType as string | undefined) || product.productType)
    next.productType = String(data.productType || product.productType || '');
  if (data.imageUrl || product.image) next.image = data.imageUrl || product.image;
  if (data.socialImageUrl || product.socialImage)
    next.socialImage = data.socialImageUrl || product.socialImage;
  next.featured = data.featured == null ? Boolean(product.featured) : Boolean(data.featured);
  next.newArrival =
    data.newArrival == null ? Boolean(product.newArrival) : Boolean(data.newArrival);
  next.bestSeller =
    data.bestSeller == null ? Boolean(product.bestSeller) : Boolean(data.bestSeller);
  next.quoteOnly = data.quoteOnly == null ? Boolean(product.quoteOnly) : Boolean(data.quoteOnly);
  if (product.legacyLha === true) next.price = product.price;
  else if (Number.isFinite(unitPrice)) next.price = unitPrice;
  else if (product.price != null) next.price = product.price;
  if (compareAtFinite != null) next.compareAt = compareAtFinite;
  else if (product.compareAt !== undefined) next.compareAt = product.compareAt ?? null;
  if (wholesaleFinite != null) next.wholesalePrice = wholesaleFinite;
  else if (product.wholesalePrice !== undefined)
    next.wholesalePrice = product.wholesalePrice ?? null;
  next.wholesaleAvailable =
    data.wholesaleAvailable == null
      ? Boolean(product.wholesaleAvailable)
      : Boolean(data.wholesaleAvailable);
  next.retailAvailable =
    data.retailAvailable == null
      ? Boolean(product.retailAvailable)
      : Boolean(data.retailAvailable);
  next.customizable =
    data.customizable == null ? Boolean(product.customizable) : Boolean(data.customizable);
  next.largeEquipment =
    data.largeEquipment == null
      ? Boolean(product.largeEquipment)
      : Boolean(data.largeEquipment);
  next.madeInUSA =
    data.madeInUSA == null ? Boolean(product.madeInUSA) : Boolean(data.madeInUSA);
  next.deliveryProfile = readyToShip
    ? 'ready'
    : data.deliveryProfile || product.deliveryProfile || 'standard';
  if (ownerConfirmedLhaReady) {
    next.inventorySource = 'owner_confirmed_lha_ready';
    next.inventoryLocation = 'LY';
    next.inventoryVerified = false;
    next.readyToShip = true;
  } else if (data.inventorySource || product.inventorySource) {
    next.inventorySource = data.inventorySource || product.inventorySource;
  }
  return next;
}

export function mergeCatalogProducts(
  baseProducts: CatalogProduct[],
  rows: CatalogRow[],
): CatalogProduct[] {
  if (!Array.isArray(rows) || !rows.length) return baseProducts;
  const grouped = new Map<string, CatalogRow[]>();
  for (const row of rows) {
    if (!row?.product_id) continue;
    const key = String(row.product_id);
    const group = grouped.get(key) || [];
    group.push(row);
    grouped.set(key, group);
  }
  return baseProducts.map((product) => overlayProduct(product, grouped.get(product.id) || []));
}

function unique(values: unknown[]): string[] {
  return [
    ...new Set(
      values
        .filter((value): value is string => Boolean(value) && typeof value === 'string')
        .map(String),
    ),
  ];
}

function marketplaceProductKey(product: CatalogProduct): string {
  const sku = String(product.sourceSku || '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();
  if (sku.length >= 6) return `sku:${sku}`;
  const nameValue =
    typeof product.name === 'string'
      ? product.name
      : String(asRecord(product.name).en || asRecord(product.name).ar || '');
  const normalizedName = nameValue.toLowerCase().replace(/[^a-z0-9]+/g, '');
  return normalizedName ? `name:${normalizedName}` : `id:${product.id}`;
}

function mergeMarketplaceProducts(
  baseProducts: CatalogProduct[],
  marketplaceProducts: CatalogProduct[],
): CatalogProduct[] {
  if (!Array.isArray(marketplaceProducts) || !marketplaceProducts.length) return baseProducts;

  const merged = [...baseProducts];
  const indexByKey = new Map<string, number>();
  merged.forEach((product, index) => {
    indexByKey.set(marketplaceProductKey(product), index);
  });

  for (const marketplaceProduct of marketplaceProducts) {
    if (!marketplaceProduct?.id) continue;
    const key = marketplaceProductKey(marketplaceProduct);
    const existingIndex = indexByKey.get(key);
    if (existingIndex == null) {
      // Reliability rule: never introduce a customer-facing product whose primary
      // media only exists on a third-party marketplace CDN. Marketplace data may
      // enrich an existing local product, but published media must ship locally.
      continue;
    }

    // Keep the project's existing product as the source of truth for its local media,
    // inventory and merchandising. Only enrich marketplace provenance metadata.
    const existing = merged[existingIndex];
    const marketplaces = new Set<string>();
    const existingSources = Array.isArray(existing.sourceMarketplaces)
      ? existing.sourceMarketplaces
      : existing.sourceMarketplace
        ? [existing.sourceMarketplace]
        : [];
    const incomingSources = Array.isArray(marketplaceProduct.sourceMarketplaces)
      ? marketplaceProduct.sourceMarketplaces
      : marketplaceProduct.sourceMarketplace
        ? [marketplaceProduct.sourceMarketplace]
        : [];
    [...existingSources, ...incomingSources].forEach((source) => {
      if (source) marketplaces.add(String(source));
    });
    merged[existingIndex] = {
      ...existing,
      sourceMarketplaces: [...marketplaces],
    };
  }

  return merged;
}

export function CatalogProvider({ children }: { children?: ReactNode }) {
  const [products, setProducts] = useState<CatalogProduct[]>(
    () => BASE_PRODUCTS,
  );
  const [status, setStatus] = useState('static');
  const [error, setError] = useState<unknown>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const marketplaceProductsRef = useRef<CatalogProduct[]>([]);

  const refresh = useCallback(async ({ quiet = false }: { quiet?: boolean } = {}) => {
    if (!quiet) setStatus((current) => (current === 'ready' ? 'refreshing' : 'loading'));
    try {
      const client = await getSupabase();
      if (!client) {
        setStatus('static');
        return BASE_PRODUCTS;
      }
      const { data, error: queryError } = await client.rpc('get_public_product_catalog');
      if (queryError) throw queryError;
      if (!Array.isArray(data) || !data.length) throw new Error('catalog_empty');
      const merged = mergeCatalogProducts(
        BASE_PRODUCTS,
        data as CatalogRow[],
      );
      if (!merged.length) throw new Error('catalog_empty');
      const withMarketplace = mergeMarketplaceProducts(merged, marketplaceProductsRef.current);
      setProducts(withMarketplace);
      setStatus('ready');
      setError(null);
      setUpdatedAt(new Date().toISOString());
      return withMarketplace;
    } catch (nextError) {
      setError(nextError);
      setStatus('static');
      return BASE_PRODUCTS;
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    const loadMarketplaceCatalog = async () => {
      const series = [4, 5, 6, 7, 8, 9, 10, 11, 12];
      const urls = [
        ...series.map((number) => `/api/kobe-marketplace-catalog?series=${number}&source=goat`),
        '/api/kobe-stockx-catalog',
      ];
      const responses = await Promise.allSettled(
        urls.map(async (url) => {
          const response = await fetch(url, {
            method: 'GET',
            headers: { Accept: 'application/json' },
            signal: controller.signal,
          });
          if (!response.ok) return [] as CatalogProduct[];
          const payload = (await response.json()) as { items?: unknown };
          return Array.isArray(payload.items) ? (payload.items as CatalogProduct[]) : [];
        }),
      );

      if (cancelled) return;
      const marketplaceProducts = responses.flatMap((result) =>
        result.status === 'fulfilled' ? result.value : [],
      );
      if (!marketplaceProducts.length) return;

      marketplaceProductsRef.current = marketplaceProducts;
      setProducts((current) => mergeMarketplaceProducts(current, marketplaceProducts));
    };

    const idleId =
      typeof window.requestIdleCallback === 'function'
        ? window.requestIdleCallback(() => void loadMarketplaceCatalog(), { timeout: 2200 })
        : window.setTimeout(() => void loadMarketplaceCatalog(), 1100);

    return () => {
      cancelled = true;
      controller.abort();
      if (typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idleId);
      else window.clearTimeout(idleId);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    let idleId = 0;
    const start = () => {
      if (cancelled) return;
      void refresh({ quiet: true });
      timer = window.setInterval(() => {
        if (document.visibilityState === 'visible') void refresh({ quiet: true });
      }, REFRESH_MS);
    };
    if (typeof window.requestIdleCallback === 'function')
      idleId = window.requestIdleCallback(start, { timeout: 1800 });
    else timer = window.setTimeout(start, 900);
    return () => {
      cancelled = true;
      if (typeof window.cancelIdleCallback === 'function' && idleId)
        window.cancelIdleCallback(idleId);
      if (timer != null) {
        window.clearTimeout(timer);
        window.clearInterval(timer);
      }
    };
  }, [refresh]);

  const value = useMemo<CatalogContextValue>(() => {
    const visualProducts = products.filter((product) => hasRealProductMedia(product as ProductLike));
    const byId = new Map(visualProducts.map((product) => [product.id, product]));
    const bySlug = new Map(
      visualProducts
        .filter((product) => typeof product.slug === 'string')
        .map((product) => [String(product.slug), product]),
    );
    const colors = Array.from(
      new Map(
        visualProducts
          .flatMap((product) => (Array.isArray(product.colors) ? product.colors : []))
          .map((color) => [String(color.key || ''), color] as const)
          .filter(([key]) => Boolean(key)),
      ).values(),
    );
    const brands = unique(visualProducts.map((product) => product.brand)).sort((a, b) => {
      const brandList = staticBrands as string[];
      const ai = brandList.indexOf(a);
      const bi = brandList.indexOf(b);
      if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      return a.localeCompare(b);
    });
    return {
      products: visualProducts,
      status,
      error,
      updatedAt,
      refresh,
      getProduct: (slug: string) => bySlug.get(slug),
      getProductById: (id: string) => byId.get(id),
      featuredProducts: () =>
        visualProducts.filter((product) => Boolean(product.featured) && !product.legacyLha),
      newArrivals: () =>
        visualProducts.filter((product) => Boolean(product.newArrival) && !product.legacyLha),
      bestSellers: () =>
        visualProducts.filter((product) => Boolean(product.bestSeller) && !product.legacyLha),
      readyToShipProducts: () =>
        visualProducts.filter((product) => isReadyToShipEligible(product as ProductLike, 'LY')),
      lhaStoreProducts: () =>
        visualProducts.filter((product) => Array.isArray(product.storefronts) && product.storefronts.includes('lha')),
      productsByCategory: (category: string) =>
        category === 'ready-to-ship'
          ? visualProducts.filter((product) => isReadyToShipEligible(product as ProductLike, 'LY'))
          : visualProducts.filter((product) => product.category === category),
      productsBySubcategory: (category: string, subcategory: string) =>
        visualProducts.filter(
          (product) => product.category === category && product.subcategory === subcategory,
        ),
      relatedProducts: (item: unknown, limit = 4) =>
        getRelatedProducts(
          item as import('../utils/relatedProducts').RelatedCandidate | null | undefined,
          visualProducts as import('../utils/relatedProducts').RelatedCandidate[],
          limit,
        ) as CatalogProduct[],
      isLowStock: (product: unknown) => {
        const row = asRecord(product);
        return (
          Boolean(row.inventoryTracking) &&
          row.inventoryVerified === true &&
          Number(row.stock) > 0 &&
          Number(row.stock) <= Number(row.lowStockThreshold || 0)
        );
      },
      allColors: colors.length ? colors : staticColors,
      allSizes: unique(visualProducts.flatMap((product) => product.sizes || [])).length
        ? unique(visualProducts.flatMap((product) => product.sizes || []))
        : staticSizes,
      allBrands: brands.length ? brands : staticBrands,
      allProductTypes: (() => {
        const types = unique(visualProducts.map((product) => product.productType)).sort();
        return types.length ? types : staticProductTypes;
      })(),
    };
  }, [products, status, error, updatedAt, refresh]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): CatalogContextValue {
  const value = useContext(CatalogContext);
  if (!value) throw new Error('useCatalog must be used inside CatalogProvider');
  return value;
}

// Silence unused helper in case localeField is reserved for future overlays.

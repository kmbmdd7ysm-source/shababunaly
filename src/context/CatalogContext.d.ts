export type CatalogContextValue = {
  products: Array<Record<string, unknown>>;
  loading?: boolean;
  status?: string;
  error: string | null;
  updatedAt?: string | null;
  refresh: (options?: { quiet?: boolean }) => Promise<void>;
  getProduct: (slug: string) => Record<string, unknown> | undefined;
  getProductById: (id: string) => Record<string, unknown> | undefined;
  relatedProducts: (product: unknown, limit?: number) => Array<Record<string, unknown>>;
  readyToShipProducts: () => Array<Record<string, unknown>>;
  lhaStoreProducts: () => Array<Record<string, unknown>>;
  productsByCategory?: (category: string) => Array<Record<string, unknown>>;
  productsBySubcategory?: (category: string, subcategory: string) => Array<Record<string, unknown>>;
  allBrands: unknown;
  allColors: unknown;
  allProductTypes: unknown;
  allSizes: unknown;
  isLowStock: (product: unknown) => boolean;
  source?: string;
};

export function useCatalog(): CatalogContextValue;
export function CatalogProvider(props: {
  children?: import('react').ReactNode;
}): import('react').ReactNode;

export function useCatalog(): {
  products: unknown[];
  relatedProducts: (product: unknown, limit?: number) => unknown[];
  [key: string]: unknown;
};

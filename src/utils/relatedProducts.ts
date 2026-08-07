import type { ProductLike } from './productEligibility.ts';

interface RelatedCandidate extends ProductLike {
  id: string;
  slug?: string;
  category?: string;
  subcategory?: string;
  productType?: string;
  brand?: string;
  price?: number;
  related?: string[];
  customizable?: unknown;
  quoteOnly?: unknown;
}

/**
 * Deterministic related-product ranking:
 * 1) explicit curated relations
 * 2) compatible category + subcategory
 * 3) product family / type
 * 4) price band
 * 5) availability compatibility
 * Brand-only matches are never enough on their own.
 */
export function getRelatedProducts(
  product: RelatedCandidate | null | undefined,
  catalog: RelatedCandidate[],
  limit = 4,
): RelatedCandidate[] {
  if (!product?.id) return [];
  const byId = new Map(catalog.map((entry) => [entry.id, entry]));
  const curated = (product.related || [])
    .map((id) => byId.get(id))
    .filter((entry): entry is RelatedCandidate => Boolean(entry && entry.id !== product.id));

  const rest = catalog.filter((entry) => entry.id !== product.id && !curated.some((c) => c.id === entry.id));
  const price = Number(product.price);
  const scored = rest
    .map((entry) => {
      let score = 0;
      if (entry.category && entry.category === product.category) score += 40;
      if (entry.subcategory && entry.subcategory === product.subcategory) score += 25;
      if (entry.productType && entry.productType === product.productType) score += 20;
      if (entry.customizable === product.customizable) score += 5;
      if (entry.quoteOnly === product.quoteOnly) score += 5;
      const entryPrice = Number(entry.price);
      if (Number.isFinite(price) && Number.isFinite(entryPrice) && price > 0) {
        const ratio = entryPrice / price;
        if (ratio >= 0.7 && ratio <= 1.3) score += 15;
        else if (ratio >= 0.5 && ratio <= 1.6) score += 8;
      }
      // Brand alone is insufficient — only a small boost when category already matches.
      if (entry.brand && entry.brand === product.brand && entry.category === product.category) score += 4;
      return { entry, score };
    })
    .filter((row) => row.score >= 40)
    .sort((a, b) => b.score - a.score || String(a.entry.slug).localeCompare(String(b.entry.slug)));

  return [...curated, ...scored.map((row) => row.entry)].slice(0, limit);
}

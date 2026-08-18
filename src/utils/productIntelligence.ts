import type { CatalogProduct } from '../context/CatalogContext';

export type PerformanceMetricKey =
  | 'cushioning'
  | 'traction'
  | 'support'
  | 'stability'
  | 'courtFeel'
  | 'responsiveness'
  | 'durability'
  | 'outdoorSuitability'
  | 'breathability'
  | 'impactProtection';

export type VerifiedPerformanceMetric = {
  value: number;
  source?: string;
  verified?: boolean;
};

export type PerformanceProfile = Partial<Record<PerformanceMetricKey, VerifiedPerformanceMetric>> & {
  positions?: string[];
  playStyles?: string[];
  courtTypes?: string[];
  wideFoot?: boolean | null;
  weightGrams?: number | null;
  provenance?: string | null;
};

export const PERFORMANCE_METRICS: Array<{ key: PerformanceMetricKey; en: string; ar: string }> = [
  { key: 'cushioning', en: 'Cushioning', ar: 'التبطين' },
  { key: 'traction', en: 'Traction', ar: 'التماسك' },
  { key: 'support', en: 'Support', ar: 'الدعم' },
  { key: 'stability', en: 'Stability', ar: 'الثبات' },
  { key: 'courtFeel', en: 'Court feel', ar: 'الإحساس بالملعب' },
  { key: 'responsiveness', en: 'Responsiveness', ar: 'الاستجابة' },
  { key: 'durability', en: 'Durability', ar: 'المتانة' },
  { key: 'outdoorSuitability', en: 'Outdoor suitability', ar: 'مناسب للخارج' },
  { key: 'breathability', en: 'Breathability', ar: 'التهوية' },
  { key: 'impactProtection', en: 'Impact protection', ar: 'امتصاص الصدمات' },
];

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(String).map((item) => item.trim()).filter(Boolean) : [];

function metric(value: unknown): VerifiedPerformanceMetric | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    // A naked number is not trusted: Phase 3 requires provenance/verification.
    return undefined;
  }
  const row = asRecord(value);
  const numeric = Number(row.value);
  if (!Number.isFinite(numeric) || row.verified !== true) return undefined;
  return {
    value: Math.max(0, Math.min(10, numeric)),
    verified: true,
    source: typeof row.source === 'string' ? row.source : undefined,
  };
}

export function getPerformanceProfile(product?: CatalogProduct | null): PerformanceProfile {
  const raw = asRecord(product?.performanceProfile);
  const profile: PerformanceProfile = {
    positions: asStringArray(raw.positions ?? product?.positions),
    playStyles: asStringArray(raw.playStyles ?? product?.playStyles),
    courtTypes: asStringArray(raw.courtTypes ?? product?.courtTypes),
    wideFoot: typeof (raw.wideFoot ?? product?.wideFoot) === 'boolean' ? Boolean(raw.wideFoot ?? product?.wideFoot) : null,
    weightGrams: Number.isFinite(Number(raw.weightGrams ?? product?.weightGrams)) ? Number(raw.weightGrams ?? product?.weightGrams) : null,
    provenance: typeof raw.provenance === 'string' ? raw.provenance : null,
  };

  for (const item of PERFORMANCE_METRICS) {
    const resolved = metric(raw[item.key]);
    if (resolved) profile[item.key] = resolved;
  }
  return profile;
}

export function hasVerifiedPerformanceData(product?: CatalogProduct | null): boolean {
  const profile = getPerformanceProfile(product);
  return PERFORMANCE_METRICS.some(({ key }) => Boolean(profile[key])) ||
    Boolean(profile.positions?.length || profile.playStyles?.length || profile.courtTypes?.length || profile.provenance);
}

export function isBasketballPerformanceShoe(product?: CatalogProduct | null): boolean {
  if (!product) return false;
  return String(product.category || '') === 'footwear' && String(product.subcategory || '') === 'in-court';
}

export type ShoeFinderPreferences = {
  position?: string;
  court?: string;
  priority?: PerformanceMetricKey | '';
  foot?: 'normal' | 'wide' | '';
  maxPrice?: number | null;
};

export type ShoeMatch = {
  product: CatalogProduct;
  score: number;
  matched: string[];
  unverified: string[];
};

/**
 * Conservative ranking: only verified structured attributes affect performance score.
 * Price may affect ranking because it is first-party catalogue data. Unknown attributes
 * never count as a match and are surfaced to the UI as unverified.
 */
export function rankBasketballShoes(
  products: CatalogProduct[],
  prefs: ShoeFinderPreferences,
): ShoeMatch[] {
  return products
    .filter(isBasketballPerformanceShoe)
    .filter(hasVerifiedPerformanceData)
    .filter((product) => !prefs.maxPrice || Number(product.price || 0) <= prefs.maxPrice)
    .map((product) => {
      const profile = getPerformanceProfile(product);
      let score = 0;
      const matched: string[] = [];
      const unverified: string[] = [];

      if (prefs.position) {
        if (profile.positions?.includes(prefs.position)) {
          score += 4;
          matched.push('position');
        } else if (!profile.positions?.length) unverified.push('position');
      }
      if (prefs.court) {
        if (profile.courtTypes?.includes(prefs.court)) {
          score += 3;
          matched.push('court');
        } else if (!profile.courtTypes?.length) unverified.push('court');
      }
      if (prefs.priority) {
        const value = profile[prefs.priority];
        if (value) {
          score += value.value;
          matched.push(prefs.priority);
        } else unverified.push(prefs.priority);
      }
      if (prefs.foot === 'wide') {
        if (profile.wideFoot === true) {
          score += 3;
          matched.push('wideFoot');
        } else if (profile.wideFoot == null) unverified.push('wideFoot');
      }

      // Stable tie-breakers only; no invented popularity/performance signal.
      if (product.newArrival === true) score += 0.15;
      return { product, score, matched, unverified };
    })
    .sort((a, b) => b.score - a.score || Number(a.product.price || 0) - Number(b.product.price || 0));
}

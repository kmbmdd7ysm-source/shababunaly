import { products } from '../data/products.ts';

export type LocaleObject = { en?: string; ar?: string };
export type LocaleText = LocaleObject | string | null | undefined;
export type LocaleKeywordBag = { en?: string[]; ar?: string[] };

export interface CatalogItem {
  id?: string;
  slug?: string;
  name?: LocaleText;
  description?: LocaleText;
  brand?: string;
  category?: string;
  subcategory?: string;
  productType?: string;
  colors?: Array<{ key?: string; name?: LocaleText }>;
  tags?: string[];
  image?: string;
  availability?: string;
  [key: string]: unknown;
}

export interface SearchCandidate {
  type: string;
  title: LocaleText;
  to: string;
  keywords?: LocaleKeywordBag;
  image?: string;
  score?: number;
  id?: string;
}

export const SEARCH_PAGES = [
  {
    type: 'page',
    title: { en: 'Shop', ar: 'المتجر' },
    to: '/shop',
    keywords: { en: ['products', 'basketball', 'retail'], ar: ['منتجات', 'كرة السلة', 'متجر'] },
  },
  {
    type: 'page',
    title: { en: 'Ready to Ship', ar: 'تسليم فوري' },
    to: '/shop/ready-to-ship',
    keywords: { en: ['in stock', 'libya', '24 72'], ar: ['متوفر', 'ليبيا', 'تسليم فوري'] },
  },
  {
    type: 'page',
    title: { en: 'Customize', ar: 'تصميم خاص' },
    to: '/customize',
    keywords: {
      en: ['custom jersey', 'uniform design', 'manufacturing'],
      ar: ['تصميم سيريا', 'تصنيع', 'ملابس مخصصة'],
    },
  },
  {
    type: 'page',
    title: { en: 'Teams & Wholesale', ar: 'الأندية والجملة' },
    to: '/teams-wholesale',
    keywords: {
      en: ['clubs', 'academies', 'wholesale', 'team order'],
      ar: ['أندية', 'أكاديميات', 'جملة', 'طلب فريق'],
    },
  },
  {
    type: 'page',
    title: { en: 'Special Request', ar: 'طلب خاص' },
    to: '/special-request',
    keywords: {
      en: ['find product', 'source product', 'product url', 'special order'],
      ar: ['توفير منتج', 'رابط منتج', 'طلب خاص', 'منتج غير موجود'],
    },
  },
  {
    type: 'page',
    title: { en: 'LHA Official Store', ar: 'متجر LHA الرسمي' },
    to: '/lha-store',
    keywords: { en: ['libya hoops academy', 'lha'], ar: ['ليبيا هوبس', 'LHA'] },
  },
  {
    type: 'page',
    title: { en: 'Our Work', ar: 'أعمالنا' },
    to: '/our-work',
    keywords: { en: ['projects', 'clients', 'custom work'], ar: ['مشاريع', 'عملاء', 'تصنيع'] },
  },
  {
    type: 'page',
    title: { en: 'About Shababuna', ar: 'عن شبابنا' },
    to: '/about',
    keywords: { en: ['company', 'tripoli', 'libya'], ar: ['شركة', 'طرابلس', 'ليبيا'] },
  },
  {
    type: 'page',
    title: { en: 'Help', ar: 'المساعدة' },
    to: '/help',
    keywords: { en: ['support', 'shipping', 'payment'], ar: ['دعم', 'شحن', 'دفع'] },
  },
  {
    type: 'page',
    title: { en: 'Contact Us', ar: 'تواصل معنا' },
    to: '/contact',
    keywords: { en: ['contact', 'whatsapp', 'email'], ar: ['تواصل', 'واتساب', 'بريد'] },
  },
];

export const POPULAR_SEARCHES = [
  { id: 'ready', query: { en: 'Ready to Ship', ar: 'تسليم فوري' }, to: '/shop/ready-to-ship' },
  {
    id: 'jerseys',
    query: { en: 'Game Jerseys', ar: 'سيريات اللعب' },
    to: '/shop/clothing/game-jerseys',
  },
  { id: 'shoes', query: { en: 'Basketball Shoes', ar: 'أحذية كرة السلة' }, to: '/shop/footwear' },
  { id: 'balls', query: { en: 'Basketballs', ar: 'كرات السلة' }, to: '/shop/basketballs' },
  { id: 'custom', query: { en: 'Custom Uniforms', ar: 'أطقم بتصميم خاص' }, to: '/customize' },
  { id: 'wholesale', query: { en: 'Wholesale', ar: 'الجملة' }, to: '/teams-wholesale' },
  {
    id: 'equipment',
    query: { en: 'Basketball Equipment', ar: 'معدات كرة السلة' },
    to: '/shop/equipment',
  },
  { id: 'lha', query: { en: 'LHA', ar: 'LHA' }, to: '/lha-store' },
];

export const normalizeSearchText = (value: unknown = '') =>
  String(value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .replace(/\u0640/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
export const localizedValues = (value: LocaleText | LocaleKeywordBag): string[] => {
  if (!value) return [];
  if (typeof value === 'string') return [value];
  const en = value.en;
  const ar = value.ar;
  const parts: string[] = [];
  if (Array.isArray(en)) parts.push(...en);
  else if (en) parts.push(en);
  if (Array.isArray(ar)) parts.push(...ar);
  else if (ar) parts.push(ar);
  return parts;
};
export const flattenText = (...values: unknown[]) =>
  normalizeSearchText(values.flat(Infinity).filter(Boolean).join(' '));
export const scoreText = (query: string, candidate: string) => {
  const q = normalizeSearchText(query),
    c = normalizeSearchText(candidate);
  if (!q || !c) return -1;
  if (c === q) return 400;
  if (c.startsWith(q)) return 300 - Math.min(c.length - q.length, 50);
  if (c.split(' ').some((word) => word.startsWith(q))) return 240;
  const index = c.indexOf(q);
  return index >= 0 ? 160 - Math.min(index, 80) : -1;
};
export const hit = (query: string, ...values: unknown[]) =>
  !normalizeSearchText(query) || flattenText(...values).includes(normalizeSearchText(query));

interface SuggestionRecord {
  id: string;
  type: string;
  label: LocaleText;
  to: string;
  searchable: string;
  item?: unknown;
  score?: number;
  index?: number;
}

export function suggestionCandidates(
  catalog: CatalogItem[] = products as CatalogItem[],
): SuggestionRecord[] {
  const out: SuggestionRecord[] = [];
  catalog.forEach((item) => {
    out.push({
      id: `product:${item.id}`,
      type: 'product',
      label: item.name,
      to: `/products/${item.slug}`,
      searchable: flattenText(
        ...localizedValues(item.name),
        item.brand,
        item.productType,
        item.category,
        item.subcategory,
        item.collection,
        item.tags,
        item.keywords,
        item.colors?.flatMap((c) => localizedValues(c.name)),
      ),
      item,
    });
    [item.brand, item.productType, item.category, item.subcategory]
      .filter(Boolean)
      .forEach((term) =>
        out.push({
          id: `term:${normalizeSearchText(term)}`,
          type: 'category',
          label: { en: String(term), ar: String(term) },
          to: '/shop',
          searchable: flattenText(term),
        }),
      );
  });
  SEARCH_PAGES.forEach((item) =>
    out.push({
      id: `page:${item.to}`,
      type: 'page',
      label: item.title,
      to: item.to,
      searchable: flattenText(...localizedValues(item.title), ...localizedValues(item.keywords)),
      item,
    }),
  );
  return out;
}
const candidateCache = new WeakMap<object, SuggestionRecord[]>();
export function getSearchSuggestions(
  query: string,
  limit = 8,
  catalog: CatalogItem[] = products as CatalogItem[],
) {
  const q = normalizeSearchText(query);
  if (!q) return [];
  let candidates = candidateCache.get(catalog as object);
  if (!candidates) {
    candidates = suggestionCandidates(catalog);
    candidateCache.set(catalog as object, candidates);
  }
  const seen = new Set<string>();
  return candidates
    .map((candidate, index) => ({ ...candidate, score: scoreText(q, candidate.searchable), index }))
    .filter((c) => (c.score ?? -1) >= 0)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || (a.index ?? 0) - (b.index ?? 0))
    .filter((candidate) => {
      const key = `${candidate.type}:${normalizeSearchText(localizedValues(candidate.label).join('|'))}:${candidate.to}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

export function searchSite(
  query = '',
  limit = 999,
  filters: Record<string, unknown> = {},
  catalog: CatalogItem[] = products as CatalogItem[],
) {
  const types = (Array.isArray(filters.types) ? filters.types : []) as string[];
  const allow = (type: string) => !types.length || types.includes(type);
  const colors = (Array.isArray(filters.colors) ? filters.colors : []) as string[];
  const brands = (Array.isArray(filters.brands) ? filters.brands : []) as string[];
  const productResults = allow('products')
    ? catalog
        .filter(
          (item) =>
            hit(
              query,
              ...localizedValues(item.name),
              item.brand,
              item.productType,
              item.category,
              item.subcategory,
              item.collection,
              item.tags,
              item.keywords,
              ...localizedValues(item.description),
              item.colors?.flatMap((c) => localizedValues(c.name)),
            ) &&
            (!colors.length ||
              item.colors?.some((c) => {
                const name = c.name;
                const en = typeof name === 'object' && name ? name.en : undefined;
                return en ? colors.includes(en) : false;
              })) &&
            (!brands.length || (item.brand ? brands.includes(item.brand) : false)),
        )
        .slice(0, limit)
    : [];
  const pages = allow('pages')
    ? SEARCH_PAGES.filter((item) =>
        hit(query, ...localizedValues(item.title), ...localizedValues(item.keywords)),
      ).slice(0, limit)
    : [];
  return { products: productResults, pages, total: productResults.length + pages.length };
}

export function getSearchFacets(catalog: CatalogItem[] = products as CatalogItem[]) {
  return {
    types: ['products', 'pages'],
    colors: [
      ...new Set(
        catalog
          .flatMap((p) => p.colors || [])
          .map((c) => (typeof c.name === 'object' && c.name ? c.name.en : undefined))
          .filter(Boolean),
      ),
    ].sort(),
    brands: [...new Set(catalog.map((p) => p.brand).filter(Boolean))].sort(),
  };
}

export const searchFacets = getSearchFacets(products);

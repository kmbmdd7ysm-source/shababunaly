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
    title: { en: 'Discover', ar: 'اكتشف' },
    to: '/discover',
    keywords: { en: ['trending', 'drops', 'new', 'discover'], ar: ['رائج', 'جديد', 'اكتشف', 'إصدارات'] },
  },
  {
    type: 'page',
    title: { en: 'Releases', ar: 'الإصدارات' },
    to: '/releases',
    keywords: { en: ['release calendar', 'upcoming', 'drops'], ar: ['إصدارات', 'قريباً', 'تقويم'] },
  },
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
    title: { en: 'Stories', ar: 'القصص' },
    to: '/stories',
    keywords: { en: ['stories', 'basketball culture', 'editorial'], ar: ['قصص', 'ثقافة كرة السلة', 'محتوى'] },
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
  { id: 'trending', query: { en: 'Trending Now', ar: 'الرائج الآن' }, to: '/discover/trending-now' },
  {
    id: 'equipment',
    query: { en: 'Basketball Equipment', ar: 'معدات كرة السلة' },
    to: '/shop/equipment',
  },
  { id: 'performance', query: { en: 'Performance Picks', ar: 'اختيارات الأداء' }, to: '/discover/performance-picks' },
];

export const normalizeSearchText = (value: unknown = '') =>
  String(value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .replace(/\u0640/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const SEARCH_ALIASES: Record<string, string[]> = {
  nike: ['نايك'],
  adidas: ['اديداس', 'ادي داس'],
  puma: ['بوما'],
  'under armour': ['underarmor', 'under armor', 'اندر ارمور', 'اندر ارمر'],
  'new balance': ['newbalance', 'نيو بالانس'],
  jordan: ['جوردن', 'air jordan', 'اير جوردن'],
  kobe: ['كوبي', 'koby'],
  lebron: ['ليبرون'],
  sabrina: ['سابرينا', 'سبرينا'],
  basketball: ['basket ball', 'كره السله', 'كرة السلة', 'كره سله', 'كرة سله'],
  shoes: ['shoe', 'sneaker', 'sneakers', 'شوز', 'حذاء', 'احذيه', 'أحذية'],
  jerseys: ['jersey', 'uniform', 'uniforms', 'سيريا', 'سيريات', 'طقم', 'اطقم', 'أطقم'],
  accessories: ['accessory', 'اكسسوارات', 'إكسسوارات'],
  equipment: ['gear', 'معدات', 'تجهيزات'],
  clothing: ['apparel', 'ملابس'],
  bag: ['bags', 'backpack', 'حقائب', 'حقيبه', 'حقيبة'],
  socks: ['sock', 'جوارب'],
};

const NORMALIZED_ALIAS_GROUPS = Object.entries(SEARCH_ALIASES).map(([canonical, aliases]) => ({
  canonical: normalizeSearchText(canonical),
  aliases: aliases.map(normalizeSearchText),
}));

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

function queryAlternatives(query: string): string[] {
  const normalized = normalizeSearchText(query);
  if (!normalized) return [];
  const alternatives = new Set([normalized]);
  for (const group of NORMALIZED_ALIAS_GROUPS) {
    if (normalized === group.canonical || group.aliases.includes(normalized)) {
      alternatives.add(group.canonical);
      group.aliases.forEach((alias) => alternatives.add(alias));
    }
    for (const alias of [group.canonical, ...group.aliases]) {
      if (alias && normalized.includes(alias)) alternatives.add(normalized.replace(alias, group.canonical).trim());
    }
  }
  return [...alternatives].filter(Boolean);
}

function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = new Array<number>(b.length + 1);
  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    for (let j = 0; j <= b.length; j += 1) previous[j] = current[j];
  }
  return previous[b.length];
}

function fuzzyWordScore(query: string, candidate: string): number {
  if (query.length < 4) return -1;
  const words = candidate.split(' ').filter((word) => word.length >= 4);
  let best = -1;
  for (const word of words) {
    const maxDistance = query.length >= 8 ? 2 : 1;
    const distance = editDistance(query, word);
    if (distance <= maxDistance) best = Math.max(best, 118 - distance * 18 - Math.abs(word.length - query.length) * 2);
  }
  return best;
}

function scoreNormalized(query: string, candidate: string): number {
  if (!query || !candidate) return -1;
  if (candidate === query) return 400;
  if (candidate.startsWith(query)) return 300 - Math.min(candidate.length - query.length, 50);
  if (candidate.split(' ').some((word) => word.startsWith(query))) return 240;
  const index = candidate.indexOf(query);
  if (index >= 0) return 160 - Math.min(index, 80);
  if (!query.includes(' ')) return fuzzyWordScore(query, candidate);
  const queryWords = query.split(' ').filter(Boolean);
  const wordScores = queryWords.map((word) => scoreNormalized(word, candidate));
  if (wordScores.length > 1 && wordScores.every((score) => score >= 0))
    return 100 + Math.round(wordScores.reduce((sum, score) => sum + score, 0) / wordScores.length / 4);
  return -1;
}

export const scoreText = (query: string, candidate: string) => {
  const c = normalizeSearchText(candidate);
  if (!c) return -1;
  return queryAlternatives(query).reduce((best, alternative) => Math.max(best, scoreNormalized(alternative, c)), -1);
};

export const hit = (query: string, ...values: unknown[]) =>
  !normalizeSearchText(query) || scoreText(query, flattenText(...values)) >= 0;

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

const CATEGORY_ROUTES: Record<string, string> = {
  footwear: '/shop/footwear',
  shoes: '/shop/footwear',
  clothing: '/shop/clothing',
  apparel: '/shop/clothing',
  accessories: '/shop/accessories',
  basketballs: '/shop/basketballs',
  basketball: '/shop/basketballs',
  equipment: '/shop/equipment',
};

function routeForTerm(term: unknown, item?: CatalogItem): string {
  const normalized = normalizeSearchText(term);
  if (CATEGORY_ROUTES[normalized]) return CATEGORY_ROUTES[normalized];
  if (item?.category && CATEGORY_ROUTES[normalizeSearchText(item.category)]) {
    const categoryRoute = CATEGORY_ROUTES[normalizeSearchText(item.category)];
    if (item.subcategory && normalizeSearchText(item.subcategory) === normalized) {
      return `${categoryRoute}/${String(item.subcategory).toLowerCase().replace(/\s+/g, '-')}`;
    }
    return categoryRoute;
  }
  return '/shop';
}

export function suggestionCandidates(catalog: CatalogItem[] = products as CatalogItem[]): SuggestionRecord[] {
  const out: SuggestionRecord[] = [];
  catalog.forEach((item) => {
    out.push({
      id: `product:${item.id}`,
      type: 'product',
      label: item.name,
      to: `/products/${item.slug}`,
      searchable: flattenText(
        ...localizedValues(item.name), item.brand, item.productType, item.category, item.subcategory,
        item.collection, item.tags, item.keywords, item.colors?.flatMap((c) => localizedValues(c.name)),
      ),
      item,
    });
    [item.brand, item.productType, item.category, item.subcategory].filter(Boolean).forEach((term) =>
      out.push({
        id: `term:${normalizeSearchText(term)}:${routeForTerm(term, item)}`,
        type: 'category',
        label: { en: String(term), ar: String(term) },
        to: routeForTerm(term, item),
        searchable: flattenText(term),
      }),
    );
  });
  SEARCH_PAGES.forEach((item) => out.push({
    id: `page:${item.to}`,
    type: 'page',
    label: item.title,
    to: item.to,
    searchable: flattenText(...localizedValues(item.title), ...localizedValues(item.keywords)),
    item,
  }));
  return out;
}

const candidateCache = new WeakMap<object, SuggestionRecord[]>();
export function getSearchSuggestions(query: string, limit = 8, catalog: CatalogItem[] = products as CatalogItem[]) {
  const q = normalizeSearchText(query);
  if (!q || limit <= 0) return [];
  let candidates = candidateCache.get(catalog as object);
  if (!candidates) {
    candidates = suggestionCandidates(catalog);
    candidateCache.set(catalog as object, candidates);
  }
  const seen = new Set<string>();
  return candidates
    .map((candidate, index) => ({ ...candidate, score: scoreText(q, candidate.searchable), index }))
    .filter((candidate) => (candidate.score ?? -1) >= 0)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || (a.index ?? 0) - (b.index ?? 0))
    .filter((candidate) => {
      const key = `${candidate.type}:${normalizeSearchText(localizedValues(candidate.label).join('|'))}:${candidate.to}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

function productSearchText(item: CatalogItem): string {
  return flattenText(
    ...localizedValues(item.name), item.brand, item.productType, item.category, item.subcategory,
    item.collection, item.tags, item.keywords, ...localizedValues(item.description),
    item.colors?.flatMap((color) => localizedValues(color.name)),
  );
}

export function searchSite(query = '', limit = 999, filters: Record<string, unknown> = {}, catalog: CatalogItem[] = products as CatalogItem[]) {
  const types = (Array.isArray(filters.types) ? filters.types : []) as string[];
  const allow = (type: string) => !types.length || types.includes(type);
  const colors = (Array.isArray(filters.colors) ? filters.colors : []) as string[];
  const brands = (Array.isArray(filters.brands) ? filters.brands : []) as string[];
  const normalizedQuery = normalizeSearchText(query);
  const productResults = allow('products')
    ? catalog
        .map((item, index) => ({ item, index, score: normalizedQuery ? scoreText(normalizedQuery, productSearchText(item)) : 0 }))
        .filter(({ item, score }) =>
          score >= 0 &&
          (!colors.length || item.colors?.some((color) => {
            const name = color.name;
            const en = typeof name === 'object' && name ? name.en : undefined;
            return en ? colors.includes(en) : false;
          })) &&
          (!brands.length || (item.brand ? brands.includes(item.brand) : false)),
        )
        .sort((a, b) => b.score - a.score || a.index - b.index)
        .slice(0, limit)
        .map(({ item }) => item)
    : [];
  const pages = allow('pages')
    ? SEARCH_PAGES
        .map((item, index) => ({
          item,
          index,
          score: normalizedQuery ? scoreText(normalizedQuery, flattenText(...localizedValues(item.title), ...localizedValues(item.keywords))) : 0,
        }))
        .filter(({ score }) => score >= 0)
        .sort((a, b) => b.score - a.score || a.index - b.index)
        .slice(0, limit)
        .map(({ item }) => item)
    : [];
  return { products: productResults, pages, total: productResults.length + pages.length };
}

export function getSearchFacets(catalog: CatalogItem[] = products as CatalogItem[]) {
  return {
    types: ['products', 'pages'],
    colors: [
      ...new Set(
        catalog.flatMap((p) => p.colors || [])
          .map((c) => (typeof c.name === 'object' && c.name ? c.name.en : undefined))
          .filter(Boolean),
      ),
    ].sort(),
    brands: [...new Set(catalog.map((p) => p.brand).filter(Boolean))].sort(),
  };
}

export const searchFacets = getSearchFacets(products);

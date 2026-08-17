export type MarketplaceName = 'GOAT' | 'StockX';

export type MarketplaceCatalogItem = {
  id: string;
  slug: string;
  name: { en: string; ar: string };
  description: { en: string; ar: string };
  category: 'footwear';
  subcategory: 'in-court';
  productType: 'Basketball Shoe';
  brand: 'Nike';
  price: 0;
  quoteOnly: true;
  wholesaleAvailable: false;
  retailAvailable: true;
  minimumOrder: 1;
  sizes: string[];
  colors: Array<{ key: string; name: { en: string; ar: string }; hex: string }>;
  image: string;
  mediaStatus: 'supplied';
  readyToShip: false;
  inventoryVerified: false;
  inventoryTracking: false;
  inventorySource: 'supplier_order';
  customizable: false;
  featured: false;
  newArrival: false;
  bestSeller: false;
  storefronts: ['shop'];
  collection: 'kobe';
  sourceMarketplace: MarketplaceName;
  sourceMarketplaces: MarketplaceName[];
  sourceUrl: string;
  sourceSku: string;
  kobeSeries: string;
  tags: string[];
  keywords: string[];
  alt: { en: string; ar: string };
};

const SHOE_SIZES = ['7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12', '12.5', '13', '14', '15'];
const SOURCE_COLOR = {
  key: 'marketplace-listed',
  name: { en: 'Marketplace listed colorway', ar: 'لون الإصدار المعروض في السوق' },
  hex: '#D9D9D9',
};

const GOAT_SERIES: Record<number, string> = {
  4: 'https://www.goat.com/sneakers/silhouette/zoom-kobe-4',
  5: 'https://www.goat.com/sneakers/silhouette/zoom-kobe-5',
  6: 'https://www.goat.com/sneakers/silhouette/zoom-kobe-6',
  7: 'https://www.goat.com/sneakers/silhouette/zoom-kobe-7',
  8: 'https://www.goat.com/sneakers/silhouette/kobe-8-system',
  9: 'https://www.goat.com/sneakers/silhouette/kobe-9',
  10: 'https://www.goat.com/sneakers/silhouette/kobe-10',
  11: 'https://www.goat.com/sneakers/silhouette/kobe-11',
  12: 'https://www.goat.com/sneakers/silhouette/kobe-a-d',
};

const STOCKX_QUERY: Record<number, string> = {
  4: 'Kobe 4',
  5: 'Kobe 5',
  6: 'Kobe 6',
  7: 'Kobe 7',
  8: 'Kobe 8',
  9: 'Kobe 9',
  10: 'Kobe 10',
  11: 'Kobe 11',
  12: 'Kobe A.D.',
};

const BOT_UA =
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

const GOAT_ALGOLIA_APP_ID = '2FWOTDVM2O';
// GOAT's search-only key is public client configuration; if it changes, HTML scraping remains the fallback.
const GOAT_ALGOLIA_SEARCH_KEY = 'ac96de6fef0e02bb95d433d8d5c7038a';
const GOAT_ALGOLIA_URL = `https://${GOAT_ALGOLIA_APP_ID.toLowerCase()}-dsn.algolia.net/1/indexes/product_variants_v2/query`;

const decode = (value: string): string =>
  value
    .replace(/\\u0026/gi, '&')
    .replace(/\\u002f/gi, '/')
    .replace(/\\u003c/gi, '<')
    .replace(/\\u003e/gi, '>')
    .replace(/\\u0022/gi, '"')
    .replace(/\\\//g, '/')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#x2F;/gi, '/');

const plain = (value: string): string =>
  decode(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 110);

const normalizeTitle = (value: string): string =>
  plain(value)
    .replace(/\s*(?:buy new|buy used|make offer).*$/i, '')
    .replace(/\s+\$\d[\d,.]*.*$/i, '')
    .trim();

const normalizeImage = (value: string): string => {
  const raw = decode(value).replace(/^["']|["']$/g, '').trim();
  if (!raw) return '';
  const candidate = raw.startsWith('//') ? `https:${raw}` : raw;
  try {
    const url = new URL(candidate);
    if (url.protocol !== 'https:') return '';
    const host = url.hostname.toLowerCase();
    if (host !== 'image.goat.com' && host !== 'images.stockx.com' && !host.endsWith('.stockx.com')) return '';
    if (host === 'image.goat.com' && !url.searchParams.has('width')) url.searchParams.set('width', '1200');
    return url.toString();
  } catch {
    return '';
  }
};

const isSeriesTitle = (title: string, series: number): boolean => {
  const value = title.toLowerCase().replace(/[.\-_/]+/g, ' ');
  if (!value.includes('kobe')) return false;
  if (series === 12) return /\bkobe\s+(?:a\s*d|ad|a d|nxt|exodus)\b/i.test(value);
  return new RegExp(`\\bkobe\\s*(?:x|${series})\\b`, 'i').test(value) ||
    (series === 10 && /\bkobe\s*x\b/i.test(value));
};

const pickNearby = (chunk: string, patterns: RegExp[]): string => {
  for (const pattern of patterns) {
    const match = chunk.match(pattern);
    if (match?.[1]) return decode(match[1]);
  }
  return '';
};

const extractGoat = (htmlInput: string, series: number): MarketplaceCatalogItem[] => {
  const html = decode(htmlInput);
  const urls = new Map<string, { title: string; image: string; sku: string }>();
  const linkPattern = /(?:https?:\/\/www\.goat\.com)?\/sneakers\/([a-z0-9][a-z0-9-]{2,})(?=["'\\?#<\s]|$)/gi;

  for (const match of html.matchAll(linkPattern)) {
    const slug = String(match[1] || '');
    if (!slug || slug.startsWith('silhouette-') || ['sneakers', 'brand', 'collections'].includes(slug)) continue;
    const index = match.index || 0;
    const chunk = html.slice(Math.max(0, index - 2200), Math.min(html.length, index + 3600));

    let title = pickNearby(chunk, [
      /"name"\s*:\s*"([^"]*Kobe[^"]*)"/i,
      /"title"\s*:\s*"([^"]*Kobe[^"]*)"/i,
      /alt=["']([^"']*Kobe[^"']*)["']/i,
      /aria-label=["']([^"']*Kobe[^"']*)["']/i,
    ]);
    if (!title) {
      const anchor = chunk.match(new RegExp(`<a[^>]+href=["'][^"']*\\/sneakers\\/${slug}[^"']*["'][^>]*>([\\s\\S]{0,900}?)<\\/a>`, 'i'));
      title = anchor?.[1] ? plain(anchor[1]) : '';
    }
    title = normalizeTitle(title);
    if (!isSeriesTitle(title, series)) continue;

    const imageRaw = pickNearby(chunk, [
      /"(?:grid_picture_url|imageUrl|image_url|picture_url)"\s*:\s*"([^"]+)"/i,
      /(?:src|content)=["'](https?:\/\/image\.goat\.com[^"']+)["']/i,
    ]);
    const image = normalizeImage(imageRaw);
    if (!image) continue;

    const sku = pickNearby(chunk, [
      /"(?:sku|style_id|styleId)"\s*:\s*"([^"]+)"/i,
      /\bSKU\b[\s|:]*([A-Z0-9-]{5,}(?:\s+[A-Z0-9]{2,})?)/i,
    ]).trim();

    const existing = urls.get(slug);
    if (!existing || (!existing.sku && sku)) urls.set(slug, { title, image, sku });
  }

  return [...urls.entries()].map(([sourceSlug, data]) =>
    toCatalogItem({
      marketplace: 'GOAT',
      series,
      title: data.title,
      image: data.image,
      sku: data.sku,
      sourceUrl: `https://www.goat.com/sneakers/${sourceSlug}`,
      sourceSlug,
    }),
  );
};

const extractStockX = (htmlInput: string, series: number): MarketplaceCatalogItem[] => {
  const html = decode(htmlInput);
  const found = new Map<string, { title: string; image: string; sku: string }>();

  const urlKeys = new Set<string>();
  for (const match of html.matchAll(/"(?:urlKey|url-key)"\s*:\s*"([a-z0-9][a-z0-9-]{2,})"/gi)) {
    urlKeys.add(String(match[1] || ''));
  }
  for (const match of html.matchAll(/href=["']\/([a-z0-9][a-z0-9-]{3,})["']/gi)) {
    const key = String(match[1] || '');
    if (key.includes('kobe')) urlKeys.add(key);
  }

  for (const sourceSlug of urlKeys) {
    const needle = sourceSlug;
    const index = html.indexOf(needle);
    if (index < 0) continue;
    const chunk = html.slice(Math.max(0, index - 2600), Math.min(html.length, index + 4200));
    const title = normalizeTitle(
      pickNearby(chunk, [
        /"(?:title|productName|name)"\s*:\s*"([^"]*Kobe[^"]*)"/i,
        /alt=["']([^"']*Kobe[^"']*)["']/i,
      ]),
    );
    const modelHint = pickNearby(chunk, [
      /"(?:model|modelName)"\s*:\s*"([^"]+)"/i,
    ]);
    const modelMatches = series === 12
      ? /\bkobe\s*(?:a\s*d|ad)\b/i.test(modelHint)
      : new RegExp(`\\bkobe\\s*${series}\\b`, 'i').test(modelHint);
    if (!isSeriesTitle(title, series) && !modelMatches) continue;

    const imageRaw = pickNearby(chunk, [
      /"(?:imageUrl|image_url|image)"\s*:\s*"([^"]*stockx[^"]+)"/i,
      /(?:src|content)=["'](https?:\/\/images\.stockx\.com[^"']+)["']/i,
    ]);
    const image = normalizeImage(imageRaw);
    if (!image) continue;

    const sku = pickNearby(chunk, [
      /"(?:styleId|style_id|sku)"\s*:\s*"([^"]+)"/i,
      /\bStyle\b[\s|:]*([A-Z0-9-]{5,}(?:\s+[A-Z0-9]{2,})?)/i,
    ]).trim();
    found.set(sourceSlug, { title, image, sku });
  }

  return [...found.entries()].map(([sourceSlug, data]) =>
    toCatalogItem({
      marketplace: 'StockX',
      series,
      title: data.title,
      image: data.image,
      sku: data.sku,
      sourceUrl: `https://stockx.com/${sourceSlug}`,
      sourceSlug,
    }),
  );
};

const toCatalogItem = ({
  marketplace,
  series,
  title,
  image,
  sku,
  sourceUrl,
  sourceSlug,
}: {
  marketplace: MarketplaceName;
  series: number;
  title: string;
  image: string;
  sku: string;
  sourceUrl: string;
  sourceSlug: string;
}): MarketplaceCatalogItem => {
  const seriesLabel = series === 12 ? 'Kobe 12 / Kobe A.D.' : `Kobe ${series}`;
  const safeSlug = slugify(`${marketplace}-${series}-${sourceSlug || title}`);
  const sourceSku = sku || '';
  return {
    id: `market-${safeSlug}`,
    slug: safeSlug,
    name: { en: title, ar: title },
    description: {
      en: `${title}. Marketplace reference from ${marketplace}. Price and availability are confirmed on request.`,
      ar: `${title}. مرجع سوق من ${marketplace}. يتم تأكيد السعر والتوفر عند الطلب.`,
    },
    category: 'footwear',
    subcategory: 'in-court',
    productType: 'Basketball Shoe',
    brand: 'Nike',
    price: 0,
    quoteOnly: true,
    wholesaleAvailable: false,
    retailAvailable: true,
    minimumOrder: 1,
    sizes: SHOE_SIZES,
    colors: [SOURCE_COLOR],
    image,
    mediaStatus: 'supplied',
    readyToShip: false,
    inventoryVerified: false,
    inventoryTracking: false,
    inventorySource: 'supplier_order',
    customizable: false,
    featured: false,
    newArrival: false,
    bestSeller: false,
    storefronts: ['shop'],
    collection: 'kobe',
    sourceMarketplace: marketplace,
    sourceMarketplaces: [marketplace],
    sourceUrl,
    sourceSku,
    kobeSeries: seriesLabel,
    tags: ['Kobe', 'Nike Kobe', 'Nike', marketplace, seriesLabel, title],
    keywords: ['Kobe', 'basketball shoes', 'Nike', marketplace, seriesLabel, sourceSku].filter(Boolean),
    alt: {
      en: `${title} — ${marketplace} product image`,
      ar: `${title} — صورة المنتج من ${marketplace}`,
    },
  };
};

type GoatAlgoliaHit = Record<string, unknown> & {
  product_template_id?: unknown;
  id?: unknown;
  name?: unknown;
  slug?: unknown;
  sku?: unknown;
  grid_picture_url?: unknown;
  main_picture_url?: unknown;
  original_picture_url?: unknown;
  brand_name?: unknown;
  silhouette?: unknown;
  shoe_condition?: unknown;
};

type GoatAlgoliaResponse = {
  hits?: GoatAlgoliaHit[];
  nbPages?: number;
  page?: number;
};

const fetchGoatAlgoliaPage = async (
  series: number,
  page: number,
): Promise<GoatAlgoliaResponse | null> => {
  const query = series === 12 ? 'Kobe A.D.' : `Kobe ${series}`;
  const params = new URLSearchParams({
    distinct: 'true',
    hitsPerPage: '100',
    page: String(page),
    query,
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(GOAT_ALGOLIA_URL, {
      method: 'POST',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Algolia-Application-Id': GOAT_ALGOLIA_APP_ID,
        'X-Algolia-API-Key': GOAT_ALGOLIA_SEARCH_KEY,
      },
      body: JSON.stringify({ params: params.toString() }),
    });
    if (!response.ok) return null;
    return (await response.json()) as GoatAlgoliaResponse;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

const goatHitToCatalogItem = (
  hit: GoatAlgoliaHit,
  series: number,
): MarketplaceCatalogItem | null => {
  const title = normalizeTitle(String(hit.name || ''));
  if (!title || !isSeriesTitle(title, series)) return null;
  const brand = String(hit.brand_name || '').toLowerCase();
  if (brand && brand !== 'nike') return null;
  const sourceSlug = String(hit.slug || '').trim();
  if (!sourceSlug) return null;
  const image = normalizeImage(
    String(hit.original_picture_url || hit.main_picture_url || hit.grid_picture_url || ''),
  );
  if (!image) return null;
  const sku = String(hit.sku || '').trim();
  return toCatalogItem({
    marketplace: 'GOAT',
    series,
    title,
    image,
    sku,
    sourceUrl: `https://www.goat.com/sneakers/${sourceSlug}`,
    sourceSlug,
  });
};

const fetchGoatAlgoliaSeries = async (series: number): Promise<MarketplaceCatalogItem[]> => {
  const firstPage = await fetchGoatAlgoliaPage(series, 0);
  if (!firstPage || !Array.isArray(firstPage.hits)) return [];
  const pageCount = Math.min(Math.max(1, Number(firstPage.nbPages) || 1), 20);
  const remaining =
    pageCount > 1
      ? await Promise.all(
          Array.from({ length: pageCount - 1 }, (_, index) => fetchGoatAlgoliaPage(series, index + 1)),
        )
      : [];
  const hits = [firstPage, ...remaining.filter(Boolean)].flatMap((page) =>
    Array.isArray(page?.hits) ? page.hits : [],
  );
  const byKey = new Map<string, MarketplaceCatalogItem>();
  for (const hit of hits) {
    const item = goatHitToCatalogItem(hit, series);
    if (!item) continue;
    const key = item.sourceSku
      ? `sku:${item.sourceSku.replace(/[^a-z0-9]/gi, '').toLowerCase()}`
      : `slug:${String(item.sourceUrl).split('/').pop() || item.slug}`;
    if (!byKey.has(key)) byKey.set(key, item);
  }
  return [...byKey.values()];
};

export const sourceUrlsForSeries = (series: number) => {
  const goat = GOAT_SERIES[series] || '';
  const stockxQuery = STOCKX_QUERY[series] || '';
  return {
    goat,
    stockx: stockxQuery ? `https://stockx.com/search?s=${encodeURIComponent(stockxQuery)}` : '',
  };
};

export const fetchHtml = async (url: string): Promise<string> => {
  if (!url) return '';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8500);
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': BOT_UA,
      },
    });
    if (!response.ok) return '';
    const declaredLength = Number(response.headers.get('content-length') || 0);
    if (declaredLength > 8_000_000) return '';
    return (await response.text()).slice(0, 8_000_000);
  } catch {
    return '';
  } finally {
    clearTimeout(timer);
  }
};

const canonicalKey = (item: MarketplaceCatalogItem): string => {
  const sku = item.sourceSku.replace(/[^a-z0-9]/gi, '').toLowerCase();
  if (sku.length >= 6) return `sku:${sku}`;
  return `name:${normalizeTitle(String(item.name.en || '')).toLowerCase().replace(/[^a-z0-9]+/g, '')}`;
};

export const mergeMarketplaceItems = (
  goatItems: MarketplaceCatalogItem[],
  stockxItems: MarketplaceCatalogItem[],
): MarketplaceCatalogItem[] => {
  const merged = new Map<string, MarketplaceCatalogItem>();
  for (const item of [...goatItems, ...stockxItems]) {
    const key = canonicalKey(item);
    const current = merged.get(key);
    if (!current) {
      merged.set(key, item);
      continue;
    }
    const marketplaces = Array.from(new Set([...current.sourceMarketplaces, ...item.sourceMarketplaces]));
    // Prefer GOAT as the visual source because GOAT product pages generally expose richer multi-angle galleries.
    const preferred = current.sourceMarketplace === 'GOAT' ? current : item.sourceMarketplace === 'GOAT' ? item : current;
    merged.set(key, { ...preferred, sourceMarketplaces: marketplaces });
  }
  return [...merged.values()];
};

export const scrapeGoatSeries = async (series: number): Promise<MarketplaceCatalogItem[]> => {
  if (!Number.isInteger(series) || series < 4 || series > 12) return [];
  const urls = sourceUrlsForSeries(series);
  const [algoliaItems, html] = await Promise.all([
    fetchGoatAlgoliaSeries(series),
    fetchHtml(urls.goat),
  ]);
  const htmlItems = html ? extractGoat(html, series) : [];
  return mergeMarketplaceItems(algoliaItems, htmlItems);
};

const STOCKX_KOBE_LINE_URL =
  'https://stockx.com/brands/nike?category=sneakers&product-line=nike-kobe';

const stockxPageUrl = (page: number): string =>
  `${STOCKX_KOBE_LINE_URL}&page=${Math.max(1, page)}`;

export const scrapeStockXCatalogAll = async (): Promise<MarketplaceCatalogItem[]> => {
  const collected: MarketplaceCatalogItem[] = [];
  const maxPages = 20;
  const batchSize = 4;
  let emptyBatches = 0;

  for (let start = 1; start <= maxPages; start += batchSize) {
    const pages = Array.from(
      { length: Math.min(batchSize, maxPages - start + 1) },
      (_, offset) => start + offset,
    );
    const htmlPages = await Promise.all(pages.map((page) => fetchHtml(stockxPageUrl(page))));
    let batchFound = 0;

    for (const html of htmlPages) {
      if (!html) continue;
      for (let series = 4; series <= 12; series += 1) {
        const items = extractStockX(html, series);
        batchFound += items.length;
        collected.push(...items);
      }
    }

    if (batchFound === 0) emptyBatches += 1;
    else emptyBatches = 0;
    if (emptyBatches >= 2) break;
  }

  return mergeMarketplaceItems([], collected);
};

export const scrapeMarketplaceSeries = async (series: number) => {
  if (!Number.isInteger(series) || series < 4 || series > 12) {
    return { items: [] as MarketplaceCatalogItem[], goatCount: 0, stockxCount: 0 };
  }
  const urls = sourceUrlsForSeries(series);
  const [goatItems, stockxHtml] = await Promise.all([
    scrapeGoatSeries(series),
    fetchHtml(urls.stockx),
  ]);
  const stockxItems = stockxHtml ? extractStockX(stockxHtml, series) : [];
  return {
    items: mergeMarketplaceItems(goatItems, stockxItems),
    goatCount: goatItems.length,
    stockxCount: stockxItems.length,
  };
};

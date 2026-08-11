import { afterEach, describe, expect, it, vi } from './test-api.js';
import {
  categories,
  getCategory,
  getSubcategory,
  allSubcategories,
  findSubcategoryAnywhere,
} from '../src/data/categories.ts';
import {
  countries,
  countryByCode,
  isSupportedCountryCode,
  normalizeCountryCode,
  getCountryName,
  getLocalizedCountries,
  getAddressRequirements,
  isCashEligibleCountry,
  normalizeCountrySearch,
} from '../src/data/countries.ts';
import {
  CUSTOM_PRODUCT_TYPES,
  DEFAULT_CUSTOM_DESIGN,
  getCustomProductType,
  normalizeRoster,
  parseRosterCsv,
  rosterToCsv,
} from '../src/data/customization.ts';
import {
  normalizeLhaProduct,
  products as rawLhaProducts,
  getProduct as getRawLhaProduct,
  getProductById as getRawLhaById,
  featuredProducts as rawFeatured,
  newArrivals as rawNew,
  bestSellers as rawBest,
  productsByCategory as rawByCategory,
  productsBySubcategory as rawBySubcategory,
  relatedProducts as rawRelated,
  isLowStock as rawLowStock,
} from '../src/data/lhaProducts.ts';
import {
  normalizeCatalogProduct,
  verifiedVariantStock,
  catalogProducts,
  products,
  getProduct,
  getProductById,
  featuredProducts,
  newArrivals,
  bestSellers,
  readyToShipProducts,
  lhaStoreProducts,
  productsByCategory,
  productsBySubcategory,
  relatedProducts,
  isLowStock,
  allColors,
  allSizes,
  allBrands,
  allProductTypes,
  compareBrands,
} from '../src/data/products.ts';

afterEach(() => vi.restoreAllMocks());

describe('taxonomy and geography exhaustive', () => {
  it('finds every category and handles missing taxonomy safely', () => {
    expect(categories.length).toBeGreaterThan(4);
    expect(allSubcategories.length).toBeGreaterThan(10);
    const clothing = getCategory('clothing');
    expect(clothing.slug).toBe('clothing');
    expect(getCategory('missing')).toBe(undefined);
    expect(getSubcategory('missing', 'x')).toBe(undefined);
    const jersey = getSubcategory('clothing', 'game-jerseys');
    expect(jersey.slug).toBe('game-jerseys');
    expect(findSubcategoryAnywhere('game-jerseys').category).toBe('clothing');
    expect(findSubcategoryAnywhere('missing')).toBe(undefined);
  });

  it('normalizes, localizes and searches every country branch', () => {
    expect(countries.length).toBeGreaterThan(200);
    expect(countryByCode.get('LY').cashEligible).toBe(true);
    expect(isSupportedCountryCode('ly')).toBe(true);
    expect(isSupportedCountryCode('ZZ')).toBe(false);
    expect(isSupportedCountryCode(null)).toBe(false);
    expect(normalizeCountryCode(' us ')).toBe('US');
    expect(normalizeCountryCode('bad', 'GB')).toBe('GB');
    expect(normalizeCountryCode('')).toBe('US');
    expect(getAddressRequirements('US')).toMatchObject({
      regionRequired: true,
      postalCodeRequired: true,
    });
    expect(getAddressRequirements('LY')).toMatchObject({ postalCodeRequired: false });
    expect(getAddressRequirements('ZZ')).toBe(null);
    expect(isCashEligibleCountry('ly')).toBe(true);
    expect(isCashEligibleCountry('US')).toBe(false);
    expect(isCashEligibleCountry(null)).toBe(false);
    expect(getCountryName('US', 'en')).toMatch(/United States|US/);
    expect(getCountryName('LY', 'ar')).toBeTruthy();
    const realIntl = globalThis.Intl;
    vi.stubGlobal('Intl', {
      ...realIntl,
      DisplayNames: class {
        constructor() {
          throw new Error('unsupported');
        }
      },
    });
    expect(getCountryName('US', 'en')).toBe('US');
    vi.restoreAllMocks();
    const localized = getLocalizedCountries('en');
    expect(localized.length).toBe(countries.length);
    expect(localized[0].name.localeCompare(localized.at(-1).name, 'en')).toBeLessThan(1);
    expect(getLocalizedCountries('ar').length).toBe(countries.length);
    expect(normalizeCountrySearch('  إِمَارَات ة ى ')).toBe('امارات ه ي');
    expect(normalizeCountrySearch(null)).toBe('');
  });
});

describe('customization data exhaustive', () => {
  it('uses known types and safe fallback', () => {
    expect(CUSTOM_PRODUCT_TYPES).toHaveLength(12);
    expect(getCustomProductType('basketball').minimum).toBe(6);
    expect(getCustomProductType('missing').key).toBe('game-set');
    expect(DEFAULT_CUSTOM_DESIGN.quantity).toBe(10);
    expect(CUSTOM_PRODUCT_TYPES.every((item) => item.madeInUSA === false)).toBe(true);
  });

  it('normalizes roster fields, errors, duplicate numbers and filters empty rows', () => {
    const rows = normalizeRoster([
      { id: 'x', name: ' Alice ', printName: 'ali', number: '12A', size: 'm' },
      { playerName: 'Bob', number: '12', jerseySize: 'L', shortsSize: 'XL' },
      { name: '', number: '', size: '' },
      { name: 'C'.repeat(60), number: '123', jerseySize: '', shortsSize: '' },
    ]);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      id: 'x',
      name: 'Alice',
      jerseyName: 'ALI',
      number: '12',
      jerseySize: 'M',
      shortsSize: 'M',
      errors: [],
    });
    expect(rows[1].errors).toContain('duplicateNumber');
    expect(rows[2].name.length).toBe(40);
    expect(rows[2].number).toBe('12');
    expect(rows[2].errors).toContain('jerseySize');
    const missing = normalizeRoster([{ number: '1', jerseySize: 'M' }])[0];
    expect(missing.errors).toContain('name');
    const missingNumber = normalizeRoster([{ name: 'Name', jerseySize: 'M' }])[0];
    expect(missingNumber.errors).toContain('number');
  });

  it('parses header/no-header, comma/semicolon, BOM, Arabic and empty CSVs', () => {
    expect(parseRosterCsv('')).toEqual([]);
    const header = parseRosterCsv(
      '\uFEFFPlayer Name,Jersey Name,Number,Jersey Size,Shorts Size\nAlice,ACE,7,M,L',
    );
    expect(header[0]).toMatchObject({
      name: 'Alice',
      jerseyName: 'ACE',
      number: '7',
      jerseySize: 'M',
      shortsSize: 'L',
    });
    const semicolon = parseRosterCsv(
      'الاسم;اسم السيريا;الرقم;مقاس السيريا;مقاس الشورت\nعلي;ALI;9;XL;L',
    );
    expect(semicolon[0].number).toBe('9');
    const raw = parseRosterCsv('Bob,11,S');
    expect(raw[0]).toMatchObject({ name: 'Bob', number: '11', jerseySize: 'S', shortsSize: 'S' });
    const alt = parseRosterCsv(
      'player,print name,jersey number,shirt size,short size\nSam,SAM,4,L,M',
    );
    expect(alt[0].jerseyName).toBe('SAM');
  });

  it('serializes a stable escaped roster CSV', () => {
    const csv = rosterToCsv([
      { name: 'A "Ace"', jerseyName: 'ACE', number: 3, jerseySize: 'M', shortsSize: 'L' },
    ]);
    expect(csv).toContain('"A ""Ace"""');
    expect(csv.split('\n')).toHaveLength(2);
    expect(rosterToCsv()).toContain('Player Name');
  });
});

describe('LHA catalog normalizer and selectors exhaustive', () => {
  const base = {
    id: 't',
    slug: 'test',
    sku: 'SKU',
    name: { en: 'Test', ar: 'Test' },
    description: { en: 'D', ar: 'D' },
    category: 'clothing',
    subcategory: 'tops',
    price: 20,
  };
  it('normalizes missing/default and verified inventory variants', () => {
    const normal = normalizeLhaProduct(base);
    expect(normal.sizes.length).toBeGreaterThan(1);
    expect(normal.colors).toHaveLength(1);
    expect(normal.inventoryTracking).toBe(false);
    expect(normal.stock).toBe(0);
    expect(normal.availability).toBe('in-stock');
    expect(normal.mediaStatus).toBe('missing');
    expect(normal.image).toBe(null);
    expect(normal.hoverImage).toBe(null);
    expect(normal.socialImage).toBe(null);
    expect(normal.status).toBe('active');
    const verified = normalizeLhaProduct({
      ...base,
      inventoryVerified: true,
      readyToShip: true,
      sizes: ['S', 'M'],
      colors: [
        {
          key: 'red',
          name: { en: 'Red', ar: 'Red' },
          hex: '#ff0000',
          stock: 2,
          image: '/red.webp',
        },
      ],
      stockByVariant: { 'red:S': 4 },
      stockPerVariant: 3,
      image: '/main.webp',
      hoverImage: '/hover.webp',
      socialImage: '/social.webp',
    });
    expect(verified.stock).toBe(6);
    expect(verified.variants[0].stock).toBe(4);
    expect(verified.variants[1].stock).toBe(2);
    expect(verified.readyToShip).toBe(true);
    expect(verified.inventoryLocation).toBe('LY');
    expect(verified.mediaStatus).toBe('supplied');
    expect(verified.hoverImage).toBe('/hover.webp');
    expect(verified.socialImage).toBe('/social.webp');
    const sameHover = normalizeLhaProduct({
      ...base,
      image: '/same.webp',
      hoverImage: '/same.webp',
    });
    expect(sameHover.hoverImage).toBe(null);
    expect(sameHover.socialImage).toBe('/same.webp');
  });

  it('covers archived, coming soon, digital and sold-out states and metadata overrides', () => {
    const coming = normalizeLhaProduct({
      ...base,
      comingSoon: true,
      available: false,
      image: '/x.webp',
    });
    expect(coming.status).toBe('coming_soon');
    expect(coming.availability).toBe('sold-out');
    const archived = normalizeLhaProduct({ ...base, available: false });
    expect(archived.status).toBe('archived');
    const sold = normalizeLhaProduct({ ...base, inventoryVerified: true, stockPerVariant: 0 });
    expect(sold.availability).toBe('sold-out');
    const digital = normalizeLhaProduct({ ...base, fulfillmentType: 'digital' });
    expect(digital.availability).toBe('sold-out');
    const custom = normalizeLhaProduct({
      ...base,
      sizes: ['OS'],
      colors: [{ key: 'white', name: { en: 'White', ar: 'White' }, hex: '#fff' }],
      alt: { en: 'A', ar: 'B' },
      seoTitle: { en: 'S', ar: 'S' },
      seoDescription: { en: 'E', ar: 'A' },
      madeInUSA: true,
    });
    expect(custom.alt.en).toBe('A');
    expect(custom.seoTitle.en).toBe('S');
    expect(custom.seoDescription.en).toBe('E');
  });

  it('executes all raw LHA selectors and stock checks', () => {
    expect(rawLhaProducts.length).toBe(25);
    const first = rawLhaProducts[0];
    expect(getRawLhaProduct(first.slug).id).toBe(first.id);
    expect(getRawLhaById(first.id).slug).toBe(first.slug);
    expect(getRawLhaProduct('missing')).toBe(undefined);
    expect(rawFeatured().every((p) => p.featured)).toBe(true);
    expect(rawNew().every((p) => p.newArrival)).toBe(true);
    expect(rawBest().every((p) => p.bestSeller)).toBe(true);
    expect(rawByCategory(first.category).length).toBeGreaterThan(0);
    expect(rawBySubcategory(first.category, first.subcategory).length).toBeGreaterThan(0);
    expect(rawRelated(first, 2).length).toBeLessThan(3);
    expect(rawRelated(null)).toEqual([]);
    expect(rawLowStock({ availability: 'in-stock', stock: 1, lowStockThreshold: 2 })).toBe(true);
    expect(rawLowStock({ availability: 'sold-out', stock: 0, lowStockThreshold: 2 })).toBe(false);
  });
});

describe('global catalog normalizer and selectors exhaustive', () => {
  const base = {
    id: 'x',
    slug: 'x',
    sku: 'X',
    name: 'Example',
    description: { en: 'D', ar: 'D' },
    category: 'clothing',
    subcategory: 't-shirts',
    price: 10,
  };
  it('covers every trusted-stock source and unverified inventory behavior', () => {
    expect(
      verifiedVariantStock({
        input: { inventoryVerified: false },
        color: { key: 'black' },
        size: 'S',
      }),
    ).toBe(0);
    expect(
      verifiedVariantStock({
        input: { inventoryVerified: true, stockByVariant: { 'black:S': 5 } },
        color: { key: 'black' },
        size: 'S',
      }),
    ).toBe(5);
    expect(
      verifiedVariantStock({
        input: { inventoryVerified: true, stockByVariant: { 'black:S': -2 } },
        color: { key: 'black' },
        size: 'S',
      }),
    ).toBe(0);
    expect(
      verifiedVariantStock({
        input: { inventoryVerified: true, stockByVariant: { 'black:S': 0 } },
        color: { key: 'black' },
        size: 'S',
      }),
    ).toBe(0);
    expect(
      verifiedVariantStock({
        input: { inventoryVerified: true, stockPerVariant: '3' },
        color: { key: 'black' },
        size: 'S',
      }),
    ).toBe(3);
    expect(
      verifiedVariantStock({
        input: { inventoryVerified: true },
        color: { key: 'black' },
        size: 'S',
      }),
    ).toBe(0);
  });

  it('normalizes default, active, draft, coming, sold, ready and verified claims', () => {
    const draft = normalizeCatalogProduct(base);
    expect(draft.name).toEqual({ en: 'Example', ar: 'Example' });
    expect(draft.colors).toHaveLength(1);
    expect(draft.sizes).toEqual(['OS']);
    expect(draft.status).toBe('active');
    expect(draft.available).toBe(true);
    expect(draft.mediaStatus).toBe('placeholder');
    expect(draft.inventorySource).toBe('supplier_order');
    expect(draft.minimumOrder).toBe(1);
    expect(draft.madeInUSA).toBe(false);
    const active = normalizeCatalogProduct({
      ...base,
      name: { en: 'Object', ar: 'Object' },
      image: '/real.webp',
      mediaStatus: 'supplied',
      inventoryVerified: true,
      readyToShip: true,
      stockPerVariant: 2,
      colors: [{ key: 'red', name: { en: 'Red', ar: 'Red' }, hex: '#f00' }],
      sizes: ['S'],
      customizable: true,
      claimVerified: true,
      madeInUSA: true,
      brand: 'Shababuna',
      manufacturingCountry: 'US',
      cutCountry: 'US',
      sewingCountry: 'US',
      printingCountry: 'US',
      materialOrigin: 'US',
      manufacturingClaimStatus: 'verified',
      claimEvidenceReference: 'evidence',
      inventorySource: 'cycle-count',
      inventoryLocation: 'LY',
    });
    expect(active.status).toBe('active');
    expect(active.available).toBe(true);
    expect(active.stock).toBe(2);
    expect(active.availability).toBe('in-stock');
    expect(active.readyToShip).toBe(true);
    expect(active.deliveryProfile).toBe('ready');
    expect(active.minimumOrder).toBe(10);
    expect(active.madeInUSA).toBe(true);
    expect(active.claimEvidenceReference).toBe('evidence');
    const sold = normalizeCatalogProduct({
      ...base,
      image: '/real.webp',
      inventoryVerified: true,
      inventoryTracking: true,
      stockPerVariant: 0,
      status: 'active',
    });
    expect(sold.availability).toBe('in-stock');
    expect(sold.deliveryProfile).toBe('standard');
    const disabled = normalizeCatalogProduct({
      ...base,
      image: '/real.webp',
      status: 'active',
      available: false,
    });
    expect(disabled.available).toBe(false);
    expect(disabled.availability).toBe('sold-out');
    const coming = normalizeCatalogProduct({ ...base, comingSoon: true });
    expect(coming.status).toBe('active');
    expect(coming.comingSoon).toBe(false);
    const explicit = normalizeCatalogProduct({
      ...base,
      status: 'archived',
      image: '/real.webp',
      hoverImage: '/hover.webp',
      socialImage: '/social.webp',
      alt: { en: 'Alt', ar: 'Alt' },
      seoTitle: { en: 'Seo', ar: 'Seo' },
      seoDescription: { en: 'Desc', ar: 'Desc' },
      deliveryProfile: 'quote',
      minimumOrder: 7,
    });
    expect(explicit.status).toBe('active');
    expect(explicit.hoverImage).toBe('/hover.webp');
    expect(explicit.socialImage).toBe('/social.webp');
    expect(explicit.alt.en).toBe('Alt');
    expect(explicit.seoTitle.en).toBe('Seo');
    expect(explicit.seoDescription.en).toBe('Desc');
    expect(explicit.minimumOrder).toBe(7);
    expect(
      normalizeCatalogProduct({ ...base, customizable: true, category: 'basketballs' })
        .minimumOrder,
    ).toBe(6);
    expect(
      normalizeCatalogProduct({ ...base, customizable: true, category: 'equipment' }).minimumOrder,
    ).toBe(1);
    expect(
      normalizeCatalogProduct({
        ...base,
        brand: '',
        category: 'clothing',
        madeInUSA: true,
        claimVerified: true,
      }).madeInUSA,
    ).toBe(true);
  });

  it('executes all global catalog selectors and ordering', () => {
    expect(catalogProducts.length).toBe(69);
    expect(products.length).toBe(69);
    const first = products[0];
    expect(getProduct(first.slug).id).toBe(first.id);
    expect(getProductById(first.id).slug).toBe(first.slug);
    expect(getProduct('missing')).toBe(undefined);
    expect(featuredProducts().every((p) => p.featured && !p.legacyLha)).toBe(true);
    expect(newArrivals().every((p) => p.newArrival && !p.legacyLha)).toBe(true);
    expect(bestSellers().every((p) => p.bestSeller && !p.legacyLha)).toBe(true);
    const ready = readyToShipProducts();
    expect(ready.length).toBe(15);
    expect(ready.every((product) => product.legacyLha === true && product.readyToShip === true && product.comingSoon !== true)).toBe(true);
    expect(lhaStoreProducts()).toHaveLength(25);
    expect(productsByCategory('ready-to-ship')).toEqual(ready);
    expect(productsByCategory(first.category).length).toBeGreaterThan(0);
    expect(productsBySubcategory(first.category, first.subcategory).length).toBeGreaterThan(0);
    expect(relatedProducts(first, 2).length).toBeLessThan(3);
    expect(relatedProducts(null, 2).length).toBeLessThan(3);
    expect(
      isLowStock({
        inventoryTracking: true,
        inventoryVerified: true,
        stock: 1,
        lowStockThreshold: 2,
      }),
    ).toBe(true);
    expect(
      isLowStock({
        inventoryTracking: false,
        inventoryVerified: true,
        stock: 1,
        lowStockThreshold: 2,
      }),
    ).toBe(false);
    expect(
      isLowStock({
        inventoryTracking: true,
        inventoryVerified: true,
        stock: 0,
        lowStockThreshold: 2,
      }),
    ).toBe(false);
    expect(
      isLowStock({
        inventoryTracking: true,
        inventoryVerified: false,
        stock: 1,
        lowStockThreshold: 2,
      }),
    ).toBe(false);
    expect(allColors.length).toBeGreaterThan(0);
    expect(allSizes.length).toBeGreaterThan(0);
    expect(allBrands).toContain('LHA');
    expect(allProductTypes.length).toBeGreaterThan(0);
    expect(compareBrands('Nike', 'Jordan')).toBeLessThan(0);
    expect(compareBrands('Unknown', 'Nike')).toBeGreaterThan(0);
    expect(compareBrands('Nike', 'Unknown')).toBeLessThan(0);
    expect(compareBrands('Zulu', 'Alpha')).toBeGreaterThan(0);
    expect(compareBrands('Nike', 'Nike')).toBe(0);
  });
});

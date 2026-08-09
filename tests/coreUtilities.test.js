import './setup.js';
import { describe, expect, it } from './test-api.js';
import { ALLOWED_ORDER_STATUSES, presentOrderStatus } from '../src/services/orderStatus.ts';
import {
  FULFILLMENT_TYPES,
  cartRequiresPhysicalShipping,
  getCartItemFulfillmentType,
  requiresPhysicalShipping,
} from '../src/utils/fulfillment.ts';
import { safeInternalReturnPath } from '../src/utils/safeReturnPath.ts';
import {
  getSearchFacets,
  getSearchSuggestions,
  normalizeSearchText,
  searchSite,
} from '../src/utils/search.js';

describe('order status presentation', () => {
  it('presents every declared status in English and Arabic', () => {
    for (const [kind, statuses] of Object.entries(ALLOWED_ORDER_STATUSES)) {
      for (const status of statuses) {
        const en = presentOrderStatus(kind, status, 'en');
        const ar = presentOrderStatus(kind, status, 'ar');
        expect(en).toMatchObject({ value: status, known: true });
        expect(ar).toMatchObject({ value: status, known: true });
        expect(en.label.length > 0).toBe(true);
        expect(ar.label.length > 0).toBe(true);
      }
    }
  });

  it('normalizes known values and fails safely for unknown values', () => {
    expect(presentOrderStatus('payment', ' PAID ', 'en')).toMatchObject({
      value: 'paid',
      label: 'Paid',
      category: 'success',
      known: true,
    });
    expect(presentOrderStatus('order', 'not-real', 'en')).toMatchObject({
      value: 'not-real',
      label: 'Status unavailable',
      known: false,
    });
    expect(presentOrderStatus('order', '', 'ar')).toMatchObject({
      value: 'unknown',
      label: 'الحالة غير متاحة',
      known: false,
    });
    expect(presentOrderStatus('missing', 'paid', 'en').known).toBe(false);
  });
});

describe('fulfillment classification', () => {
  it('honors supported explicit fulfillment values', () => {
    for (const value of Object.values(FULFILLMENT_TYPES)) {
      expect(getCartItemFulfillmentType({ fulfillmentType: value })).toBe(value);
      expect(getCartItemFulfillmentType({ fulfillment_type: value.toUpperCase() })).toBe(value);
    }
  });

  it('maps legacy item types and defaults unknown items to physical', () => {
    expect(getCartItemFulfillmentType({ type: 'product' })).toBe(FULFILLMENT_TYPES.PHYSICAL);
    expect(getCartItemFulfillmentType({ type: 'training' })).toBe(
      FULFILLMENT_TYPES.DIGITAL_TRAINING,
    );
    expect(getCartItemFulfillmentType({ type: 'event' })).toBe(
      FULFILLMENT_TYPES.EVENT_REGISTRATION,
    );
    expect(getCartItemFulfillmentType({ type: 'unknown', fulfillmentType: 'bad' })).toBe(
      FULFILLMENT_TYPES.PHYSICAL,
    );
    expect(getCartItemFulfillmentType(null)).toBe(FULFILLMENT_TYPES.PHYSICAL);
  });

  it('requires shipping only when at least one physical line exists', () => {
    expect(requiresPhysicalShipping({ type: 'product' })).toBe(true);
    expect(requiresPhysicalShipping({ type: 'training' })).toBe(false);
    expect(cartRequiresPhysicalShipping([])).toBe(false);
    expect(cartRequiresPhysicalShipping(null)).toBe(false);
    expect(cartRequiresPhysicalShipping([{ type: 'training' }, { type: 'event' }])).toBe(false);
    expect(cartRequiresPhysicalShipping([{ type: 'training' }, { type: 'product' }])).toBe(true);
  });
});

describe('safe internal navigation', () => {
  it('accepts only allow-listed local routes including query and hash values', () => {
    for (const value of [
      '/',
      '/shop',
      '/shop?sort=new',
      '/products/item-1#details',
      '/account/orders',
      '/checkout?step=payment',
      '/favorites',
    ]) {
      expect(safeInternalReturnPath(value, '/')).toBe(value);
    }
  });

  it('rejects open redirects, encoded tricks, credentials and control characters', () => {
    for (const value of [
      'https://evil.example',
      '//evil.example/path',
      '/\\evil.example',
      ' /shop',
      '/admin',
      '/operations',
      '/%5cevil.example',
      '/shop%0aevil',
      '/shop%00x',
      '/shop%ZZ',
      123,
    ])
      expect(safeInternalReturnPath(value, '/safe')).toBe('/safe');
  });
});

describe('site search', () => {
  const catalog = [
    {
      id: 'p1',
      slug: 'alpha-shoe',
      status: 'active',
      name: { en: 'Alpha Shoe', ar: 'Alpha Shoe' },
      brand: 'Nike',
      productType: 'Shoe',
      category: 'Footwear',
      subcategory: 'In-Court',
      collection: 'Core',
      tags: ['speed'],
      keywords: ['guard'],
      description: { en: 'Fast basketball shoe', ar: 'حذاء كرة سلة سريع' },
      colors: [{ name: { en: 'Black', ar: 'أسود' } }],
    },
    {
      id: 'p2',
      slug: 'beta-ball',
      status: 'active',
      name: { en: 'Beta Basketball', ar: 'Beta Basketball' },
      brand: 'Molten',
      productType: 'Basketball',
      category: 'Basketballs',
      subcategory: 'Indoor',
      collection: 'Pro',
      tags: ['game'],
      keywords: ['ball'],
      description: { en: 'Official size', ar: 'مقاس رسمي' },
      colors: [{ name: { en: 'Orange', ar: 'برتقالي' } }],
    },
  ];

  it('normalizes punctuation, Arabic marks and repeated whitespace', () => {
    expect(normalizeSearchText('  ÁLPHA—Shoe!!  ')).toBe('alpha shoe');
    expect(normalizeSearchText('كُرَةــ السلة')).toBe('كرة السلة');
    expect(normalizeSearchText(null)).toBe('');
  });

  it('ranks exact and prefix suggestions deterministically without duplicates', () => {
    const exact = getSearchSuggestions('alpha shoe', 8, catalog);
    expect(exact[0]).toMatchObject({ type: 'product', to: '/products/alpha-shoe' });
    const prefix = getSearchSuggestions('nik', 8, catalog);
    expect(prefix.some((item) => item.type === 'category')).toBe(true);
    expect(new Set(prefix.map((item) => item.id)).size).toBe(prefix.length);
    expect(getSearchSuggestions('', 8, catalog)).toEqual([]);
    expect(getSearchSuggestions('alpha', 0, catalog)).toEqual([]);
  });

  it('filters products and pages by type, color and brand', () => {
    expect(searchSite('basketball', 20, {}, catalog).total > 0).toBe(true);
    expect(
      searchSite('', 20, { types: ['products'], colors: ['Black'], brands: ['Nike'] }, catalog)
        .products,
    ).toHaveLength(1);
    expect(
      searchSite('', 20, { types: ['products'], colors: ['Orange'], brands: ['Nike'] }, catalog)
        .products,
    ).toHaveLength(0);
    expect(
      searchSite('contact', 20, { types: ['pages'] }, catalog).pages.some(
        (item) => item.to === '/contact',
      ),
    ).toBe(true);
    expect(searchSite('no-match', 20, {}, catalog).total).toBe(0);
  });

  it('builds stable unique facets', () => {
    expect(getSearchFacets(catalog)).toEqual({
      types: ['products', 'pages'],
      colors: ['Black', 'Orange'],
      brands: ['Molten', 'Nike'],
    });
    expect(getSearchFacets([])).toEqual({ types: ['products', 'pages'], colors: [], brands: [] });
  });
});

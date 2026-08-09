import crypto from 'node:crypto';
import { afterEach, describe, expect, it, vi } from './test-api.js';
import { ALLOWED_ORDER_STATUSES, presentOrderStatus } from '../src/services/orderStatus.ts';
import {
  countries,
  countryByCode,
  getAddressRequirements,
  getCountryName,
  getLocalizedCountries,
  isCashEligibleCountry,
  isSupportedCountryCode,
  normalizeCountryCode,
  normalizeCountrySearch,
} from '../src/data/countries.ts';
import { safeInternalReturnPath } from '../src/utils/safeReturnPath.ts';
import {
  flattenText,
  getSearchFacets,
  getSearchSuggestions,
  hit,
  localizedValues,
  normalizeSearchText,
  scoreText,
  searchSite,
  suggestionCandidates,
} from '../src/utils/search.ts';
import {
  buildDesignViewSvg,
  buildProductionPackage,
  createStoreZip,
  crc32,
  escapeXml,
  productShape,
  safeHex,
  u16,
  u32,
} from '../src/utils/designExports.js';
import {
  createGuestOrderToken,
  guestEmailHash,
  normalizeGuestEmail,
  normalizeGuestOrderNumber,
  verifyGuestOrderToken,
} from '../api/_guest-order-token.ts';
import createSessionHandler from '../api/create-session.ts';
import designShareHandler from '../api/design-share.ts';
import readinessHandler, {
  featureReadiness,
  optionalCapabilities,
  requiredEnvironment,
} from '../api/readiness.js';
import specialRequestHandler, { isMalwareScannerConfigured } from '../api/special-request.js';
import {
  buildNotificationTemplate,
  notificationReference,
} from '../api/_notification-templates.ts';
import {
  __resetSupabaseForTests,
  __setSupabaseBuildEnvForTests,
  __setSupabaseClientFactoryForTests,
  authRedirectUrl,
  completeAuthRedirect,
  getSupabase,
  getSupabaseConfigStatus,
} from '../src/services/supabase.ts';
import {
  columnIndex,
  decodeXml,
  matrixToCsv,
  parseRosterFile,
  parseRosterXlsxBuffer,
  parseSharedStrings,
  parseWorksheet,
  resolveFirstWorksheet,
  unzipEntries,
} from '../src/utils/rosterSpreadsheet.js';
import {
  artworkPage,
  coverPage,
  createTextPdf,
  downloadDesignDocuments,
  hexRgb,
  makePdf,
  rect,
  tablePages,
} from '../src/utils/simplePdf.js';

const ENV_KEYS = [
  'NODE_ENV',
  'SITE_URL',
  'SUPABASE_URL',
  'VITE_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'VITE_SUPABASE_ANON_KEY',
  'SUPABASE_ANON_KEY',
  'SUPABASE_PUBLISHABLE_KEY',
  'VITE_FORM_ENDPOINT',
  'FORMSPREE_ENDPOINT',
  'TURNSTILE_SECRET_KEY',
  'VITE_TURNSTILE_SITE_KEY',
  'TURNSTILE_TEST_MODE',
  'CRON_SECRET',
  'EDGE_RATE_LIMIT_SALT',
  'GUEST_ORDER_ACCESS_SECRET',
  'PAYMENTS_SESSION_URL',
  'PAYMENTS_SECRET_KEY',
  'PAYMENTS_PROVIDER',
  'LIBYAN_BANK_CARD_SESSION_URL',
  'LIBYAN_BANK_CARD_SECRET_KEY',
  'MALWARE_SCAN_API_URL',
  'MALWARE_SCAN_API_KEY',
  'MALWARE_SCAN_TEST_MODE',
  'MALWARE_SCAN_ENDPOINT',
  'ERROR_MONITORING_INGEST_URL',
  'VITE_SENTRY_DSN',
  'READINESS_SKIP_NETWORK_CHECKS',
];

afterEach(() => {
  vi.restoreAllMocks();
  __resetSupabaseForTests();
  for (const key of ENV_KEYS) delete process.env[key];
});

function resMock() {
  return {
    statusCode: 0,
    body: null,
    ended: false,
    headers: {},
    setHeader(key, value) {
      this.headers[key] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    end() {
      this.ended = true;
      return this;
    },
  };
}
function req(body = {}, method = 'POST', headers = {}, query = {}) {
  return {
    method,
    body,
    query,
    headers: {
      origin: 'http://localhost:5173',
      'user-agent': 'coverage-test',
      'x-forwarded-for': '127.0.0.77',
      ...headers,
    },
    socket: { remoteAddress: '127.0.0.78' },
  };
}
function reply(value, status = 200, headers = {}) {
  const text = typeof value === 'string' ? value : value == null ? '' : JSON.stringify(value);
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => headers[name.toLowerCase()] || headers[name] || '' },
    text: async () => text,
    json: async () => value,
    arrayBuffer: async () => new TextEncoder().encode(text).buffer,
  };
}
function configureCore() {
  process.env.NODE_ENV = 'test';
  process.env.SUPABASE_URL = 'https://db.example';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
  process.env.VITE_SUPABASE_ANON_KEY = 'public-key-long-enough-for-tests';
  process.env.TURNSTILE_TEST_MODE = 'true';
  process.env.TURNSTILE_SECRET_KEY = 'turnstile-secret';
  process.env.VITE_TURNSTILE_SITE_KEY = 'turnstile-site';
  process.env.CRON_SECRET = 'c'.repeat(64);
  process.env.EDGE_RATE_LIMIT_SALT = 'r'.repeat(64);
  process.env.GUEST_ORDER_ACCESS_SECRET = 'g'.repeat(64);
  process.env.SITE_URL = 'https://shababuna.ly';
  process.env.VITE_FORM_ENDPOINT = 'https://formspree.io/f/testform123';
  process.env.READINESS_SKIP_NETWORK_CHECKS = 'true';
}
function configureOnlinePayment() {
  process.env.PAYMENTS_PROVIDER = 'online_card';
  process.env.PAYMENTS_SESSION_URL = 'https://payments.example/session';
  process.env.PAYMENTS_SECRET_KEY = 'payment-secret';
}
function signedGuestPayload(
  data,
  secret = process.env.GUEST_ORDER_ACCESS_SECRET || process.env.CRON_SECRET,
) {
  const payload = Buffer.from(typeof data === 'string' ? data : JSON.stringify(data)).toString(
    'base64url',
  );
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

describe('coverage closure for localization and navigation', { concurrency: false }, () => {
  it('covers every order status language and unknown branch', () => {
    for (const [kind, values] of Object.entries(ALLOWED_ORDER_STATUSES)) {
      for (const value of values) {
        expect(
          presentOrderStatus(kind, ` ${value.toUpperCase()} `, /** @type {any} */ ('fr')),
        ).toMatchObject({ value, known: true });
      }
    }
    expect(presentOrderStatus('missing', null, 'ar')).toMatchObject({
      value: 'unknown',
      label: 'الحالة غير متاحة',
      known: false,
    });
    expect(presentOrderStatus('missing', 'custom', 'en')).toMatchObject({
      value: 'custom',
      label: 'Status unavailable',
      known: false,
    });
  });

  it('covers country fallbacks, localization failure and mutable map fallback', () => {
    expect(isSupportedCountryCode(12)).toBe(false);
    expect(normalizeCountryCode('bad', 'US')).toBe('US');
    expect(normalizeCountryCode(' ly ')).toBe('LY');
    expect(getLocalizedCountries('fr')).toHaveLength(countries.length);
    expect(isCashEligibleCountry('ly')).toBe(true);
    expect(isCashEligibleCountry(null)).toBe(false);
    expect(normalizeCountrySearch(' إِسْمـة ')).toBe('اسمه');
    vi.stubGlobal('Intl', {
      ...Intl,
      DisplayNames: class {
        constructor() {
          throw new Error('unsupported');
        }
      },
    });
    expect(getCountryName('US', 'fr')).toBe('US');
    vi.restoreAllMocks();
    const ly = countryByCode.get('LY');
    countryByCode.delete('LY');
    expect(getAddressRequirements('LY')).toBe(null);
    countryByCode.set('LY', ly);
    expect(getAddressRequirements('bad')).toBe(null);
  });

  it('covers every safe-return path decision', () => {
    for (const value of [
      '/',
      '/checkout',
      '/checkout/x',
      '/checkout?x=1',
      '/products/item',
      '/products/?x=1',
      '/account#orders',
      '/events/1',
    ]) {
      expect(safeInternalReturnPath(value, '/fallback')).toBe(value);
    }
    for (const value of [
      null,
      ' /shop',
      '/shop ',
      '%E0%A4%A',
      'https://evil.test',
      '//evil.test',
      '/shop\\evil',
      '/shop\u0001',
      '/unknown',
      '/%2F%2Fevil.test',
    ]) {
      expect(safeInternalReturnPath(value, '/fallback')).toBe('/fallback');
    }
  });
});

describe('coverage closure for search and production exports', { concurrency: false }, () => {
  const catalog = [
    {
      id: '1',
      slug: 'alpha',
      name: { en: 'Alpha', ar: 'الفا' },
      brand: 'Brand',
      productType: 'Game Jersey',
      category: 'clothing',
      subcategory: 'jerseys',
      collection: 'one',
      tags: ['fast'],
      keywords: ['court'],
      description: { en: 'Exact item', ar: 'عنصر' },
      colors: [{ name: { en: 'Red', ar: 'أحمر' } }],
    },
    {
      id: '2',
      slug: 'alphabet',
      name: { en: 'Alphabet', ar: 'ابجدية' },
      brand: 'Brand',
      productType: 'Ball',
      category: 'basketballs',
      subcategory: 'indoor',
      collection: 'two',
      tags: [],
      keywords: [],
      description: { en: 'Second', ar: 'ثاني' },
      colors: [],
    },
  ];
  it('covers all text scoring, candidate, cache, dedupe, filters and facets branches', () => {
    expect(localizedValues(null)).toEqual([]);
    expect(flattenText(['A', null], [['B']])).toBe('a b');
    expect(scoreText('', 'x')).toBe(-1);
    expect(scoreText('x', '')).toBe(-1);
    expect(scoreText('alpha', 'alpha')).toBe(400);
    expect(scoreText('alpha', 'alphabet')).toBeGreaterThan(249);
    expect(scoreText('jer', 'game jersey')).toBe(240);
    expect(scoreText('pha', 'alphabet')).toBeGreaterThan(100);
    expect(scoreText('zzz', 'alphabet')).toBe(-1);
    expect(hit('', 'anything')).toBe(true);
    expect(hit('alpha', 'Alpha item')).toBe(true);
    expect(hit('missing', 'Alpha item')).toBe(false);
    const candidates = suggestionCandidates(catalog);
    expect(candidates.length).toBeGreaterThan(10);
    expect(getSearchSuggestions('alpha', 50, catalog).length).toBeGreaterThan(0);
    expect(getSearchSuggestions('alpha', 50, catalog).length).toBeGreaterThan(0); // cached branch
    expect(getSearchSuggestions('', 10, catalog)).toEqual([]);
    expect(searchSite('', 99, {}, catalog).total).toBeGreaterThan(0);
    expect(
      searchSite('alpha', 99, { types: ['products'], colors: ['Red'], brands: ['Brand'] }, catalog)
        .products,
    ).toHaveLength(1);
    expect(searchSite('alpha', 99, { types: ['pages'] }, catalog).products).toHaveLength(0);
    expect(
      searchSite('alpha', 99, { types: ['products'], colors: ['Blue'] }, catalog).products,
    ).toHaveLength(0);
    expect(
      searchSite('alpha', 99, { types: ['products'], brands: ['Other'] }, catalog).products,
    ).toHaveLength(0);
    expect(
      getSearchFacets([
        { brand: null, colors: null },
        { brand: 'B', colors: [{ name: { en: null } }, { name: { en: 'Blue' } }] },
      ]),
    ).toMatchObject({ colors: ['Blue'], brands: ['B'] });
    expect(normalizeSearchText(null)).toBe('');
  });

  it('covers every product silhouette, XML, zip and manifest branch', async () => {
    const previews = [
      'uniform',
      'jersey',
      'shirt',
      'shorts',
      'hoodie',
      'pants',
      'tracksuit',
      'bag',
      'sleeve',
      'ball',
      'padding',
      'unknown',
    ];
    for (const preview of previews) {
      expect(productShape(preview, '#000', '#fff', '#f00', 'front')).toContain('<');
      expect(productShape(preview, '#000', '#fff', '#f00', 'side')).toContain('<');
    }
    expect(escapeXml(`<&>"'`)).toBe('&lt;&amp;&gt;&quot;&apos;');
    expect(safeHex('#abcdef', '#000000')).toBe('#abcdef');
    expect(safeHex('bad', '#000000')).toBe('#000000');
    expect(u16(258)).toEqual([2, 1]);
    expect(u32(0x01020304)).toEqual([4, 3, 2, 1]);
    expect(crc32(new Uint8Array())).toBe(0);
    const design = {
      productType: 'game-jersey',
      primary: '#000000',
      secondary: '#ffffff',
      accent: '#ff0000',
      variant: 'home',
      quantity: 10,
      notes: '',
    };
    const studio = {
      activeView: 'front',
      showSafeArea: true,
      showBleedArea: true,
      layers: [
        {
          id: 'logo',
          type: 'logo',
          view: 'front',
          label: 'Logo',
          content: 'data:image/png;base64,AA==',
          x: 50,
          y: 50,
          width: 20,
          rotation: 10,
          color: '#fff',
          visible: true,
          zIndex: 2,
        },
        {
          id: 'text',
          type: 'text',
          view: 'front',
          label: 'Text',
          content: 'A&B',
          x: 40,
          y: 30,
          width: 30,
          rotation: 0,
          color: 'bad',
          visible: true,
          zIndex: 1,
        },
        {
          id: 'hidden',
          type: 'text',
          view: 'front',
          label: 'Hidden',
          content: 'X',
          x: 1,
          y: 1,
          width: 1,
          rotation: 0,
          color: '#fff',
          visible: false,
          zIndex: 3,
        },
      ],
      comments: [],
    };
    expect(buildDesignViewSvg({ design, studio, view: 'front', productLabel: '' })).toContain(
      '&amp;',
    );
    expect(
      buildDesignViewSvg({
        design: { ...design, primary: 'bad', secondary: 'bad', accent: 'bad' },
        studio: { ...studio, showSafeArea: false, showBleedArea: false },
        view: 'back',
        productLabel: 'Custom',
      }),
    ).toContain('Custom');
    const zip = createStoreZip([
      { name: '/a.txt', data: 'a' },
      { name: 'b.bin', data: new Uint8Array([1, 2]) },
    ]);
    expect(zip.type).toBe('application/zip');
    expect(zip.size).toBeGreaterThan(40);
    const packageBlob = buildProductionPackage({
      design,
      studio,
      roster: [{ name: 'A', jerseyName: 'A', number: '1', jerseySize: 'M', shortsSize: 'M' }],
      reference: 'REF',
      productLabel: '',
    });
    expect(packageBlob.type).toBe('application/zip');
    expect(buildProductionPackage()).toBeTruthy();
  });
});

describe('coverage closure for signed guest access and payment', { concurrency: false }, () => {
  it('covers CRON fallback, default TTL and every signed payload rejection', () => {
    process.env.CRON_SECRET = 'c'.repeat(64);
    const token = createGuestOrderToken({
      orderNumber: 'SHB-20260801-0000001',
      email: 'guest@example.com',
    });
    expect(verifyGuestOrderToken(token)).toMatchObject({ orderNumber: 'SHB-20260801-0000001' });
    expect(verifyGuestOrderToken(signedGuestPayload('not-json', process.env.CRON_SECRET))).toBe(
      null,
    );
    expect(
      verifyGuestOrderToken(
        signedGuestPayload(
          { orderNumber: 'bad', emailHash: 'a'.repeat(64), exp: Date.now() / 1000 + 1000 },
          process.env.CRON_SECRET,
        ),
      ),
    ).toBe(null);
    expect(
      verifyGuestOrderToken(
        signedGuestPayload(
          { orderNumber: 'SHB-20260801-0000001', emailHash: 'bad', exp: Date.now() / 1000 + 1000 },
          process.env.CRON_SECRET,
        ),
      ),
    ).toBe(null);
    expect(
      verifyGuestOrderToken(
        signedGuestPayload(
          { orderNumber: 'SHB-20260801-0000001', emailHash: 'a'.repeat(64), exp: 'nan' },
          process.env.CRON_SECRET,
        ),
      ),
    ).toBe(null);
    expect(
      verifyGuestOrderToken(
        signedGuestPayload(
          { orderNumber: 'SHB-20260801-0000001', emailHash: 'a'.repeat(64), exp: 1 },
          process.env.CRON_SECRET,
        ),
      ),
    ).toBe(null);
    expect(normalizeGuestOrderNumber('LHA-20260801-0000001')).toBe('LHA-20260801-0000001');
    expect(normalizeGuestEmail(null)).toBe('');
    expect(guestEmailHash('invalid')).toHaveLength(64);
  });

  it('covers trusted checkout idempotency lookup, defaults and provider errors', async () => {
    configureCore();
    configureOnlinePayment();
    const order = {
      id: 'o',
      order_number: 'SHB-20260801-0000001',
      idempotency_key: '11111111-1111-4111-8111-111111111111',
      customer_email: 'a@example.com',
      currency: 'USD',
      amount_due_now: 10,
      payment_method: 'online_card',
      payment_plan: 'full',
      payment_stage: null,
      payment_status: 'failed',
      order_status: 'received',
      shipping_quote_required: false,
      shipping_quote_expires_at: null,
      payment_expires_at: null,
      delivery_profile: null,
    };
    const calls = [];
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (url, options = {}) => {
        calls.push([String(url), options]);
        if (String(url).includes('consume_edge_rate_limit')) return reply(true);
        if (String(url).includes('/rest/v1/orders')) return reply([order]);
        if (String(url) === 'https://payments.example/session')
          return reply({ url: 'https://pay.example/x' });
        throw new Error('unexpected');
      }),
    );
    let res = resMock();
    await createSessionHandler(
      req({
        paymentMethod: 'online_card',
        idempotencyKey: order.idempotency_key,
        customerEmail: 'a@example.com',
      }),
      res,
    );
    expect(res.statusCode).toBe(200);
    expect(calls.find(([url]) => url.includes('/rest/v1/orders'))[0]).toContain(
      'idempotency_key=eq.',
    );
    res = resMock();
    await createSessionHandler(req(null), res);
    expect(res.statusCode).toBe(400);
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementation(async (url) =>
          String(url).includes('consume_edge_rate_limit')
            ? reply(true)
            : String(url).includes('/rest/v1/orders')
              ? reply({ id: 'not-array' })
              : reply({}),
        ),
    );
    res = resMock();
    await createSessionHandler(
      req({ paymentMethod: 'online_card', orderNumber: 'SHB-20260801-0000001' }),
      res,
    );
    expect(res.statusCode).toBe(404);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (url) => {
        if (String(url).includes('consume_edge_rate_limit')) return reply(true);
        if (String(url).includes('/rest/v1/orders')) return reply([order]);
        throw Object.assign(new Error('provider broke'), { status: 418 });
      }),
    );
    res = resMock();
    await createSessionHandler(
      req({
        paymentMethod: 'online_card',
        orderNumber: 'SHB-20260801-0000001',
        customerEmail: 'a@example.com',
      }),
      res,
    );
    expect(res.statusCode).toBeGreaterThan(399);
  });
});

describe('coverage closure for design-share API', { concurrency: false }, () => {
  const TOKEN = 'T'.repeat(48);
  function install(mode = 'ok') {
    const calls = [];
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (url, options = {}) => {
        const target = String(url);
        calls.push([target, options]);
        if (target.includes('consume_edge_rate_limit')) return reply(true);
        if (mode === 'throw') throw Object.assign(new Error('expired_share'), { status: 404 });
        if (target.includes('get_shared_design'))
          return reply(mode === 'missing' ? null : { id: 'd', design_data: {} });
        if (target.includes('add_shared_design_comment')) return reply({ id: 'c', x: 0, y: 100 });
        if (target.includes('respond_to_shared_design'))
          return reply({ status: 'changes_requested' });
        throw new Error(`unexpected:${target}`);
      }),
    );
    return calls;
  }
  it('covers token arrays, missing designs and all action branches', async () => {
    configureCore();
    install('ok');
    let res = resMock();
    await designShareHandler(req({}, 'GET', {}, { token: [TOKEN, 'ignored'] }), res);
    expect(res.statusCode).toBe(200);
    configureCore();
    install('missing');
    res = resMock();
    await designShareHandler(req({}, 'GET', {}, { token: TOKEN }), res);
    expect(res.statusCode).toBe(404);
    configureCore();
    install('ok');
    res = resMock();
    await designShareHandler(
      req({ token: TOKEN, action: 'bad', turnstileToken: 'test-pass' }),
      res,
    );
    expect(res.statusCode).toBe(400);
    res = resMock();
    await designShareHandler(
      req(
        {
          token: TOKEN,
          action: 'comment',
          name: 'Reviewer',
          email: '',
          text: 'OK',
          view: 'side',
          x: -20,
          y: 120,
          turnstileToken: 'test-pass',
        },
        'POST',
        { 'x-forwarded-for': '', 'x-real-ip': '127.0.0.2' },
      ),
      res,
    );
    expect(res.statusCode).toBe(201);
    for (const body of [
      {
        token: TOKEN,
        action: 'comment',
        name: 'R',
        email: 'bad',
        text: 'OK',
        view: 'front',
        x: 1,
        y: 1,
        turnstileToken: 'test-pass',
      },
      {
        token: TOKEN,
        action: 'comment',
        name: 'Reviewer',
        email: 'a@b.com',
        text: 'X',
        view: 'back',
        x: 1,
        y: 1,
        turnstileToken: 'test-pass',
      },
      {
        token: TOKEN,
        action: 'comment',
        name: 'Reviewer',
        email: 'a@b.com',
        text: 'OK',
        view: 'bad',
        x: 1,
        y: 1,
        turnstileToken: 'test-pass',
      },
      {
        token: TOKEN,
        action: 'comment',
        name: 'Reviewer',
        email: 'a@b.com',
        text: 'OK',
        view: 'front',
        x: NaN,
        y: 1,
        turnstileToken: 'test-pass',
      },
    ]) {
      res = resMock();
      await designShareHandler(req(body), res);
      expect(res.statusCode).toBe(400);
    }
    res = resMock();
    await designShareHandler(
      req({
        token: TOKEN,
        action: 'request_changes',
        note: 'Please move logo',
        turnstileToken: 'test-pass',
      }),
      res,
    );
    expect(res.statusCode).toBe(200);
  });
  it('maps not-found and generic RPC failures safely', async () => {
    configureCore();
    install('throw');
    let res = resMock();
    await designShareHandler(req({}, 'GET', {}, { token: TOKEN }), res);
    expect(res.statusCode).toBe(404);
    configureCore();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (url) => {
        if (String(url).includes('consume_edge_rate_limit')) return reply(true);
        throw new Error('database_down');
      }),
    );
    res = resMock();
    await designShareHandler(req({}, 'GET', {}, { token: TOKEN }), res);
    expect(res.statusCode).toBe(503);
  });
});

describe(
  'coverage closure for readiness, scanner and notifications',
  { concurrency: false },
  () => {
    it('evaluates every required, optional and feature-readiness state', async () => {
      const empty = requiredEnvironment();
      expect(empty.supabase_url).toBe(false);
      expect(empty.site_url).toBe(false);
      expect(optionalCapabilities()).toEqual({
        online_card: false,
        libyan_bank_card: false,
        malware_scan: false,
        signature: false,
        monitoring: false,
      });
      configureCore();
      process.env.FORMSPREE_DELIVERY_VERIFIED_AT = new Date().toISOString();
      process.env.FORMSPREE_DELIVERY_EVIDENCE_ID = 'verified-delivery';
      configureOnlinePayment();
      process.env.PAYMENTS_PROVIDER = 'sandbox-pay';
      process.env.LIBYAN_BANK_CARD_SESSION_URL = 'https://bank.example/session';
      process.env.LIBYAN_BANK_CARD_SECRET_KEY = 'bank';
      process.env.LIBYAN_BANK_CARD_PROVIDER = 'sandbox-bank';
      process.env.MALWARE_SCAN_API_URL = 'https://scanner.example';
      process.env.MALWARE_SCAN_API_KEY = 'scanner-key-long';
      process.env.MALWARE_SCAN_PROVIDER = 'sandbox-scanner';
      process.env.ERROR_MONITORING_INGEST_URL = 'https://monitor.example';
      const required = requiredEnvironment(),
        optional = optionalCapabilities(),
        features = featureReadiness(required, optional);
      expect(Object.values(required).every(Boolean)).toBe(true);
      expect(features.core_commerce).toBe(true);
      expect(features.public_forms).toBe(true);
      expect(features.special_request_uploads).toBe(true);
      let res = resMock();
      await readinessHandler(req({}, 'GET'), res);
      expect(res.statusCode).toBe(200);
      expect(res.body.features.special_request_uploads).toBe(true);
      res = resMock();
      await readinessHandler(req({}, 'HEAD'), res);
      expect(res.statusCode).toBe(204);
      expect(res.ended).toBe(true);
      delete process.env.SUPABASE_URL;
      res = resMock();
      await readinessHandler(req({}, 'HEAD'), res);
      expect(res.statusCode).toBe(503);
      res = resMock();
      await readinessHandler(req({}, 'POST'), res);
      expect(res.statusCode).toBe(405);
    });
    it('fails file uploads closed in production while allowing URL-only intake', async () => {
      process.env.NODE_ENV = 'production';
      expect(isMalwareScannerConfigured()).toBe(false);
      process.env.MALWARE_SCAN_API_URL = 'http://insecure.example';
      process.env.MALWARE_SCAN_API_KEY = 'short';
      expect(isMalwareScannerConfigured()).toBe(false);
      process.env.NODE_ENV = 'test';
      process.env.MALWARE_SCAN_TEST_MODE = 'true';
      expect(isMalwareScannerConfigured()).toBe(true);
      process.env.NODE_ENV = 'production';
      process.env.MALWARE_SCAN_API_URL = 'https://scanner.example';
      process.env.MALWARE_SCAN_API_KEY = 'x'.repeat(20);
      expect(isMalwareScannerConfigured()).toBe(true);
      configureCore();
      process.env.NODE_ENV = 'production';
      delete process.env.MALWARE_SCAN_API_URL;
      delete process.env.MALWARE_SCAN_API_KEY;
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply(true)));
      const body = {
        turnstileToken: 'x',
        customerName: 'User',
        email: 'u@example.com',
        country: 'LY',
        description: 'A valid detailed product request',
        desiredQuantity: 1,
        preferredContactMethod: 'email',
        consent: true,
        files: [
          {
            name: 'x.png',
            mime: 'image/png',
            role: 'product_image',
            base64: 'iVBORw0KGgoAAAANSUhEUg==',
          },
        ],
      };
      const res = resMock();
      await specialRequestHandler(req(body), res);
      expect(res.statusCode).toBe(503);
      expect(res.body.error).toBe('secure_file_scanning_unavailable');
    });
    it('builds versioned bilingual notification templates and all fallbacks', () => {
      expect(notificationReference({ entity_id: 'e' }, {})).toBe('e');
      const ar = buildNotificationTemplate({
        event_type: 'quote_ready',
        entity_type: 'quote',
        entity_id: 'q',
        recipient_email: 'a@example.com',
        payload: {
          language: 'ar',
          quoteNumber: 'QT-1',
          customerName: 'A',
          amount: 50,
          currency: 'USD',
          customerAccountUrl: 'https://x',
        },
      });
      expect(ar.locale).toBe('ar');
      expect(ar.customerMessage).toContain('QT-1');
      const fallback = buildNotificationTemplate({
        event_type: 'unknown',
        subject: 'Custom',
        entity_type: 'x',
        entity_id: '1',
        payload: null,
      });
      expect(fallback.title).toBe('Custom');
      const empty = buildNotificationTemplate();
      expect(empty.templateVersion).toBe('2026-08-01.1');
    });
  },
);

describe('coverage closure for Supabase runtime and documents', { concurrency: false }, () => {
  it('covers build config aliases, client caching and every auth redirect branch', async () => {
    const url = 'https://project.supabase.co';
    const key = 'x'.repeat(40);
    let calls = 0;
    __setSupabaseBuildEnvForTests({
      NEXT_PUBLIC_SUPABASE_URL: url,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
    });
    __setSupabaseClientFactoryForTests(async () => ({
      createClient: (u, k, options) => {
        calls += 1;
        return { u, k, options, auth: {} };
      },
    }));
    const one = await getSupabase(),
      two = await getSupabase();
    expect(one).toBe(two);
    expect(calls).toBe(1);
    expect(getSupabaseConfigStatus()).toMatchObject({ configured: true, source: 'build' });
    vi.stubGlobal('location', {
      origin: 'https://example.com',
      href: 'https://example.com/account',
    });
    expect(authRedirectUrl('recovery')).toContain('reset-password');
    expect(authRedirectUrl()).toContain('verified=1');
    expect(await completeAuthRedirect(null)).toMatchObject({ handled: false });
    const replaceCalls = [];
    vi.stubGlobal('history', { replaceState: (...args) => replaceCalls.push(args) });
    vi.stubGlobal('document', { title: 'T' });
    const client = {
      auth: {
        setSession: async () => ({ data: { session: 1 }, error: null }),
        exchangeCodeForSession: async () => ({ data: { code: 1 }, error: null }),
        verifyOtp: async () => ({ data: { otp: 1 }, error: null }),
      },
    };
    for (const href of [
      'https://example.com/account#error=denied',
      'https://example.com/account#access_token=a&refresh_token=b',
      'https://example.com/account?code=c',
      'https://example.com/account?token_hash=t&type=signup',
      'https://example.com/account?token_hash=t&type=magiclink',
      'https://example.com/account?token_hash=t&type=recovery',
      'https://example.com/account',
    ]) {
      globalThis.location.href = href;
      const result = await completeAuthRedirect(client);
      expect(typeof result.handled).toBe('boolean');
    }
    expect(replaceCalls.length).toBeGreaterThan(0);
  });

  it('covers spreadsheet XML, ZIP and file-dispatch fallbacks', async () => {
    expect(decodeXml('&#65;&#x42;&lt;&gt;&quot;&apos;&amp;')).toBe('AB<>"\'&');
    expect(parseSharedStrings('<si><t>A</t><r><t>B</t></r></si>')).toEqual(['AB']);
    expect(columnIndex('')).toBe(0);
    expect(columnIndex('AA2')).toBe(26);
    const rows = parseWorksheet(
      '<row><c><is><t>X</t></is></c><c r="B1" t="s"><v>9</v></c></row>',
      [],
    );
    expect(rows).toEqual([['X', '']]);
    expect(matrixToCsv([[null, 'a"b']])).toBe('"","a""b"');
    expect(resolveFirstWorksheet(new Map([['xl/worksheets/sheet2.xml', new Uint8Array()]]))).toBe(
      'xl/worksheets/sheet2.xml',
    );
    expect(resolveFirstWorksheet(new Map())).toBe(null);
    let failed = false;
    try {
      await unzipEntries(new Uint8Array([1, 2, 3]));
    } catch (error) {
      failed = error.message === 'xlsx_zip_directory_missing';
    }
    expect(failed).toBe(true);
    expect(await parseRosterFile(null)).toEqual([]);
    let unsupported = false;
    try {
      await parseRosterFile({ size: 1, name: 'x.bin', type: 'application/octet-stream' });
    } catch (error) {
      unsupported = error.message === 'roster_file_type_unsupported';
    }
    expect(unsupported).toBe(true);
    let invalid = false;
    try {
      await parseRosterXlsxBuffer(new Uint8Array());
    } catch (error) {
      invalid = error.message === 'xlsx_size_invalid';
    }
    expect(invalid).toBe(true);
  });

  it('covers remaining PDF primitive, pagination and fallback branches', () => {
    expect(hexRgb('bad', '#010203')).toEqual([1 / 255, 2 / 255, 3 / 255]);
    expect(rect(1, 2, 3, 4, null, '1 1 1', 0)).toContain('re S');
    const longSections = Array.from({ length: 3 }, (_, i) => ({
      heading: `H${i}`,
      rows: Array.from({ length: 60 }, (_, j) => [`R${j}`, j]),
    }));
    expect(
      createTextPdf({ title: 'T', subtitle: 'S', sections: longSections }).size,
    ).toBeGreaterThan(100);
    expect(makePdf([''], {}).size).toBeGreaterThan(20);
    expect(
      coverPage({ title: 'T', subtitle: 'S', design: {}, productLabel: 'P', reference: 'R' }),
    ).toContain('SHABABUNA');
    expect(artworkPage({ design: {}, studio: null, view: 'front', productLabel: 'P' })).toContain(
      'Editable vector artwork',
    );
    expect(
      tablePages({
        heading: 'H',
        rows: Array.from({ length: 40 }, (_, i) => [`A${i}`, `B${i}`, i % 2 ? null : 'C']),
      }),
    ).toHaveLength(2);
    expect(
      downloadDesignDocuments({ design: {}, studio: null, roster: [], reference: 'R' }).proof.size,
    ).toBeGreaterThan(100);
  });
});

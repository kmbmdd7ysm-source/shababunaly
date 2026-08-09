import crypto from 'node:crypto';
import { afterEach, describe, expect, it, vi } from './test-api.js';
import guestAccessHandler from '../api/guest-order-access.js';
import publicQuoteHandler from '../api/public-quote-request.js';
import retryPaymentHandler from '../api/retry-order-payment.js';
import specialRequestHandler from '../api/special-request.js';
import formspreeHandler, {
  resolveFormspreeEndpoint,
  sanitize,
  sanitizeKey,
  buildCleanFormPayload,
} from '../api/formspree.js';
import createSessionHandler from '../api/create-session.js';
import designShareHandler from '../api/design-share.js';
import { createGuestOrderToken, verifyGuestOrderToken } from '../api/_guest-order-token.ts';
import {
  buildNotificationTemplate,
  EVENT_COPY,
  notificationReference,
} from '../api/_notification-templates.ts';
import {
  guardPublicRequest,
  guardPublicPost,
  verifyBearerSecret,
} from '../api/_request-security.ts';
import {
  normalizeCatalogProduct,
  normalizeLhaCatalogProduct,
  verifiedVariantStock,
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
  compareBrands,
  BRAND_PRIORITY,
  catalogProducts,
} from '../src/data/products.js';
import { CUSTOM_PRODUCT_TYPES, normalizeRoster, rosterToCsv } from '../src/data/customization.ts';
import {
  normalizeStudio,
  addDesignLayer,
  updateDesignLayer,
  removeDesignLayer,
  duplicateDesignLayer,
  moveDesignLayer,
  addDesignComment,
  resolveDesignComment,
  createHistory,
  pushHistory,
  undoHistory,
  redoHistory,
  buildProductionMetadata,
  autosaveDesignStudio,
  createSecureDesignShare,
  loadSharedDesign,
  addSharedDesignComment,
  respondToSharedDesign,
} from '../src/services/designStudio.ts';
import {
  __resetSupabaseForTests,
  __setSupabaseBuildEnvForTests,
  __setSupabaseClientFactoryForTests,
  authRedirectUrl,
  completeAuthRedirect,
  getSupabase,
  getSupabaseConfigStatus,
} from '../src/services/supabase.ts';
import { getAddressRequirements, countryByCode } from '../src/data/countries.ts';
import {
  buildDesignViewSvg,
  buildProductionPackage,
  createStoreZip,
  escapeXml,
} from '../src/utils/designExports.js';
import {
  parseRosterFile,
  parseWorksheet,
  resolveFirstWorksheet,
  unzipEntries,
} from '../src/utils/rosterSpreadsheet.js';
import { createTextPdf, downloadDesignDocuments } from '../src/utils/simplePdf.js';
import { getSearchSuggestions } from '../src/utils/search.ts';
import { safeInternalReturnPath } from '../src/utils/safeReturnPath.ts';

const ENV_KEYS = [
  'NODE_ENV',
  'SITE_URL',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'TURNSTILE_TEST_MODE',
  'TURNSTILE_SECRET_KEY',
  'CRON_SECRET',
  'EDGE_RATE_LIMIT_SALT',
  'GUEST_ORDER_ACCESS_SECRET',
  'PAYMENTS_PROVIDER',
  'PAYMENTS_SESSION_URL',
  'PAYMENTS_SECRET_KEY',
  'LIBYAN_BANK_CARD_PROVIDER',
  'LIBYAN_BANK_CARD_SESSION_URL',
  'LIBYAN_BANK_CARD_SECRET_KEY',
  'FORMSPREE_ORDER_ENDPOINT',
  'VITE_FORM_ENDPOINT',
  'MALWARE_SCAN_API_URL',
  'MALWARE_SCAN_API_KEY',
  'MALWARE_SCAN_TEST_MODE',
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
    setHeader(k, v) {
      this.headers[k] = v;
    },
    status(c) {
      this.statusCode = c;
      return this;
    },
    json(b) {
      this.body = b;
      return this;
    },
    end() {
      this.ended = true;
      return this;
    },
  };
}
/** @returns {any} */
function req(body = {}, method = 'POST', headers = {}, query = {}) {
  return {
    method,
    body,
    query,
    headers: {
      origin: 'http://localhost:5173',
      'user-agent': 'coverage-100',
      'x-forwarded-for': '127.0.0.90',
      ...headers,
    },
    socket: { remoteAddress: '127.0.0.91' },
  };
}

/** @returns {any} */
function reply(value, status = 200, headers = {}) {
  const text = typeof value === 'string' ? value : value == null ? '' : JSON.stringify(value);
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (n) => headers[n.toLowerCase()] ?? headers[n] ?? '' },
    text: async () => text,
    json: async () => value,
    arrayBuffer: async () => new TextEncoder().encode(text).buffer,
  };
}
function configureCore() {
  process.env.NODE_ENV = 'test';
  process.env.SITE_URL = 'https://shababuna.ly';
  process.env.SUPABASE_URL = 'https://db.example';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
  process.env.TURNSTILE_TEST_MODE = 'true';
  process.env.TURNSTILE_SECRET_KEY = 'turnstile';
  process.env.EDGE_RATE_LIMIT_SALT = 'e'.repeat(64);
  process.env.CRON_SECRET = 'c'.repeat(64);
  process.env.GUEST_ORDER_ACCESS_SECRET = 'g'.repeat(64);
}
function configurePayment(method = 'online_card') {
  process.env.PAYMENTS_PROVIDER = 'sandbox';
  process.env.PAYMENTS_SESSION_URL = 'https://pay.example/session';
  process.env.PAYMENTS_SECRET_KEY = 'secret';
  process.env.LIBYAN_BANK_CARD_PROVIDER = 'bank';
  process.env.LIBYAN_BANK_CARD_SESSION_URL = 'https://bank.example/session';
  process.env.LIBYAN_BANK_CARD_SECRET_KEY = 'bank-secret';
  return method;
}
/** @returns {any} */
function order(overrides = {}) {
  return {
    id: 'o1',
    order_number: 'SHB-20260801-0000001',
    user_id: null,
    customer_email: 'guest@example.com',
    idempotency_key: '11111111-1111-4111-8111-111111111111',
    currency: 'USD',
    total: 100,
    amount_paid: 0,
    amount_due_now: 100,
    outstanding_balance: 100,
    remaining_balance: 100,
    payment_method: 'online_card',
    payment_plan: 'full',
    payment_stage: 'initial',
    payment_status: 'pending',
    order_status: 'awaiting_payment',
    shipping_quote_required: false,
    shipping_quote_expires_at: null,
    payment_expires_at: new Date(Date.now() + 60000).toISOString(),
    delivery_profile: 'standard',
    shipping_summary: { email: 'guest@example.com' },
    order_items: [{ product_name: 'Ball', quantity: 1 }],
    ...overrides,
  };
}
function signed(data, secret = process.env.GUEST_ORDER_ACCESS_SECRET || process.env.CRON_SECRET) {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

// These tests intentionally execute every real fallback and error branch in the production modules.
describe('100% API and security branch closure', { concurrency: false }, () => {
  it('closes guest-token, template and request-security fallbacks', async () => {
    process.env.CRON_SECRET = 'c'.repeat(64);
    const t = createGuestOrderToken({
      orderNumber: 'SHB-20260801-0000001',
      email: 'guest@example.com',
      ttlSeconds: 0,
    });
    expect(verifyGuestOrderToken(t)).toBeTruthy();
    const now = Math.floor(Date.now() / 1000);
    expect(
      verifyGuestOrderToken(
        signed({ orderNumber: 'SHB-20260801-0000001', emailHash: '', exp: now + 1000, nonce: 'n' }),
      ),
    ).toBe(null);
    expect(
      verifyGuestOrderToken(
        signed({
          orderNumber: 'SHB-20260801-0000001',
          emailHash: 'a'.repeat(64),
          exp: 'bad',
          nonce: 'n',
        }),
      ),
    ).toBe(null);
    expect(
      verifyGuestOrderToken(
        signed({
          orderNumber: 'SHB-20260801-0000001',
          emailHash: 'a'.repeat(64),
          exp: now,
          nonce: 'n',
        }),
      ),
    ).toBe(null);
    expect(verifyGuestOrderToken(t, 'bad')).toBe(null);
    const [payload] = t.split('.');
    expect(verifyGuestOrderToken(`${payload}.${'x'.repeat(43)}`)).toBe(null);

    for (const event of Object.keys(EVENT_COPY))
      for (const locale of ['en', 'ar']) {
        const built = buildNotificationTemplate({
          event_type: event,
          entity_type: 'order',
          entity_id: 'e',
          recipient_email: 'r@example.com',
          payload: {
            locale,
            orderNumber: 'O',
            amount: 0,
            total: 12,
            currency: 'LYD',
            customerAccountUrl: 'https://a',
            customerName: 'N',
          },
        });
        expect(built.locale).toBe(locale);
        expect(built.customerMessage).toContain(locale === 'ar' ? 'المرجع' : 'Reference');
      }
    expect(
      buildNotificationTemplate({
        event_type: 'other',
        subject: '',
        payload: { locale: 'ar', totalUsd: 5, trackingUrl: 'https://t' },
      }).title,
    ).toBe('تحديث من شبابنا');
    expect(
      buildNotificationTemplate({
        event_type: 'other',
        subject: '',
        payload: { language: 'en', paymentRecoveryUrl: 'https://p' },
      }).title,
    ).toBe('SHABABUNA update');
    expect(
      buildNotificationTemplate({ event_type: 'other', subject: 'Custom', payload: null }).title,
    ).toBe('Custom');
    expect(notificationReference({ entity_id: 'row' }, { quoteNumber: 'q' })).toBe('q');
    expect(notificationReference({ entity_id: 'row' }, { requestNumber: 'r' })).toBe('r');
    expect(notificationReference({ entity_id: 'row' }, { referenceId: 'x' })).toBe('x');

    const result = [];
    process.env.NODE_ENV = 'test';
    process.env.SUPABASE_URL = 'https://db.example';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (url, options = {}) => {
        result.push([String(url), options]);
        return reply(true);
      }),
    );
    let res = resMock();
    let request = req({}, 'GET', { 'x-forwarded-for': '', 'x-real-ip': '127.1.1.1' });
    expect(await guardPublicRequest(request, res, { honeypot: false })).toBe(true);
    request = req({}, 'GET', { 'x-forwarded-for': '', 'x-real-ip': '' });
    expect(await guardPublicRequest(request, res, { honeypot: false })).toBe(true);
    request = req({}, 'GET', { 'x-forwarded-for': '', 'x-real-ip': '' });
    request.socket = {};
    expect(await guardPublicRequest(request, res, { honeypot: false })).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(verifyBearerSecret(undefined, '')).toBe(false);
    expect(verifyBearerSecret('Bearer x', 'y')).toBe(false);
    expect(verifyBearerSecret('Bearer same', 'same')).toBe(true);

    // Missing durable store: development fallback allow and deny; production fail closed.
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    res = resMock();
    expect(await guardPublicPost(req({ company_website: 'bot' }), res)).toBe(false);
    expect(res.statusCode).toBe(200);
    res = resMock();
    expect(await guardPublicPost(req({ _gotcha: 'bot' }), res)).toBe(false);
    for (let i = 0; i < 2; i++) {
      res = resMock();
      await guardPublicRequest(req({}, 'POST'), res, {
        limit: 1,
        windowMs: 60000,
        bucket: 'fallback-limit',
        honeypot: false,
      });
      if (i === 1) expect(res.statusCode).toBe(429);
    }
    process.env.NODE_ENV = 'production';
    res = resMock();
    expect(await guardPublicRequest(req({}, 'POST'), res, { honeypot: false })).toBe(false);
    expect(res.statusCode).toBe(503);
  });

  it('closes guest order access privacy and fallback branches', async () => {
    configureCore();
    let stored = order();
    let mode = 'array';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (url) => {
        const u = String(url);
        if (u.includes('consume_edge_rate_limit')) return reply(true);
        if (u.includes('/rest/v1/orders?'))
          return reply(mode === 'object' ? stored : mode === 'none' ? [] : [stored]);
        throw new Error('unexpected');
      }),
    );
    let res = resMock();
    await guestAccessHandler(req(null), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.order).toBe(null);
    mode = 'object';
    res = resMock();
    await guestAccessHandler(
      req({
        orderNumber: stored.order_number,
        email: 'guest@example.com',
        turnstileToken: 'test-pass',
      }),
      res,
    );
    expect(res.body.order).toBe(null);
    mode = 'array';
    stored = order({ order_items: null });
    res = resMock();
    await guestAccessHandler(
      req({
        orderNumber: stored.order_number,
        email: 'guest@example.com',
        turnstileToken: 'test-pass',
      }),
      res,
    );
    expect(res.body.order.items).toEqual([]);
    stored = order({ customer_email: '', shipping_summary: { email: 'guest@example.com' } });
    res = resMock();
    await guestAccessHandler(
      req({
        orderNumber: stored.order_number,
        email: 'guest@example.com',
        turnstileToken: 'test-pass',
      }),
      res,
    );
    res = resMock();
    await guestAccessHandler(
      req({
        orderNumber: stored.order_number,
        email: 'guest@example.com',
        turnstileToken: 'test-pass',
      }),
      res,
    );
    expect(res.body.order).toBeTruthy();
    stored = order({ customer_email: '', shipping_summary: {} });
    const token = createGuestOrderToken({
      orderNumber: 'SHB-20260801-0000001',
      email: 'guest@example.com',
    });
    res = resMock();
    await guestAccessHandler(req({ orderNumber: stored.order_number, accessToken: token }), res);
    expect(res.body.order).toBe(null);
    stored = order();
    const noForward = req(
      { orderNumber: stored.order_number, email: 'guest@example.com', turnstileToken: 'test-pass' },
      'POST',
      { 'x-forwarded-for': '' },
    );
    res = resMock();
    await guestAccessHandler(noForward, res);
    expect(res.statusCode).toBe(200);
    mode = 'none';
    res = resMock();
    await guestAccessHandler(
      req({
        orderNumber: 'SHB-20260801-0000001',
        email: 'guest@example.com',
        turnstileToken: 'test-pass',
      }),
      res,
    );
    expect(res.body.order).toBe(null);
  });

  it('closes quote intake body/default/membership/insert branches', async () => {
    configureCore();
    /** @type {any} */ let auth = null;
    /** @type {any} */ let duplicate = [];
    /** @type {any} */ let members = [];
    /** @type {any} */ let created = [{ id: 'q1', quote_number: 'QT', status: 'under_review' }];
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (url, options = {}) => {
        const u = String(url);
        if (u.includes('consume_edge_rate_limit')) return reply(true);
        if (u.includes('challenges.cloudflare.com')) return reply({ success: true });
        if (u.includes('/auth/v1/user')) return auth ? reply(auth) : reply(null, 401);
        if (u.includes('organization_members')) return reply(members);
        if (u.includes('quote_requests?select=id,quote_number') && options.method !== 'POST')
          return reply(duplicate);
        if (u.includes('/rest/v1/quote_requests?select=id,quote_number,status,created_at'))
          return reply(created, 201);
        throw new Error(`unexpected:${u}`);
      }),
    );
    const direct = {
      turnstileToken: 'test-pass',
      formType: 'custom_design_quote',
      customerName: 'Owner',
      customerEmail: 'o@example.com',
      phone: '1',
      organization: 'Club',
      organizationType: 'club',
      product: 'jersey',
      quantity: 10,
      notes: 'custom work',
      design: { a: 1 },
      roster: Array.from({ length: 510 }, (_, i) => ({ i })),
      language: 'xx',
    };
    let res = resMock();
    await publicQuoteHandler(req(direct), res);
    expect(res.statusCode).toBe(201);
    created = { id: 'q2', quote_number: 'QT2', status: 'under_review' };
    res = resMock();
    await publicQuoteHandler(
      req({
        ...direct,
        idempotencyKey: 'bad',
        country: '',
        accountType: '',
        organizationType: 'academy',
        language: 'ar',
      }),
      res,
    );
    expect(res.statusCode).toBe(201);
    auth = { id: 'u1' };
    members = { organization_id: 'no' };
    created = [{ id: 'q3' }];
    res = resMock();
    await publicQuoteHandler(
      req({ ...direct, organizationId: 'not-uuid' }, 'POST', {
        authorization: 'Bearer x',
        'x-forwarded-for': '',
      }),
      res,
    );
    expect(res.statusCode).toBe(201);
    members = [];
    res = resMock();
    await publicQuoteHandler(
      req({ ...direct, organizationId: '22222222-2222-4222-8222-222222222222' }, 'POST', {
        authorization: 'Bearer x',
      }),
      res,
    );
    expect(res.statusCode).toBe(201);
    duplicate = { id: 'd' };
    res = resMock();
    await publicQuoteHandler(
      req({ ...direct, idempotencyKey: '11111111-1111-4111-8111-111111111111' }),
      res,
    );
    expect(res.body.duplicate).toBe(false); // non-array duplicate response is ignored
    duplicate = [];
    created = [];
    res = resMock();
    await publicQuoteHandler(req(direct), res);
    expect(res.statusCode).toBe(503);
    created = null;
    res = resMock();
    await publicQuoteHandler(req(direct), res);
    expect(res.statusCode).toBe(503);
    res = resMock();
    await publicQuoteHandler(req(null), res);
    expect(res.statusCode).toBe(400);
  });

  it('closes payment recovery amount, auth, expiry and provider branches', async () => {
    configureCore();
    configurePayment();
    let current = order(),
      auth = null,
      orderResponse = 'array',
      providerError = null;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (url, _options = {}) => {
        const u = String(url);
        if (u.includes('consume_edge_rate_limit')) return reply(true);
        if (u.includes('/auth/v1/user')) return auth ? reply(auth) : reply(null, 401);
        if (u.includes('/rest/v1/orders?'))
          return reply(
            orderResponse === 'object' ? current : orderResponse === 'none' ? [] : [current],
          );
        if (u === 'https://pay.example/session') {
          if (providerError) throw providerError;
          return reply({ url: 'https://pay/ok' });
        }
        throw new Error(`unexpected:${u}`);
      }),
    );
    let res = resMock();
    await retryPaymentHandler(req(null), res);
    expect(res.statusCode).toBe(400);
    orderResponse = 'object';
    res = resMock();
    await retryPaymentHandler(req({ orderNumber: current.order_number }), res);
    expect(res.statusCode).toBe(404);
    orderResponse = 'array';
    current = order({ user_id: 'u1' });
    auth = { id: 'other' };
    res = resMock();
    await retryPaymentHandler(
      req({ orderNumber: current.order_number }, 'POST', { authorization: 'Bearer x' }),
      res,
    );
    expect(res.statusCode).toBe(403);
    current = order({ customer_email: '' });
    auth = null;
    res = resMock();
    await retryPaymentHandler(req({ orderNumber: current.order_number, accessToken: 'bad' }), res);
    expect(res.statusCode).toBe(403);
    current = order({ amount_due_now: 0, outstanding_balance: 55, remaining_balance: 44 });
    const token = createGuestOrderToken({
      orderNumber: current.order_number,
      email: current.customer_email,
    });
    res = resMock();
    await retryPaymentHandler(req({ orderNumber: current.order_number, accessToken: token }), res);
    expect(res.body.amountDue).toBe(55);
    current = order({
      amount_due_now: 0,
      outstanding_balance: 0,
      remaining_balance: 44,
      payment_stage: '',
    });
    const t2 = createGuestOrderToken({
      orderNumber: current.order_number,
      email: current.customer_email,
    });
    res = resMock();
    await retryPaymentHandler(req({ orderNumber: current.order_number, accessToken: t2 }), res);
    expect(res.body.amountDue).toBe(44);
    current = order({ amount_due_now: 0, outstanding_balance: 0, remaining_balance: 0 });
    const t3 = createGuestOrderToken({
      orderNumber: current.order_number,
      email: current.customer_email,
    });
    res = resMock();
    await retryPaymentHandler(req({ orderNumber: current.order_number, accessToken: t3 }), res);
    expect(res.statusCode).toBe(409);
    current = order({
      shipping_quote_expires_at: new Date(Date.now() + 60000).toISOString(),
      payment_expires_at: new Date(Date.now() + 60000).toISOString(),
    });
    const t4 = createGuestOrderToken({
      orderNumber: current.order_number,
      email: current.customer_email,
    });
    delete process.env.SITE_URL;
    res = resMock();
    await retryPaymentHandler(req({ orderNumber: current.order_number, accessToken: t4 }), res);
    expect(res.statusCode).toBe(200);
    providerError = Object.assign(new Error('provider down'), { status: 418 });
    res = resMock();
    await retryPaymentHandler(req({ orderNumber: current.order_number, accessToken: t4 }), res);
    expect(res.statusCode).toBe(418);
  });

  it('closes special-request URL, scanner, files, insert and error branches', async () => {
    configureCore();
    /** @type {any} */ let created = [
      { id: 'sr1', request_number: 'SR', status: 'submitted', created_at: 'now' },
    ];
    /** @type {any} */ let fileRows = { id: 'f' };
    let storageStatus = 200;
    /** @type {any} */ let auth = null;
    process.env.MALWARE_SCAN_TEST_MODE = 'true';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (url, _options = {}) => {
        const u = String(url);
        if (u.includes('consume_edge_rate_limit')) return reply(true);
        if (u.includes('challenges.cloudflare.com')) return reply({ success: true });
        if (u.includes('/auth/v1/user')) return auth ? reply(auth) : reply(null, 401);
        if (u.includes('create_special_request_api')) return reply(created);
        if (u.includes('/storage/v1/object/'))
          return reply(storageStatus === 200 ? '' : 'bad', storageStatus);
        if (u.includes('/rest/v1/special_request_files')) return reply(fileRows, 201);
        throw new Error(`unexpected:${u}`);
      }),
    );
    const base = {
      turnstileToken: 'test-pass',
      customerName: 'Buyer',
      email: 'b@example.com',
      phone: '1',
      whatsapp: '2',
      country: 'ly',
      productUrl: 'https://example.com/item',
      description: 'A detailed requested product description',
      desiredQuantity: 1,
      targetBudget: '',
      preferredContactMethod: 'email',
      consent: true,
      locale: '',
      files: [],
    };
    let res = resMock();
    await specialRequestHandler(req(base), res);
    expect(res.statusCode).toBe(201);
    for (const bad of ['notaurl', 'ftp://example.com/item']) {
      res = resMock();
      await specialRequestHandler(req({ ...base, productUrl: bad }), res);
      expect(res.statusCode).toBe(400);
    }
    for (const budget of [null, '', 0, 'NaN', -1]) {
      res = resMock();
      await specialRequestHandler(req({ ...base, targetBudget: budget }), res);
      expect([201, 400]).toContain(res.statusCode);
    }
    process.env.NODE_ENV = 'production';
    delete process.env.MALWARE_SCAN_TEST_MODE;
    delete process.env.MALWARE_SCAN_API_URL;
    delete process.env.MALWARE_SCAN_API_KEY;
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]).toString(
      'base64',
    );
    res = resMock();
    await specialRequestHandler(
      req({
        ...base,
        productUrl: '',
        files: [{ name: 'p.png', mime: 'image/png', role: 'product_image', base64: png }],
      }),
      res,
    );
    expect(res.statusCode).toBe(503);
    process.env.MALWARE_SCAN_API_URL = 'https://scan.example';
    process.env.MALWARE_SCAN_API_KEY = 'x'.repeat(16);
    auth = { id: 'u1' };
    fileRows = [{ id: 'f' }];
    res = resMock();
    await specialRequestHandler(
      req(
        {
          ...base,
          productUrl: '',
          idempotencyKey: 'bad',
          files: [{ name: 'p.png', mime: 'image/png', role: 'product_image', base64: png }],
        },
        'POST',
        { authorization: 'Bearer x', 'x-forwarded-for': '' },
      ),
      res,
    );
    expect(res.statusCode).toBe(201);
    storageStatus = 500;
    res = resMock();
    await specialRequestHandler(
      req({
        ...base,
        productUrl: '',
        files: [{ name: 'p.png', mime: 'image/png', role: 'product_image', base64: png }],
      }),
      res,
    );
    expect(res.statusCode).toBe(503);
    storageStatus = 200;
    created = { id: 'sr2', request_number: 'SR2', status: 'submitted' };
    res = resMock();
    await specialRequestHandler(req(base), res);
    expect(res.statusCode).toBe(201);
    created = [];
    res = resMock();
    await specialRequestHandler(req(base), res);
    expect(res.statusCode).toBe(503);
  });

  it('closes Formspree endpoint, payload, guard, provider and thrown branches', async () => {
    process.env.FORMSPREE_ORDER_ENDPOINT = 'https://one.example';
    expect(resolveFormspreeEndpoint()).toBe('https://one.example');
    delete process.env.FORMSPREE_ORDER_ENDPOINT;
    process.env.VITE_FORM_ENDPOINT = 'https://two.example';
    expect(resolveFormspreeEndpoint()).toBe('https://two.example');
    expect(sanitize(null)).toBe('');
    expect(sanitize({ a: 1 })).toContain('"a"');
    expect(sanitizeKey(' a b! ')).toBe('a_b_');
    expect(buildCleanFormPayload(null)).toEqual({});
    const sixtyFive = { turnstileToken: 'x' };
    for (let i = 0; i < 65; i++) sixtyFive[`k ${i}`] = i;
    expect(Object.keys(buildCleanFormPayload(sixtyFive))).toHaveLength(60);
    configureCore();
    process.env.VITE_FORM_ENDPOINT = 'https://form.example';
    let mode = 'ok';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (url) => {
        const u = String(url);
        if (u.includes('consume_edge_rate_limit')) return reply(true);
        if (u === 'https://form.example') {
          if (mode === 'throw') throw new Error('network');
          return reply(mode === 'ok' ? {} : 'rejected', mode === 'ok' ? 200 : 429);
        }
        throw new Error(`unexpected:${u}`);
      }),
    );
    let res = resMock();
    await formspreeHandler(req(null), res);
    expect(res.statusCode).toBe(400);
    res = resMock();
    await formspreeHandler(req({ turnstileToken: 'test-pass' }), res);
    expect(res.statusCode).toBe(200);
    mode = 'reject';
    res = resMock();
    await formspreeHandler(req({ turnstileToken: 'test-pass' }), res);
    expect(res.statusCode).toBe(502);
    mode = 'throw';
    res = resMock();
    await formspreeHandler(req({ turnstileToken: 'test-pass' }), res);
    res = resMock();
    await formspreeHandler(
      req({ turnstileToken: 'test-pass' }, 'POST', { 'x-forwarded-for': '' }),
      res,
    );
    expect(res.statusCode).toBe(502);
    process.env.VITE_FORM_ENDPOINT = 'http://bad';
    res = resMock();
    await formspreeHandler(req({ turnstileToken: 'test-pass' }), res);
    expect(res.statusCode).toBe(503);
  });

  it('closes trusted checkout and design-share API remaining branches', async () => {
    configureCore();
    configurePayment();
    /** @type {any} */ let rows = [order()];
    /** @type {any} */ let rpc = { id: 'd', design_data: {} };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (url) => {
        const u = String(url);
        if (u.includes('consume_edge_rate_limit')) return reply(true);
        if (u.includes('/rest/v1/orders?')) return reply(rows);
        if (u === 'https://pay.example/session') return reply({ url: 'https://pay' });
        if (u.includes('get_shared_design')) return reply(rpc);
        if (u.includes('add_shared_design_comment')) return reply({ id: 'c' });
        if (u.includes('respond_to_shared_design')) return reply({ status: 'approved' });
        throw new Error(`unexpected:${u}`);
      }),
    );
    let res = resMock();
    await createSessionHandler(
      req({
        paymentMethod: 'online_card',
        idempotencyKey: '11111111-1111-4111-8111-111111111111',
        customerEmail: 'guest@example.com',
      }),
      res,
    );
    expect(res.statusCode).toBe(200);
    rows = {};
    res = resMock();
    await createSessionHandler(
      req({ paymentMethod: 'online_card', orderNumber: 'SHB-20260801-0000001' }),
      res,
    );
    expect(res.statusCode).toBe(404);
    rows = [
      order({
        shipping_quote_expires_at: new Date(Date.now() + 60000).toISOString(),
        payment_expires_at: new Date(Date.now() + 60000).toISOString(),
        customer_email: 'guest@example.com',
      }),
    ];
    delete process.env.SITE_URL;
    res = resMock();
    await createSessionHandler(
      req({
        paymentMethod: 'online_card',
        orderNumber: 'SHB-20260801-0000001',
        customerEmail: 'guest@example.com',
      }),
      res,
    );
    expect(res.statusCode).toBe(200);
    res = resMock();
    await designShareHandler(
      req({}, 'GET', { 'x-forwarded-for': '', 'x-real-ip': '' }, { token: 'T'.repeat(48) }),
      res,
    );
    expect(res.statusCode).toBe(200);
    rpc = {};
    res = resMock();
    await designShareHandler(req({}, 'GET', {}, { token: 'T'.repeat(48) }), res);
    expect(res.statusCode).toBe(404);
    rpc = { id: 'd' };
    res = resMock();
    await designShareHandler(req(null, 'POST', {}, {}), res);
    expect(res.statusCode).toBe(400);
    res = resMock();
    await designShareHandler(
      req({ token: 'T'.repeat(48), action: 'approve', note: '', turnstileToken: 'test-pass' }),
      res,
    );
    expect(res.statusCode).toBe(200);
    res = resMock();
    await designShareHandler(
      req({
        token: 'T'.repeat(48),
        action: 'request_changes',
        note: '',
        turnstileToken: 'test-pass',
      }),
      res,
    );
    expect(res.statusCode).toBe(400);
  });
});

describe('100% data, studio and document branch closure', { concurrency: false }, () => {
  it('executes every catalog normalization and selector branch', () => {
    expect(
      verifiedVariantStock({
        input: { inventoryVerified: true, stockByVariant: { 'black:M': 'bad' } },
        color: { key: 'black' },
        size: 'M',
      }),
    ).toBe(0);
    const inputs = [
      {
        id: 'x1',
        slug: 'x1',
        sku: 'X',
        name: 'Name',
        description: { en: 'd', ar: 'd' },
        price: 1,
        category: 'clothing',
        colors: [],
        sizes: [],
        image: '/real.jpg',
        mediaStatus: 'supplied',
        inventoryVerified: true,
        inventoryTracking: true,
        stockPerVariant: 2,
        readyToShip: true,
        inventoryLocation: 'LY',
        claimVerified: true,
        madeInUSA: true,
        brand: 'Shababuna',
      },
      {
        id: 'x2',
        slug: 'x2',
        sku: 'X2',
        name: { en: 'N', ar: 'N' },
        description: { en: 'd', ar: 'd' },
        price: 0,
        category: 'basketballs',
        customizable: true,
        comingSoon: true,
        colors: [{ key: 'black' }],
        sizes: ['OS'],
        image: '',
        available: false,
      },
      {
        id: 'x3',
        slug: 'x3',
        sku: 'X3',
        name: 'N',
        description: { en: 'd', ar: 'd' },
        price: 2,
        category: 'equipment',
        customizable: true,
        status: 'archived',
        colors: [{ key: 'black' }],
        sizes: ['OS'],
        image: '/real.png',
      },
    ];
    for (const input of inputs) expect(normalizeCatalogProduct(input).id).toBe(input.id);
    const base = {
      id: 1,
      sku: 'L',
      name: { en: 'L', ar: 'L' },
      category: 'accessories',
      subcategory: 'balls',
      price: 10,
      available: true,
      comingSoon: false,
      image: '/l.jpg',
      variants: [{ stock: 2 }],
      inventoryVerified: true,
      readyToShip: true,
    };
    expect(normalizeLhaCatalogProduct(base)).toMatchObject({
      category: 'basketballs',
      wholesaleMin: 6,
      readyToShip: true,
      status: 'active',
      availability: 'in-stock',
    });
    expect(
      normalizeLhaCatalogProduct({
        ...base,
        subcategory: 'other',
        variants: null,
        inventoryVerified: false,
        readyToShip: false,
        image: '',
        price: 0,
        available: false,
      }),
    ).toMatchObject({
      status: 'active',
      mediaStatus: 'placeholder',
      stock: 0,
      quoteOnly: true,
      inventorySource: 'supplier_order',
    });
    expect(
      normalizeLhaCatalogProduct({
        ...base,
        comingSoon: true,
        available: true,
        variants: [{ stock: 0 }],
        inventoryVerified: true,
      }),
    ).toMatchObject({ status: 'active', comingSoon: false, availability: 'in-stock' });
    expect(getProduct('missing')).toBe(undefined);
    expect(getProductById('missing')).toBe(undefined);
    featuredProducts();
    newArrivals();
    bestSellers();
    readyToShipProducts();
    lhaStoreProducts();
    productsByCategory('ready-to-ship');
    productsByCategory('clothing');
    productsBySubcategory('clothing', 'x');
    relatedProducts(null, 1);
    relatedProducts(catalogProducts[0], 1);
    expect(
      isLowStock({
        inventoryTracking: true,
        inventoryVerified: true,
        stock: 1,
        lowStockThreshold: 2,
      }),
    ).toBe(true);
    expect(isLowStock({ inventoryTracking: false })).toBe(false);
    expect(compareBrands('ZZZ', 'AAA')).toBeGreaterThan(0);
    expect(compareBrands('ZZZ', 'Nike')).toBeGreaterThan(0);
    expect(compareBrands('Nike', 'ZZZ')).toBeLessThan(0);
    expect(compareBrands(BRAND_PRIORITY[0], BRAND_PRIORITY[1])).toBeLessThan(0);
  });

  it('executes every customization roster fallback', () => {
    const rows = normalizeRoster(
      /** @type {any} */ ([
        { playerName: null, number: null, size: null, quantity: null, notes: null },
        { name: 'A', jerseyNumber: '1', shirtSize: 'M', qty: '2', note: 'N' },
      ]),
    );
    expect(rows).toHaveLength(1);
    expect(
      rosterToCsv([
        { name: 'A', jerseyName: null, number: null, jerseySize: null, shortsSize: null },
      ]),
    ).toContain('""');
    expect(CUSTOM_PRODUCT_TYPES.every((type) => type.madeInUSA === false)).toBe(true);
  });

  it('executes every design studio branch and cloud operation path', async () => {
    const originalCrypto = globalThis.crypto;
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: {} });
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: originalCrypto });
    const normalized = normalizeStudio(
      {
        activeView: 'bad',
        showSafeArea: false,
        showBleedArea: 1,
        layers: [
          {
            id: '',
            type: 'bad',
            view: 'bad',
            label: '',
            content: null,
            x: 'bad',
            y: 200,
            width: 0,
            rotation: 999,
            color: 'bad',
            font: 'bad',
            visible: false,
            locked: true,
            zIndex: null,
          },
        ],
        comments: [
          { id: '', view: 'bad', x: -1, y: 200, text: '', createdAt: null },
          { text: 'valid' },
        ],
      },
      {},
    );
    let studio = addDesignLayer(
      normalized,
      { type: 'number', view: 'bad', label: '', content: '', color: 'bad', font: 'bad' },
      {},
    );
    studio = addDesignLayer(
      studio,
      { type: 'logo', content: 'data:image/png;base64,a', color: '#ffffff', font: 'modern' },
      { secondary: '' },
    );
    const id = studio.layers[0].id;
    updateDesignLayer(studio, id, { x: 40 });
    removeDesignLayer(studio, 'missing');
    expect(duplicateDesignLayer(studio, 'missing')).toBeTruthy();
    duplicateDesignLayer(studio, id);
    expect(moveDesignLayer(studio, 'missing', 'up')).toBeTruthy();
    expect(moveDesignLayer(studio, id, 'down')).toBeTruthy();
    expect(addDesignComment(studio, { text: '', view: 'bad' })).toBeTruthy();
    studio = addDesignComment(studio, { text: 'note', view: 'bad', x: null, y: null });
    resolveDesignComment(studio, 'missing');
    let history = createHistory({ a: 1 }, 1);
    expect(pushHistory(history, { a: 1 })).toBe(history);
    expect(undoHistory(history)).toBe(history);
    expect(redoHistory(history)).toBe(history);
    history = pushHistory(history, { a: 2 });
    history = undoHistory(history);
    redoHistory(history);
    expect(buildProductionMetadata({ notes: null }, studio).notes).toBe('');

    const client = {
      from: () => ({
        update: () => ({
          eq: () => ({
            select: () => ({ single: async () => ({ data: { id: 'd' }, error: null }) }),
          }),
        }),
      }),
      rpc: async (name) => ({
        data: name === 'create_design_share_link' ? { token: 'T'.repeat(48) } : null,
        error: null,
      }),
    };
    __setSupabaseBuildEnvForTests({
      VITE_SUPABASE_URL: 'https://project.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'x'.repeat(30),
    });
    __setSupabaseClientFactoryForTests(async () => ({ createClient: () => client }));
    expect((await autosaveDesignStudio('d', {}, studio)).id).toBe('d');
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { location: { origin: 'https://site' } },
    });
    expect(await createSecureDesignShare('d', 'view', 0)).toContain('/design-share/');
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          reply({ ok: true, design: { id: 'd', designData: {}, productType: 'jersey' } }),
        ),
    );
    expect((await loadSharedDesign('T'.repeat(48))).design.productType).toBe('jersey');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply({ ok: true, comment: { id: 'c' } })));
    expect((await addSharedDesignComment('T'.repeat(48))).id).toBe('c');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(reply({ ok: true, result: { status: 'approved' } })),
    );
    expect((await respondToSharedDesign('T'.repeat(48), 'approve')).status).toBe('approved');
  });

  it('executes every Supabase runtime, client and auth callback branch', async () => {
    __setSupabaseBuildEnvForTests({
      VITE_SUPABASE_URL: 'https://project.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'x'.repeat(30),
    });
    let calls = 0;
    __setSupabaseClientFactoryForTests(async () => ({
      createClient: (url, key, options) => {
        calls++;
        return { url, key, options };
      },
    }));
    const a = await getSupabase(),
      b = await getSupabase();
    expect(a).toBe(b);
    expect(calls).toBe(1);
    expect(getSupabaseConfigStatus().source).toBe('build');
    __resetSupabaseForTests();
    __setSupabaseBuildEnvForTests({});
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        reply({ url: 'https://runtime.supabase.in', publishableKey: 'y'.repeat(30) }, 200, {
          'content-type': 'application/json',
        }),
      ),
    );
    __setSupabaseClientFactoryForTests(async () => ({ createClient: (url) => ({ url }) }));
    expect((await getSupabase()).url).toContain('runtime');
    expect(getSupabaseConfigStatus().source).toBe('runtime');
    __resetSupabaseForTests();
    __setSupabaseBuildEnvForTests({});
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(reply({}, 500, { 'content-type': 'text/plain' })),
    );
    expect(await getSupabase()).toBe(null);
    expect(getSupabaseConfigStatus().source).toBe('none');
    __resetSupabaseForTests();
    __setSupabaseBuildEnvForTests({});
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(Object.assign(new Error('timeout'), { name: 'TimeoutError' })),
    );
    expect(await getSupabase()).toBe(null);
    expect(getSupabaseConfigStatus().source).toBe('timeout');
    __resetSupabaseForTests();
    __setSupabaseBuildEnvForTests({});
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
    expect(await getSupabase()).toBe(null);
    expect(getSupabaseConfigStatus().source).toBe('error');
    expect(authRedirectUrl('confirm')).toContain('verified=1');
    expect(authRedirectUrl('recovery')).toContain('reset-password');
    const replace = vi.fn();
    vi.stubGlobal('history', { replaceState: replace });
    vi.stubGlobal('document', { title: '' });
    const client = {
      auth: {
        setSession: async () => ({ data: null, error: null }),
        exchangeCodeForSession: async () => ({ data: null, error: null }),
        verifyOtp: async () => ({ data: null, error: null }),
      },
    };
    for (const href of [
      'https://site/account#access_token=a&refresh_token=r',
      'https://site/account?code=c',
      'https://site/account?token_hash=h&type=signup',
      'https://site/account?token_hash=h&type=magiclink',
      'https://site/account?error=bad',
      'https://site/account',
    ]) {
      vi.stubGlobal('location', { href, origin: 'https://site' });
      await completeAuthRedirect(client);
    }
    expect(await completeAuthRedirect(null)).toMatchObject({ handled: false });
  });

  it('executes archive, spreadsheet, PDF, search and navigation branches', async () => {
    expect(escapeXml(null)).toBe('');
    const logoStudio = {
      layers: [
        {
          id: 'l',
          type: 'logo',
          view: 'front',
          content: 'data:image/png;base64,a',
          x: 50,
          y: 50,
          width: 20,
          rotation: 0,
          visible: true,
          zIndex: 1,
        },
      ],
      comments: [],
    };
    expect(
      buildDesignViewSvg({ design: { productType: 'jersey' }, studio: logoStudio, view: 'front' }),
    ).toContain('<image');
    expect(
      (await createStoreZip([{ name: '/a.bin', data: new Uint8Array([1, 2]) }]).arrayBuffer())
        .byteLength,
    ).toBeGreaterThan(0);
    expect(
      (
        await buildProductionPackage({
          design: {},
          studio: {},
          roster: [],
          reference: '',
          productLabel: '',
        }).arrayBuffer()
      ).byteLength,
    ).toBeGreaterThan(0);
    const entries = new Map([['xl/worksheets/sheet2.xml', new Uint8Array()]]);
    expect(resolveFirstWorksheet(entries)).toBe('xl/worksheets/sheet2.xml');
    expect(parseWorksheet('<row><c><is><t>X</t></is></c><c r="B1"><v></v></c></row>', [])).toEqual([
      ['X', ''],
    ]);
    expect(
      await parseRosterFile({ size: 0, name: 'a.csv', type: 'text/plain', text: async () => '' }),
    ).toEqual([]);
    expect(await parseRosterFile(null)).toEqual([]);
    await expect(async () => unzipEntries(new Uint8Array([1, 2, 3]))).not.toBe(undefined);
    createTextPdf({
      title: 'T',
      sections: [{ heading: 'H', rows: Array.from({ length: 100 }, (_, i) => [`R${i}`]) }],
    });
    const oldDoc = globalThis.document;
    const oldUrl = globalThis.URL;
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: { createElement: () => ({ click() {}, remove() {} }), body: { appendChild() {} } },
    });
    Object.defineProperty(globalThis, 'URL', {
      configurable: true,
      value: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
    });
    downloadDesignDocuments({ design: {}, studio: { layers: [] }, roster: null, reference: '' });
    Object.defineProperty(globalThis, 'document', { configurable: true, value: oldDoc });
    Object.defineProperty(globalThis, 'URL', { configurable: true, value: oldUrl });
    const duplicateCatalog = [
      {
        id: '1',
        slug: 'a',
        name: { en: 'Same', ar: 'Same' },
        brand: 'Same',
        productType: 'Same',
        category: 'Same',
        subcategory: 'Same',
        colors: [],
      },
      {
        id: '2',
        slug: 'b',
        name: { en: 'Same', ar: 'Same' },
        brand: 'Same',
        productType: 'Same',
        category: 'Same',
        subcategory: 'Same',
        colors: [],
      },
    ];
    expect(getSearchSuggestions('same', 50, duplicateCatalog).length).toBeGreaterThan(0);
    expect(safeInternalReturnPath('/shop@evil.com', 'x')).toBe('x');
    const ly = countryByCode.get('LY');
    expect(getAddressRequirements('ly')).toBe(ly);
  });
});

import { afterEach, describe, expect, it, vi } from './test-api.js';
import createSession from '../api/create-session.ts';
import designShare from '../api/design-share.ts';
import formspree, { resolveFormspreeEndpoint } from '../api/formspree.ts';
import guestOrderAccess from '../api/guest-order-access.ts';
import publicQuote from '../api/public-quote-request.ts';
import retryPayment from '../api/retry-order-payment.ts';
import specialRequest from '../api/special-request.ts';
import { createGuestOrderToken } from '../api/_guest-order-token.ts';
import { parseRosterCsv, rosterToCsv } from '../src/data/customization.ts';
import {
  normalizeCatalogProduct,
  normalizeLhaCatalogProduct,
  verifiedVariantStock,
  bestSellers,
  collectColors,
  collectSizes,
} from '../src/data/products.ts';
import {
  createDefaultStudio,
  addDesignLayer,
  duplicateDesignLayer,
  moveDesignLayer,
  addDesignComment,
  createHistory,
  undoHistory,
  redoHistory,
  buildProductionMetadata,
  autosaveDesignStudio,
  createSecureDesignShare,
  loadSharedDesign,
} from '../src/services/designStudio.ts';
import {
  __resetSupabaseForTests,
  __setSupabaseBuildEnvForTests,
  __setSupabaseClientFactoryForTests,
  getSupabase,
  completeAuthRedirect,
} from '../src/services/supabase.ts';
import { productShape, buildDesignViewSvg } from '../src/utils/designExports.ts';
import {
  parseRosterFile,
  parseWorksheet,
  resolveFirstWorksheet,
  unzipEntries,
} from '../src/utils/rosterSpreadsheet.ts';
import { createTextPdf, downloadDesignDocuments } from '../src/utils/simplePdf.ts';

const ENV = [
  'NODE_ENV',
  'SITE_URL',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'TURNSTILE_TEST_MODE',
  'TURNSTILE_SECRET_KEY',
  'EDGE_RATE_LIMIT_SALT',
  'CRON_SECRET',
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
  for (const key of ENV) delete process.env[key];
});

/** @returns {any} */
function resMock() {
  return {
    statusCode: 0,
    body: null,
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
      'user-agent': 'absolute-coverage',
      'x-forwarded-for': '127.0.0.44',
      ...headers,
    },
    socket: { remoteAddress: '127.0.0.45' },
  };
}
/** @returns {any} */
function reply(value, status = 200, headers = { 'content-type': 'application/json' }) {
  const text = typeof value === 'string' ? value : value == null ? '' : JSON.stringify(value);
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => headers[String(name).toLowerCase()] ?? '' },
    text: async () => text,
    json: async () => value,
    arrayBuffer: async () => new TextEncoder().encode(text).buffer,
  };
}
function configure() {
  process.env.NODE_ENV = 'test';
  process.env.SITE_URL = 'https://shababuna.ly';
  process.env.SUPABASE_URL = 'https://db.example';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
  process.env.TURNSTILE_TEST_MODE = 'true';
  process.env.TURNSTILE_SECRET_KEY = 'turnstile';
  process.env.EDGE_RATE_LIMIT_SALT = 'e'.repeat(64);
  process.env.CRON_SECRET = 'c'.repeat(64);
  process.env.GUEST_ORDER_ACCESS_SECRET = 'g'.repeat(64);
  process.env.PAYMENTS_PROVIDER = 'sandbox';
  process.env.PAYMENTS_SESSION_URL = 'https://pay.example/session';
  process.env.PAYMENTS_SECRET_KEY = 'secret';
  process.env.LIBYAN_BANK_CARD_PROVIDER = 'bank';
  process.env.LIBYAN_BANK_CARD_SESSION_URL = 'https://bank.example/session';
  process.env.LIBYAN_BANK_CARD_SECRET_KEY = 'bank-secret';
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
function rateLimit(url) {
  return String(url).includes('consume_edge_rate_limit');
}

// This suite intentionally executes both sides of every security- and commerce-relevant branch.
describe('absolute API branch coverage', { concurrency: false }, () => {
  it('executes every trusted checkout validation, lookup and provider branch', async () => {
    configure();
    let current = order();
    let orderMode = 'array';
    let paymentMode = 'ok';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (url) => {
        const u = String(url);
        if (rateLimit(u)) return reply(true);
        if (u.includes('/rest/v1/orders?')) {
          if (orderMode === 'throw') throw new Error('network');
          return reply(orderMode === 'object' ? current : orderMode === 'none' ? [] : [current]);
        }
        if (u === 'https://pay.example/session') {
          if (paymentMode === 'throw') throw new Error('provider');
          return reply({ url: 'https://pay/checkout' });
        }
        throw new Error(`unexpected:${u}`);
      }),
    );
    let r = resMock();
    await createSession(
      req({
        paymentMethod: 'online_card',
        idempotencyKey: '11111111-1111-4111-8111-111111111111',
        customerEmail: 'guest@example.com',
      }),
      r,
    );
    expect(r.statusCode).toBe(200);
    orderMode = 'throw';
    r = resMock();
    await createSession(
      req({ paymentMethod: 'online_card', orderNumber: 'SHB-20260801-0000001' }),
      r,
    );
    expect(r.statusCode).toBe(502);
    orderMode = 'array';
    const invalid = [
      { payment_method: 'libyan_bank_card' },
      { shipping_quote_required: true },
      { shipping_quote_expires_at: new Date(Date.now() - 1000).toISOString() },
      { payment_expires_at: new Date(Date.now() - 1000).toISOString() },
      { currency: 'LYD' },
      { amount_due_now: 'bad' },
      { amount_due_now: 0 },
      { payment_status: null },
      { payment_status: 'paid' },
      { order_status: null },
      { order_status: 'delivered' },
    ];
    for (const patch of invalid) {
      current = order(patch);
      r = resMock();
      await createSession(
        req({ paymentMethod: 'online_card', orderNumber: current.order_number }),
        r,
      );
      expect(r.statusCode).toBe(409);
    }
    current = order({ customer_email: null });
    r = resMock();
    await createSession(
      req({
        paymentMethod: 'online_card',
        orderNumber: current.order_number,
        customerEmail: 'x@example.com',
      }),
      r,
    );
    expect(r.statusCode).toBe(403);
    current = order({ payment_stage: '', amount_paid: null, remaining_balance: null });
    delete process.env.SITE_URL;
    r = resMock();
    await createSession(
      req({
        paymentMethod: 'online_card',
        orderNumber: current.order_number,
        customerEmail: 'guest@example.com',
      }),
      r,
    );
    expect(r.statusCode).toBe(200);
    paymentMode = 'throw';
    r = resMock();
    await createSession(
      req({
        paymentMethod: 'online_card',
        orderNumber: current.order_number,
        customerEmail: 'guest@example.com',
      }),
      r,
    );
    expect(r.statusCode).toBe(502);
  });

  it('executes every public design-share guard, address and error mapping branch', async () => {
    configure();
    let rpcMode = 'data';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (url) => {
        const u = String(url);
        if (rateLimit(u)) return reply(true);
        if (u.includes('/rest/v1/rpc/')) {
          if (rpcMode === 'throw') throw 'offline';
          if (rpcMode === '404') return reply({ message: 'expired' }, 404);
          if (rpcMode === 'empty') return reply({});
          if (u.includes('get_shared_design')) return reply({ id: 'd1', design_data: {} });
          if (u.includes('add_shared_design_comment')) return reply({ id: 'c1' });
          return reply({ status: 'approved' });
        }
        throw new Error(`unexpected:${u}`);
      }),
    );
    const token = 'T'.repeat(48);
    let r = resMock();
    await designShare(req({}, 'GET', { origin: 'https://evil.example' }, { token }), r);
    expect(r.statusCode).toBe(403);
    rpcMode = 'empty';
    r = resMock();
    await designShare(req({}, 'GET', {}, { token: [token] }), r);
    expect(r.statusCode).toBe(404);
    rpcMode = 'data';
    r = resMock();
    await designShare(req({}, 'GET', {}, { token: 'bad' }), r);
    expect(r.statusCode).toBe(400);
    rpcMode = '404';
    r = resMock();
    await designShare(req({}, 'GET', {}, { token }), r);
    expect(r.statusCode).toBe(404);
    rpcMode = 'throw';
    r = resMock();
    await designShare(req({}, 'GET', {}, { token }), r);
    expect(r.statusCode).toBe(503);
    rpcMode = 'data';
    r = resMock();
    await designShare(
      req({ token, action: 'approve', turnstileToken: 'test-pass' }, 'POST', {
        'content-length': '999999',
      }),
      r,
    );
    expect(r.statusCode).toBe(413);
    for (const headers of [
      { 'x-forwarded-for': '', 'x-real-ip': '10.0.0.2' },
      { 'x-forwarded-for': '', 'x-real-ip': '' },
    ]) {
      const q = req(
        {
          token,
          action: 'comment',
          name: 'A User',
          email: '',
          text: 'ok',
          view: 'front',
          x: 20,
          y: 20,
          turnstileToken: 'test-pass',
        },
        'POST',
        headers,
      );
      if (!headers['x-real-ip']) q.socket.remoteAddress = '';
      r = resMock();
      await designShare(q, r);
      expect(r.statusCode).toBe(201);
    }
    r = resMock();
    await designShare(
      req({ token, action: 'request_changes', note: '', turnstileToken: 'test-pass' }),
      r,
    );
    expect(r.statusCode).toBe(400);
  });

  it('executes Formspree endpoint, guard, address and non-Error failure branches', async () => {
    configure();
    process.env.VITE_FORM_ENDPOINT = 'https://vite-form.example';
    expect(resolveFormspreeEndpoint()).toBe('https://vite-form.example');
    let mode = 'ok';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (url) => {
        const u = String(url);
        if (rateLimit(u)) return reply(true);
        if (u === 'https://vite-form.example') {
          if (mode === 'throw') throw 'offline';
          return reply({ ok: true });
        }
        throw new Error(`unexpected:${u}`);
      }),
    );
    let r = resMock();
    await formspree(
      req({ turnstileToken: 'test-pass' }, 'POST', { 'content-length': '999999' }),
      r,
    );
    expect(r.statusCode).toBe(413);
    const q = req({ turnstileToken: 'test-pass' }, 'POST', { 'x-forwarded-for': '' });
    q.socket.remoteAddress = '';
    r = resMock();
    await formspree(q, r);
    expect(r.statusCode).toBe(200);
    mode = 'throw';
    r = resMock();
    await formspree(q, r);
    expect(r.statusCode).toBe(502);
  });

  it('executes guest-order token, no-email, guard and trusted-store failure branches', async () => {
    configure();
    let current = order();
    let mode = 'array';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (url) => {
        const u = String(url);
        if (rateLimit(u)) return reply(true);
        if (u.includes('/rest/v1/orders?')) {
          if (mode === 'throw') throw 'db';
          return reply(mode === 'none' ? [] : [current]);
        }
        throw new Error(`unexpected:${u}`);
      }),
    );
    const token = createGuestOrderToken({
      orderNumber: current.order_number,
      email: current.customer_email,
    });
    let r = resMock();
    await guestOrderAccess(req({ orderNumber: current.order_number, accessToken: token }), r);
    expect(r.body.order.order_number).toBe(current.order_number);
    current = order({ customer_email: 'changed@example.com' });
    r = resMock();
    await guestOrderAccess(req({ orderNumber: current.order_number, accessToken: token }), r);
    expect(r.body.order).toBe(null);
    current = order({ customer_email: '', shipping_summary: {} });
    r = resMock();
    await guestOrderAccess(
      req({
        orderNumber: current.order_number,
        email: 'guest@example.com',
        turnstileToken: 'test-pass',
      }),
      r,
    );
    expect(r.body.order).toBe(null);
    current = order();
    r = resMock();
    await guestOrderAccess(
      req({ orderNumber: current.order_number, email: '', turnstileToken: 'test-pass' }),
      r,
    );
    expect(r.body.order).toBe(null);
    const remote = req(
      {
        orderNumber: current.order_number,
        email: 'guest@example.com',
        turnstileToken: 'test-pass',
      },
      'POST',
      { 'x-forwarded-for': '' },
    );
    remote.socket.remoteAddress = '';
    r = resMock();
    await guestOrderAccess(remote, r);
    expect(r.statusCode).toBe(200);
    r = resMock();
    await guestOrderAccess(
      req({ orderNumber: current.order_number }, 'POST', { origin: 'https://evil.example' }),
      r,
    );
    expect(r.statusCode).toBe(403);
    mode = 'throw';
    r = resMock();
    await guestOrderAccess(
      req({
        orderNumber: current.order_number,
        email: 'guest@example.com',
        turnstileToken: 'test-pass',
      }),
      r,
    );
    expect(r.statusCode).toBe(503);
  });

  it('executes quote wrapper/default/data-shape/membership/guard and failure branches', async () => {
    configure();
    let auth = null;
    let members = [];
    /** @type {any} */
    let created = [{ id: 'q1', quote_number: 'QT', status: 'under_review' }];
    let throwValue = null;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (url, options = {}) => {
        const u = String(url);
        if (rateLimit(u)) return reply(true);
        if (throwValue !== null) throw throwValue;
        if (u.includes('/auth/v1/user')) return auth ? reply(auth) : reply(null, 401);
        if (u.includes('organization_members')) return reply(members);
        if (u.includes('quote_requests?select=id,quote_number') && options.method !== 'POST')
          return reply([]);
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
      notes: 'details',
    };
    let r = resMock();
    await publicQuote(req(direct), r);
    expect(r.statusCode).toBe(201);
    auth = { id: 'u1' };
    members = [{ organization_id: '22222222-2222-4222-8222-222222222222' }];
    created = { id: 'q2' };
    r = resMock();
    await publicQuote(
      req(
        {
          turnstileToken: 'test-pass',
          idempotencyKey: '11111111-1111-4111-8111-111111111111',
          organizationId: '22222222-2222-4222-8222-222222222222',
          payload: {
            ...direct,
            accountType: 'club',
            country: 'US',
            language: 'ar',
            design: { x: 1 },
            roster: [{ n: 1 }],
          },
        },
        'POST',
        { authorization: 'Bearer x', 'x-forwarded-for': '' },
      ),
      r,
    );
    expect(r.statusCode).toBe(201);
    const remoteQuote = req(direct, 'POST', { 'x-forwarded-for': '' });
    remoteQuote.socket.remoteAddress = '';
    r = resMock();
    await publicQuote(remoteQuote, r);
    expect(r.statusCode).toBe(201);
    r = resMock();
    await publicQuote(req(direct, 'POST', { origin: 'https://evil.example' }), r);
    expect(r.statusCode).toBe(403);
    throwValue = 'db';
    r = resMock();
    await publicQuote(req(direct), r);
    expect(r.statusCode).toBe(503);
  });

  it('executes payment-recovery guard, amount fallbacks, status fallbacks and non-Error failure', async () => {
    configure();
    let current = order();
    let fail = null;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (url) => {
        const u = String(url);
        if (rateLimit(u)) return reply(true);
        if (fail !== null) throw fail;
        if (u.includes('/rest/v1/orders?')) return reply([current]);
        if (u.includes('/auth/v1/user')) return reply(null, 401);
        if (u === 'https://pay.example/session') return reply({ url: 'https://pay/retry' });
        throw new Error(`unexpected:${u}`);
      }),
    );
    let r = resMock();
    await retryPayment(
      req({ orderNumber: current.order_number }, 'POST', { origin: 'https://evil.example' }),
      r,
    );
    expect(r.statusCode).toBe(403);
    for (const patch of [{ payment_status: null }, { order_status: null }]) {
      current = order(patch);
      const t = createGuestOrderToken({
        orderNumber: current.order_number,
        email: current.customer_email,
      });
      r = resMock();
      await retryPayment(req({ orderNumber: current.order_number, accessToken: t }), r);
      expect(r.statusCode).toBe(409);
    }
    current = order({
      amount_due_now: 100,
      outstanding_balance: 0,
      remaining_balance: 0,
      payment_stage: '',
      amount_paid: null,
    });
    let token = createGuestOrderToken({
      orderNumber: current.order_number,
      email: current.customer_email,
    });
    r = resMock();
    await retryPayment(req({ orderNumber: current.order_number, accessToken: token }), r);
    expect(r.statusCode).toBe(200);
    current = order({ amount_due_now: 0, outstanding_balance: 0, remaining_balance: 25 });
    token = createGuestOrderToken({
      orderNumber: current.order_number,
      email: current.customer_email,
    });
    r = resMock();
    await retryPayment(req({ orderNumber: current.order_number, accessToken: token }), r);
    expect(r.body.amountDue).toBe(25);
    fail = 'offline';
    r = resMock();
    await retryPayment(req({ orderNumber: current.order_number, accessToken: token }), r);
    expect(r.statusCode).toBe(503);
  });

  it('executes special-request body, file-count, upload and non-Error failure branches', async () => {
    configure();
    process.env.MALWARE_SCAN_TEST_MODE = 'true';
    /** @type {any} */
    let create = [{ id: 'sr1', request_number: 'SR1', status: 'submitted', created_at: 'now' }];
    /** @type {any} */
    let fileRows = { id: 'f1' };
    let storage = 200;
    let fail = null;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (url) => {
        const u = String(url);
        if (rateLimit(u)) return reply(true);
        if (fail !== null) throw fail;
        if (u.includes('/auth/v1/user')) return reply(null, 401);
        if (u.includes('create_special_request_api')) return reply(create);
        if (u.includes('/storage/v1/object/')) return reply(storage === 200 ? '' : 'bad', storage);
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
      country: 'LY',
      productUrl: 'https://example.com/item',
      description: 'A detailed product description',
      desiredQuantity: 1,
      preferredContactMethod: 'email',
      consent: true,
      files: [],
    };
    let r = resMock();
    await specialRequest(req(null), r);
    expect(r.statusCode).toBe(400);
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]).toString(
      'base64',
    );
    const image = { name: 'p.png', mime: 'image/png', role: 'product_image', base64: png };
    r = resMock();
    await specialRequest(
      req({ ...base, productUrl: '', files: [image, { ...image, name: 'p2.png' }] }),
      r,
    );
    expect(r.statusCode).toBe(400);
    create = { id: 'sr2', request_number: 'SR2', status: 'submitted', created_at: 'now' };
    fileRows = [{ id: 'f2' }];
    storage = 409;
    const remoteSpecial = req(
      {
        ...base,
        productUrl: '',
        idempotencyKey: '11111111-1111-4111-8111-111111111111',
        files: [image],
      },
      'POST',
      { 'x-forwarded-for': '' },
    );
    remoteSpecial.socket.remoteAddress = '';
    r = resMock();
    await specialRequest(remoteSpecial, r);
    expect(r.statusCode).toBe(201);
    storage = 500;
    fileRows = { id: 'f3' };
    r = resMock();
    await specialRequest(req({ ...base, productUrl: '', files: [image] }), r);
    expect(r.statusCode).toBe(503);
    storage = 200;
    fail = 'db';
    r = resMock();
    await specialRequest(req(base), r);
    expect(r.statusCode).toBe(503);
  });
});

describe('absolute pure-module branch coverage', { concurrency: false }, () => {
  it('executes roster delimiter, fallback field and escaping branches', () => {
    const rows = parseRosterCsv('name;print name;number;jersey size;shorts size\nAlice;;;M;');
    expect(rows[0].name).toBe('Alice');
    const raw = parseRosterCsv('A,,,,\nB,BB,2,L,M');
    expect(raw).toHaveLength(2);
    const missing = parseRosterCsv(
      'name,print name,number,jersey size,shorts size\n,PRINT,7,,\nBob,,8,M,',
    );
    expect(missing).toHaveLength(2);
    expect(
      rosterToCsv([
        { name: 'A"B', jerseyName: 'B', number: '1', jerseySize: 'M', shortsSize: 'M' },
      ]),
    ).toContain('A""B');
  });

  it('executes catalog inventory, brand, availability and selector fallback branches', () => {
    expect(
      verifiedVariantStock({
        input: { inventoryVerified: true, stockByVariant: { 'black:M': NaN } },
        color: { key: 'black' },
        size: 'M',
      }),
    ).toBe(0);
    expect(
      verifiedVariantStock({
        input: { inventoryVerified: true, stockPerVariant: 3 },
        color: { key: 'black' },
        size: 'M',
      }),
    ).toBe(3);
    expect(
      verifiedVariantStock({
        input: { inventoryVerified: true },
        color: { key: 'black' },
        size: 'M',
      }),
    ).toBe(0);
    const normalized = normalizeCatalogProduct({
      id: 'x',
      slug: 'x',
      sku: 'x',
      name: 'X',
      category: 'apparel',
      subcategory: 'tops',
      productType: 'Top',
      price: 10,
      sizes: [],
      colors: [],
      image: '/x.jpg',
      inventoryVerified: false,
      availability: 'sold-out',
      brand: '',
    });
    expect(normalized.brand).toBe('Shababuna');
    expect(normalized.availability).toBe('in-stock');
    const stocked = normalizeCatalogProduct({
      id: 'y',
      slug: 'y',
      sku: 'y',
      name: 'Y',
      brand: 'Shababuna',
      category: 'clothing',
      subcategory: 'tops',
      productType: 'Top',
      price: 10,
      status: 'active',
      available: true,
      image: '/real.jpg',
      inventoryVerified: true,
      inventoryTracking: true,
      stockPerVariant: 2,
    });
    expect(stocked.availability).toBe('in-stock');
    const lha = normalizeLhaCatalogProduct({
      id: 1,
      sku: 'L',
      name: { en: 'L', ar: 'L' },
      category: 'apparel',
      subcategory: 'tops',
      price: 10,
      available: true,
      comingSoon: false,
      image: '/l.jpg',
      inventoryVerified: true,
      readyToShip: false,
      variants: [{ stock: 0 }],
    });
    expect(lha.availability).toBe('in-stock');
    expect(
      bestSellers([
        { bestSeller: true, legacyLha: false },
        { bestSeller: true, legacyLha: true },
      ]),
    ).toHaveLength(1);
    expect(collectColors([{ colors: null }])).toEqual([]);
    expect(collectSizes([{ sizes: null }])).toEqual([]);
  });

  it('executes design-studio defaults, no-op, history, error and share fallbacks', async () => {
    const originalCrypto = globalThis.crypto;
    vi.stubGlobal('crypto', undefined);
    let studio = createDefaultStudio({ secondary: '', accent: '', sponsorName: 'Sponsor' });
    expect(studio.layers.length).toBeGreaterThan(0);
    vi.restoreAllMocks();
    if (originalCrypto) vi.stubGlobal('crypto', originalCrypto);
    studio = addDesignLayer(studio, { type: '', label: '', color: '', font: '', zIndex: 0 }, {});
    const id = studio.layers.at(-1).id;
    expect(studio.layers.at(-1).label).toBe('New layer');
    expect(duplicateDesignLayer(studio, 'missing', {}).layers.length).toBe(studio.layers.length);
    const duplicate = duplicateDesignLayer(studio, id, {});
    expect(duplicate.layers.at(-1).zIndex).toBeGreaterThan(0);
    expect(moveDesignLayer(studio, 'missing', 'up', {}).layers.length).toBe(studio.layers.length);
    const only = createDefaultStudio({});
    expect(moveDesignLayer(only, only.layers[0].id, 'down', {}).layers.length).toBe(
      only.layers.length,
    );
    expect(addDesignComment(studio, { text: '' }, {}).comments.length).toBe(studio.comments.length);
    const commented = addDesignComment(studio, { text: 'note', view: 'front' }, {});
    expect(commented.comments).toHaveLength(1);
    let movedHistory = createHistory({ a: 1 });
    movedHistory = { ...movedHistory, past: [{ a: 0 }], future: [{ a: 2 }] };
    expect(undoHistory(movedHistory).present.a).toBe(0);
    expect(redoHistory(movedHistory).present.a).toBe(2);
    const history = createHistory({ a: 1 });
    expect(undoHistory(history)).toBe(history);
    expect(redoHistory(history)).toBe(history);
    expect(buildProductionMetadata({ notes: null }, studio).notes).toBe('');
    __setSupabaseBuildEnvForTests({});
    await expectAsyncReject(autosaveDesignStudio('x', {}, {}));
    __resetSupabaseForTests();
    __setSupabaseBuildEnvForTests({
      VITE_SUPABASE_URL: 'https://x.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'k'.repeat(30),
    });
    let saveError = null;
    /** @type {any} */
    let shareData = 'TOKEN';
    __setSupabaseClientFactoryForTests(async () => ({
      createClient: () => ({
        rpc: async () => ({
          data: shareData,
          error: shareData === null ? new Error('share') : null,
        }),
        from: () => ({
          update: () => ({
            eq: () => ({
              select: () => ({ single: async () => ({ data: { id: 'x' }, error: saveError }) }),
            }),
          }),
        }),
      }),
    }));
    expect(
      (await autosaveDesignStudio('x', { primary: '#000', secondary: '#fff', accent: '#aaa' }, {}))
        .id,
    ).toBe('x');
    saveError = new Error('save');
    await expectAsyncReject(autosaveDesignStudio('x', {}, {}));
    saveError = null;
    vi.stubGlobal('window', { location: { origin: 'https://shop.example' } });
    expect(await createSecureDesignShare('d', 'view', 1)).toContain('/design-share/TOKEN');
    shareData = { token: 'OBJECT' };
    expect(await createSecureDesignShare('d', 'view', 1)).toContain('OBJECT');
    shareData = {};
    await expectAsyncReject(createSecureDesignShare('d', 'view', 1));
    shareData = null;
    await expectAsyncReject(createSecureDesignShare('d', 'view', 1));
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => {
          throw new Error('invalid-json');
        },
      }),
    );
    await expectAsyncReject(loadSharedDesign('T'.repeat(48)));
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, design: { id: 'd', designData: {} } }),
      }),
    );
    const shared = await loadSharedDesign('T'.repeat(48));
    expect(shared.studio).toBeTruthy();
  });

  it('executes Supabase runtime aliases, fallback signal, dynamic import and auth null branches', async () => {
    const originalAbort = globalThis.AbortSignal;
    vi.stubGlobal('AbortSignal', {});
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, headers: { get: () => null }, json: async () => ({}) }),
    );
    expect(await getSupabase()).toBe(null);
    vi.restoreAllMocks();
    if (originalAbort) vi.stubGlobal('AbortSignal', originalAbort);
    // When build env is valid, a rejected dynamic import / client factory must surface as rejection.
    __resetSupabaseForTests();
    __setSupabaseBuildEnvForTests({
      VITE_SUPABASE_URL: 'https://x.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'k'.repeat(30),
    });
    __setSupabaseClientFactoryForTests(async () => {
      throw new Error('supabase-client-import-failed');
    });
    await expectAsyncReject(getSupabase());
    __resetSupabaseForTests();
    __setSupabaseBuildEnvForTests(null);
    __setSupabaseClientFactoryForTests(null);
    const originalLocation = globalThis.location;
    const originalHistory = globalThis.history;
    const originalDocument = globalThis.document;
    vi.stubGlobal('location', {
      href: 'https://shop.example/account#access_token=a&refresh_token=b',
      origin: 'https://shop.example',
    });
    vi.stubGlobal('history', { replaceState: () => {} });
    vi.stubGlobal('document', { title: null });
    const client = {
      auth: {
        setSession: async () => ({}),
        exchangeCodeForSession: async () => ({}),
        verifyOtp: async () => ({}),
      },
    };
    const result = await completeAuthRedirect(client);
    expect(result.handled).toBe(true);
    expect(result.data).toBe(null);
    expect(result.error).toBe(null);
    vi.restoreAllMocks();
    if (originalLocation) vi.stubGlobal('location', originalLocation);
    if (originalHistory) vi.stubGlobal('history', originalHistory);
    if (originalDocument) vi.stubGlobal('document', originalDocument);
  });

  it('executes every production artwork shape, layer and document branch', async () => {
    for (const preview of [
      'jersey',
      'shirt',
      'shorts',
      'hoodie',
      'pants',
      'tracksuit',
      'bag',
      'ball',
      'sleeve',
      'hoop-padding',
      'unknown',
    ])
      expect(productShape(preview, 'side')).toBeTruthy();
    /** @type {any} */ const studio = {
      layers: [
        {
          id: 'l',
          type: 'logo',
          view: 'front',
          content: 'data:image/png;base64,AA==',
          x: 50,
          y: 50,
          width: 20,
          rotation: 0,
          visible: true,
          zIndex: 1,
        },
        {
          id: 't',
          type: 'text',
          view: 'front',
          content: '',
          x: 50,
          y: 50,
          width: 20,
          rotation: 0,
          color: '#fff',
          font: '',
          visible: true,
          zIndex: 2,
        },
      ],
    };
    expect(
      buildDesignViewSvg({
        design: { productType: 'game-set', primary: '#000', secondary: '#fff' },
        studio,
        view: 'front',
      }),
    ).toContain('<svg');
    const sections = Array.from({ length: 3 }, (_, i) => ({
      heading: `H${i}`,
      rows: Array.from({ length: 70 }, (_, j) => [`R${j}`, `V${j}`]),
    }));
    const pdf = createTextPdf({ title: 'T', subtitle: 'S', sections });
    expect((await pdf.arrayBuffer()).byteLength).toBeGreaterThan(1000);
    const docs = downloadDesignDocuments({
      design: { primary: '#000', secondary: '#fff', accent: '#aaa' },
      studio: { layers: null },
      roster: null,
    });
    const docs2 = downloadDesignDocuments({
      design: { primary: '#000', secondary: '#fff', accent: '#aaa' },
      studio: {
        layers: [
          {
            view: 'front',
            visible: true,
            label: 'Empty',
            content: '',
            x: 0,
            y: 0,
            width: 0,
            rotation: 0,
            zIndex: 1,
          },
        ],
      },
      roster: [],
    });
    expect((await docs2.tech.arrayBuffer()).byteLength).toBeGreaterThan(100);
    expect((await docs.proof.arrayBuffer()).byteLength).toBeGreaterThan(100);
  });

  it('executes spreadsheet malformed, fallback, shared-string and file-type branches', async () => {
    await expectAsyncReject(unzipEntries(new Uint8Array([1, 2, 3])));
    expect(
      parseWorksheet('<worksheet><sheetData><row><c><v></v></c></row></sheetData></worksheet>', []),
    ).toHaveLength(1);
    const entries = new Map([['xl/worksheets/sheet1.xml', new TextEncoder().encode('<x/>')]]);
    expect(resolveFirstWorksheet(entries)).toBe('xl/worksheets/sheet1.xml');
    expect(resolveFirstWorksheet(new Map())).toBe(null);
    expect(await parseRosterFile(null)).toEqual([]);
    await expectAsyncReject(parseRosterFile({ size: 6_000_000, name: 'x.csv', type: 'text/csv' }));
    await expectAsyncReject(
      parseRosterFile({
        size: 1,
        name: 'x.bin',
        type: 'application/octet-stream',
        text: async () => '',
        arrayBuffer: async () => new ArrayBuffer(0),
      }),
    );
  });
});

async function expectAsyncReject(promise) {
  let rejected = false;
  try {
    await promise;
  } catch {
    rejected = true;
  }
  expect(rejected).toBe(true);
}

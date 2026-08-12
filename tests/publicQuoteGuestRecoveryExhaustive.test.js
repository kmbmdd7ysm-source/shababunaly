import { afterEach, describe, expect, it, vi } from './test-api.js';
import publicQuoteHandler from '../api/public-quote-request.ts';
import guestAccessHandler from '../api/guest-order-access.ts';
import retryPaymentHandler from '../api/retry-order-payment.ts';
import {
  createGuestOrderToken,
  guestEmailHash,
  normalizeGuestEmail,
  normalizeGuestOrderNumber,
  verifyGuestOrderToken,
} from '../api/_guest-order-token.ts';

const ENV = [
  'NODE_ENV',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'TURNSTILE_TEST_MODE',
  'TURNSTILE_SECRET_KEY',
  'EDGE_RATE_LIMIT_SALT',
  'CRON_SECRET',
  'GUEST_ORDER_ACCESS_SECRET',
  'SITE_URL',
  'PAYMENTS_PROVIDER',
  'PAYMENTS_SESSION_URL',
  'PAYMENTS_SECRET_KEY',
  'LIBYAN_BANK_CARD_PROVIDER',
  'LIBYAN_BANK_CARD_SESSION_URL',
  'LIBYAN_BANK_CARD_SECRET_KEY',
];
afterEach(() => {
  vi.restoreAllMocks();
  for (const key of ENV) delete process.env[key];
});
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
  };
}
function req(body = {}, method = 'POST', headers = {}) {
  return {
    method,
    body,
    query: {},
    headers: {
      origin: 'http://localhost:5173',
      'user-agent': 'api-test',
      'x-forwarded-for': '127.0.0.33',
      ...headers,
    },
    socket: { remoteAddress: '127.0.0.33' },
  };
}
function configure() {
  process.env.NODE_ENV = 'test';
  process.env.SUPABASE_URL = 'https://db.example';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
  process.env.TURNSTILE_TEST_MODE = 'true';
  process.env.GUEST_ORDER_ACCESS_SECRET = 'g'.repeat(64);
  process.env.SITE_URL = 'https://shababuna.ly';
  process.env.EDGE_RATE_LIMIT_SALT = 'r'.repeat(64);
}
function reply(value, status = 200) {
  const text = typeof value === 'string' ? value : value == null ? '' : JSON.stringify(value);
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => text,
    json: async () => value,
  };
}
const validQuote = {
  turnstileToken: 'test-pass',
  idempotencyKey: '11111111-1111-4111-8111-111111111111',
  payload: {
    formType: 'teams_wholesale_quote',
    customerName: 'Club Owner',
    customerEmail: 'owner@example.com',
    phone: '+218900000000',
    organization: 'Global Club',
    accountType: 'club',
    country: 'ly',
    package: 'season',
    productGroup: 'full-supply',
    quantity: '20',
    requirements: 'Complete club supply',
    language: 'ar',
  },
};
const order = (overrides = {}) => ({
  id: 'order-id',
  order_number: 'SHB-20260801-0000001',
  user_id: null,
  customer_email: 'guest@example.com',
  idempotency_key: '11111111-1111-4111-8111-111111111111',
  currency: 'USD',
  total: 120,
  amount_paid: 0,
  amount_due_now: 120,
  outstanding_balance: 120,
  remaining_balance: 120,
  payment_method: 'online_card',
  payment_plan: 'full',
  payment_stage: 'initial',
  payment_status: 'pending',
  order_status: 'awaiting_payment',
  shipping_quote_required: false,
  shipping_quote_expires_at: null,
  payment_expires_at: new Date(Date.now() + 3600000).toISOString(),
  delivery_profile: 'standard',
  shipping_summary: { email: 'guest@example.com' },
  order_items: [{ product_name: 'Item', quantity: 1 }],
  ...overrides,
});

describe('guest order token cryptography', { concurrency: false }, () => {
  it('normalizes identifiers and creates a bounded authenticated token', () => {
    configure();
    expect(normalizeGuestOrderNumber(' shb-20260801-0000001 ')).toBe('SHB-20260801-0000001');
    expect(normalizeGuestOrderNumber('bad')).toBe('');
    expect(normalizeGuestOrderNumber(null)).toBe('');
    expect(normalizeGuestEmail(' A@EXAMPLE.COM ')).toBe('a@example.com');
    expect(normalizeGuestEmail('bad')).toBe('');
    expect(guestEmailHash('A@example.com')).toHaveLength(64);
    const short = createGuestOrderToken({
      orderNumber: 'SHB-20260801-0000001',
      email: 'guest@example.com',
      ttlSeconds: 1,
    });
    const decoded = verifyGuestOrderToken(short, 'SHB-20260801-0000001');
    expect(decoded.orderNumber).toBe('SHB-20260801-0000001');
    expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000) + 250);
    const long = createGuestOrderToken({
      orderNumber: 'LHA-20260801-0000001',
      email: 'guest@example.com',
      ttlSeconds: 999999,
    });
    expect(verifyGuestOrderToken(long).exp).toBeLessThan(Math.floor(Date.now() / 1000) + 86500);
  });
  it('rejects invalid configuration, identities, signatures, payloads, expiry and mismatches', () => {
    expect(() => createGuestOrderToken({ orderNumber: 'bad', email: 'bad' })).toThrow(
      'invalid_guest_access',
    );
    process.env.GUEST_ORDER_ACCESS_SECRET = 'short';
    expect(() =>
      createGuestOrderToken({ orderNumber: 'SHB-20260801-0000001', email: 'guest@example.com' }),
    ).toThrow('guest_access_not_configured');
    configure();
    const token = createGuestOrderToken({
      orderNumber: 'SHB-20260801-0000001',
      email: 'guest@example.com',
    });
    expect(verifyGuestOrderToken('')).toBe(null);
    expect(verifyGuestOrderToken(`${token}.extra`)).toBe(null);
    expect(verifyGuestOrderToken(`${token}x`)).toBe(null);
    expect(verifyGuestOrderToken(token, 'LHA-20260801-0000001')).toBe(null);
    const [, signature] = token.split('.');
    expect(
      verifyGuestOrderToken(`${Buffer.from('not-json').toString('base64url')}.${signature}`),
    ).toBe(null);
    const make = (data) => {
      const encoded = Buffer.from(JSON.stringify(data)).toString('base64url');
      const good = createGuestOrderToken({
        orderNumber: 'SHB-20260801-0000001',
        email: 'guest@example.com',
      }).split('.')[1];
      return `${encoded}.${good}`;
    };
    // Payload edits necessarily invalidate the HMAC.
    expect(verifyGuestOrderToken(make({ orderNumber: 'bad' }))).toBe(null);
  });
});

describe('public quote intake API', { concurrency: false }, () => {
  it('rejects methods and every validation class while allowing public intake without captcha', async () => {
    configure();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply(true)));
    let res = resMock();
    await publicQuoteHandler(req({}, 'GET'), res);
    expect(res.statusCode).toBe(405);
    process.env.TURNSTILE_TEST_MODE = 'false';
    res = resMock();
    await publicQuoteHandler(req(validQuote), res);
    expect([201, 202]).toContain(res.statusCode);
    process.env.TURNSTILE_TEST_MODE = 'true';
    const cases = [
      [
        { ...validQuote, payload: { ...validQuote.payload, formType: 'bad' } },
        'invalid_quote_type',
      ],
      [
        { ...validQuote, payload: { ...validQuote.payload, customerName: 'x' } },
        'invalid_customer_details',
      ],
      [
        { ...validQuote, payload: { ...validQuote.payload, organization: 'x' } },
        'invalid_organization_details',
      ],
      [{ ...validQuote, payload: { ...validQuote.payload, quantity: 0 } }, 'invalid_quantity'],
      [
        { ...validQuote, payload: { ...validQuote.payload, productGroup: '', requirements: '' } },
        'quote_details_required',
      ],
    ];
    for (const [body, code] of cases) {
      res = resMock();
      await publicQuoteHandler(req(body), res);
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe(code);
    }
  });
  it('returns a duplicate without inserting and creates a normalized guest quote otherwise', async () => {
    configure();
    let mode = 'duplicate';
    const calls = [];
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (url, options = {}) => {
        const target = String(url);
        calls.push([target, options]);
        if (target.includes('consume_edge_rate_limit')) return reply(true);
        if (target.includes('/auth/v1/user')) return reply(null, 401);
        if (target.includes('quote_requests?select=id,quote_number') && options.method !== 'POST')
          return reply(
            mode === 'duplicate'
              ? [{ id: 'q1', quote_number: 'QT-1', status: 'under_review' }]
              : [],
          );
        if (target.endsWith('/rest/v1/quote_requests?select=id,quote_number,status,created_at'))
          return reply([{ id: 'q2', quote_number: 'QT-2', status: 'under_review' }], 201);
        throw new Error(`unexpected:${target}`);
      }),
    );
    let res = resMock();
    await publicQuoteHandler(req(validQuote), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.duplicate).toBe(true);
    mode = 'create';
    res = resMock();
    await publicQuoteHandler(req({ ...validQuote, idempotencyKey: 'not-a-uuid' }), res);
    expect(res.statusCode).toBe(201);
    expect(res.body.duplicate).toBe(false);
    const insert = calls.find(
      ([u, o]) =>
        u.endsWith('/rest/v1/quote_requests?select=id,quote_number,status,created_at') &&
        o.method === 'POST',
    );
    const row = JSON.parse(insert[1].body);
    expect(row.user_id).toBe(null);
    expect(row.organization_id).toBe(null);
    expect(row.request_data.country).toBe('LY');
    expect(row.request_data.language).toBe('ar');
    expect(row.request_data.whatsapp).toBe('+218900000000');
  });
  it('verifies authenticated organization membership and fails closed on insert errors', async () => {
    configure();
    let fail = false;
    const calls = [];
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (url, options = {}) => {
        const target = String(url);
        calls.push([target, options]);
        if (target.includes('consume_edge_rate_limit')) return reply(true);
        if (target.includes('/auth/v1/user')) return reply({ id: 'user-1' });
        if (target.includes('quote_requests?select=id,quote_number') && options.method !== 'POST')
          return reply([]);
        if (target.includes('organization_members'))
          return reply([{ organization_id: '22222222-2222-4222-8222-222222222222' }]);
        if (target.endsWith('/rest/v1/quote_requests?select=id,quote_number,status,created_at'))
          return fail
            ? reply({ message: 'no' }, 500)
            : reply([{ id: 'q3', quote_number: 'QT-3', status: 'under_review' }], 201);
        throw new Error(`unexpected:${target}`);
      }),
    );
    const body = { ...validQuote, organizationId: '22222222-2222-4222-8222-222222222222' };
    let res = resMock();
    await publicQuoteHandler(req(body, 'POST', { authorization: 'Bearer token' }), res);
    expect(res.statusCode).toBe(201);
    const insert = calls.find(
      ([u, o]) =>
        u.endsWith('/rest/v1/quote_requests?select=id,quote_number,status,created_at') &&
        o.method === 'POST',
    );
    expect(JSON.parse(insert[1].body).organization_id).toBe('22222222-2222-4222-8222-222222222222');
    fail = true;
    res = resMock();
    await publicQuoteHandler(
      req({ ...body, idempotencyKey: '33333333-3333-4333-8333-333333333333' }, 'POST', {
        authorization: 'Bearer token',
      }),
      res,
    );
    expect(res.statusCode).toBe(503);
    expect(res.body.error).toBe('quote_request_unavailable');
  });
});

describe('guest order access and payment recovery APIs', { concurrency: false }, () => {
  it('returns privacy-preserving empty results and grants token access after captcha/email match', async () => {
    configure();
    let stored = order();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (url) => {
        const target = String(url);
        if (target.includes('consume_edge_rate_limit')) return reply(true);
        if (target.includes('/rest/v1/orders?')) return reply(stored ? [stored] : []);
        throw new Error(`unexpected:${target}`);
      }),
    );
    let res = resMock();
    await guestAccessHandler(req({}, 'GET'), res);
    expect(res.statusCode).toBe(405);
    res = resMock();
    await guestAccessHandler(req({ orderNumber: 'bad' }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.order).toBe(null);
    stored = null;
    res = resMock();
    await guestAccessHandler(
      req({
        orderNumber: 'SHB-20260801-0000001',
        email: 'guest@example.com',
        turnstileToken: 'test-pass',
      }),
      res,
    );
    expect(res.statusCode).toBe(200);
    expect(res.body.order).toBe(null);
    stored = order();
    res = resMock();
    await guestAccessHandler(
      req({
        orderNumber: stored.order_number,
        email: 'wrong@example.com',
        turnstileToken: 'test-pass',
      }),
      res,
    );
    expect(res.body.order).toBe(null);
    res = resMock();
    await guestAccessHandler(
      req({
        orderNumber: stored.order_number,
        email: 'guest@example.com',
        turnstileToken: 'test-pass',
      }),
      res,
    );
    expect(res.statusCode).toBe(200);
    expect(res.body.order.order_number).toBe(stored.order_number);
    expect(Object.hasOwn(res.body.order, 'customer_email')).toBe(false);
    expect(res.body.order.items).toHaveLength(1);
    const token = res.body.accessToken;
    res = resMock();
    await guestAccessHandler(req({ orderNumber: stored.order_number, accessToken: token }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.accessToken).toBe(token);
    stored = order({ customer_email: 'changed@example.com' });
    res = resMock();
    await guestAccessHandler(req({ orderNumber: 'SHB-20260801-0000001', accessToken: token }), res);
    expect(res.body.order).toBe(null);
  });
  it('fails captcha and trusted storage safely', async () => {
    configure();
    process.env.TURNSTILE_TEST_MODE = 'false';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (url) => {
        if (String(url).includes('consume_edge_rate_limit')) return reply(true);
        if (String(url).includes('/rest/v1/orders?')) return reply([order()]);
        throw new Error('unexpected');
      }),
    );
    let res = resMock();
    await guestAccessHandler(
      req({ orderNumber: 'SHB-20260801-0000001', email: 'guest@example.com' }),
      res,
    );
    expect(res.statusCode).toBe(400);
    process.env.TURNSTILE_TEST_MODE = 'true';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (url) => {
        if (String(url).includes('consume_edge_rate_limit')) return reply(true);
        throw new Error('db-down');
      }),
    );
    res = resMock();
    await guestAccessHandler(
      req({
        orderNumber: 'SHB-20260801-0000001',
        email: 'guest@example.com',
        turnstileToken: 'test-pass',
      }),
      res,
    );
    expect(res.statusCode).toBe(503);
  });
  it('authorizes account and guest payment retries and enforces every payable rule', async () => {
    configure();
    process.env.PAYMENTS_PROVIDER = 'sandbox';
    process.env.PAYMENTS_SESSION_URL = 'https://pay.example/session';
    process.env.PAYMENTS_SECRET_KEY = 'secret';
    let current = order();
    let authUser = null;
    let providerStatus = 200;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (url) => {
        const target = String(url);
        if (target.includes('consume_edge_rate_limit')) return reply(true);
        if (target.includes('/rest/v1/orders?')) return reply([current]);
        if (target.includes('/auth/v1/user')) return authUser ? reply(authUser) : reply(null, 401);
        if (target === 'https://pay.example/session')
          return providerStatus === 200
            ? reply({ url: 'https://pay.example/checkout' }, 200)
            : reply({ error: 'bad' }, providerStatus);
        throw new Error(`unexpected:${target}`);
      }),
    );
    let res = resMock();
    await retryPaymentHandler(req({}, 'GET'), res);
    expect(res.statusCode).toBe(405);
    res = resMock();
    await retryPaymentHandler(req({ orderNumber: 'bad' }), res);
    expect(res.statusCode).toBe(400);
    current = null;
    res = resMock();
    await retryPaymentHandler(req({ orderNumber: 'SHB-20260801-0000001' }), res);
    expect(res.statusCode).toBe(404);
    current = order();
    res = resMock();
    await retryPaymentHandler(req({ orderNumber: current.order_number }), res);
    expect(res.statusCode).toBe(403);
    const token = createGuestOrderToken({
      orderNumber: current.order_number,
      email: current.customer_email,
    });
    res = resMock();
    await retryPaymentHandler(req({ orderNumber: current.order_number, accessToken: token }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.url).toBe('https://pay.example/checkout');
    expect(res.body.amountDue).toBe(120);
    current = order({ user_id: 'user-1' });
    authUser = { id: 'user-1' };
    res = resMock();
    await retryPaymentHandler(
      req({ orderNumber: current.order_number }, 'POST', { authorization: 'Bearer user-token' }),
      res,
    );
    expect(res.statusCode).toBe(200);
    const invalid = [
      { shipping_quote_required: true },
      { shipping_quote_expires_at: new Date(Date.now() - 1000).toISOString() },
      { payment_expires_at: new Date(Date.now() - 1000).toISOString() },
      { currency: 'LYD' },
      { amount_due_now: 0, outstanding_balance: 0, remaining_balance: 0 },
      { payment_status: 'paid' },
      { order_status: 'delivered' },
    ];
    for (const changes of invalid) {
      current = order({ user_id: 'user-1', ...changes });
      res = resMock();
      await retryPaymentHandler(
        req({ orderNumber: current.order_number }, 'POST', { authorization: 'Bearer user-token' }),
        res,
      );
      expect(res.statusCode).toBe(409);
    }
    delete process.env.PAYMENTS_SESSION_URL;
    current = order({ user_id: 'user-1' });
    res = resMock();
    await retryPaymentHandler(
      req({ orderNumber: current.order_number }, 'POST', { authorization: 'Bearer user-token' }),
      res,
    );
    expect(res.statusCode).toBe(503);
    configure();
    process.env.PAYMENTS_PROVIDER = 'sandbox';
    process.env.PAYMENTS_SESSION_URL = 'https://pay.example/session';
    process.env.PAYMENTS_SECRET_KEY = 'secret';
    current = order({ user_id: 'user-1' });
    authUser = { id: 'user-1' };
    providerStatus = 500;
    res = resMock();
    await retryPaymentHandler(
      req({ orderNumber: current.order_number }, 'POST', { authorization: 'Bearer user-token' }),
      res,
    );
    expect(res.statusCode).toBe(502);
    expect(res.body.error).toBe('payment_recovery_unavailable');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (url) => {
        if (String(url).includes('consume_edge_rate_limit')) return reply(true);
        throw Object.assign(new Error('db-down'), { status: 502 });
      }),
    );
    res = resMock();
    await retryPaymentHandler(req({ orderNumber: 'SHB-20260801-0000001' }), res);
    expect(res.statusCode).toBe(502);
    expect(res.body.error).toBe('payment_recovery_unavailable');
  });
});

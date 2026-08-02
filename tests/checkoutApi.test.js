import { afterEach, describe, expect, it, vi } from './test-api.js';
import handler from '../api/create-session.js';

const envKeys = [
  'SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','SITE_URL',
  'PAYMENTS_PROVIDER','PAYMENTS_SESSION_URL','PAYMENTS_SECRET_KEY',
  'LIBYAN_BANK_CARD_PROVIDER','LIBYAN_BANK_CARD_SESSION_URL','LIBYAN_BANK_CARD_SECRET_KEY','EDGE_RATE_LIMIT_SALT',
];

afterEach(() => { vi.restoreAllMocks(); for (const key of envKeys) delete process.env[key]; });

function responseMock() {
  return { statusCode: 0, body: null, headers: {}, setHeader(key, value) { this.headers[key] = value; }, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}
function request(body = {}, method = 'POST', headers = {}) { return { method, body, headers }; }
function configure(method = 'online_card') {
  process.env.SUPABASE_URL = 'https://supabase.example';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
  process.env.SITE_URL = 'https://shababuna.ly';
  process.env.EDGE_RATE_LIMIT_SALT = 'r'.repeat(64);
  if (method === 'online_card') {
    process.env.PAYMENTS_PROVIDER = 'sandbox-card'; process.env.PAYMENTS_SESSION_URL = 'https://payments.example/session'; process.env.PAYMENTS_SECRET_KEY = 'payment-secret';
  } else {
    process.env.LIBYAN_BANK_CARD_PROVIDER = 'libyan-sandbox'; process.env.LIBYAN_BANK_CARD_SESSION_URL = 'https://bank.example/session'; process.env.LIBYAN_BANK_CARD_SECRET_KEY = 'bank-secret';
  }
}
function order(overrides = {}) {
  return {
    id: 'order-id', order_number: 'SHB-20260801-0000001', idempotency_key: '11111111-1111-4111-8111-111111111111',
    customer_email: 'customer@example.com', currency: 'USD', subtotal: 100, shipping_total: 10, total: 110,
    amount_paid: 0, amount_due_now: 110, remaining_balance: 0, payment_method: 'online_card', payment_plan: 'full', payment_stage: 'initial',
    payment_status: 'pending', order_status: 'awaiting_payment', shipping_quote_required: false,
    shipping_quote_expires_at: null, payment_expires_at: new Date(Date.now() + 3600000).toISOString(), delivery_profile: 'standard', created_at: '2026-08-01T00:00:00Z',
    ...overrides,
  };
}
/** @param {any} trustedOrder @param {any} session */
function installFetch(trustedOrder = order(), session = { url: 'https://payments.example/checkout/1', id: 'session-1' }, orderStatus = 200, sessionStatus = 200) {
  const calls = [];
  vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url, options = {}) => {
    const target = String(url); calls.push([target, options]);
    if (target.includes('consume_edge_rate_limit')) return { ok: true, status: 200, json: async () => true };
    if (target.includes('/rest/v1/orders?')) return { ok: orderStatus >= 200 && orderStatus < 300, status: orderStatus, json: async () => trustedOrder ? [trustedOrder] : [] };
    if (target.includes('/session')) return { ok: sessionStatus >= 200 && sessionStatus < 300, status: sessionStatus, text: async () => JSON.stringify(session) };
    throw new Error(`unexpected_fetch:${target}`);
  }));
  return calls;
}

describe('trusted checkout session API', { concurrency: false }, () => {
  it('rejects methods, oversized bodies and malformed references before provider access', async () => {
    const method = responseMock(); await handler(request({}, 'GET'), method); expect(method.statusCode).toBe(405); expect(method.headers.Allow).toBe('POST');
    const size = responseMock(); await handler(request({}, 'POST', { 'content-length': '16001' }), size); expect(size.statusCode).toBe(413);
    const invalid = responseMock(); await handler(request({ paymentMethod: 'cash', orderNumber: 'bad' }), invalid); expect(invalid.statusCode).toBe(400);
  });

  it('fails closed when payment or trusted order storage is unavailable', async () => {
    const provider = responseMock(); await handler(request({ paymentMethod: 'online_card', orderNumber: 'SHB-20260801-0000001' }), provider); expect(provider.statusCode).toBe(503); expect(provider.body.error).toBe('payment_provider_not_connected');
    configure(); delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SERVICE_ROLE_KEY; const store = responseMock(); await handler(request({ paymentMethod: 'online_card', orderNumber: 'SHB-20260801-0000001' }), store); expect(store.statusCode).toBe(503); expect(store.body.error).toBe('trusted_order_store_not_connected');
  });

  it('returns trusted lookup errors and never trusts browser totals', async () => {
    configure(); installFetch(null); const missing = responseMock();
    await handler(request({ paymentMethod: 'online_card', orderNumber: 'SHB-20260801-0000001', total: 1 }), missing);
    expect(missing.statusCode).toBe(404); expect(missing.body.error).toBe('trusted_order_not_found');
    configure(); installFetch(order(), {}, 502); const lookup = responseMock();
    await handler(request({ paymentMethod: 'online_card', orderNumber: 'SHB-20260801-0000001' }), lookup);
    expect(lookup.statusCode).toBe(502); expect(lookup.body.error).toBe('trusted_order_lookup_failed');
  });

  it('blocks every non-payable order state and customer mismatch', async () => {
    const invalidOrders = [
      { payment_method: 'libyan_bank_card' }, { shipping_quote_required: true },
      { shipping_quote_expires_at: new Date(Date.now() - 1000).toISOString() }, { payment_expires_at: new Date(Date.now() - 1000).toISOString() },
      { currency: 'LYD' }, { amount_due_now: 0 }, { payment_status: 'paid' }, { order_status: 'delivered' },
    ];
    for (const override of invalidOrders) {
      configure(); installFetch(order(override)); const res = responseMock();
      await handler(request({ paymentMethod: 'online_card', orderNumber: 'SHB-20260801-0000001' }), res);
      expect(res.statusCode).toBe(409); expect(res.body.error).toBe('order_not_payable');
    }
    configure(); installFetch(order()); const mismatch = responseMock();
    await handler(request({ paymentMethod: 'online_card', orderNumber: 'SHB-20260801-0000001', customerEmail: 'other@example.com' }), mismatch);
    expect(mismatch.statusCode).toBe(403); expect(mismatch.body.error).toBe('order_customer_mismatch');
  });

  it('creates a provider session from the server-trusted amount and immutable identity', async () => {
    configure(); const calls = installFetch(); const res = responseMock();
    await handler(request({ paymentMethod: 'online_card', orderNumber: 'SHB-20260801-0000001', customerEmail: 'customer@example.com', total: 0.01 }), res);
    expect(res.statusCode).toBe(200); expect(res.body).toEqual({ url: 'https://payments.example/checkout/1', orderNumber: 'SHB-20260801-0000001' });
    const providerCall = calls.find(([url]) => url === 'https://payments.example/session');
    const body = JSON.parse(providerCall[1].body);
    expect(body.trustedOrder).toMatchObject({ orderNumber: 'SHB-20260801-0000001', currency: 'USD', amount: 110, amountMinor: 11000 });
    expect(providerCall[1].headers['Idempotency-Key']).toContain('11111111-1111-4111-8111-111111111111:initial:0.00:110.00');
  });

  it('supports the configured Libyan card adapter and maps provider failures safely', async () => {
    configure('libyan_bank_card'); installFetch(order({ payment_method: 'libyan_bank_card' }), { url: 'https://bank.example/pay', id: 'bank-session' }); const success = responseMock();
    await handler(request({ paymentMethod: 'libyan_bank_card', orderNumber: 'SHB-20260801-0000001', customerEmail: 'customer@example.com' }), success); expect(success.statusCode).toBe(200);
    configure(); installFetch(order(), { code: 'declined' }, 200, 422); const failed = responseMock();
    await handler(request({ paymentMethod: 'online_card', orderNumber: 'SHB-20260801-0000001', customerEmail: 'customer@example.com' }), failed); expect(failed.statusCode).toBe(400); expect(failed.body.error).toBe('provider_rejected');
  });
});

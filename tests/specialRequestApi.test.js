import { afterEach, describe, expect, it, vi } from './test-api.js';
import handler from '../api/special-request.ts';

const envKeys = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'TURNSTILE_TEST_MODE',
  'TURNSTILE_SECRET_KEY',
  'NODE_ENV',
  'SITE_URL',
  'EDGE_RATE_LIMIT_SALT',
];

afterEach(() => {
  vi.restoreAllMocks();
  for (const key of envKeys) delete process.env[key];
});

function responseMock() {
  return {
    statusCode: 0,
    body: null,
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
  };
}

function request(method = 'POST', body = {}, headers = {}) {
  return {
    method,
    body,
    headers: {
      origin: 'http://localhost:5173',
      'user-agent': 'node-test',
      'x-forwarded-for': '127.0.0.1',
      ...headers,
    },
    socket: { remoteAddress: '127.0.0.1' },
  };
}

function validBody(overrides = {}) {
  return {
    customerName: 'Global Customer',
    email: 'customer@example.com',
    phone: '+218920000000',
    whatsapp: '+218920000000',
    country: 'LY',
    productUrl: 'https://example.com/product',
    description: 'A genuine basketball product requested for professional sourcing.',
    preferredBrand: 'Nike',
    desiredQuantity: 2,
    size: 'XL',
    color: 'Black',
    targetBudget: 400,
    requiredDate: '2026-12-01',
    preferredContactMethod: 'whatsapp',
    consent: true,
    locale: 'en',
    idempotencyKey: '11111111-1111-4111-8111-111111111111',
    turnstileToken: 'test-pass',
    files: [],
    ...overrides,
  };
}

function configure() {
  process.env.NODE_ENV = 'test';
  process.env.SUPABASE_URL = 'https://supabase.example';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
  process.env.TURNSTILE_TEST_MODE = 'true';
  process.env.EDGE_RATE_LIMIT_SALT = 'r'.repeat(64);
}

function installFetch({ withFile = false, createRow = true, storageConflict = false } = {}) {
  const calls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(async (url, options = {}) => {
      const target = String(url);
      calls.push([target, options]);
      if (target.includes('consume_edge_rate_limit'))
        return { ok: true, status: 200, json: async () => true, text: async () => 'true' };
      if (target.includes('create_special_request_api')) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify(
              createRow
                ? [
                    {
                      id: 'request-id',
                      request_number: 'SR-20260801-0000001',
                      status: 'submitted',
                      created_at: '2026-08-01T00:00:00Z',
                    },
                  ]
                : [],
            ),
        };
      }
      if (withFile && target.includes('/storage/v1/object/special-request-quarantine/'))
        return {
          ok: !storageConflict,
          status: storageConflict ? 409 : 200,
          text: async () => (storageConflict ? 'exists' : ''),
        };
      if (withFile && target.includes('/rest/v1/special_request_files'))
        return {
          ok: true,
          status: 201,
          text: async () => JSON.stringify([{ id: 'file-id', quarantine_status: 'quarantined' }]),
        };
      throw new Error(`unexpected_fetch:${target}`);
    }),
  );
  return calls;
}

const pngBase64 = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0,
]).toString('base64');

describe('special request API', { concurrency: false }, () => {
  it('creates an idempotent URL request with trusted normalized fields', async () => {
    configure();
    const calls = installFetch();
    const res = responseMock();
    await handler(request('POST', validBody()), res);
    expect(res.statusCode).toBe(201);
    expect(res.body).toMatchObject({
      ok: true,
      request: { id: 'request-id', requestNumber: 'SR-20260801-0000001', status: 'submitted' },
      filesReceived: 0,
    });
    const createCall = calls.find(([url]) => url.includes('create_special_request_api'));
    const payload = JSON.parse(createCall[1].body);
    expect(payload).toMatchObject({
      p_user_id: null,
      p_idempotency_key: '11111111-1111-4111-8111-111111111111',
    });
    expect(payload.p_payload).toMatchObject({
      country: 'LY',
      desiredQuantity: 2,
      preferredContactMethod: 'whatsapp',
      consent: true,
    });
  });

  it('uploads one verified product image to private quarantine storage', async () => {
    configure();
    const calls = installFetch({ withFile: true });
    const res = responseMock();
    await handler(
      request(
        'POST',
        validBody({
          productUrl: '',
          files: [
            { name: 'product.png', mime: 'image/png', role: 'product_image', base64: pngBase64 },
          ],
        }),
      ),
      res,
    );
    expect(res.statusCode).toBe(201);
    expect(res.body.filesReceived).toBe(1);
    expect(
      calls.some(([url]) =>
        url.includes('/storage/v1/object/special-request-quarantine/request-id/'),
      ),
    ).toBe(true);
    expect(calls.some(([url]) => url.includes('/rest/v1/special_request_files'))).toBe(true);
  });

  it('reuses an idempotently uploaded quarantine object after a storage conflict', async () => {
    configure();
    const calls = installFetch({ withFile: true, storageConflict: true });
    const res = responseMock();
    await handler(
      request(
        'POST',
        validBody({
          productUrl: '',
          files: [
            { name: 'product.png', mime: 'image/png', role: 'product_image', base64: pngBase64 },
          ],
        }),
      ),
      res,
    );
    expect(res.statusCode).toBe(201);
    expect(res.body.filesReceived).toBe(1);
    expect(calls.some(([url]) => url.includes('/rest/v1/special_request_files'))).toBe(true);
  });

  it('rejects unsafe or incomplete customer input without touching commerce data', async () => {
    configure();
    const calls = installFetch();
    const cases = [
      [validBody({ productUrl: 'javascript:alert(1)' }), 'invalid_product_url'],
      [validBody({ customerName: 'X' }), 'invalid_customer_details'],
      [validBody({ description: 'short' }), 'invalid_request_details'],
      [validBody({ preferredContactMethod: 'telegram' }), 'consent_and_contact_required'],
      [validBody({ consent: false }), 'consent_and_contact_required'],
      [validBody({ productUrl: '', files: [] }), 'product_reference_required'],
      [validBody({ targetBudget: -1 }), 'invalid_budget'],
      [
        validBody({
          files: [
            { name: 'bad.svg', mime: 'image/svg+xml', role: 'product_image', base64: pngBase64 },
          ],
        }),
        'unsupported_file_type',
      ],
    ];
    for (const [body, expected] of cases) {
      const res = responseMock();
      await handler(request('POST', body), res);
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe(expected);
    }
    expect(calls.filter(([url]) => url.includes('create_special_request_api'))).toHaveLength(0);
  });

  it('enforces method, origin and size protections while allowing public intake without captcha', async () => {
    configure();
    installFetch();
    const method = responseMock();
    await handler(request('GET'), method);
    expect(method.statusCode).toBe(405);
    expect(method.headers.Allow).toBe('POST');
    const origin = responseMock();
    await handler(request('POST', validBody(), { origin: 'https://evil.example' }), origin);
    expect(origin.statusCode).toBe(403);
    const size = responseMock();
    await handler(request('POST', validBody(), { 'content-length': String(4_200_001) }), size);
    expect(size.statusCode).toBe(413);
    process.env.TURNSTILE_TEST_MODE = 'false';
    const publicIntake = responseMock();
    await handler(request('POST', validBody({ turnstileToken: '' })), publicIntake);
    expect([201, 202]).toContain(publicIntake.statusCode);
  });

  it('fails closed when the trusted database row cannot be created', async () => {
    configure();
    installFetch({ createRow: false });
    const res = responseMock();
    await handler(request('POST', validBody()), res);
    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({ ok: false, error: 'special_request_unavailable' });
  });
});

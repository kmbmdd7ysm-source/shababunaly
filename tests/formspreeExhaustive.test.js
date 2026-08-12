import handler from '../api/formspree.ts';
import { afterEach, describe, expect, it, vi } from './test-api.js';

const ENV = [
  'NODE_ENV',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'TURNSTILE_TEST_MODE',
  'TURNSTILE_SECRET_KEY',
  'FORMSPREE_ORDER_ENDPOINT',
  'VITE_FORM_ENDPOINT',
];
afterEach(() => {
  vi.restoreAllMocks();
  for (const key of ENV) delete process.env[key];
});
function responseMock() {
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
function request(body = {}, method = 'POST', headers = {}) {
  return {
    method,
    body,
    headers: {
      origin: 'http://localhost:5173',
      'user-agent': 'form-test',
      'x-forwarded-for': '127.0.0.9',
      ...headers,
    },
    socket: { remoteAddress: '127.0.0.9' },
  };
}
function configure() {
  process.env.NODE_ENV = 'test';
  process.env.SUPABASE_URL = 'https://db.example';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
  process.env.TURNSTILE_TEST_MODE = 'true';
  process.env.FORMSPREE_ORDER_ENDPOINT = 'https://formspree.io/f/test-form';
}
function installFetch(upstream = { ok: true, status: 200, text: async () => '' }) {
  const calls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(async (url, options = {}) => {
      calls.push([String(url), options]);
      if (String(url).includes('consume_edge_rate_limit'))
        return { ok: true, status: 200, json: async () => true };
      if (String(url).includes('formspree')) return upstream;
      throw new Error(`unexpected:${url}`);
    }),
  );
  return calls;
}

describe('Formspree public gateway exhaustive', { concurrency: false }, () => {
  it('enforces method and rejects unsafe configuration', async () => {
    configure();
    installFetch();
    const method = responseMock();
    await handler(request({}, 'GET'), method);
    expect(method.statusCode).toBe(405);
    expect(method.headers.Allow).toBe('POST');
    process.env.FORMSPREE_ORDER_ENDPOINT = 'ftp://invalid.example';
    const pinned = responseMock();
    await handler(request({ turnstileToken: 'test-pass' }), pinned);
    expect(pinned.statusCode).toBe(200);
    expect(pinned.body).toEqual({ ok: true, provider: 'formspree' });
  });

  it('fails captcha before contacting Formspree', async () => {
    configure();
    process.env.TURNSTILE_TEST_MODE = 'false';
    installFetch();
    const result = responseMock();
    await handler(request({ turnstileToken: '' }), result);
    expect(result.statusCode).toBe(400);
    expect(result.body.error).toBe('captcha_failed');
  });

  it('sanitizes keys and scalar/object/null values, removes captcha and caps entries', async () => {
    configure();
    const calls = installFetch();
    const payload = {
      turnstileToken: 'test-pass',
      'bad key!': 'hello\0world',
      number: 4,
      flag: true,
      nothing: null,
      nested: { safe: 'yes' },
    };
    for (let i = 0; i < 70; i += 1) payload[`key ${i}`] = `value-${i}`;
    const result = responseMock();
    await handler(request(payload), result);
    expect(result.statusCode).toBe(200);
    expect(result.body).toEqual({ ok: true, provider: 'formspree' });
    const upstream = calls.find(([url]) => url.includes('formspree.io'));
    expect(upstream[1].headers['Content-Type']).toContain('application/x-www-form-urlencoded');
    const params = new URLSearchParams(upstream[1].body);
    expect(params.has('turnstileToken')).toBe(false);
    expect(params.get('bad_key_')).toBe('helloworld');
    expect(params.get('number')).toBe('4');
    expect(params.get('flag')).toBe('true');
    expect(params.get('nothing')).toBe('');
    expect(params.get('nested')).toContain('"safe": "yes"');
    expect([...params.keys()].length).toBe(60);
  });

  it('maps upstream rejections and transport failures without exposing stack traces', async () => {
    configure();
    installFetch({ ok: false, status: 429, text: async () => 'x'.repeat(700) });
    const rejected = responseMock();
    await handler(request({ turnstileToken: 'test-pass' }), rejected);
    expect(rejected.statusCode).toBe(502);
    expect(rejected.body).toMatchObject({ ok: false, error: 'formspree_rejected', status: 429 });
    expect(rejected.body.detail.length).toBe(500);
    configure();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (url) => {
        if (String(url).includes('consume_edge_rate_limit'))
          return { ok: true, status: 200, json: async () => true };
        throw new Error('network-down');
      }),
    );
    const failed = responseMock();
    await handler(request({ turnstileToken: 'test-pass' }), failed);
    expect(failed.statusCode).toBe(502);
    expect(failed.body.error).toBe('formspree_delivery_failed');
    expect(failed.body.detail).toContain('network-down');
  });
});

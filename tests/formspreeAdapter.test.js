import { afterEach, describe, expect, it, vi } from './test-api.js';
import handler, { buildCleanFormPayload, resolveFormspreeEndpoint, sanitize, sanitizeKey } from '../api/formspree.js';

function responseMock() {
  return { statusCode: 0, body: null, headers: {}, setHeader(key, value) { this.headers[key] = value; }, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}
function request(body = {}) { return { method: 'POST', body, headers: { origin: 'http://localhost:5173', host: 'localhost', 'content-length': String(JSON.stringify(body).length) }, socket: { remoteAddress: '127.0.0.1' } }; }

afterEach(() => { vi.restoreAllMocks(); delete process.env.FORMSPREE_ORDER_ENDPOINT; delete process.env.TURNSTILE_TEST_MODE; });

describe('Formspree server adapter', () => {

  it('normalizes every Formspree endpoint and payload helper branch', () => {
    delete process.env.FORMSPREE_ORDER_ENDPOINT; delete process.env.VITE_FORM_ENDPOINT;
    expect(resolveFormspreeEndpoint()).toBe('');
    process.env.VITE_FORM_ENDPOINT = 'https://formspree.io/f/vite'; expect(resolveFormspreeEndpoint()).toBe('https://formspree.io/f/vite');
    process.env.FORMSPREE_ORDER_ENDPOINT = 'https://formspree.io/f/server'; expect(resolveFormspreeEndpoint()).toBe('https://formspree.io/f/server');
    expect(sanitize(undefined)).toBe(''); expect(sanitize(null)).toBe(''); expect(sanitize('a\0b', 2)).toBe('ab');
    expect(sanitize(0)).toBe('0'); expect(sanitize(false)).toBe('false'); expect(sanitize({ a: 1 })).toContain('"a": 1');
    expect(sanitizeKey(undefined)).toBe(''); expect(sanitizeKey(' bad key!? ')).toBe('bad_key__'); expect(sanitizeKey('a'.repeat(100))).toHaveLength(80);
    expect(buildCleanFormPayload(null)).toEqual({}); expect(buildCleanFormPayload({ turnstileToken: 'secret', '': 'skip', ok: 'yes' })).toEqual({ ok: 'yes' });
  });

  it('accepts a provider 200 response', async () => {
    process.env.FORMSPREE_ORDER_ENDPOINT = 'https://formspree.io/f/mvzenjgv';
    process.env.TURNSTILE_TEST_MODE = 'true';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => '{"ok":true}' }));
    const res = responseMock(); await handler(request({ request_type: 'contact', reference_id: 'ref-1', customer_email: 'a@example.com', turnstileToken: 'test-pass' }), res);
    expect(res.statusCode).toBe(200); expect(res.body.ok).toBe(true);
  });

  it.each([400, 429, 500])('does not report success when provider returns %s', async (status) => {
    process.env.FORMSPREE_ORDER_ENDPOINT = 'https://formspree.io/f/mvzenjgv';
    process.env.TURNSTILE_TEST_MODE = 'true';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status, text: async () => 'rejected' }));
    const res = responseMock(); await handler(request({ request_type: 'contact', reference_id: `ref-${status}`, turnstileToken: 'test-pass' }), res);
    expect(res.statusCode).toBe(502); expect(res.body.ok).toBe(false);
  });

  it('reports delivery failure on timeout/network rejection', async () => {
    process.env.FORMSPREE_ORDER_ENDPOINT = 'https://formspree.io/f/mvzenjgv';
    process.env.TURNSTILE_TEST_MODE = 'true';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));
    const res = responseMock(); await handler(request({ request_type: 'contact', reference_id: 'ref-timeout', turnstileToken: 'test-pass' }), res);
    expect(res.statusCode).toBe(502); expect(res.body.error).toBe('formspree_delivery_failed');
  });
});

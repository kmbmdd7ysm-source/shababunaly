import { afterEach, describe, expect, it, vi } from './test-api.js';
import handler from '../api/design-share.ts';

const TOKEN = 'A'.repeat(48);
const envKeys = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'TURNSTILE_TEST_MODE',
  'TURNSTILE_SECRET_KEY',
  'NODE_ENV',
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

function request(method, body = {}, query = {}) {
  return {
    method,
    body,
    query,
    headers: {
      origin: 'http://localhost:5173',
      'user-agent': 'node-test',
      'x-forwarded-for': '127.0.0.1',
    },
    socket: { remoteAddress: '127.0.0.1' },
  };
}

function configure() {
  process.env.NODE_ENV = 'test';
  process.env.SUPABASE_URL = 'https://supabase.example';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
  process.env.TURNSTILE_TEST_MODE = 'true';
}

function installFetch() {
  const calls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(async (url, options = {}) => {
      calls.push([String(url), options]);
      if (String(url).includes('consume_edge_rate_limit'))
        return { ok: true, status: 200, text: async () => 'true', json: async () => true };
      if (String(url).includes('get_shared_design'))
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: 'design-1',
              name: 'Final Uniform',
              version: 3,
              status: 'proof_ready',
              permissions: 'approve',
              designData: { productType: 'full-game-set' },
              comments: [],
            }),
        };
      if (String(url).includes('add_shared_design_comment'))
        return {
          ok: true,
          status: 201,
          text: async () =>
            JSON.stringify({ id: 'comment-1', text: 'Move logo', view: 'front', x: 25, y: 30 }),
        };
      if (String(url).includes('respond_to_shared_design'))
        return { ok: true, status: 200, text: async () => JSON.stringify({ status: 'approved' }) };
      throw new Error(`unexpected_fetch:${url}`);
    }),
  );
  return calls;
}

describe('secure design share API', { concurrency: false }, () => {
  it('loads a sanitized shared design through the server boundary', async () => {
    configure();
    const calls = installFetch();
    const res = responseMock();
    await handler(request('GET', {}, { token: TOKEN }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      ok: true,
      design: { id: 'design-1', permissions: 'approve' },
    });
    expect(calls.some(([url]) => url.includes('get_shared_design'))).toBe(true);
  });

  it('adds a pinned comment with Turnstile and rate limiting', async () => {
    configure();
    installFetch();
    const res = responseMock();
    await handler(
      request('POST', {
        token: TOKEN,
        action: 'comment',
        name: 'Reviewer',
        email: 'review@example.com',
        text: 'Move logo',
        view: 'front',
        x: 25,
        y: 30,
        turnstileToken: 'test-pass',
      }),
      res,
    );
    expect(res.statusCode).toBe(201);
    expect(res.body).toMatchObject({ ok: true, comment: { id: 'comment-1' } });
  });

  it('approves a proof and requires a note for change requests', async () => {
    configure();
    installFetch();
    const approved = responseMock();
    await handler(
      request('POST', { token: TOKEN, action: 'approve', note: '', turnstileToken: 'test-pass' }),
      approved,
    );
    expect(approved.statusCode).toBe(200);
    expect(approved.body).toMatchObject({ ok: true, result: { status: 'approved' } });

    const invalid = responseMock();
    await handler(
      request('POST', {
        token: TOKEN,
        action: 'request_changes',
        note: '',
        turnstileToken: 'test-pass',
      }),
      invalid,
    );
    expect(invalid.statusCode).toBe(400);
    expect(invalid.body.error).toBe('change_note_required');
  });

  it('rejects invalid tokens, methods, comments and missing captcha', async () => {
    configure();
    installFetch();
    const invalidToken = responseMock();
    await handler(request('GET', {}, { token: 'short' }), invalidToken);
    expect(invalidToken.statusCode).toBe(400);
    const method = responseMock();
    await handler(request('DELETE'), method);
    expect(method.statusCode).toBe(405);
    const comment = responseMock();
    await handler(
      request('POST', {
        token: TOKEN,
        action: 'comment',
        name: 'X',
        text: '',
        view: 'wrong',
        x: 'x',
        y: 3,
        turnstileToken: 'test-pass',
      }),
      comment,
    );
    expect(comment.statusCode).toBe(400);
    process.env.TURNSTILE_TEST_MODE = 'false';
    const captcha = responseMock();
    await handler(
      request('POST', { token: TOKEN, action: 'approve', turnstileToken: '' }),
      captcha,
    );
    expect(captcha.statusCode).toBe(400);
    expect(captcha.body.error).toBe('captcha_failed');
  });
});

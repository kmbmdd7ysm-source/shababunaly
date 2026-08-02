import { afterEach, describe, expect, it, vi } from './test-api.js';
import handler, { connectivityChecks, requiredEnvironment } from '../api/readiness.js';

const keys = [
  'SITE_URL','SUPABASE_URL','VITE_SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','VITE_SUPABASE_ANON_KEY',
  'SUPABASE_ANON_KEY','SUPABASE_PUBLISHABLE_KEY','VITE_FORM_ENDPOINT','FORMSPREE_ENDPOINT',
  'TURNSTILE_SECRET_KEY','VITE_TURNSTILE_SITE_KEY','CRON_SECRET','EDGE_RATE_LIMIT_SALT',
  'PAYMENTS_SESSION_URL','PAYMENTS_SECRET_KEY','LIBYAN_BANK_CARD_SESSION_URL','LIBYAN_BANK_CARD_SECRET_KEY',
  'MALWARE_SCAN_API_URL','MALWARE_SCAN_ENDPOINT','MALWARE_SCAN_API_KEY','MALWARE_SCAN_PROVIDER','ERROR_MONITORING_INGEST_URL','VITE_SENTRY_DSN','READINESS_SKIP_NETWORK_CHECKS','ALLOW_READINESS_NETWORK_SKIP','REQUIRE_PRODUCTION_READINESS','FORMSPREE_DELIVERY_VERIFIED_AT','FORMSPREE_DELIVERY_EVIDENCE_ID','PAYMENTS_PROVIDER','LIBYAN_BANK_CARD_PROVIDER','SIGNATURE_PROVIDER','SIGNATURE_CREATE_ENVELOPE_URL','SIGNATURE_API_URL','SIGNATURE_WEBHOOK_SECRET','DEPLOYMENT_ENVIRONMENT',
];

afterEach(() => { vi.restoreAllMocks(); for (const key of keys) delete process.env[key]; });

function responseMock() {
  return {
    statusCode: 0, body: null, headers: {}, ended: false,
    setHeader(key, value) { this.headers[key] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    end() { this.ended = true; return this; },
  };
}

function configureRequired() {
  process.env.SITE_URL = 'https://shababuna.ly';
  process.env.SUPABASE_URL = 'https://project.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-secret';
  process.env.VITE_SUPABASE_ANON_KEY = 'public-anon-key';
  process.env.VITE_FORM_ENDPOINT = 'https://formspree.io/f/mvzenjgv';
  process.env.FORMSPREE_DELIVERY_VERIFIED_AT = new Date().toISOString();
  process.env.FORMSPREE_DELIVERY_EVIDENCE_ID = 'submission-verified-123';
  process.env.TURNSTILE_SECRET_KEY = 'turnstile-secret';
  process.env.VITE_TURNSTILE_SITE_KEY = 'turnstile-site';
  process.env.CRON_SECRET = 'c'.repeat(32);
  process.env.EDGE_RATE_LIMIT_SALT = 'r'.repeat(32);
  process.env.READINESS_SKIP_NETWORK_CHECKS = 'true';
}

describe('production readiness endpoint', { concurrency: false }, () => {
  it('fails closed without required production services and never exposes secret values', async () => {
    const res = responseMock();
    await handler({ method: 'GET' }, res);
    expect(res.statusCode).toBe(503);
    expect(res.body.ready).toBe(false);
    expect(res.body.required.supabase_service_role).toBe(false);
    expect(JSON.stringify(res.body)).not.toContain('service-role-secret');
    expect(JSON.stringify(res.body)).not.toContain('turnstile-secret');
    expect(res.headers['Cache-Control']).toContain('no-store');
  });

  it('reports ready only when every required environment contract is satisfied', async () => {
    configureRequired();
    const res = responseMock();
    await handler({ method: 'GET' }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.ready).toBe(true);
    expect(Object.values(res.body.required).every(Boolean)).toBe(true);
    expect(res.body.optionalCapabilities).toEqual({ online_card: false, libyan_bank_card: false, malware_scan: false, signature: false, monitoring: false });
  });

  it('reports optional capabilities without making them production blockers', async () => {
    configureRequired();
    process.env.PAYMENTS_SESSION_URL = 'https://payments.example/session';
    process.env.PAYMENTS_SECRET_KEY = 'online-secret';
    process.env.PAYMENTS_PROVIDER = 'sandbox-pay';
    process.env.LIBYAN_BANK_CARD_SESSION_URL = 'https://bank.example/session';
    process.env.LIBYAN_BANK_CARD_SECRET_KEY = 'bank-secret';
    process.env.LIBYAN_BANK_CARD_PROVIDER = 'sandbox-bank';
    process.env.MALWARE_SCAN_API_URL = 'https://scanner.example/scan';
    process.env.MALWARE_SCAN_API_KEY = 'scanner-secret';
    process.env.MALWARE_SCAN_PROVIDER = 'sandbox-scanner';
    process.env.ERROR_MONITORING_INGEST_URL = 'https://monitor.example/events';
    const res = responseMock();
    await handler({ method: 'GET' }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.optionalCapabilities).toEqual({ online_card: true, libyan_bank_card: true, malware_scan: true, signature: false, monitoring: true });
  });

  it('supports HEAD health checks and rejects unsupported methods', async () => {
    configureRequired();
    const head = responseMock(); await handler({ method: 'HEAD' }, head);
    expect(head.statusCode).toBe(204); expect(head.ended).toBe(true);
    const method = responseMock(); await handler({ method: 'POST' }, method);
    expect(method.statusCode).toBe(405); expect(method.headers.Allow).toBe('GET, HEAD');
  });

  it('verifies live Supabase and form connectivity and fails safely', async () => {
    configureRequired();
    delete process.env.READINESS_SKIP_NETWORK_CHECKS;
    const responses = [
      { ok: true, status: 200, json: async () => [] },
      { ok: true, status: 200 },
    ];
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => responses.shift()));
    expect(await connectivityChecks(requiredEnvironment())).toEqual({ supabase_catalog: true, form_endpoint: true, skipped: false });

    const degraded = [
      { ok: true, status: 200, json: async () => { throw new Error('invalid-json'); } },
      { ok: false, status: 500 },
    ];
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => degraded.shift()));
    expect(await connectivityChecks(requiredEnvironment())).toEqual({ supabase_catalog: false, form_endpoint: false, skipped: false });

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    expect(await connectivityChecks(requiredEnvironment())).toEqual({ supabase_catalog: false, form_endpoint: false, skipped: false });
  });


  it('covers disabled connectivity and every environment fallback', async () => {
    delete process.env.READINESS_SKIP_NETWORK_CHECKS;
    const disabledFetch = vi.fn();
    vi.stubGlobal('fetch', disabledFetch);
    const disabledRequired = { ...requiredEnvironment(), supabase_url: false, supabase_service_role: false, formspree: false };
    expect(await connectivityChecks(disabledRequired)).toEqual({ supabase_catalog: false, form_endpoint: false, skipped: false });
    expect(disabledFetch.mock.calls).toHaveLength(0);

    process.env.VITE_SUPABASE_URL = 'https://fallback.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-secret';
    process.env.SUPABASE_PUBLISHABLE_KEY = 'publishable-key';
    process.env.FORMSPREE_ENDPOINT = 'https://formspree.io/f/fallback123';
    const checks = requiredEnvironment();
    expect(checks.supabase_url).toBe(true);
    expect(checks.supabase_public_key).toBe(true);
    expect(checks.formspree).toBe(true);

    const responses = [
      { ok: true, status: 200, json: async () => [] },
      { ok: true, status: 499 },
    ];
    const fallbackFetch = vi.fn().mockImplementation(async () => responses.shift());
    vi.stubGlobal('fetch', fallbackFetch);
    expect(await connectivityChecks(checks)).toEqual({ supabase_catalog: true, form_endpoint: true, skipped: false });
    expect(fallbackFetch.mock.calls[0][0]).toContain('fallback.supabase.co');
    expect(fallbackFetch.mock.calls[1][0]).toBe('https://formspree.io/f/fallback123');
  });

});

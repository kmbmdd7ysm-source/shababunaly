import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { recordBusinessEvent, sanitizeProperties } from '../api/_business-events.ts';
import malwareWorker, { malwareWorkerInternals } from '../api/malware-scan-worker.js';
import mediaWorker, { mediaWorkerInternals } from '../api/media-scan-worker.js';
import {
  createSignatureEnvelope,
  getSignatureProviderConfig,
  normalizeSignatureEvent,
  verifySignatureWebhook,
} from '../api/signatures/provider.js';
import {
  buildColorSpecifications,
  deltaE76,
  readRasterDimensions,
  rgbToLab,
  runProductionPreflight,
} from '../src/services/productionPreflight.js';
import { DEFAULT_CUSTOM_DESIGN } from '../src/data/customization.ts';
import { createDefaultStudio } from '../src/services/designStudio.ts';

const originalFetch = globalThis.fetch;
const trackedEnv = [
  'NODE_ENV',
  'ANALYTICS_HASH_SALT',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'CRON_SECRET',
  'MALWARE_SCAN_TEST_MODE',
  'MALWARE_SCAN_API_URL',
  'MALWARE_SCAN_API_KEY',
  'MALWARE_SCAN_TIMEOUT_MS',
  'MALWARE_SCAN_PROVIDER',
  'SIGNATURE_PROVIDER',
  'SIGNATURE_CREATE_ENVELOPE_URL',
  'SIGNATURE_API_URL',
  'SIGNATURE_API_KEY',
  'SIGNATURE_WEBHOOK_SECRET',
  'SIGNATURE_PROVIDER_SCHEMA_VERSION',
  'SIGNATURE_PROVIDER_DOCS_URL',
  'SIGNATURE_PROVIDER_SANDBOX_URL',
  'SIGNATURE_WEBHOOK_HEADER',
  'SIGNATURE_TIMEOUT_MS',
];
const reset = () => {
  globalThis.fetch = originalFetch;
  for (const key of trackedEnv) delete process.env[key];
};
test.afterEach(reset);
const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const emptyResponse = (status = 204) => new Response(status === 204 ? null : '', { status });
const response = () => ({
  statusCode: 0,
  body: null,
  headers: {},
  setHeader(k, v) {
    this.headers[k.toLowerCase()] = v;
  },
  status(c) {
    this.statusCode = c;
    return this;
  },
  json(b) {
    this.body = b;
    return this;
  },
});
const configureDb = () => {
  process.env.SUPABASE_URL = 'https://db.example';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
  process.env.CRON_SECRET = 'cron-secret';
  process.env.NODE_ENV = 'test';
};

function signatureEnv() {
  process.env.SIGNATURE_PROVIDER = 'Dropbox Sign';
  process.env.SIGNATURE_CREATE_ENVELOPE_URL = 'https://sign.example/envelopes';
  process.env.SIGNATURE_API_KEY = 'key';
  process.env.SIGNATURE_WEBHOOK_SECRET = 'secret';
  process.env.SIGNATURE_PROVIDER_SCHEMA_VERSION = 'v1';
  process.env.SIGNATURE_PROVIDER_DOCS_URL = 'https://docs.example';
  process.env.SIGNATURE_PROVIDER_SANDBOX_URL = 'https://sandbox.example';
}

test('business events cover sanitization, hashing, failures and production salt enforcement', async () => {
  configureDb();
  process.env.ANALYTICS_HASH_SALT = 'x'.repeat(32);
  let inserted = /** @type {any} */ (null);
  globalThis.fetch = async (_url, init = {}) => {
    inserted = JSON.parse(String(init.body));
    return emptyResponse();
  };
  assert.deepEqual(
    sanitizeProperties({
      email: 'hide',
      nil: null,
      emptyKey: ' ok ',
      count: 2,
      yes: true,
      nested: { a: 1 },
      note: 'x\n'.repeat(300),
      password: 'hide',
    }),
    { emptyKey: 'ok', count: 2, yes: true, note: 'x '.repeat(120) },
  );
  assert.equal(
    await recordBusinessEvent('CHECKOUT_STARTED', {
      sourceEventId: 'evt-1',
      entityType: 'order',
      entityReference: 'r1',
      organizationId: 'org',
      actorUserId: 'actor',
      customerIdentifier: 'User@Example.com',
      valueUsd: '12.5',
      currency: 'lyd',
      channel: 'web',
      properties: { name: 'hidden', safe: 'ok' },
    }),
    true,
  );
  assert.ok(inserted);
  assert.equal(inserted.event_name, 'checkout_started');
  assert.equal(inserted.value_usd, 12.5);
  assert.equal(inserted.currency, 'LYD');
  assert.match(inserted.customer_hash, /^[a-f0-9]{64}$/);
  globalThis.fetch = async () => {
    throw new Error('offline');
  };
  assert.equal(
    await recordBusinessEvent('payment_failed', { sourceEventId: 'evt-2', valueUsd: 'bad' }),
    false,
  );
  await assert.rejects(
    () => recordBusinessEvent('nope', { sourceEventId: 'x' }),
    /unsupported_business_event/,
  );
  await assert.rejects(
    () => recordBusinessEvent('payment_failed', {}),
    /business_event_source_id_required/,
  );
  process.env.NODE_ENV = 'production';
  delete process.env.ANALYTICS_HASH_SALT;
  await assert.rejects(
    () =>
      recordBusinessEvent('payment_failed', { sourceEventId: 'evt-3', customerIdentifier: 'a' }),
    /analytics_hash_salt_not_configured/,
  );
});

test('malware internals cover download, scanner forms, delete and expiry failure branches', async () => {
  configureDb();
  const row = {
    id: 'r',
    storage_bucket: '',
    storage_path: 'a b/file',
    original_name: 'x y.bin',
    detected_mime: '',
    byte_size: 4,
    sha256: 'a'.repeat(64),
    scan_attempts: 4,
  };
  globalThis.fetch = async (url, init = {}) => {
    if (String(url).includes('/storage/') && (init.method || 'GET') === 'GET')
      return new Response('safe');
    return emptyResponse(404);
  };
  assert.equal((await malwareWorkerInternals.downloadQuarantinedFile(row)).length, 4);
  assert.equal(await malwareWorkerInternals.deleteQuarantinedFile(row), true);
  globalThis.fetch = async () => new Response('bad');
  await assert.rejects(
    () => malwareWorkerInternals.downloadQuarantinedFile(row),
    /stored_file_size_mismatch/,
  );
  globalThis.fetch = async () => emptyResponse(500);
  await assert.rejects(
    () => malwareWorkerInternals.downloadQuarantinedFile(row),
    /storage_download_failed:500/,
  );
  await assert.rejects(
    () => malwareWorkerInternals.deleteQuarantinedFile(row),
    /storage_delete_failed:500/,
  );
  await assert.rejects(
    () => malwareWorkerInternals.scanFile(row, new Uint8Array([1])),
    /malware_scanner_not_configured/,
  );
  process.env.MALWARE_SCAN_API_URL = 'https://scan.example';
  process.env.MALWARE_SCAN_API_KEY = 'k';
  process.env.MALWARE_SCAN_PROVIDER = 'named';
  globalThis.fetch = async () => jsonResponse({ clean: true, scanId: 's1' });
  assert.deepEqual(
    (await malwareWorkerInternals.scanFile(row, new Uint8Array([1]))).verdict,
    'clean',
  );
  globalThis.fetch = async () => jsonResponse({ infected: true, id: 's2' });
  assert.equal(
    (await malwareWorkerInternals.scanFile(row, new Uint8Array([1]))).verdict,
    'infected',
  );
  globalThis.fetch = async () => jsonResponse({ verdict: 'clean', provider: 'p', reference: 'r' });
  assert.equal((await malwareWorkerInternals.scanFile(row, new Uint8Array([1]))).provider, 'p');
  globalThis.fetch = async () => new Response('bad json', { status: 502 });
  await assert.rejects(
    () => malwareWorkerInternals.scanFile(row, new Uint8Array([1])),
    /malware_scanner_rejected:502/,
  );
});

test('worker handlers cover retry exhaustion, null rows and top-level failures', async () => {
  configureDb();
  process.env.MALWARE_SCAN_TEST_MODE = 'true';
  const file = {
    id: 'retry',
    storage_bucket: 'b',
    storage_path: 'x',
    original_name: 'x',
    detected_mime: 'x',
    byte_size: 1,
    sha256: 'a'.repeat(64),
    scan_attempts: 4,
    special_request_id: 'q',
  };
  let security = 0;
  globalThis.fetch = async (url, init = {}) => {
    const s = String(url),
      method = init.method || 'GET';
    if (s.includes('quarantine_expires_at')) return jsonResponse(null);
    if (s.includes('next_scan_at')) return jsonResponse([file]);
    if (s.includes('/storage/') && method === 'GET') return new Response('xx');
    if (s.includes('/security_events')) {
      security++;
      return emptyResponse();
    }
    if (method === 'PATCH') return jsonResponse([]);
    throw new Error(`unexpected:${s}`);
  };
  let res = response();
  await malwareWorker({ method: 'POST', headers: { authorization: 'Bearer cron-secret' } }, res);
  assert.equal(res.body.failed, 1);
  assert.equal(security, 1);
  globalThis.fetch = async () => {
    throw 'top-level';
  };
  res = response();
  await malwareWorker({ method: 'POST', headers: { authorization: 'Bearer cron-secret' } }, res);
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.error, 'top-level');

  const media = {
    id: 'm',
    bucket: '',
    storage_path: 'x y',
    original_name: 'm',
    mime_type: '',
    byte_size: null,
    sha256: 'b'.repeat(64),
    scan_attempts: 4,
    metadata: null,
  };
  security = 0;
  globalThis.fetch = async (url, init = {}) => {
    const s = String(url),
      method = init.method || 'GET';
    if (s.includes('quarantine_expires_at')) return jsonResponse(null);
    if (s.includes('next_scan_at')) return jsonResponse([media]);
    if (s.includes('/storage/') && method === 'GET') return new Response('safe');
    if (s.includes('/security_events')) {
      security++;
      return emptyResponse();
    }
    if (method === 'PATCH') return emptyResponse();
    throw new Error('unexpected');
  };
  res = response();
  await mediaWorker({ method: 'POST', headers: { authorization: 'Bearer cron-secret' } }, res);
  assert.equal(res.body.clean, 1);
  process.env.MALWARE_SCAN_TEST_MODE = 'false';
  delete process.env.MALWARE_SCAN_API_URL;
  globalThis.fetch = async (url, init = {}) => {
    const s = String(url),
      method = init.method || 'GET';
    if (s.includes('quarantine_expires_at')) return jsonResponse([]);
    if (s.includes('next_scan_at')) return jsonResponse([media]);
    if (method === 'PATCH') return emptyResponse();
    if (s.includes('/storage/')) return new Response('safe');
    if (s.includes('/security_events')) {
      security++;
      return emptyResponse();
    }
    throw new Error('x');
  };
  res = response();
  await mediaWorker({ method: 'POST', headers: { authorization: 'Bearer cron-secret' } }, res);
  assert.equal(res.body.failed, 1);
  assert.ok(security >= 1);
  globalThis.fetch = async () => {
    throw new Error('outer');
  };
  res = response();
  await mediaWorker({ method: 'POST', headers: { authorization: 'Bearer cron-secret' } }, res);
  assert.equal(res.statusCode, 503);
});

test('media internals cover object defaults, storage errors, timeout and provider response aliases', async () => {
  configureDb();
  const row = {
    id: 'm',
    storage_path: 'a b',
    bucket: '',
    original_name: 'm x',
    mime_type: '',
    byte_size: 4,
    sha256: 'b'.repeat(64),
  };
  assert.match(mediaWorkerInternals.objectUrl(row), /media-quarantine\/a%20b/);
  assert.equal(mediaWorkerInternals.storageHeaders().apikey, 'service');
  globalThis.fetch = async () => new Response('safe');
  assert.equal((await mediaWorkerInternals.download(row)).length, 4);
  globalThis.fetch = async () => new Response('x');
  await assert.rejects(() => mediaWorkerInternals.download(row), /stored_file_size_mismatch/);
  globalThis.fetch = async () => emptyResponse(500);
  await assert.rejects(() => mediaWorkerInternals.download(row), /storage_download_failed:500/);
  await assert.rejects(() => mediaWorkerInternals.remove(row), /storage_delete_failed:500/);
  globalThis.fetch = async () => emptyResponse(404);
  await mediaWorkerInternals.remove(row);
  process.env.MALWARE_SCAN_API_URL = 'https://scan.example';
  process.env.MALWARE_SCAN_API_KEY = 'k';
  process.env.MALWARE_SCAN_TIMEOUT_MS = '5';
  globalThis.fetch = async () => jsonResponse({ clean: true, scanId: 's' });
  assert.equal((await mediaWorkerInternals.scan(row, new Uint8Array([1]))).verdict, 'clean');
  globalThis.fetch = async () => jsonResponse({ infected: true, id: 'i' });
  assert.equal((await mediaWorkerInternals.scan(row, new Uint8Array([1]))).verdict, 'infected');
  globalThis.fetch = (_u, o) =>
    new Promise((resolve, reject) =>
      o.signal.addEventListener(
        'abort',
        () => reject(Object.assign(new Error('a'), { name: 'AbortError' })),
        { once: true },
      ),
    );
  await assert.rejects(
    () => mediaWorkerInternals.scan(row, new Uint8Array([1])),
    /malware_scanner_timeout/,
  );
});

test('signature adapter covers aliases, malformed JSON, missing fields, statuses and fallback header', async () => {
  signatureEnv();
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        envelopeId: 'e',
        embeddedSigningUrl: 'https://sign.example/x',
        expiresAt: 'x',
        documentSha256: 'A'.repeat(64),
      }),
      { status: 200 },
    );
  const result = await createSignatureEnvelope({ idempotencyKey: 'i' });
  assert.equal(result.envelopeId, 'e');
  assert.equal(result.documentSha256, 'a'.repeat(64));
  assert.equal(result.providerMetadata.providerStatus, 'sent');
  globalThis.fetch = async () => new Response('{oops', { status: 400 });
  await assert.rejects(
    () => createSignatureEnvelope({ idempotencyKey: 'i' }),
    (e) => e.status === 422 && /signature_provider:400/.test(e.message),
  );
  delete process.env.SIGNATURE_CREATE_ENVELOPE_URL;
  delete process.env.SIGNATURE_API_URL;
  assert.throws(() => getSignatureProviderConfig(), /signature_api_url_missing/);
  signatureEnv();
  const raw = Buffer.from('x');
  const sig = createHmac('sha256', 'secret').update(raw).digest('hex');
  assert.equal(verifySignatureWebhook(raw, { 'x-shababuna-signature': sig }), true);
  for (const [input, expected] of [
    ['created', 'prepared'],
    ['prepared', 'prepared'],
    ['sent', 'sent'],
    ['delivered', 'sent'],
    ['viewed', 'viewed'],
    ['opened', 'viewed'],
    ['signed', 'signed'],
    ['declined', 'declined'],
    ['rejected', 'declined'],
    ['expired', 'expired'],
    ['voided', 'void'],
    ['void', 'void'],
    ['failed', 'failed'],
    ['error', 'failed'],
  ]) {
    assert.equal(normalizeSignatureEvent({ data: { type: input } }).status, expected);
  }
  const direct = normalizeSignatureEvent({
    event_id: 'evt',
    signature_request_id: 'env',
    eventStatus: 'completed',
    signedDocumentUrl: 'https://x',
    signedDocumentSha256: 'A'.repeat(64),
    auditCertificateUrl: 'https://y',
    auditCertificateSha256: 'B'.repeat(64),
    identityVerification: { verified: true },
  });
  assert.equal(direct.status, 'signed');
  assert.equal(direct.envelopeId, 'env');
  assert.equal(direct.signedDocumentSha256, 'a'.repeat(64));
});

test('production preflight parses JPEG/WebP and rejects every incomplete factory/vector evidence branch', () => {
  const jpeg = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x02, 0xff, 0xc0, 0x00, 0x08, 0x08, 0x00, 0x03, 0x00, 0x02, 0, 0,
  ]);
  assert.deepEqual(readRasterDimensions(`data:image/jpeg;base64,${jpeg.toString('base64')}`), {
    pixelWidth: 2,
    pixelHeight: 3,
    format: 'jpeg',
    source: 'embedded_header',
  });
  const malformedJpeg = Buffer.from([
    0xff, 0xd8, 0x01, 0xff, 0xe0, 0x00, 0x01, 0, 0, 0, 0, 0, 0, 0, 0,
  ]);
  assert.equal(
    readRasterDimensions(`data:image/jpeg;base64,${malformedJpeg.toString('base64')}`),
    null,
  );
  const webp = Buffer.alloc(30);
  webp.write('RIFF', 0);
  webp.write('WEBP', 8);
  webp.write('VP8X', 12);
  webp[24] = 1;
  webp[27] = 2;
  assert.deepEqual(readRasterDimensions(`data:image/webp;base64,${webp.toString('base64')}`), {
    pixelWidth: 2,
    pixelHeight: 3,
    format: 'webp',
    source: 'embedded_header',
  });
  assert.equal(readRasterDimensions('data:image/png;base64,@@@@'), null);
  assert.equal(deltaE76({ l: 'x', a: 0, b: 0 }, { l: 0, a: 0, b: 0 }), null);
  const design = { ...DEFAULT_CUSTOM_DESIGN, notes: 'n' };
  const studio = createDefaultStudio(design);
  studio.layers = studio.layers.map((x) => ({
    ...x,
    content: x.content || 'TEXT',
    x: 50,
    y: 50,
    width: 10,
    fontLicenseStatus: 'built_in_licensed',
  }));
  studio.layers.push({
    id: 'v',
    type: 'logo',
    content: 'data:image/svg+xml;base64,PHN2Zy8+',
    sourceFileName: 'logo.svg',
    sourceSha256: 'bad',
    vectorSourceValidated: false,
    visible: true,
    x: 50,
    y: 50,
    width: 10,
  });
  const invalid = runProductionPreflight({
    design,
    studio,
    factoryApproval: { approved: true, approvalStatus: 'approved', productTypes: [] },
  });
  assert.ok(invalid.blockers.some((x) => x.code === 'vector_source_unverified'));
  assert.ok(invalid.blockers.filter((x) => x.code === 'factory_evidence_invalid').length >= 6);
  const colors = buildColorSpecifications(design);
  const approval = {
    approved: true,
    approvalStatus: 'approved',
    manufacturer: 'F',
    manufacturerLegalId: 'ID',
    certificateReference: 'C',
    certificateSha256: 'a'.repeat(64),
    templateVersion: 'generic-production-v2',
    productTypes: ['game-set'],
    iccProfileReference: 'I',
    iccProfileSha256: 'b'.repeat(64),
    pantoneLibrary: 'P',
    pantoneLibraryVersion: '1',
    pantoneLibrarySha256: 'c'.repeat(64),
    deltaETolerance: 2,
    gradedPatternSha256: 'd'.repeat(64),
    materialProfile: { fabricCode: 'F', stretchPercent: 0, shrinkagePercent: 0 },
    colorMeasurements: colors.map((c, i) => ({
      role: c.role,
      targetLab: rgbToLab(c.rgb),
      measuredLab: i ? rgbToLab(c.rgb) : { l: 100, a: 100, b: 100 },
    })),
  };
  const failedColor = runProductionPreflight({
    design,
    studio: { ...studio, layers: studio.layers.filter((x) => x.id !== 'v') },
    factoryApproval: approval,
  });
  assert.ok(
    failedColor.factoryValidation.errors.some((x) => x.startsWith('color_measurement_failed')),
  );
});

test('closes remaining business, readiness, provider and small utility branches', async () => {
  assert.deepEqual(sanitizeProperties({ '\n': 'ignored', object: {}, keep: false }), {
    keep: false,
  });
  const { optionalCapabilities, connectivityChecks } = await import('../api/readiness.js');
  process.env.SIGNATURE_API_URL = 'https://sign.example';
  process.env.SIGNATURE_PROVIDER = 'Named';
  delete process.env.SIGNATURE_WEBHOOK_SECRET;
  assert.equal(optionalCapabilities().signature, false);
  process.env.SIGNATURE_WEBHOOK_SECRET = 'x'.repeat(24);
  assert.equal(optionalCapabilities().signature, true);
  process.env.NODE_ENV = 'production';
  process.env.READINESS_SKIP_NETWORK_CHECKS = 'true';
  process.env.ALLOW_READINESS_NETWORK_SKIP = 'true';
  assert.equal(
    (
      await connectivityChecks({
        site_url: false,
        supabase_url: false,
        supabase_service_role: false,
        supabase_public_key: false,
        formspree: false,
        formspree_delivery_evidence: false,
        turnstile_secret: false,
        turnstile_site_key: false,
        cron_secret: false,
        rate_limit_salt: false,
        guest_order_access_secret: false,
      })
    ).skipped,
    true,
  );
  signatureEnv();
  globalThis.fetch = async () => new Response(null, { status: 200 });
  await assert.rejects(
    () => createSignatureEnvelope({ idempotencyKey: 'empty' }),
    /invalid_signature_provider_response/,
  );
  globalThis.fetch = async () =>
    jsonResponse({ envelopeId: 'e', signingUrl: 'https://sign.example/e' });
  assert.equal(
    (await createSignatureEnvelope({ idempotencyKey: 'empty-hash' })).documentSha256,
    null,
  );
  const minimal = normalizeSignatureEvent({ status: 'sent' });
  assert.deepEqual(minimal.identityVerification, {});
  assert.throws(() => normalizeSignatureEvent(null), /unsupported_signature_event/);
  const { getCountryName } = await import('../src/data/countries.ts');
  const OriginalDisplayNames = Intl.DisplayNames;
  Object.defineProperty(Intl, 'DisplayNames', {
    configurable: true,
    value: class {
      of() {
        return '';
      }
    },
  });
  try {
    assert.equal(getCountryName('LY', 'en'), 'LY');
  } finally {
    Object.defineProperty(Intl, 'DisplayNames', {
      configurable: true,
      value: OriginalDisplayNames,
    });
  }
});

test('closes all malware worker defensive branches without publishing unsafe files', async () => {
  configureDb();
  const bare = { id: 'bare', byte_size: 1, sha256: 'x', scan_attempts: 0 };
  globalThis.fetch = async () => new Response('x');
  assert.equal((await malwareWorkerInternals.downloadQuarantinedFile(bare)).length, 1);
  globalThis.fetch = async () => emptyResponse();
  assert.equal(await malwareWorkerInternals.deleteQuarantinedFile(bare), true);
  process.env.NODE_ENV = 'production';
  process.env.MALWARE_SCAN_API_URL = 'https://scan.example';
  process.env.MALWARE_SCAN_API_KEY = 'key';
  delete process.env.MALWARE_SCAN_PROVIDER;
  globalThis.fetch = async () => jsonResponse({ verdict: 'clean' });
  const clean = await malwareWorkerInternals.scanFile(bare, new Uint8Array([1]));
  assert.equal(clean.provider, 'external');
  assert.equal(clean.reference, '');
  globalThis.fetch = async () => jsonResponse({});
  await assert.rejects(
    () => malwareWorkerInternals.scanFile(bare, new Uint8Array([1])),
    /invalid_response/,
  );
  globalThis.fetch = async () => {
    throw new Error('network');
  };
  await assert.rejects(() => malwareWorkerInternals.scanFile(bare, new Uint8Array([1])), /network/);

  process.env.NODE_ENV = 'test';
  process.env.MALWARE_SCAN_TEST_MODE = 'true';
  const expired = { id: 'exp', storage_path: 'x', byte_size: 1, sha256: 'e' };
  let patchCount = 0;
  globalThis.fetch = async (url, init = {}) => {
    const s = String(url),
      m = init.method || 'GET';
    if (s.includes('quarantine_expires_at')) return jsonResponse([expired]);
    if (s.includes('/storage/') && m === 'DELETE') return emptyResponse(500);
    if (m === 'PATCH') {
      patchCount++;
      return jsonResponse([]);
    }
    if (s.includes('next_scan_at')) return jsonResponse(null);
    throw new Error('unexpected');
  };
  const res = response();
  await malwareWorker({ method: 'POST', headers: { authorization: 'Bearer cron-secret' } }, res);
  assert.equal(res.body.expiryFailed, 1);
  assert.equal(res.body.processed, 0);
  assert.ok(patchCount >= 1);
  const noRef = { id: 'noref', storage_path: 'x', byte_size: 4, sha256: 'z', scan_attempts: 0 };
  globalThis.fetch = async (url, init = {}) => {
    const s = String(url),
      m = init.method || 'GET';
    if (s.includes('quarantine_expires_at')) return jsonResponse([]);
    if (s.includes('next_scan_at')) return jsonResponse([noRef]);
    if (m === 'PATCH') return jsonResponse([]);
    if (s.includes('/storage/')) return new Response('safe');
    throw new Error('unexpected');
  };
  const res2 = response();
  await malwareWorker({ method: 'POST', headers: { authorization: 'Bearer cron-secret' } }, res2);
  assert.equal(res2.body.clean, 1);
  process.env.MALWARE_SCAN_TEST_MODE = 'false';
  delete process.env.MALWARE_SCAN_API_URL;
  delete process.env.MALWARE_SCAN_API_KEY;
  const nonError = { ...noRef, scan_attempts: 4, special_request_id: 'q' };
  globalThis.fetch = async (url, init = {}) => {
    const s = String(url),
      m = init.method || 'GET';
    if (s.includes('quarantine_expires_at')) return jsonResponse([]);
    if (s.includes('next_scan_at')) return jsonResponse([nonError]);
    if (m === 'PATCH') return jsonResponse([]);
    if (s.includes('/storage/')) return new Response('safe');
    if (s.includes('/security_events')) return emptyResponse();
    throw 'plain';
  };
  const res3 = response();
  await malwareWorker({ method: 'POST', headers: { authorization: 'Bearer cron-secret' } }, res3);
  assert.equal(res3.body.failed, 1);
});

test('closes all media worker defensive branches and method guards', async () => {
  configureDb();
  const bare = {
    id: 'm',
    storage_path: undefined,
    bucket: undefined,
    original_name: '',
    mime_type: '',
    byte_size: null,
    sha256: 'x',
    metadata: null,
    scan_attempts: 0,
  };
  assert.match(mediaWorkerInternals.objectUrl(bare), /media-quarantine\/$/);
  process.env.NODE_ENV = 'production';
  process.env.MALWARE_SCAN_API_URL = 'https://scan.example';
  process.env.MALWARE_SCAN_API_KEY = 'key';
  globalThis.fetch = async () => new Response('nope', { status: 500 });
  await assert.rejects(() => mediaWorkerInternals.scan(bare, new Uint8Array([1])), /rejected:500/);
  globalThis.fetch = async () => jsonResponse({});
  await assert.rejects(
    () => mediaWorkerInternals.scan(bare, new Uint8Array([1])),
    /invalid_response/,
  );
  globalThis.fetch = async () => {
    throw new Error('network');
  };
  await assert.rejects(() => mediaWorkerInternals.scan(bare, new Uint8Array([1])), /network/);
  process.env.NODE_ENV = 'test';
  process.env.MALWARE_SCAN_TEST_MODE = 'true';
  let res = response();
  await mediaWorker({ method: 'DELETE', headers: { authorization: 'Bearer cron-secret' } }, res);
  assert.equal(res.statusCode, 405);
  res = response();
  await mediaWorker({ method: 'POST', headers: { authorization: 'bad' } }, res);
  assert.equal(res.statusCode, 401);
  const exp = { ...bare, id: 'exp', storage_path: 'exp' };
  const patches = [];
  globalThis.fetch = async (url, init = {}) => {
    const s = String(url),
      m = init.method || 'GET';
    if (s.includes('quarantine_expires_at')) return jsonResponse([exp]);
    if (s.includes('next_scan_at')) return jsonResponse(null);
    if (s.includes('/storage/') && m === 'DELETE') return emptyResponse();
    if (m === 'PATCH') {
      patches.push(JSON.parse(String(init.body)));
      return emptyResponse();
    }
    throw new Error('unexpected');
  };
  res = response();
  await mediaWorker({ method: 'POST', headers: { authorization: 'Bearer cron-secret' } }, res);
  assert.equal(res.body.expired, 1);
  assert.equal(res.body.processed, 0);
  assert.ok(patches.some((x) => x.scan_status === 'expired'));
  process.env.MALWARE_SCAN_TEST_MODE = 'false';
  delete process.env.MALWARE_SCAN_API_URL;
  delete process.env.MALWARE_SCAN_API_KEY;
  const retry = { ...bare, id: 'retry', storage_path: 'r', byte_size: 4, scan_attempts: 4 };
  globalThis.fetch = async (url, init = {}) => {
    const s = String(url),
      m = init.method || 'GET';
    if (s.includes('quarantine_expires_at')) return jsonResponse([]);
    if (s.includes('next_scan_at')) return jsonResponse([retry]);
    if (m === 'PATCH') return emptyResponse();
    if (s.includes('/storage/')) return new Response('safe');
    if (s.includes('/security_events')) return emptyResponse();
    throw 'plain';
  };
  res = response();
  await mediaWorker({ method: 'POST', headers: { authorization: 'Bearer cron-secret' } }, res);
  assert.equal(res.body.failed, 1);
});

test('closes production preflight raster/vector and factory evidence branches', () => {
  const base = { ...DEFAULT_CUSTOM_DESIGN, notes: 'notes' };
  const studio = createDefaultStudio(base);
  studio.layers = studio.layers.map((x) => ({
    ...x,
    content: x.content || 'TEXT',
    x: 50,
    y: 50,
    width: 10,
    fontLicenseStatus: 'built_in_licensed',
  }));
  const validPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAlgAAAJYCAIAAAAxBA+L';
  studio.layers.push({
    id: 'r1',
    type: 'logo',
    content: validPng,
    pixelWidth: 600,
    pixelHeight: 600,
    sourceSha256: 'a'.repeat(64),
    visible: true,
    x: 50,
    y: 50,
    width: 10,
  });
  studio.layers.push({
    id: 'r2',
    type: 'logo',
    content: 'data:image/png;base64,QUJDRA==',
    pixelWidth: 10,
    pixelHeight: 10,
    sourceSha256: 'b'.repeat(64),
    visible: true,
    x: 50,
    y: 50,
    width: 90,
  });
  studio.layers.push({
    id: 'svg',
    type: 'logo',
    content: 'data:image/svg+xml;base64,PHN2Zz4=',
    sourceFileName: '',
    sourceSha256: 'c'.repeat(64),
    vectorSourceValidated: true,
    visible: true,
    x: 50,
    y: 50,
    width: 10,
  });
  studio.layers.push({
    id: 'ai',
    type: 'logo',
    content: 'file',
    sourceFileName: 'logo.ai',
    sourceSha256: 'd'.repeat(64),
    vectorSourceValidated: true,
    visible: true,
    x: 50,
    y: 50,
    width: 10,
  });
  studio.layers.push({
    id: 'badfont',
    type: 'text',
    content: 'X',
    fontLicenseStatus: 'unknown',
    visible: true,
    x: 50,
    y: 50,
    width: 10,
  });
  const out = runProductionPreflight({ design: base, studio });
  assert.ok(out.blockers.some((x) => x.code === 'raster_below_minimum_dpi'));
  assert.ok(out.blockers.some((x) => x.code === 'font_license_unverified'));
  assert.ok(out.vectorAssets.some((x) => x.status === 'passed'));
  const colors = buildColorSpecifications(base);
  const incomplete = {
    approved: true,
    approvalStatus: 'approved',
    manufacturer: 'F',
    manufacturerLegalId: 'ID',
    certificateReference: 'c',
    certificateSha256: 'bad',
    templateVersion: 'bad',
    productTypes: ['other'],
    iccProfileReference: 'i',
    iccProfileSha256: 'bad',
    pantoneLibrary: 'p',
    pantoneLibraryVersion: '1',
    pantoneLibrarySha256: 'bad',
    deltaETolerance: 0,
    gradedPatternSha256: '',
    materialProfile: { fabricCode: '', stretchPercent: -1, shrinkagePercent: -1 },
    colorMeasurements: [],
  };
  const failed = runProductionPreflight({
    design: base,
    studio: {
      ...studio,
      layers: studio.layers.filter((x) => !['r1', 'r2', 'svg', 'ai', 'badfont'].includes(x.id)),
    },
    factoryApproval: incomplete,
  });
  assert.ok(failed.factoryValidation.errors.length >= 6);
  const missingMeasurements = {
    ...incomplete,
    certificateSha256: 'a'.repeat(64),
    templateVersion: 'generic-production-v2',
    productTypes: ['game-set'],
    iccProfileSha256: 'b'.repeat(64),
    pantoneLibrarySha256: 'c'.repeat(64),
    deltaETolerance: 2,
    gradedPatternSha256: 'd'.repeat(64),
    materialProfile: { fabricCode: 'f', stretchPercent: 0, shrinkagePercent: 0 },
    colorMeasurements: colors.map((c) => ({
      role: c.role,
      targetLab: rgbToLab(c.rgb),
      measuredLab: null,
    })),
  };
  const failed2 = runProductionPreflight({
    design: base,
    studio: {
      ...studio,
      layers: studio.layers.filter((x) => !['r1', 'r2', 'svg', 'ai', 'badfont'].includes(x.id)),
    },
    factoryApproval: missingMeasurements,
  });
  assert.ok(failed2.factoryValidation.errors.some((x) => x.startsWith('color_measurement_failed')));
});

test('closes final design-share, worker and preflight branch aliases', async () => {
  // design-share not-found mapping
  const designShareModule = await import('../api/design-share.js');
  const designShare = designShareModule.default;
  assert.equal(designShareModule.mapDesignShareError(new Error('expired')), 404);
  assert.equal(designShareModule.mapDesignShareError(new Error('offline')), 503);
  assert.equal(
    designShareModule.mapDesignShareError(Object.assign(new Error('x'), { status: 400 })),
    400,
  );
  process.env.NODE_ENV = 'test';
  process.env.SUPABASE_URL = 'https://db.example';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
  let designFetchCount = 0;
  globalThis.fetch = async () => {
    designFetchCount += 1;
    if (designFetchCount === 1) return jsonResponse(true);
    throw new Error('shared design expired');
  };
  let res = response();
  await designShare({ method: 'GET', query: { token: 'A'.repeat(48) }, headers: {} }, res);
  assert.equal(res.statusCode, 404);

  configureDb();
  process.env.MALWARE_SCAN_API_URL = 'https://scan.example';
  process.env.MALWARE_SCAN_API_KEY = 'key';
  const row = {
    id: 'clean-ext',
    storage_path: 'x',
    storage_bucket: 'b',
    original_name: 'x',
    byte_size: 4,
    sha256: 'a'.repeat(64),
    scan_attempts: 0,
  };
  globalThis.fetch = async (url, init = {}) => {
    const s = String(url),
      m = init.method || 'GET';
    if (s.includes('quarantine_expires_at')) return jsonResponse([]);
    if (s.includes('next_scan_at')) return jsonResponse([row]);
    if (m === 'PATCH') return jsonResponse([]);
    if (s.includes('/storage/')) return new Response('safe');
    if (s === 'https://scan.example') return jsonResponse({ verdict: 'clean' });
    throw new Error('unexpected');
  };
  res = response();
  await malwareWorker({ method: 'POST', headers: { authorization: 'Bearer cron-secret' } }, res);
  assert.equal(res.body.clean, 1);
  const rowString = { ...row, id: 'string-error' };
  globalThis.fetch = async (url, init = {}) => {
    const s = String(url),
      m = init.method || 'GET';
    if (s.includes('quarantine_expires_at')) return jsonResponse([]);
    if (s.includes('next_scan_at')) return jsonResponse([rowString]);
    if (m === 'PATCH') return jsonResponse([]);
    if (s.includes('/storage/')) throw 'storage-string';
    if (s.includes('/security_events')) return emptyResponse();
    throw new Error('unexpected');
  };
  res = response();
  await malwareWorker({ method: 'POST', headers: { authorization: 'Bearer cron-secret' } }, res);
  assert.equal(res.body.failed, 1);
  const expired = { ...row, id: 'expired-string' };
  globalThis.fetch = async (url, init = {}) => {
    const s = String(url),
      m = init.method || 'GET';
    if (s.includes('quarantine_expires_at')) return jsonResponse([expired]);
    if (s.includes('/storage/') && m === 'DELETE') throw 'delete-string';
    if (m === 'PATCH') return jsonResponse([]);
    if (s.includes('next_scan_at')) return jsonResponse([]);
    throw new Error('unexpected');
  };
  res = response();
  await malwareWorker({ method: 'POST', headers: { authorization: 'Bearer cron-secret' } }, res);
  assert.equal(res.body.expiryFailed, 1);

  const mrow = {
    id: 'media-string',
    storage_path: 'x',
    bucket: 'b',
    original_name: 'x',
    byte_size: 4,
    sha256: 'b'.repeat(64),
    scan_attempts: 4,
    metadata: null,
  };
  globalThis.fetch = async (url, init = {}) => {
    const s = String(url),
      m = init.method || 'GET';
    if (s.includes('quarantine_expires_at')) return jsonResponse([]);
    if (s.includes('next_scan_at')) return jsonResponse([mrow]);
    if (m === 'PATCH') return emptyResponse();
    if (s.includes('/storage/')) throw 'storage-string';
    if (s.includes('/security_events')) return emptyResponse();
    throw new Error('unexpected');
  };
  res = response();
  await mediaWorker({ method: 'POST', headers: { authorization: 'Bearer cron-secret' } }, res);
  assert.equal(res.body.failed, 1);
  const mexp = { ...mrow, id: 'media-exp' };
  globalThis.fetch = async (url, init = {}) => {
    const s = String(url),
      m = init.method || 'GET';
    if (s.includes('quarantine_expires_at')) return jsonResponse([mexp]);
    if (s.includes('/storage/') && m === 'DELETE') throw 'delete-string';
    if (m === 'PATCH') return emptyResponse();
    if (s.includes('next_scan_at')) return jsonResponse([]);
    throw new Error('unexpected');
  };
  res = response();
  await mediaWorker({ method: 'POST', headers: { authorization: 'Bearer cron-secret' } }, res);
  assert.equal(res.body.expiryFailed, 1);
  globalThis.fetch = async () => {
    throw 'outer-string';
  };
  res = response();
  await mediaWorker({ method: 'POST', headers: { authorization: 'Bearer cron-secret' } }, res);
  assert.equal(res.body.error, 'outer-string');

  assert.equal(readRasterDimensions(null), null);
  assert.equal(readRasterDimensions('data:image/png;base64,A'), null);
  const design = { ...DEFAULT_CUSTOM_DESIGN, notes: 'n' };
  const studio = createDefaultStudio(design);
  studio.layers = studio.layers.map((x) => ({
    ...x,
    content: x.content || 'TEXT',
    x: 50,
    y: 50,
    width: 10,
    fontLicenseStatus: 'built_in_licensed',
  }));
  studio.layers.push({
    id: 'declared-pass',
    type: 'logo',
    content: 'data:image/png;base64,QUJDRA==',
    pixelWidth: 100000,
    pixelHeight: 100000,
    sourceSha256: 'a'.repeat(64),
    visible: true,
    x: 50,
    y: 50,
    width: 10,
  });
  studio.layers.push({
    id: 'ai-null',
    type: 'logo',
    content: null,
    sourceFileName: 'logo.ai',
    sourceSha256: null,
    vectorSourceValidated: true,
    visible: true,
    x: 50,
    y: 50,
    width: 10,
  });
  const out = runProductionPreflight({
    design,
    studio,
    factoryApproval: {
      approved: true,
      approvalStatus: 'approved',
      manufacturer: 'F',
      manufacturerLegalId: 'ID',
      certificateReference: 'c',
      templateVersion: 'generic-production-v2',
      productTypes: ['game-set'],
      iccProfileReference: 'i',
      pantoneLibrary: 'p',
      pantoneLibraryVersion: '1',
      deltaETolerance: 2,
      gradedPatternSha256: 'd',
      materialProfile: { fabricCode: 'f', stretchPercent: 0, shrinkagePercent: 0 },
      colorMeasurements: [],
    },
  });
  assert.ok(out.rasterAssets.some((x) => x.status === 'passed'));
  assert.ok(out.vectorAssets.some((x) => x.status === 'unverified_vector_source'));
  assert.ok(out.factoryValidation.errors.includes('certificate_evidence_missing'));
  assert.ok(out.factoryValidation.errors.includes('icc_evidence_missing'));
  assert.ok(out.factoryValidation.errors.includes('pantone_evidence_missing'));
});

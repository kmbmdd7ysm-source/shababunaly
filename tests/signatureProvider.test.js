import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import {
  createSignatureEnvelope,
  getSignatureProviderConfig,
  normalizeSignatureEvent,
  verifySignatureWebhook,
} from '../api/signatures/provider.js';

const KEYS = [
  'SIGNATURE_PROVIDER', 'SIGNATURE_CREATE_ENVELOPE_URL', 'SIGNATURE_API_URL',
  'SIGNATURE_API_KEY', 'SIGNATURE_WEBHOOK_SECRET', 'SIGNATURE_PROVIDER_SCHEMA_VERSION',
  'SIGNATURE_PROVIDER_DOCS_URL', 'SIGNATURE_PROVIDER_SANDBOX_URL',
  'SIGNATURE_WEBHOOK_HEADER', 'SIGNATURE_TIMEOUT_MS',
];
const originalFetch = globalThis.fetch;
const reset = () => {
  for (const key of KEYS) delete process.env[key];
  globalThis.fetch = originalFetch;
};
const configure = () => {
  process.env.SIGNATURE_PROVIDER = 'Dropbox Sign';
  process.env.SIGNATURE_CREATE_ENVELOPE_URL = 'https://sign.example.test/envelopes';
  process.env.SIGNATURE_API_KEY = 'secret-key';
  process.env.SIGNATURE_WEBHOOK_SECRET = 'webhook-secret';
  process.env.SIGNATURE_PROVIDER_SCHEMA_VERSION = '2026-08-02';
  process.env.SIGNATURE_PROVIDER_DOCS_URL = 'https://docs.example.test/signatures';
  process.env.SIGNATURE_PROVIDER_SANDBOX_URL = 'https://sandbox.example.test';
};

test.afterEach(reset);

test('loads a named HTTPS signature provider and supports the base API URL fallback', () => {
  configure();
  assert.equal(getSignatureProviderConfig().createUrl, 'https://sign.example.test/envelopes');
  delete process.env.SIGNATURE_CREATE_ENVELOPE_URL;
  process.env.SIGNATURE_API_URL = 'https://sign.example.test/api/envelopes';
  assert.equal(getSignatureProviderConfig().createUrl, 'https://sign.example.test/api/envelopes');
});

test('rejects unnamed, generic, incomplete and non-HTTPS provider configuration', () => {
  assert.throws(() => getSignatureProviderConfig(), /signature_provider_missing/);
  configure();
  process.env.SIGNATURE_PROVIDER = 'generic-http-adapter';
  assert.throws(() => getSignatureProviderConfig(), /named_signature_provider_required/);
  configure();
  process.env.SIGNATURE_PROVIDER_DOCS_URL = 'http://docs.example.test';
  assert.throws(() => getSignatureProviderConfig(), /signature_https_required/);
  configure();
  delete process.env.SIGNATURE_API_KEY;
  assert.throws(() => getSignatureProviderConfig(), /signature_api_key_missing/);
});

test('creates a signature envelope with idempotency and rejects malformed provider responses', async () => {
  configure();
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://sign.example.test/envelopes');
    const headers = new Headers(options.headers);
    assert.equal(headers.get('Idempotency-Key'), 'contract:123');
    assert.equal(headers.get('Authorization'), 'Bearer secret-key');
    return new Response(JSON.stringify({
      envelope_id: 'env_123',
      signing_url: 'https://sign.example.test/session/123',
      status: 'sent',
      document_sha256: 'a'.repeat(64),
    }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  };
  const result = await createSignatureEnvelope({ idempotencyKey: 'contract:123', contractId: '123' });
  assert.deepEqual(result, {
    provider: 'dropbox sign',
    envelopeId: 'env_123',
    signingUrl: 'https://sign.example.test/session/123',
    expiresAt: null,
    documentSha256: 'a'.repeat(64),
    providerMetadata: { schemaVersion: '2026-08-02', providerStatus: 'sent' },
  });

  globalThis.fetch = async () => new Response('{}', { status: 200 });
  await assert.rejects(() => createSignatureEnvelope({ idempotencyKey: 'x' }), /invalid_signature_provider_response/);

  globalThis.fetch = async () => new Response('provider unavailable', { status: 503 });
  await assert.rejects(
    () => createSignatureEnvelope({ idempotencyKey: 'x' }),
    (error) => error.status === 502 && /signature_provider:503/.test(error.message),
  );
});

test('aborts an unresponsive signature provider using the configured timeout', async () => {
  configure();
  process.env.SIGNATURE_TIMEOUT_MS = '5';
  globalThis.fetch = (_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })), { once: true });
  });
  await assert.rejects(() => createSignatureEnvelope({ idempotencyKey: 'timeout' }), /aborted/);
});

test('verifies HMAC webhooks with a configurable header and rejects malformed signatures', () => {
  configure();
  process.env.SIGNATURE_WEBHOOK_HEADER = 'x-dropbox-signature';
  const raw = Buffer.from('{"event":"signed"}');
  const signature = createHmac('sha256', 'webhook-secret').update(raw).digest('hex');
  assert.equal(verifySignatureWebhook(raw, { 'x-dropbox-signature': `sha256=${signature}` }), true);
  assert.equal(verifySignatureWebhook(raw, { 'x-dropbox-signature': 'not-a-signature' }), false);
  assert.equal(verifySignatureWebhook(Buffer.from('tampered'), { 'x-dropbox-signature': signature }), false);
});

test('normalizes provider lifecycle events and preserves required signature evidence', () => {
  const normalized = normalizeSignatureEvent({
    schemaVersion: 'v1',
    event: {
      event_id: 'evt_1',
      envelope_id: 'env_1',
      status: 'completed',
      timestamp: '2026-08-02T00:00:00.000Z',
      evidence: {
        signed_document_url: 'https://sign.example.test/doc.pdf',
        signed_document_sha256: 'b'.repeat(64),
        audit_certificate_url: 'https://sign.example.test/audit.pdf',
        audit_certificate_sha256: 'c'.repeat(64),
      },
      identity_verification: { method: 'government_id', verified: true },
    },
  });
  assert.equal(normalized.status, 'signed');
  assert.equal(normalized.eventId, 'evt_1');
  assert.equal(normalized.signedDocumentSha256, 'b'.repeat(64));
  assert.equal(normalized.auditCertificateSha256, 'c'.repeat(64));
  assert.deepEqual(normalized.identityVerification, { method: 'government_id', verified: true });
  assert.throws(() => normalizeSignatureEvent({ status: 'unknown-state' }), /unsupported_signature_event/);
});

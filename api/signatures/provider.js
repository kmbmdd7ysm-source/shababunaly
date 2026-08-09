import { createHmac, timingSafeEqual } from 'node:crypto';

const clean = (value, max = 4000) =>
  String(value ?? '')
    .trim()
    .slice(0, max);
const optional = (name) => clean(process.env[name]);
const required = (name) => {
  const value = optional(name);
  if (!value) throw Object.assign(new Error(`${name.toLowerCase()}_missing`), { status: 503 });
  return value;
};
const safeJson = async (response) => {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text.slice(0, 1000) };
  }
};
const normalizeUrl = (value) => {
  const url = new URL(value);
  if (url.protocol !== 'https:')
    throw Object.assign(new Error('signature_https_required'), { status: 503 });
  return url.toString();
};

export function getSignatureProviderConfig() {
  const provider = required('SIGNATURE_PROVIDER').toLowerCase();
  if (/generic|adapter|http|test/i.test(provider))
    throw Object.assign(new Error('named_signature_provider_required'), { status: 503 });
  return {
    provider,
    createUrl: normalizeUrl(
      optional('SIGNATURE_CREATE_ENVELOPE_URL') || required('SIGNATURE_API_URL'),
    ),
    apiKey: required('SIGNATURE_API_KEY'),
    webhookSecret: required('SIGNATURE_WEBHOOK_SECRET'),
    schemaVersion: required('SIGNATURE_PROVIDER_SCHEMA_VERSION'),
    docsUrl: normalizeUrl(required('SIGNATURE_PROVIDER_DOCS_URL')),
    sandboxUrl: normalizeUrl(required('SIGNATURE_PROVIDER_SANDBOX_URL')),
  };
}

export async function createSignatureEnvelope(payload) {
  const config = getSignatureProviderConfig();
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    Number(process.env.SIGNATURE_TIMEOUT_MS || 15_000),
  );
  try {
    const response = await fetch(config.createUrl, {
      method: 'POST',
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
        'Idempotency-Key': payload.idempotencyKey,
        'X-SHABABUNA-Signature-Schema': config.schemaVersion,
      },
      body: JSON.stringify(payload),
    });
    const body = await safeJson(response);
    if (!response.ok)
      throw Object.assign(
        new Error(
          `signature_provider:${response.status}:${clean(body?.error || body?.message || body?.raw, 500)}`,
        ),
        { status: response.status >= 500 ? 502 : 422 },
      );
    const envelopeId = clean(
      body.envelopeId || body.envelope_id || body.signatureRequestId || body.signature_request_id,
      300,
    );
    const signingUrl = clean(
      body.signingUrl || body.signing_url || body.embeddedSigningUrl || body.embedded_signing_url,
      2000,
    );
    if (!envelopeId || !/^https:\/\//i.test(signingUrl))
      throw Object.assign(new Error('invalid_signature_provider_response'), { status: 502 });
    return {
      provider: config.provider,
      envelopeId,
      signingUrl,
      expiresAt: body.expiresAt || body.expires_at || null,
      documentSha256: clean(body.documentSha256 || body.document_sha256, 64).toLowerCase() || null,
      providerMetadata: {
        schemaVersion: config.schemaVersion,
        providerStatus: clean(body.status || 'sent', 60),
      },
    };
  } finally {
    clearTimeout(timer);
  }
}

export function verifySignatureWebhook(rawBody, headers) {
  const { webhookSecret } = getSignatureProviderConfig();
  const headerName = clean(
    process.env.SIGNATURE_WEBHOOK_HEADER || 'x-signature',
    100,
  ).toLowerCase();
  const received = clean(headers[headerName] || headers['x-shababuna-signature'], 1000).replace(
    /^sha256=/i,
    '',
  );
  if (!/^[0-9a-f]{64}$/i.test(received)) return false;
  const expected = createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(received, 'hex'));
}

export function normalizeSignatureEvent(payload) {
  const event = payload?.event || payload?.data || payload || {};
  const providerStatus = clean(
    event.status || event.eventStatus || event.event_type || event.type,
    80,
  ).toLowerCase();
  const statusMap = new Map([
    ['created', 'prepared'],
    ['prepared', 'prepared'],
    ['sent', 'sent'],
    ['delivered', 'sent'],
    ['viewed', 'viewed'],
    ['opened', 'viewed'],
    ['completed', 'signed'],
    ['signed', 'signed'],
    ['declined', 'declined'],
    ['rejected', 'declined'],
    ['expired', 'expired'],
    ['voided', 'void'],
    ['void', 'void'],
    ['failed', 'failed'],
    ['error', 'failed'],
  ]);
  const status = statusMap.get(providerStatus);
  if (!status) throw Object.assign(new Error('unsupported_signature_event'), { status: 400 });
  const evidence = event.evidence || event.documents || {};
  return {
    eventId: clean(event.eventId || event.event_id || payload?.eventId || payload?.event_id, 300),
    envelopeId: clean(
      event.envelopeId ||
        event.envelope_id ||
        event.signatureRequestId ||
        event.signature_request_id,
      300,
    ),
    status,
    eventAt: event.eventAt || event.event_at || event.timestamp || new Date().toISOString(),
    signedDocumentUrl:
      clean(
        evidence.signedDocumentUrl || evidence.signed_document_url || event.signedDocumentUrl,
        2000,
      ) || null,
    signedDocumentSha256:
      clean(
        evidence.signedDocumentSha256 ||
          evidence.signed_document_sha256 ||
          event.signedDocumentSha256,
        64,
      ).toLowerCase() || null,
    auditCertificateUrl:
      clean(
        evidence.auditCertificateUrl || evidence.audit_certificate_url || event.auditCertificateUrl,
        2000,
      ) || null,
    auditCertificateSha256:
      clean(
        evidence.auditCertificateSha256 ||
          evidence.audit_certificate_sha256 ||
          event.auditCertificateSha256,
        64,
      ).toLowerCase() || null,
    identityVerification: event.identityVerification || event.identity_verification || {},
    providerMetadata: {
      rawStatus: providerStatus,
      schemaVersion: clean(payload?.schemaVersion || payload?.schema_version, 80),
    },
  };
}

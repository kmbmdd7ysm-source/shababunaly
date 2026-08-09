import { createHash } from 'node:crypto';
import { getSupabaseAdminConfig } from '../_supabase-admin.ts';

const clean = (value, max = 4000) =>
  String(value ?? '')
    .trim()
    .slice(0, max);
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
function allowedHosts() {
  const explicit = clean(process.env.SIGNATURE_EVIDENCE_ALLOWED_HOSTS, 8000)
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  if (!explicit.length)
    throw Object.assign(new Error('signature_evidence_hosts_not_configured'), { status: 503 });
  return new Set(explicit);
}
function verifiedIdentity(value) {
  return (
    value?.verified === true ||
    ['verified', 'passed', 'complete', 'completed'].includes(clean(value?.status, 40).toLowerCase())
  );
}
async function downloadEvidence(urlValue, expectedHash, { maxBytes, kind }) {
  const url = new URL(urlValue);
  if (url.protocol !== 'https:' || !allowedHosts().has(url.hostname.toLowerCase()))
    throw Object.assign(new Error(`unapproved_${kind}_host`), { status: 422 });
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    Math.min(60_000, Math.max(1_000, Number(process.env.SIGNATURE_EVIDENCE_TIMEOUT_MS || 15_000))),
  );
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
      redirect: 'error',
      headers: {
        Accept:
          kind === 'signed_document' ? 'application/pdf' : 'application/pdf, application/json',
      },
    });
    if (!response.ok)
      throw Object.assign(new Error(`${kind}_download_failed:${response.status}`), { status: 502 });
    const declared = Number(response.headers.get('content-length') || 0);
    if (declared > maxBytes) throw Object.assign(new Error(`${kind}_too_large`), { status: 413 });
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (!bytes.byteLength || bytes.byteLength > maxBytes)
      throw Object.assign(new Error(`${kind}_too_large`), { status: 413 });
    if (
      kind === 'signed_document' &&
      Buffer.from(bytes.subarray(0, 5)).toString('ascii') !== '%PDF-'
    )
      throw Object.assign(new Error('signed_document_not_pdf'), { status: 422 });
    const computed = sha256(bytes);
    if (
      !/^[0-9a-f]{64}$/i.test(expectedHash || '') ||
      computed !== String(expectedHash).toLowerCase()
    )
      throw Object.assign(new Error(`${kind}_hash_mismatch`), { status: 422 });
    return {
      bytes,
      sha256: computed,
      contentType:
        clean(response.headers.get('content-type'), 120) ||
        (kind === 'signed_document' ? 'application/pdf' : 'application/octet-stream'),
    };
  } catch (error) {
    if (error?.name === 'AbortError')
      throw Object.assign(new Error(`${kind}_download_timeout`), { status: 504 });
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
async function storePrivateEvidence(path, evidence) {
  const { base, serviceKey } = getSupabaseAdminConfig();
  const encoded = path.split('/').map(encodeURIComponent).join('/');
  const response = await fetch(`${base}/storage/v1/object/contract-signature-evidence/${encoded}`, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': evidence.contentType,
      'x-upsert': 'true',
    },
    body: evidence.bytes,
  });
  if (!response.ok)
    throw Object.assign(new Error(`signature_evidence_storage_failed:${response.status}`), {
      status: 502,
    });
  return path;
}
export async function verifyAndStoreSignatureEvidence(event) {
  if (!verifiedIdentity(event.identityVerification))
    throw Object.assign(new Error('signature_identity_not_verified'), { status: 422 });
  const document = await downloadEvidence(event.signedDocumentUrl, event.signedDocumentSha256, {
    maxBytes: 25_000_000,
    kind: 'signed_document',
  });
  const certificate = await downloadEvidence(
    event.auditCertificateUrl,
    event.auditCertificateSha256,
    { maxBytes: 10_000_000, kind: 'audit_certificate' },
  );
  const basePath = `${clean(event.envelopeId, 200).replace(/[^A-Za-z0-9._-]/g, '_')}/${clean(event.eventId, 200).replace(/[^A-Za-z0-9._-]/g, '_')}`;
  const signedDocumentStoragePath = await storePrivateEvidence(
    `${basePath}/signed-document.pdf`,
    document,
  );
  const auditCertificateStoragePath = await storePrivateEvidence(
    `${basePath}/audit-certificate`,
    certificate,
  );
  return {
    signedDocumentStoragePath,
    auditCertificateStoragePath,
    signedDocumentSha256: document.sha256,
    auditCertificateSha256: certificate.sha256,
    verifiedAt: new Date().toISOString(),
  };
}
export { downloadEvidence, verifiedIdentity };

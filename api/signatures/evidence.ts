import { createHash } from 'node:crypto';
import { getSupabaseAdminConfig } from '../_supabase-admin.ts';

type EvidenceBlob = {
  bytes: Uint8Array;
  sha256: string;
  contentType: string;
};

const clean = (value: unknown, max = 4000): string =>
  String(value ?? '')
    .trim()
    .slice(0, max);

const sha256 = (bytes: Buffer | Uint8Array): string =>
  createHash('sha256').update(bytes).digest('hex');

function allowedHosts(): Set<string> {
  const explicit = clean(process.env.SIGNATURE_EVIDENCE_ALLOWED_HOSTS, 8000)
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  if (!explicit.length)
    throw Object.assign(new Error('signature_evidence_hosts_not_configured'), { status: 503 });
  return new Set(explicit);
}

export function verifiedIdentity(value: unknown): boolean {
  const record = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return (
    record.verified === true ||
    ['verified', 'passed', 'complete', 'completed'].includes(
      clean(record.status, 40).toLowerCase(),
    )
  );
}

export async function downloadEvidence(
  urlValue: string,
  expectedHash: string,
  { maxBytes, kind }: { maxBytes: number; kind: string },
): Promise<EvidenceBlob> {
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
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'name' in error &&
      (error as { name?: string }).name === 'AbortError'
    )
      throw Object.assign(new Error(`${kind}_download_timeout`), { status: 504 });
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function storePrivateEvidence(path: string, evidence: EvidenceBlob): Promise<string> {
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
    body: evidence.bytes as BodyInit,
  });
  if (!response.ok)
    throw Object.assign(new Error(`signature_evidence_storage_failed:${response.status}`), {
      status: 502,
    });
  return path;
}

export async function verifyAndStoreSignatureEvidence(event: Record<string, unknown>) {
  if (!verifiedIdentity(event.identityVerification))
    throw Object.assign(new Error('signature_identity_not_verified'), { status: 422 });
  const document = await downloadEvidence(
    String(event.signedDocumentUrl || ''),
    String(event.signedDocumentSha256 || ''),
    {
      maxBytes: 25_000_000,
      kind: 'signed_document',
    },
  );
  const certificate = await downloadEvidence(
    String(event.auditCertificateUrl || ''),
    String(event.auditCertificateSha256 || ''),
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

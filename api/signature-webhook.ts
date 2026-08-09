import { applyApiHeaders } from './_request-security.ts';
import { supabaseAdminRequest } from './_supabase-admin.ts';
import {
  getSignatureProviderConfig,
  normalizeSignatureEvent,
  verifySignatureWebhook,
} from './signatures/provider.ts';
import { verifyAndStoreSignatureEvidence } from './signatures/evidence.ts';

export const config = { api: { bodyParser: false } };

type ApiReq = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
} & AsyncIterable<Uint8Array | Buffer>;

type ApiRes = {
  setHeader: (n: string, v: string) => void;
  status: (c: number) => { json: (b: unknown) => unknown };
};

const MAX_BODY_BYTES = 256_000;
const clean = (value: unknown, max = 1000): string =>
  String(value ?? '')
    .trim()
    .slice(0, max);

async function rawBody(req: ApiReq): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buf.length;
    if (size > MAX_BODY_BYTES) throw Object.assign(new Error('request_too_large'), { status: 413 });
    chunks.push(buf);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req: ApiReq, res: ApiRes) {
  applyApiHeaders(res as never);
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  try {
    const raw = await rawBody(req);
    if (!verifySignatureWebhook(raw, req.headers || {}))
      return res.status(401).json({ ok: false, error: 'invalid_webhook_signature' });
    let payload: unknown;
    try {
      payload = JSON.parse(raw.toString('utf8'));
    } catch {
      return res.status(400).json({ ok: false, error: 'invalid_json' });
    }
    const event = normalizeSignatureEvent(payload);
    if (!event.eventId || !event.envelopeId)
      return res.status(400).json({ ok: false, error: 'invalid_signature_event' });
    const { provider } = getSignatureProviderConfig();
    if (event.status === 'signed') {
      const evidence = await verifyAndStoreSignatureEvidence(event);
      const record = (await supabaseAdminRequest(
        '/rest/v1/rpc/apply_verified_external_signature_event',
        {
          method: 'POST',
          body: JSON.stringify({
            p_provider: provider,
            p_provider_envelope_id: event.envelopeId,
            p_provider_event_id: event.eventId,
            p_provider_event_at: event.eventAt,
            p_signed_document_storage_path: evidence.signedDocumentStoragePath,
            p_signed_document_sha256: evidence.signedDocumentSha256,
            p_audit_certificate_storage_path: evidence.auditCertificateStoragePath,
            p_audit_certificate_sha256: evidence.auditCertificateSha256,
            p_identity_verification: event.identityVerification,
            p_provider_metadata: event.providerMetadata,
          }),
        },
      )) as Record<string, unknown> | null;
      return res.status(200).json({ ok: true, status: record?.provider_status || 'signed' });
    }
    const record = (await supabaseAdminRequest('/rest/v1/rpc/apply_external_signature_event', {
      method: 'POST',
      body: JSON.stringify({
        p_provider: provider,
        p_provider_envelope_id: event.envelopeId,
        p_provider_event_id: event.eventId,
        p_provider_status: event.status,
        p_provider_event_at: event.eventAt,
        p_signed_document_url: null,
        p_signed_document_sha256: null,
        p_audit_certificate_url: null,
        p_audit_certificate_sha256: null,
        p_identity_verification: event.identityVerification,
        p_provider_metadata: event.providerMetadata,
      }),
    })) as Record<string, unknown> | null;
    return res.status(200).json({ ok: true, status: record?.provider_status || event.status });
  } catch (error: unknown) {
    const status =
      error && typeof error === 'object' && 'status' in error
        ? Number((error as { status?: unknown }).status || 502)
        : 502;
    const message =
      error && typeof error === 'object' && 'message' in error
        ? (error as { message?: unknown }).message
        : 'signature_webhook_failed';
    return res.status(status).json({
      ok: false,
      error: clean(message || 'signature_webhook_failed', 300),
    });
  }
}

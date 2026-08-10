import { createHash } from 'node:crypto';
import { applyApiHeaders, guardPublicPost } from './_request-security.ts';
import { resolveSupabaseUser, supabaseUserRequest } from './_supabase-admin.ts';
import { createSignatureEnvelope } from './signatures/provider.ts';

const clean = (value: unknown, max = 1000): string =>
  String(value ?? '')
    .replace(/\0/g, '')
    .trim()
    .slice(0, max);
const sha = (value: unknown) => createHash('sha256').update(String(value)).digest('hex');

type ApiReq = { method?: string; body?: unknown; headers?: Record<string, string | string[] | undefined> };
type ApiRes = { setHeader: (n: string, v: string) => void; status: (c: number) => { json: (b: unknown) => unknown } };
export default async function handler(req: ApiReq, res: ApiRes) {
  applyApiHeaders(res);
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  if (
    !(await guardPublicPost(req, res, {
      maxBytes: 24_000,
      limit: 8,
      windowMs: 10 * 60_000,
      bucket: 'signature-envelope',
    }))
  )
    return;
  try {
    const authorization = clean(req.headers?.authorization, 6000);
    const user = await resolveSupabaseUser(authorization);
    if (!user) return res.status(401).json({ ok: false, error: 'authentication_required' });
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
    const contractId = clean(body.contractId, 80);
    const signerName = clean(body.signerName, 160);
    const signerEmail = clean(body.signerEmail || user.email, 320).toLowerCase();
    if (!/^[0-9a-f-]{36}$/i.test(contractId) || signerName.length < 2 || !signerEmail.includes('@'))
      return res.status(400).json({ ok: false, error: 'invalid_signature_details' });
    const rows = await supabaseUserRequest(
      `/rest/v1/organization_contracts?id=eq.${encodeURIComponent(contractId)}&select=id,contract_number,title,status,terms_version,valid_until,signature_mode,document_asset_id,terms&limit=1`,
      authorization,
    );
    const contract = Array.isArray(rows) ? rows[0] : null;
    if (!contract) return res.status(404).json({ ok: false, error: 'contract_not_found' });
    if (!['sent', 'viewed', 'changes_requested'].includes(contract.status))
      return res.status(409).json({ ok: false, error: 'contract_not_signable' });
    const siteUrl = clean(process.env.SITE_URL, 1000).replace(/\/$/, '');
    if (!/^https:\/\//i.test(siteUrl))
      throw Object.assign(new Error('site_url_https_required'), { status: 503 });
    const idempotencyKey = sha(`${contractId}:${user.id}:${contract.terms_version || '1.0'}`);
    const envelope = await createSignatureEnvelope({
      idempotencyKey,
      reference: contract.contract_number,
      title: contract.title,
      signer: { name: signerName, email: signerEmail, clientUserId: user.id },
      contract: {
        id: contract.id,
        termsVersion: contract.terms_version,
        terms: contract.terms || {},
        documentAssetId: contract.document_asset_id || null,
      },
      returnUrl: `${siteUrl}/account?section=workspace&signature=complete`,
      cancelUrl: `${siteUrl}/account?section=workspace&signature=cancelled`,
      webhookUrl: `${siteUrl}/api/signature-webhook`,
      requireAuditCertificate: true,
      requireIdentityVerification: true,
    });
    const saved = await supabaseUserRequest(
      '/rest/v1/rpc/customer_prepare_external_signature',
      authorization,
      {
        method: 'POST',
        body: JSON.stringify({
          p_contract_id: contractId,
          p_provider: envelope.provider,
          p_provider_envelope_id: envelope.envelopeId,
          p_signer_name: signerName,
          p_signer_email: signerEmail,
          p_signing_url: envelope.signingUrl,
          p_signing_url_expires_at: envelope.expiresAt,
          p_document_sha256: envelope.documentSha256,
          p_provider_metadata: envelope.providerMetadata,
        }),
      },
    );
    return res.status(200).json({ ok: true, signingUrl: envelope.signingUrl, envelope: saved });
  } catch (error: unknown) {
    const raw = clean((error && typeof error === 'object' && 'message' in error ? (error as {message?:unknown}).message : error) || error, 500);
    const client =
      /contract_not_found|contract_not_signable|contract_expired|invalid_signature|signer_details/.test(
        raw,
      );
    const statusCode =
      client
        ? 400
        : error && typeof error === 'object' && 'status' in error
          ? Number((error as { status?: unknown }).status || 503)
          : 503;
    return res
      .status(statusCode)
      .json({ ok: false, error: client ? raw.split(':').pop() : 'signature_provider_unavailable' });
  }
}

import { createHash } from 'node:crypto';
import { applyApiHeaders, guardPublicPost } from './_request-security.ts';
import { resolveSupabaseUser, supabaseUserRequest } from './_supabase-admin.ts';

const clean = (value: unknown, max = 1000): string =>
  String(value ?? '')
    .replace(/\0/g, '')
    .trim()
    .slice(0, max);
const hash = (value: unknown): string => createHash('sha256').update(String(value)).digest('hex');

type ApiReq = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
};
type ApiRes = {
  setHeader: (n: string, v: string) => void;
  status: (c: number) => { json: (b: unknown) => unknown };
};
export default async function handler(req: ApiReq, res: ApiRes) {
  applyApiHeaders(res as never);
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  if (
    !(await guardPublicPost(req as never, res as never, {
      maxBytes: 24_000,
      limit: 10,
      windowMs: 10 * 60_000,
      bucket: 'contract-sign',
    }))
  )
    return;
  try {
    const authorization = clean(req.headers?.authorization, 6000);
    const user = await resolveSupabaseUser(authorization);
    if (!user) return res.status(401).json({ ok: false, error: 'authentication_required' });
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<
      string,
      unknown
    >;
    const contractId = clean(body.contractId, 80);
    const signerName = clean(body.signerName, 160);
    const signerEmail = clean(body.signerEmail || user.email, 320).toLowerCase();
    const signatureType = clean(body.signatureType || 'typed', 30);
    const signatureValue = clean(body.signatureValue, 1000);
    const consentVersion = clean(body.consentVersion || '1.0', 80);
    if (
      !/^[0-9a-f-]{36}$/i.test(contractId) ||
      signerName.length < 2 ||
      !signerEmail.includes('@') ||
      signatureValue.length < 2
    )
      return res.status(400).json({ ok: false, error: 'invalid_signature_details' });
    const canonical = JSON.stringify({
      contractId,
      signerName,
      signerEmail,
      signatureType,
      signatureValue,
      consentVersion,
      userId: user.id,
    });
    const payload = {
      p_contract_id: contractId,
      p_signer_name: signerName,
      p_signer_email: signerEmail,
      p_signature_type: signatureType,
      p_signature_hash: hash(`${signatureValue}:${user.id}:${contractId}`),
      p_consent_text_version: consentVersion,
      p_signed_payload_hash: hash(canonical),
      p_ip_hash: hash(
        clean(req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || '', 300),
      ),
      p_user_agent_hash: hash(clean(req.headers?.['user-agent'], 1000)),
    };
    const data = await supabaseUserRequest('/rest/v1/rpc/customer_sign_contract', authorization, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.status(200).json({ ok: true, contract: data });
  } catch (error: unknown) {
    const raw = clean(
      (error && typeof error === 'object' && 'message' in error
        ? (error as { message?: unknown }).message
        : error) || error,
      240,
    );
    const client =
      /authentication_required|invalid_signature|contract_not_found|contract_not_signable|contract_expired|signer_details_required/.test(
        raw,
      );
    return res
      .status(
        client
          ? 400
          : (error && typeof error === 'object' && 'status' in error
              ? Number((error as { status?: unknown }).status)
              : undefined) || 503,
      )
      .json({ ok: false, error: client ? raw.split(':').pop() : 'contract_sign_unavailable' });
  }
}

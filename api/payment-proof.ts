import { randomUUID } from 'node:crypto';
import { applyApiHeaders, guardPublicPost } from './_request-security.ts';
import {
  resolveSupabaseUser,
  getSupabaseAdminConfig,
  supabaseAdminRequest,
  supabaseUserRequest,
} from './_supabase-admin.ts';
import { validateEncodedFiles } from './_file-security.ts';

type ApiReq = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
};
type ApiRes = {
  setHeader: (n: string, v: string) => void;
  status: (c: number) => { json: (b: unknown) => unknown };
};

type EncodedFile = {
  name: string;
  extension: string;
  detectedMime: string;
  byteSize: number;
  sha256: string;
  buffer: Buffer | Uint8Array;
};

const clean = (value: unknown, max = 1000): string =>
  String(value ?? '')
    .replace(/\0/g, '')
    .trim()
    .slice(0, max);

async function upload(
  bucket: string,
  path: string,
  buffer: Buffer | Uint8Array,
  mime: string,
): Promise<void> {
  const { base, serviceKey } = getSupabaseAdminConfig();
  const encoded = path.split('/').map(encodeURIComponent).join('/');
  const response = await fetch(
    `${base}/storage/v1/object/${encodeURIComponent(bucket)}/${encoded}`,
    {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': mime,
        'x-upsert': 'false',
      },
      body: buffer as BodyInit,
    },
  );
  if (!response.ok) throw new Error(`storage_upload_failed:${response.status}`);
}

export default async function handler(req: ApiReq, res: ApiRes) {
  applyApiHeaders(res as never);
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  if (
    !(await guardPublicPost(req as never, res as never, {
      maxBytes: 3_100_000,
      limit: 8,
      windowMs: 10 * 60_000,
      bucket: 'payment-proof',
    }))
  )
    return;
  let assetId = '';
  try {
    const authorization = clean(req.headers?.authorization, 6000);
    const user = await resolveSupabaseUser(authorization);
    if (!user) return res.status(401).json({ ok: false, error: 'authentication_required' });
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<
      string,
      unknown
    >;
    const entityType = clean(body.entityType, 20);
    const entityId = clean(body.entityId, 100);
    const amount = Number(body.amount);
    const currency = clean(body.currency || 'USD', 3).toUpperCase();
    if (
      !['order', 'quote', 'invoice'].includes(entityType) ||
      !entityId ||
      !Number.isFinite(amount) ||
      amount <= 0
    )
      return res.status(400).json({ ok: false, error: 'invalid_payment_proof_details' });
    const files = validateEncodedFiles(body.files) as EncodedFile[];
    const first = files[0];
    if (
      files.length !== 1 ||
      !first ||
      !['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(first.detectedMime)
    )
      return res.status(400).json({ ok: false, error: 'one_payment_proof_file_required' });
    const file = first;
    assetId = randomUUID();
    const bucket = process.env.MEDIA_QUARANTINE_BUCKET || 'media-quarantine';
    const path = `payment-proofs/${user.id}/${assetId}.${file.extension}`;
    await upload(bucket, path, file.buffer, file.detectedMime);
    const rows = (await supabaseAdminRequest('/rest/v1/media_assets?select=*', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        id: assetId,
        owner_user_id: user.id,
        entity_type: 'payment_proof',
        entity_id: entityId,
        bucket,
        storage_path: path,
        original_name: file.name,
        mime_type: file.detectedMime,
        byte_size: file.byteSize,
        sha256: file.sha256,
        scan_status: 'quarantined',
        visibility: 'private',
        metadata: { entityType },
      }),
    })) as Array<Record<string, unknown>>;
    const asset = Array.isArray(rows) ? rows[0] : null;
    if (!asset?.id) throw new Error('media_asset_create_failed');
    const proof = await supabaseUserRequest(
      '/rest/v1/rpc/customer_register_payment_proof',
      authorization,
      {
        method: 'POST',
        body: JSON.stringify({
          p_entity_type: entityType,
          p_entity_id: entityId,
          p_media_asset_id: asset.id,
          p_amount: amount,
          p_currency: currency,
          p_payment_method: clean(body.paymentMethod || 'bank_transfer', 80),
          p_reference: clean(body.reference, 240),
          p_note: clean(body.note, 2000),
        }),
      },
    );
    return res
      .status(201)
      .json({ ok: true, proof, asset: { id: asset.id, scanStatus: asset.scan_status } });
  } catch (error: unknown) {
    if (assetId) {
      try {
        await supabaseAdminRequest(`/rest/v1/media_assets?id=eq.${encodeURIComponent(assetId)}`, {
          method: 'DELETE',
        });
      } catch {
        /* ignore */
      }
    }
    const raw = clean(
      error && typeof error === 'object' && 'message' in error
        ? (error as { message?: unknown }).message
        : error,
      240,
    );
    const client = /invalid_|required|unsupported_file|file_signature|file_mime|one_payment/.test(
      raw,
    );
    const status =
      client
        ? 400
        : error && typeof error === 'object' && 'status' in error
          ? Number((error as { status?: unknown }).status || 503)
          : 503;
    return res
      .status(status)
      .json({ ok: false, error: client ? raw.split(':').pop() : 'payment_proof_unavailable' });
  }
}

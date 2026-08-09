import { randomUUID } from 'node:crypto';
import { requireStaffSession } from './_staff-auth.ts';
import { validateEncodedFiles } from './_file-security.ts';
import { getSupabaseAdminConfig, supabaseAdminRequest } from './_supabase-admin.ts';
import { applyApiHeaders } from './_request-security.ts';

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

const json = (res: ApiRes, status: number, body: unknown) => res.status(status).json(body);

async function uploadObject(
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
    return json(res, 405, { ok: false, error: 'method_not_allowed' });
  }
  try {
    const staff = (await requireStaffSession(req as never, { requireAal2: true })) as {
      user: { id?: string };
      role?: string;
    };
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<
      string,
      unknown
    >;
    const entityType = clean(body.entityType, 80);
    const entityId = clean(body.entityId, 160);
    const assetRole = clean(body.assetRole || 'proof', 40);
    if (
      !entityType ||
      !entityId ||
      !['logo', 'sponsor', 'reference', 'proof', 'production', 'tech_pack'].includes(assetRole)
    )
      return json(res, 400, { ok: false, error: 'invalid_media_target' });
    const files = validateEncodedFiles(body.files) as EncodedFile[];
    if (!files.length) return json(res, 400, { ok: false, error: 'file_required' });
    const bucket = process.env.MEDIA_QUARANTINE_BUCKET || 'media-quarantine';
    const assets: Array<Record<string, unknown> | undefined> = [];
    for (const file of files) {
      const id = randomUUID();
      const path = `${entityType}/${entityId}/${id}.${file.extension}`;
      await uploadObject(bucket, path, file.buffer, file.detectedMime);
      const rows = (await supabaseAdminRequest('/rest/v1/media_assets?select=*', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          id,
          owner_user_id: staff.user.id,
          entity_type: entityType,
          entity_id: entityId,
          bucket,
          storage_path: path,
          original_name: file.name,
          mime_type: file.detectedMime,
          byte_size: file.byteSize,
          sha256: file.sha256,
          scan_status: 'quarantined',
          visibility: 'private',
          metadata: { assetRole, uploadedByRole: staff.role },
        }),
      })) as Array<Record<string, unknown>>;
      const asset = Array.isArray(rows) ? rows[0] : undefined;
      if (entityType === 'design' && asset) {
        await supabaseAdminRequest('/rest/v1/design_assets', {
          method: 'POST',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({
            design_id: entityId,
            media_asset_id: asset.id,
            asset_role: assetRole,
          }),
        });
      }
      assets.push(asset);
    }
    return json(res, 200, { ok: true, assets });
  } catch (error: unknown) {
    const status =
      error && typeof error === 'object' && 'status' in error
        ? Number((error as { status?: unknown }).status || 500)
        : 500;
    const message =
      error && typeof error === 'object' && 'message' in error
        ? (error as { message?: unknown }).message
        : error;
    return json(res, status, {
      ok: false,
      error: clean(message || error, 160),
    });
  }
}

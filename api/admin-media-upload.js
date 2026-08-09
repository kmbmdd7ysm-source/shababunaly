import { randomUUID } from 'node:crypto';
import { requireStaffSession } from './_staff-auth.ts';
import { validateEncodedFiles } from './_file-security.js';
import { getSupabaseAdminConfig, supabaseAdminRequest } from './_supabase-admin.js';
import { applyApiHeaders } from './_request-security.js';
const clean = (value, max = 1000) =>
  String(value ?? '')
    .replace(/\0/g, '')
    .trim()
    .slice(0, max);
const json = (res, status, body) => res.status(status).json(body);
async function uploadObject(bucket, path, buffer, mime) {
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
      body: buffer,
    },
  );
  if (!response.ok) throw new Error(`storage_upload_failed:${response.status}`);
}
export default async function handler(req, res) {
  applyApiHeaders(res);
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { ok: false, error: 'method_not_allowed' });
  }
  try {
    const staff = await requireStaffSession(req, { requireAal2: true });
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const entityType = clean(body.entityType, 80);
    const entityId = clean(body.entityId, 160);
    const assetRole = clean(body.assetRole || 'proof', 40);
    if (
      !entityType ||
      !entityId ||
      !['logo', 'sponsor', 'reference', 'proof', 'production', 'tech_pack'].includes(assetRole)
    )
      return json(res, 400, { ok: false, error: 'invalid_media_target' });
    const files = validateEncodedFiles(body.files);
    if (!files.length) return json(res, 400, { ok: false, error: 'file_required' });
    const bucket = process.env.MEDIA_QUARANTINE_BUCKET || 'media-quarantine';
    const assets = [];
    for (const file of files) {
      const id = randomUUID();
      const path = `${entityType}/${entityId}/${id}.${file.extension}`;
      await uploadObject(bucket, path, file.buffer, file.detectedMime);
      const rows = await supabaseAdminRequest('/rest/v1/media_assets?select=*', {
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
      });
      const asset = rows?.[0];
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
  } catch (error) {
    return json(res, error?.status || 500, {
      ok: false,
      error: clean(error?.message || error, 160),
    });
  }
}

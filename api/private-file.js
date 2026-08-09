import { applyApiHeaders } from './_request-security.ts';
import {
  getSupabaseAdminConfig,
  resolveSupabaseUser,
  supabaseAdminRequest,
} from './_supabase-admin.ts';

const clean = (value, max = 1000) =>
  String(value ?? '')
    .trim()
    .slice(0, max);
const STAFF_ROLES = new Set(['super_admin', 'admin', 'operations', 'sales']);

async function signedStorageUrl(bucket, path) {
  const { base, serviceKey } = getSupabaseAdminConfig();
  const encodedPath = String(path).split('/').map(encodeURIComponent).join('/');
  const response = await fetch(
    `${base}/storage/v1/object/sign/${encodeURIComponent(bucket)}/${encodedPath}`,
    {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expiresIn: 300 }),
      cache: 'no-store',
    },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.signedURL) throw new Error('signed_url_failed');
  return `${base}/storage/v1${data.signedURL}`;
}

export default async function handler(req, res) {
  applyApiHeaders(res);
  res.setHeader('Cache-Control', 'no-store, private');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  try {
    const user = await resolveSupabaseUser(req.headers.authorization);
    if (!user) return res.status(401).json({ ok: false, error: 'authentication_required' });
    const fileId = clean(req.query?.id || req.query?.assetId, 80);
    if (!/^[0-9a-f-]{36}$/i.test(fileId))
      return res.status(400).json({ ok: false, error: 'invalid_file_id' });

    const role = clean(user.app_metadata?.role, 80);
    const staff = STAFF_ROLES.has(role);

    const specialRows = await supabaseAdminRequest(
      `/rest/v1/special_request_files?select=*,special_requests!inner(user_id)&id=eq.${encodeURIComponent(fileId)}&limit=1`,
    ).catch(() => []);
    const special = Array.isArray(specialRows) ? specialRows[0] : null;
    if (special) {
      if (!staff && special.special_requests?.user_id !== user.id)
        return res.status(403).json({ ok: false, error: 'forbidden' });
      if (special.quarantine_status !== 'clean')
        return res.status(423).json({ ok: false, error: 'file_not_cleared' });
      return res.status(200).json({
        ok: true,
        url: await signedStorageUrl(special.storage_bucket, special.storage_path),
        expiresIn: 300,
        name: special.original_name,
        mime: special.detected_mime,
      });
    }

    const assetRows = await supabaseAdminRequest(
      `/rest/v1/media_assets?select=*&id=eq.${encodeURIComponent(fileId)}&limit=1`,
    ).catch(() => []);
    const asset = Array.isArray(assetRows) ? assetRows[0] : null;
    if (!asset) return res.status(404).json({ ok: false, error: 'file_not_found' });
    if (!staff && asset.owner_user_id !== user.id)
      return res.status(403).json({ ok: false, error: 'forbidden' });
    if (asset.scan_status !== 'clean')
      return res.status(423).json({ ok: false, error: 'file_not_cleared' });

    return res.status(200).json({
      ok: true,
      url: await signedStorageUrl(asset.bucket, asset.storage_path),
      expiresIn: 300,
      name: asset.original_name,
      mime: asset.mime_type,
    });
  } catch (error) {
    return res.status(503).json({ ok: false, error: clean(error?.message || error, 160) });
  }
}

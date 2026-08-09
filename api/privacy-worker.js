import { randomUUID } from 'node:crypto';
import { getSupabaseAdminConfig, supabaseAdminRequest } from './_supabase-admin.js';
import { applyApiHeaders } from './_request-security.js';

const clean = (value, max = 1000) =>
  String(value ?? '')
    .replace(/\0/g, '')
    .trim()
    .slice(0, max);
const json = (res, status, body) => res.status(status).json(body);
const authorized = (req) =>
  Boolean(process.env.CRON_SECRET) &&
  clean(req.headers.authorization, 800) === `Bearer ${clean(process.env.CRON_SECRET, 500)}`;

async function fetchRows(table, userId, foreign = 'user_id') {
  try {
    return await supabaseAdminRequest(
      `/rest/v1/${table}?select=*&${foreign}=eq.${encodeURIComponent(userId)}&limit=1000`,
    );
  } catch {
    return [];
  }
}

async function upload(bucket, path, bytes) {
  const { base, serviceKey } = getSupabaseAdminConfig();
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  const response = await fetch(
    `${base}/storage/v1/object/${encodeURIComponent(bucket)}/${encodedPath}`,
    {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'x-upsert': 'false',
      },
      body: bytes,
    },
  );
  if (!response.ok) throw new Error(`privacy_export_upload_failed:${response.status}`);
}

async function buildExport(userId) {
  const [
    profiles,
    userState,
    addresses,
    orders,
    quotes,
    designs,
    rosters,
    returns,
    specialRequests,
    organizations,
    organizationMemberships,
    privacyRequests,
  ] = await Promise.all([
    fetchRows('profiles', userId, 'id'),
    fetchRows('user_state', userId),
    fetchRows('addresses', userId),
    fetchRows('orders', userId),
    fetchRows('quote_requests', userId),
    fetchRows('custom_designs', userId),
    fetchRows('team_rosters', userId),
    fetchRows('return_requests', userId),
    fetchRows('special_requests', userId),
    fetchRows('organizations', userId, 'created_by'),
    fetchRows('organization_members', userId),
    fetchRows('privacy_export_requests', userId),
  ]);

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    userId,
    profiles,
    userState,
    addresses,
    orders,
    quotes,
    designs,
    rosters,
    returns,
    specialRequests,
    organizations,
    organizationMemberships,
    privacyRequests,
  };
}

export default async function handler(req, res) {
  applyApiHeaders(res);
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return json(res, 405, { ok: false, error: 'method_not_allowed' });
  }
  if (!authorized(req)) return json(res, 401, { ok: false, error: 'unauthorized' });

  try {
    const requests = await supabaseAdminRequest(
      '/rest/v1/privacy_export_requests?select=*&status=eq.requested&order=created_at.asc&limit=5',
    );
    let ready = 0;
    let failed = 0;

    for (const request of requests || []) {
      try {
        const now = new Date().toISOString();
        await supabaseAdminRequest(`/rest/v1/privacy_export_requests?id=eq.${request.id}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ status: 'processing', updated_at: now }),
        });

        const userId = request.user_id;
        const data = await buildExport(userId);
        const bytes = Buffer.from(JSON.stringify(data, null, 2));
        const assetId = randomUUID();
        const bucket = process.env.PRIVACY_EXPORT_BUCKET || 'privacy-exports';
        const path = `${userId}/${request.id}.json`;
        await upload(bucket, path, bytes);

        const assets = await supabaseAdminRequest('/rest/v1/media_assets?select=*', {
          method: 'POST',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({
            id: assetId,
            owner_user_id: userId,
            entity_type: 'privacy_export',
            entity_id: request.id,
            bucket,
            storage_path: path,
            original_name: `shababuna-privacy-export-${request.id}.json`,
            mime_type: 'application/json',
            byte_size: bytes.length,
            scan_status: 'clean',
            visibility: 'private',
            metadata: { generated: true, schemaVersion: 1 },
          }),
        });

        await supabaseAdminRequest(`/rest/v1/privacy_export_requests?id=eq.${request.id}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({
            status: 'ready',
            export_asset_id: assets?.[0]?.id || assetId,
            expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString(),
            error_message: null,
            updated_at: new Date().toISOString(),
          }),
        });
        ready += 1;
      } catch (error) {
        await supabaseAdminRequest(`/rest/v1/privacy_export_requests?id=eq.${request.id}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({
            status: 'failed',
            error_message: clean(error?.message || error, 1000),
            updated_at: new Date().toISOString(),
          }),
        });
        failed += 1;
      }
    }

    return json(res, 200, { ok: true, processed: (requests || []).length, ready, failed });
  } catch (error) {
    return json(res, 503, { ok: false, error: clean(error?.message || error, 200) });
  }
}

import { getSupabaseAdminConfig, supabaseAdminRequest } from './_supabase-admin.ts';
import { applyApiHeaders } from './_request-security.js';

const clean = (value, max = 1000) =>
  String(value ?? '')
    .replace(/\0/g, '')
    .trim()
    .slice(0, max);
const json = (res, status, body) => res.status(status).json(body);
const errorText = (error, max = 1000) => clean(error instanceof Error ? error.message : error, max);
const securityEvent = (severity, eventType, message, context = {}) =>
  supabaseAdminRequest('/rest/v1/security_events', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      severity,
      source: 'media-malware-worker',
      event_type: eventType,
      message,
      context,
    }),
  }).catch(() => null);
const authorized = (req) => {
  const secret = clean(process.env.CRON_SECRET, 500);
  return Boolean(secret) && clean(req.headers.authorization, 800) === `Bearer ${secret}`;
};
const objectUrl = (row) => {
  const { base } = getSupabaseAdminConfig();
  const path = String(row.storage_path || '')
    .split('/')
    .map(encodeURIComponent)
    .join('/');
  return `${base}/storage/v1/object/${encodeURIComponent(row.bucket || 'media-quarantine')}/${path}`;
};
const storageHeaders = () => {
  const { serviceKey } = getSupabaseAdminConfig();
  return { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
};
async function download(row) {
  const response = await fetch(objectUrl(row), { headers: storageHeaders(), cache: 'no-store' });
  if (!response.ok) throw new Error(`storage_download_failed:${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (row.byte_size != null && bytes.byteLength !== Number(row.byte_size))
    throw new Error('stored_file_size_mismatch');
  return bytes;
}
async function remove(row) {
  const response = await fetch(objectUrl(row), {
    method: 'DELETE',
    headers: storageHeaders(),
    cache: 'no-store',
  });
  if (!response.ok && response.status !== 404)
    throw new Error(`storage_delete_failed:${response.status}`);
}
async function scan(row, bytes) {
  const endpoint = clean(process.env.MALWARE_SCAN_API_URL, 1500);
  const token = clean(process.env.MALWARE_SCAN_API_KEY, 5000);
  const test =
    process.env.NODE_ENV !== 'production' && process.env.MALWARE_SCAN_TEST_MODE === 'true';
  if (test) {
    const infected = Buffer.from(bytes)
      .toString('utf8')
      .includes('EICAR-STANDARD-ANTIVIRUS-TEST-FILE');
    return {
      verdict: infected ? 'infected' : 'clean',
      provider: 'test-scanner',
      reference: `test:${row.sha256}`,
    };
  }
  if (!endpoint || !token || !/^https:\/\//i.test(endpoint))
    throw new Error('malware_scanner_not_configured');
  const controller = new AbortController();
  const minimumTimeout = process.env.NODE_ENV === 'test' ? 5 : 1_000;
  const timeoutMs = Math.min(
    120_000,
    Math.max(minimumTimeout, Number(process.env.MALWARE_SCAN_TIMEOUT_MS || 30_000)),
  );
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': row.mime_type || 'application/octet-stream',
        Authorization: `Bearer ${token}`,
        'X-File-Name': encodeURIComponent(clean(row.original_name, 180)),
        'X-File-SHA256': clean(row.sha256, 64),
      },
      body: bytes,
      signal: controller.signal,
      cache: 'no-store',
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`malware_scanner_rejected:${response.status}`);
    const verdict = clean(
      data.verdict || (data.clean === true ? 'clean' : data.infected === true ? 'infected' : ''),
      40,
    ).toLowerCase();
    if (!['clean', 'infected'].includes(verdict))
      throw new Error('malware_scanner_invalid_response');
    const result = {
      verdict,
      provider: clean(data.provider || process.env.MALWARE_SCAN_PROVIDER || 'external', 120),
      reference: clean(data.reference || data.scanId || data.id, 240),
      raw: data,
    };
    clearTimeout(timeout);
    return result;
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === 'AbortError')
      throw new Error('malware_scanner_timeout');
    throw error;
  }
}
const update = (id, patch) =>
  supabaseAdminRequest(`/rest/v1/media_assets?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(patch),
  });
async function expire() {
  const rows = await supabaseAdminRequest(
    '/rest/v1/media_assets?select=*&scan_status=in.(quarantined,failed)&quarantine_expires_at=lte.now()&order=created_at.asc&limit=50',
  );
  let expired = 0;
  let failed = 0;
  for (const row of rows || []) {
    try {
      await remove(row);
      await update(row.id, {
        scan_status: 'expired',
        storage_deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: { ...(row.metadata || {}), expiryReason: 'quarantine_expired' },
      });
      expired += 1;
    } catch (error) {
      await update(row.id, {
        metadata: { ...(row.metadata || {}), expiryError: errorText(error, 1000) },
        updated_at: new Date().toISOString(),
      });
      failed += 1;
    }
  }
  return { expired, failed };
}

export default async function handler(req, res) {
  applyApiHeaders(res);
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return json(res, 405, { ok: false, error: 'method_not_allowed' });
  }
  if (!authorized(req)) return json(res, 401, { ok: false, error: 'unauthorized' });
  try {
    const expiry = await expire();
    const rows = await supabaseAdminRequest(
      '/rest/v1/media_assets?select=*&scan_status=in.(quarantined,failed)&next_scan_at=lte.now()&scan_attempts=lt.5&order=created_at.asc&limit=10',
    );
    let cleanCount = 0;
    let infectedCount = 0;
    let failedCount = 0;
    for (const row of rows || []) {
      try {
        const attempts = Number(row.scan_attempts || 0) + 1;
        await update(row.id, {
          scan_status: 'scanning',
          scan_attempts: attempts,
          updated_at: new Date().toISOString(),
        });
        const bytes = await download(row);
        const result = await scan(row, bytes);
        const infected = result.verdict === 'infected';
        if (infected) await remove(row);
        await update(row.id, {
          scan_status: infected ? 'infected' : 'clean',
          storage_deleted_at: infected ? new Date().toISOString() : null,
          metadata: {
            ...(row.metadata || {}),
            antivirusProvider: result.provider,
            antivirusReference: result.reference,
            scanResult: result.raw || { verdict: result.verdict },
          },
          updated_at: new Date().toISOString(),
        });
        if (infected) {
          infectedCount += 1;
          await securityEvent(
            'critical',
            'malware_infected_media_rejected',
            'An infected media file was deleted from quarantine.',
            { mediaAssetId: row.id, sha256: row.sha256, provider: result.provider },
          );
        } else cleanCount += 1;
      } catch (error) {
        const attempts = Number(row.scan_attempts || 0) + 1;
        await update(row.id, {
          scan_status: 'failed',
          scan_attempts: attempts,
          next_scan_at: new Date(
            Date.now() + Math.min(360, 2 ** Math.min(attempts, 8)) * 60_000,
          ).toISOString(),
          metadata: { ...(row.metadata || {}), lastScanError: errorText(error, 1000) },
          updated_at: new Date().toISOString(),
        });
        if (attempts >= 5)
          await securityEvent(
            'critical',
            'media_scan_retries_exhausted',
            'A quarantined media file exhausted all malware scan retries and remains blocked.',
            { mediaAssetId: row.id, attempts, error: errorText(error, 300) },
          );
        failedCount += 1;
      }
    }
    return json(res, 200, {
      ok: true,
      processed: (rows || []).length,
      clean: cleanCount,
      infected: infectedCount,
      failed: failedCount,
      expired: expiry.expired,
      expiryFailed: expiry.failed,
    });
  } catch (error) {
    return json(res, 503, { ok: false, error: errorText(error, 200) });
  }
}

export const mediaWorkerInternals = Object.freeze({
  authorized,
  objectUrl,
  storageHeaders,
  download,
  remove,
  scan,
  update,
  expire,
  errorText,
});

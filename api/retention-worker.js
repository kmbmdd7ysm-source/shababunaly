import { supabaseAdminRequest } from './_supabase-admin.js';
import { applyApiHeaders } from './_request-security.js';

const clean = (value, max = 1000) => String(value ?? '').replace(/\0/g, '').trim().slice(0, max);
const json = (res, status, body) => res.status(status).json(body);
const authorized = (req) => Boolean(process.env.CRON_SECRET)
  && clean(req.headers.authorization, 800) === `Bearer ${clean(process.env.CRON_SECRET, 500)}`;

export default async function handler(req, res) {
  applyApiHeaders(res);
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return json(res, 405, { ok: false, error: 'method_not_allowed' });
  }
  if (!authorized(req)) return json(res, 401, { ok: false, error: 'unauthorized' });

  try {
    const now = new Date().toISOString();
    const securityCutoff = new Date(
      Date.now() - Number(process.env.SECURITY_EVENT_RETENTION_DAYS || 180) * 86_400_000,
    ).toISOString();
    const telemetryCutoff = new Date(
      Date.now() - Number(process.env.TELEMETRY_RETENTION_DAYS || 90) * 86_400_000,
    ).toISOString();

    const jobs = [
      supabaseAdminRequest(`/rest/v1/design_share_links?expires_at=lt.${encodeURIComponent(now)}`, {
        method: 'DELETE', headers: { Prefer: 'return=minimal' },
      }),
      supabaseAdminRequest(`/rest/v1/privacy_export_requests?expires_at=lt.${encodeURIComponent(now)}&status=eq.ready`, {
        method: 'PATCH', headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ status: 'expired', updated_at: now }),
      }),
      supabaseAdminRequest(`/rest/v1/security_events?source=neq.browser&created_at=lt.${encodeURIComponent(securityCutoff)}`, {
        method: 'DELETE', headers: { Prefer: 'return=minimal' },
      }),
      supabaseAdminRequest(`/rest/v1/security_events?source=eq.browser&created_at=lt.${encodeURIComponent(telemetryCutoff)}`, {
        method: 'DELETE', headers: { Prefer: 'return=minimal' },
      }),
    ];

    const results = await Promise.allSettled(jobs);
    return json(res, 200, {
      ok: true,
      completed: results.filter((item) => item.status === 'fulfilled').length,
      failed: results.filter((item) => item.status === 'rejected').length,
    });
  } catch (error) {
    return json(res, 503, { ok: false, error: clean(error?.message || error, 200) });
  }
}

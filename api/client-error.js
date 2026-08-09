import { applyApiHeaders, guardPublicPost } from './_request-security.js';
import { supabaseAdminRequest } from './_supabase-admin.ts';

const clean = (value, max = 600) =>
  String(value ?? '')
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[email]')
    .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, '[phone]')
    .slice(0, max);
const json = (res, status, body) => {
  applyApiHeaders(res);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(status).json(body);
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method_not_allowed' });
  const guarded = await guardPublicPost(req, res, {
    maxBytes: 20_000,
    limit: 20,
    windowMs: 60_000,
    bucket: 'client-error',
  });
  if (!guarded) return;
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const row = {
      severity: 'error',
      source: 'browser',
      event_name: clean(body.event || 'client_error', 100),
      error_name: clean(body.name || 'Error', 100),
      message: clean(body.message),
      error_code: clean(body.code, 100),
      path: clean(body.path, 250),
      context: body.context && typeof body.context === 'object' ? body.context : {},
      occurred_at: body.occurredAt || new Date().toISOString(),
    };
    try {
      await supabaseAdminRequest('/rest/v1/security_events', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify(row),
      });
    } catch {
      // Monitoring must never break the customer flow. External ingest below
      // remains available even when the database is temporarily unavailable.
    }
    const endpoint = clean(process.env.ERROR_MONITORING_INGEST_URL, 1000);
    const token = clean(process.env.ERROR_MONITORING_TOKEN, 5000);
    if (endpoint && /^https:\/\//i.test(endpoint)) {
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(row),
        signal: AbortSignal.timeout(4000),
      }).catch(() => null);
    }
    return json(res, 202, { ok: true });
  } catch (error) {
    return json(res, 400, { ok: false, error: clean(error.message || 'invalid_request', 200) });
  }
}

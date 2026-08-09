import { buildNotificationTemplate } from './_notification-templates.ts';
const formspreeEndpoint = () =>
  clean(process.env.FORMSPREE_ORDER_ENDPOINT || process.env.VITE_FORM_ENDPOINT, 1000);
const clean = (value, max = 12000) =>
  String(value ?? '')
    .replace(/\0/g, '')
    .slice(0, max);
const json = (res, status, body) => {
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.status(status).json(body);
};

function authorized(req) {
  const secret = clean(process.env.CRON_SECRET, 500);
  if (!secret) return false;
  const header = clean(req.headers.authorization, 800);
  return header === `Bearer ${secret}`;
}

async function supabaseRequest(path, options = {}) {
  const base = clean(process.env.SUPABASE_URL, 1000).replace(/\/$/, '');
  const key = clean(process.env.SUPABASE_SERVICE_ROLE_KEY, 5000);
  if (!base || !key) throw new Error('supabase_not_configured');
  const response = await fetch(`${base}/rest/v1/${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${key}`,
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`supabase:${response.status}:${text.slice(0, 400)}`);
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

async function deliver(row) {
  const endpoint = formspreeEndpoint();
  if (!/^https:\/\/formspree\.io\/f\/[A-Za-z0-9_-]+$/u.test(endpoint))
    throw new Error('formspree_not_configured');
  const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};
  const template = buildNotificationTemplate(row);
  const params = new URLSearchParams({
    _subject: clean(row.subject || template.title, 240),
    template_version: template.templateVersion,
    locale: template.locale,
    customer_message: template.customerMessage,
    admin_summary: template.adminSummary,
    _template: 'table',
    request_type: clean(row.event_type, 80),
    reference_id: clean(
      payload.orderNumber || payload.quoteNumber || payload.requestNumber || row.entity_id,
      160,
    ),
    customer_name: clean(payload.customerName || payload.name, 240),
    customer_email: clean(payload.customerEmail || row.recipient_email, 320),
    phone: clean(payload.phone || payload.customerPhone, 80),
    whatsapp: clean(payload.whatsapp, 80),
    country: clean(payload.country || payload.countryCode, 80),
    details: clean(
      payload.description || payload.details || payload.note || payload.staffNotes,
      5000,
    ),
    amount: clean(payload.amount || payload.total || payload.totalUsd, 80),
    currency: clean(payload.currency || 'USD', 12),
    payment_method: clean(payload.paymentMethod, 80),
    admin_order_url: clean(payload.adminOrderUrl, 1000),
    event_type: clean(row.event_type, 80),
    entity_type: clean(row.entity_type, 80),
    entity_id: clean(row.entity_id, 160),
    email: clean(payload.customerEmail || row.recipient_email, 320),
    _replyto: clean(payload.customerEmail || row.recipient_email, 320),
  });
  for (const [key, value] of Object.entries(payload).slice(0, 50)) {
    const field = clean(key, 80).replace(/[^A-Za-z0-9_.:-]/g, '_');
    if (field && !params.has(field))
      params.set(field, clean(typeof value === 'object' ? JSON.stringify(value) : value, 5000));
  }
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
    body: params.toString(),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`formspree:${response.status}:${text.slice(0, 300)}`);
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return json(res, 405, { ok: false, error: 'method_not_allowed' });
  }
  if (!authorized(req)) return json(res, 401, { ok: false, error: 'unauthorized' });
  try {
    let expiredOrders = 0;
    try {
      const expiredResult = await supabaseRequest('rpc/expire_stale_commerce_orders', {
        method: 'POST',
        body: '{}',
      });
      expiredOrders = Number(expiredResult || 0);
    } catch {
      // Notification delivery must continue even if the optional expiry RPC is not deployed yet.
    }
    const rows = await supabaseRequest('rpc/claim_commerce_notifications', {
      method: 'POST',
      body: JSON.stringify({ p_limit: 25 }),
    });
    let sent = 0;
    let failed = 0;
    for (const row of rows || []) {
      try {
        await deliver(row);
        await supabaseRequest(`commerce_notifications?id=eq.${encodeURIComponent(row.id)}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({
            delivery_status: 'sent',
            sent_at: new Date().toISOString(),
            last_error: null,
            updated_at: new Date().toISOString(),
          }),
        });
        sent += 1;
      } catch (error) {
        const attempts = Math.max(1, Number(row.attempts || 1));
        const exhausted = attempts >= 8;
        const delayMinutes = Math.min(360, 2 ** Math.min(attempts, 8));
        await supabaseRequest(`commerce_notifications?id=eq.${encodeURIComponent(row.id)}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({
            delivery_status: exhausted ? 'dead_letter' : 'failed',
            last_error: clean(error.message, 1000),
            available_at: exhausted
              ? new Date('9999-12-31T23:59:59.000Z').toISOString()
              : new Date(Date.now() + delayMinutes * 60_000).toISOString(),
            dead_letter_at: exhausted ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          }),
        });
        if (exhausted) {
          try {
            await supabaseRequest('security_events', {
              method: 'POST',
              headers: { Prefer: 'return=minimal' },
              body: JSON.stringify({
                event_type: 'notification_dead_letter',
                severity: 'high',
                source: 'notification-worker',
                entity_type: row.entity_type,
                entity_id: String(row.entity_id || row.id),
                details: {
                  notificationId: row.id,
                  eventType: row.event_type,
                  attempts,
                  error: clean(error.message, 1000),
                },
              }),
            });
          } catch {
            /* The dead-letter record remains visible even if alert creation fails. */
          }
        }
        failed += 1;
      }
    }
    return json(res, 200, {
      ok: true,
      expiredOrders,
      processed: (rows || []).length,
      sent,
      failed,
    });
  } catch (error) {
    return json(res, 503, { ok: false, error: clean(error.message, 500) });
  }
}

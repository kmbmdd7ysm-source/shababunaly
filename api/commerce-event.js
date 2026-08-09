import { randomUUID } from 'node:crypto';
import { guardPublicPost } from './_request-security.js';
import { recordBusinessEvent } from './_business-events.js';

const PUBLIC_EVENTS = new Set(['checkout_started', 'checkout_abandoned', 'payment_failed']);
const clean = (value, max = 200) =>
  String(value ?? '')
    .trim()
    .replace(/[\0\r\n]/g, ' ')
    .slice(0, max);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  if (
    !(await guardPublicPost(req, res, {
      maxBytes: 16_000,
      limit: 30,
      windowMs: 60_000,
      bucket: 'commerce-event',
      honeypot: false,
    }))
  )
    return;
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const eventName = clean(body.eventName, 80).toLowerCase();
  if (!PUBLIC_EVENTS.has(eventName))
    return res.status(400).json({ ok: false, error: 'unsupported_public_event' });
  const sourceEventId = clean(body.sourceEventId, 200) || randomUUID();
  const recorded = await recordBusinessEvent(eventName, {
    entityType: 'checkout',
    entityReference: clean(body.checkoutReference, 120) || null,
    sourceEventId,
    valueUsd: body.valueUsd,
    currency: clean(body.currency || 'USD', 3),
    channel: 'web',
    properties: {
      payment_method: body.paymentMethod,
      stage: body.stage,
      item_count: body.itemCount,
      shipping_quote_required: body.shippingQuoteRequired,
    },
  });
  return res.status(recorded ? 202 : 503).json({
    ok: recorded,
    sourceEventId,
    error: recorded ? undefined : 'analytics_store_unavailable',
  });
}

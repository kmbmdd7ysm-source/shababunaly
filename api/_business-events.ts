import { createHash } from 'node:crypto';
import { writeBlobJson } from './_blob-store.js';

const ALLOWED_EVENTS = new Set([
  'checkout_started',
  'checkout_abandoned',
  'order_created',
  'purchase_completed',
  'payment_failed',
  'payment_recovered',
  'deposit_paid',
  'final_payment_paid',
  'refund_requested',
  'refund_completed',
  'return_requested',
  'return_completed',
  'quote_created',
  'quote_approved',
  'quote_rejected',
  'production_started',
  'shipment_created',
  'shipment_delivered',
  'inventory_stockout',
  'ready_to_ship_conversion',
]);
const clean = (value: unknown, max = 160) =>
  String(value ?? '')
    .trim()
    .replace(/[\0\r\n]/g, ' ')
    .slice(0, max);
const safeNumber = (value: unknown) => (Number.isFinite(Number(value)) ? Number(value) : null);
function analyticsSalt() {
  const value = clean(
    process.env.ANALYTICS_HASH_SALT ||
      process.env.SHABABUNA_AUTH_SECRET ||
      process.env.GUEST_ORDER_ACCESS_SECRET,
    5000,
  );
  if (process.env.NODE_ENV === 'production' && value.length < 32)
    throw new Error('analytics_hash_salt_not_configured');
  return value || 'development-only-analytics-salt-not-for-production';
}
const hashIdentifier = (value: unknown) =>
  value
    ? createHash('sha256')
        .update(`${analyticsSalt()}:${String(value).trim().toLowerCase()}`)
        .digest('hex')
    : null;
const sanitizeProperties = (input: Record<string, unknown> = {}): Record<string, unknown> => {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (
      /email|phone|address|name|token|secret|password|authorization|cookie/i.test(key) ||
      value == null
    )
      continue;
    const safeKey = clean(key, 80);
    if (!safeKey) continue;
    if (typeof value === 'number' || typeof value === 'boolean') output[safeKey] = value;
    else if (typeof value === 'string') output[safeKey] = clean(value, 240);
  }
  return output;
};

export async function recordBusinessEvent(
  eventName: unknown,
  details: Record<string, unknown> = {},
): Promise<boolean> {
  const normalized = clean(eventName, 80).toLowerCase();
  if (!ALLOWED_EVENTS.has(normalized)) throw new Error('unsupported_business_event');
  const sourceEventId = clean(details.sourceEventId, 200);
  if (!sourceEventId) throw new Error('business_event_source_id_required');
  const properties =
    details.properties && typeof details.properties === 'object'
      ? sanitizeProperties(details.properties as Record<string, unknown>)
      : {};
  const row = {
    event_name: normalized,
    entity_type: clean(details.entityType, 40) || null,
    entity_reference: clean(details.entityReference, 120) || null,
    organization_id: details.organizationId || null,
    actor_user_id: details.actorUserId || null,
    customer_hash: hashIdentifier(details.customerIdentifier),
    value_usd: safeNumber(details.valueUsd),
    currency: clean(details.currency || 'USD', 3).toUpperCase(),
    channel: clean(details.channel || 'web', 40),
    properties,
    source_event_id: sourceEventId,
  };
  const safeEvent = normalized.replace(/[^a-z0-9_-]/g, '');
  const safeSource = sourceEventId.replace(/[^A-Za-z0-9._-]/g, '').slice(0, 160);
  if (!safeEvent || !safeSource) return false;
  try {
    await writeBlobJson(
      `analytics/commerce/${safeEvent}/${safeSource}.json`,
      { ...row, recorded_at: new Date().toISOString() },
      { allowOverwrite: false },
    );
    return true;
  } catch (error) {
    const status =
      error && typeof error === 'object' && 'status' in error
        ? Number((error as { status?: unknown }).status)
        : 0;
    // Duplicate source ids are successful idempotent replays.
    if ([409, 412].includes(status)) return true;
    // Analytics remain fail-open for customer transactions.
    return false;
  }
}

export { ALLOWED_EVENTS, sanitizeProperties };

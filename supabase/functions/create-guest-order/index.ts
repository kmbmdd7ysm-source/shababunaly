import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const MAX_BYTES = 64_000;
const ALLOWED_METHODS = new Set([
  'cash_on_delivery',
  'cash',
  'online',
  'online_card',
  'libyan_bank_card',
]);
const ALLOWED_MODES = new Set(['retail', 'wholesale', 'custom']);
const headers = { 'content-type': 'application/json', 'cache-control': 'no-store' };
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });
const emailValid = (value: unknown) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
const text = (value: unknown, max = 160) =>
  typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max;

async function hash(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  if (Number(request.headers.get('content-length') || 0) > MAX_BYTES)
    return json({ error: 'request_too_large' }, 413);

  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const salt = Deno.env.get('EDGE_RATE_LIMIT_SALT');
  if (!url || !key || !salt) return json({ error: 'service_unavailable' }, 503);

  const body = await request.json().catch(() => null);
  const shipping = body?.shipping || {};
  const email = String(body?.email || '')
    .trim()
    .toLowerCase();
  const valid =
    body &&
    /^[0-9a-f-]{36}$/i.test(String(body.idempotencyKey || '')) &&
    body.currency === 'USD' &&
    ALLOWED_METHODS.has(String(body.paymentMethod || '')) &&
    emailValid(email) &&
    text(shipping.firstName, 80) &&
    text(shipping.lastName, 80) &&
    text(shipping.line1, 180) &&
    text(shipping.city, 100) &&
    /^[A-Za-z]{2}$/.test(String(shipping.country || '')) &&
    Array.isArray(body.items) &&
    body.items.length > 0 &&
    body.items.length <= 50 &&
    body.items.every(
      (item: any) =>
        item &&
        text(item.productId, 80) &&
        text(item.variantId, 180) &&
        Number.isInteger(item.quantity) &&
        item.quantity >= 1 &&
        item.quantity <= 999 &&
        ALLOWED_MODES.has(String(item.purchaseMode || 'retail').toLowerCase()),
    );
  if (!valid) return json({ error: 'invalid_request' }, 400);

  const admin = createClient(url, key, { auth: { persistSession: false } });
  const ip =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    'unknown';
  const subject = await hash(`${salt}:${ip}:${email}`);
  const { data: allowed, error: limitError } = await admin.rpc('consume_edge_rate_limit', {
    p_bucket: 'guest-create',
    p_subject_hash: subject,
    p_limit: 5,
    p_window_seconds: 900,
  });
  if (limitError) return json({ error: 'service_unavailable' }, 503);
  if (!allowed) return json({ error: 'too_many_requests' }, 429);

  const { data, error } = await admin.rpc('create_order_transactional', {
    p_user_id: null,
    p_customer_email: email,
    p_currency: 'USD',
    p_payment_method: body.paymentMethod,
    p_idempotency_key: body.idempotencyKey,
    p_shipping: shipping,
    p_items: body.items.map((item: any) => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      purchaseMode: String(item.purchaseMode || 'retail').toLowerCase(),
    })),
  });
  if (error) {
    const message = String(error.message || '');
    if (
      /invalid_|insufficient_|unavailable|cash_available_only_in_libya|retail_unavailable/i.test(
        message,
      )
    )
      return json({ error: 'invalid_order' }, 400);
    return json({ error: 'order_service_unavailable' }, 503);
  }
  return json(data, data?.duplicate ? 200 : 201);
});

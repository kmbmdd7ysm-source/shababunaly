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

const validBody = (body: any) =>
  body &&
  /^[0-9a-f-]{36}$/i.test(String(body.idempotencyKey || '')) &&
  body.currency === 'USD' &&
  ALLOWED_METHODS.has(String(body.paymentMethod || '')) &&
  body.shipping &&
  /^[A-Za-z]{2}$/.test(String(body.shipping.country || '')) &&
  Array.isArray(body.items) &&
  body.items.length > 0 &&
  body.items.length <= 50 &&
  body.items.every(
    (item: any) =>
      item &&
      typeof item.productId === 'string' &&
      item.productId.length <= 80 &&
      typeof item.variantId === 'string' &&
      item.variantId.length <= 180 &&
      Number.isInteger(item.quantity) &&
      item.quantity >= 1 &&
      item.quantity <= 999 &&
      ALLOWED_MODES.has(String(item.purchaseMode || 'retail').toLowerCase()),
  );

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  if (Number(request.headers.get('content-length') || 0) > MAX_BYTES)
    return json({ error: 'request_too_large' }, 413);

  const authHeader = request.headers.get('authorization') || '';
  if (!/^Bearer\s+\S+/i.test(authHeader)) return json({ error: 'unauthorized' }, 401);
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return json({ error: 'service_unavailable' }, 503);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const { data: auth, error: authError } = await admin.auth.getUser(token);
  if (authError || !auth.user || !emailValid(auth.user.email))
    return json({ error: 'unauthorized' }, 401);

  const body = await request.json().catch(() => null);
  if (!validBody(body)) return json({ error: 'invalid_request' }, 400);

  const { data, error } = await admin.rpc('create_order_transactional', {
    p_user_id: auth.user.id,
    p_customer_email: auth.user.email!.trim().toLowerCase(),
    p_currency: 'USD',
    p_payment_method: body.paymentMethod,
    p_idempotency_key: body.idempotencyKey,
    p_shipping: body.shipping,
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

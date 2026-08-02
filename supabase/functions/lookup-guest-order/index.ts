import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const MAX_BYTES = 8_000;
const headers = { 'content-type': 'application/json', 'cache-control': 'no-store' };
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });
async function hash(value: string) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  if (Number(request.headers.get('content-length') || 0) > MAX_BYTES)
    return json({ order: null }, 200);
  const body = await request.json().catch(() => null);
  const orderNumber = String(body?.orderNumber || '')
    .trim()
    .toUpperCase();
  const email = String(body?.email || '')
    .trim()
    .toLowerCase();
  if (!(/^(SHB|LHA)-\d{8}-\d{7}$/.test(orderNumber)) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return json({ order: null }, 200);
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const salt = Deno.env.get('EDGE_RATE_LIMIT_SALT');
  if (!url || !key || !salt) return json({ error: 'lookup_unavailable' }, 503);
  const admin = createClient(url, key, { auth: { persistSession: false } });
  const ip =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    'unknown';
  const subject = await hash(`${salt}:${ip}:${email}`);
  const { data: allowed, error: limitError } = await admin.rpc('consume_edge_rate_limit', {
    p_bucket: 'guest-lookup',
    p_subject_hash: subject,
    p_limit: 10,
    p_window_seconds: 900,
  });
  if (limitError) return json({ error: 'lookup_unavailable' }, 503);
  if (!allowed) return json({ order: null }, 200);
  const { data, error } = await admin
    .from('orders')
    .select(
      'order_number,currency,total,payment_method,payment_status,order_status,fulfillment_status,created_at,order_items(product_id,sku,product_name,variant_snapshot,quantity,unit_price,line_total)',
    )
    .eq('order_number', orderNumber)
    .eq('customer_email', email)
    .is('user_id', null)
    .maybeSingle();
  if (error) return json({ error: 'lookup_unavailable' }, 503);
  if (!data) return json({ order: null }, 200);
  return json({ order: data });
});

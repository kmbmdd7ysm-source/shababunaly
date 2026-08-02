import { getSupabase } from './supabase';
import { sendFormspree } from './formspree';

const clean = (value, max = 3000) => String(value ?? '').replace(/[<>]/g, '').trim().slice(0, max);

export async function listMyReturns(userId) {
  if (!userId) return [];
  const client = await getSupabase();
  if (!client) return [];
  const { data, error } = await client
    .from('return_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data || [];
}

export async function createReturnRequest({ orderNumber, reason, details = '', items = [] }) {
  const normalizedItems = items
    .map((item) => ({
      variantId: clean(item.variantId || item.variant_id || item.sku, 240),
      sku: clean(item.sku || item.variantId || item.variant_id, 240),
      name: clean(item.name, 240),
      quantity: Math.max(1, Math.trunc(Number(item.quantity) || 1)),
    }))
    .filter((item) => item.variantId)
    .slice(0, 30);
  if (!clean(orderNumber, 80) || clean(reason, 120).length < 2 || !normalizedItems.length) {
    throw new Error('invalid_return_request');
  }
  const client = await getSupabase();
  if (!client) throw new Error('cloud_not_configured');
  const { data, error } = await client.rpc('create_return_request', {
    p_order_number: clean(orderNumber, 80).toUpperCase(),
    p_reason: clean(reason, 120),
    p_details: clean(details, 3000),
    p_items: normalizedItems,
  });
  if (error) throw error;
  try {
    await sendFormspree({
      formType: 'return_request',
      event: 'new_return_request',
      returnNumber: data?.return_number,
      orderNumber: data?.order_number,
      customerEmail: data?.customer_email,
      reason: data?.reason,
      details: data?.details,
      items: data?.requested_items,
    }, `New return request — ${data?.return_number || orderNumber}`);
  } catch {
    // The database notification outbox retries independently.
  }
  return data;
}


export async function cancelReturnRequest({ returnId, note = '' }) {
  const client = await getSupabase();
  if (!client) throw new Error('cloud_not_configured');
  const { data, error } = await client.rpc('customer_cancel_return_request', {
    p_return_id: returnId,
    p_note: clean(note, 1000),
  });
  if (error) throw error;
  try {
    await sendFormspree({
      formType: 'return_request',
      event: 'return_cancelled',
      returnNumber: data?.return_number,
      orderNumber: data?.order_number,
      customerEmail: data?.customer_email,
      note: data?.customer_note,
    }, `Return cancelled — ${data?.return_number || returnId}`);
  } catch {
    // The outbox remains the reliable retry path.
  }
  return data;
}

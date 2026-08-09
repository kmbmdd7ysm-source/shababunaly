import { getSupabase } from './supabase.ts';
import { sendFormspree } from './formspree.ts';

const clean = (value: unknown, max = 3000): string =>
  String(value ?? '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, max);

export async function listMyReturns(userId: string | null | undefined): Promise<unknown[]> {
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
  return (data as unknown[]) || [];
}

export async function createReturnRequest({
  orderNumber,
  reason,
  details = '',
  items = [],
}: {
  orderNumber: string;
  reason: string;
  details?: string;
  items?: Array<Record<string, unknown>>;
}): Promise<Record<string, unknown>> {
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
  const row = (data || {}) as Record<string, unknown>;
  try {
    await sendFormspree(
      {
        formType: 'return_request',
        event: 'new_return_request',
        returnNumber: row.return_number,
        orderNumber: row.order_number,
        customerEmail: row.customer_email,
        reason: row.reason,
        details: row.details,
        items: row.requested_items,
      },
      `New return request — ${String(row.return_number || orderNumber)}`,
    );
  } catch {
    // The database notification outbox retries independently.
  }
  return row;
}

export async function cancelReturnRequest({
  returnId,
  note = '',
}: {
  returnId: string;
  note?: string;
}): Promise<Record<string, unknown>> {
  const client = await getSupabase();
  if (!client) throw new Error('cloud_not_configured');
  const { data, error } = await client.rpc('customer_cancel_return_request', {
    p_return_id: returnId,
    p_note: clean(note, 1000),
  });
  if (error) throw error;
  const row = (data || {}) as Record<string, unknown>;
  try {
    await sendFormspree(
      {
        formType: 'return_request',
        event: 'return_cancelled',
        returnNumber: row.return_number,
        orderNumber: row.order_number,
        customerEmail: row.customer_email,
        note: row.customer_note,
      },
      `Return cancelled — ${String(row.return_number || returnId)}`,
    );
  } catch {
    // The outbox remains the reliable retry path.
  }
  return row;
}

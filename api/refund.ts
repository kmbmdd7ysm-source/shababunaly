import crypto from 'node:crypto';
import { applyApiHeaders, guardPublicPost } from './_request-security.ts';
import { requireStaffSession } from './_staff-auth.ts';
import { supabaseAdminRequest } from './_supabase-admin.ts';
import { getPaymentAdapter } from './payments/registry.ts';
import { recordBusinessEvent } from './_business-events.ts';

type ApiReq = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
};
type ApiRes = {
  setHeader: (n: string, v: string) => void;
  status: (c: number) => { json: (b: unknown) => unknown };
};

const clean = (value: unknown, max = 1000): string =>
  String(value ?? '')
    .trim()
    .slice(0, max);

export default async function handler(req: ApiReq, res: ApiRes) {
  applyApiHeaders(res as never);
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  if (
    !(await guardPublicPost(req as never, res as never, {
      maxBytes: 32_000,
      limit: 12,
      windowMs: 60_000,
      bucket: 'staff-refund',
    }))
  )
    return;
  try {
    const staff = await requireStaffSession(req as never, {
      roles: new Set(['operations', 'admin', 'super_admin']),
      requireAal2: true,
    });
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<
      string,
      unknown
    >;
    const orderNumber = clean(body.orderNumber, 80).toUpperCase();
    const amount = Number(body.amount);
    const reason = clean(body.reason, 500);
    const returnRequestId = clean(body.returnRequestId, 80) || null;
    if (!/^SHB-[A-Z0-9-]+$/i.test(orderNumber) || !Number.isFinite(amount) || amount <= 0)
      return res.status(400).json({ ok: false, error: 'invalid_refund_request' });
    const orders = await supabaseAdminRequest(
      `/rest/v1/orders?select=id,order_number,total,amount_paid,amount_refunded,currency,payment_provider,payment_reference,customer_email&order_number=eq.${encodeURIComponent(orderNumber)}&limit=1`,
    );
    const order = (
      Array.isArray(orders) ? orders[0] : null
    ) as Record<string, unknown> | null;
    if (!order) return res.status(404).json({ ok: false, error: 'order_not_found' });
    const refundable = Math.max(
      0,
      Number(order.amount_paid || 0) - Number(order.amount_refunded || 0),
    );
    if (amount > refundable + 0.01)
      return res.status(409).json({ ok: false, error: 'refund_exceeds_refundable_amount' });
    const provider = clean(body.provider || order.payment_provider, 80).replace(/^manual-/, '');
    const adapter = getPaymentAdapter(provider);
    if (!adapter || !adapter.capabilities?.().refund || !adapter.refund)
      return res.status(503).json({ ok: false, error: 'refund_provider_not_connected' });
    const idempotencyKey =
      clean(body.idempotencyKey, 160) ||
      `refund:${String(order.id)}:${returnRequestId || 'none'}:${amount.toFixed(2)}`;
    const staffUser = (staff as { user?: { id?: string } }).user;
    const result = await adapter.refund({
      transactionId: clean(body.transactionId || order.payment_reference, 240),
      amount,
      currency: order.currency || 'USD',
      idempotencyKey,
      reason,
      metadata: { orderNumber, returnRequestId, requestedBy: staffUser?.id },
    });
    await recordBusinessEvent('refund_requested', {
      entityType: 'order',
      entityReference: orderNumber,
      actorUserId: staffUser?.id,
      customerIdentifier: order.customer_email,
      valueUsd: amount,
      currency: String(order.currency || 'USD'),
      channel: provider,
      sourceEventId: result.id,
      properties: { status: result.status, return_request_id: returnRequestId },
    });
    await supabaseAdminRequest('/rest/v1/security_events', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        severity: 'info',
        source: 'refund_api',
        event_type: 'refund_requested',
        message: `Refund requested for ${orderNumber}`,
        context: {
          orderNumber,
          amount,
          provider,
          providerRefundId: result.id,
          status: result.status,
          returnRequestId,
        },
        request_id: crypto.randomUUID(),
        user_id: staffUser?.id,
      }),
    });
    return res.status(202).json({
      ok: true,
      provider,
      refundId: result.id,
      status: result.status,
    });
  } catch (error: unknown) {
    const status =
      error && typeof error === 'object' && 'status' in error
        ? Number((error as { status?: unknown }).status || 503)
        : 503;
    const message =
      error && typeof error === 'object' && 'message' in error
        ? (error as { message?: unknown }).message
        : error;
    return res.status(status).json({ ok: false, error: clean(message || error, 160) });
  }
}

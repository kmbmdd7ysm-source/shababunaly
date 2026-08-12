import { randomUUID } from 'node:crypto';
import { guardPublicPost, applyApiHeaders } from './_request-security.ts';
import { verifyFormTurnstileToken } from './_turnstile.ts';
import { resolveSupabaseUser, supabaseAdminRequest } from './_supabase-admin.ts';
import { recordBusinessEvent } from './_business-events.ts';
import { sendInternalFormNotification } from './_internal-form-notification.ts';

type ApiReq = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
};
type ApiRes = {
  setHeader: (n: string, v: string) => void;
  status: (c: number) => { json: (b: unknown) => unknown };
};

const clean = (value: unknown, max = 2000): string =>
  String(value ?? '')
    .trim()
    .replace(/\0/g, '')
    .slice(0, max);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TYPES = new Set(['teams_wholesale_quote', 'custom_design_quote']);

function normalizePayload(body: Record<string, unknown>) {
  const raw =
    body.payload && typeof body.payload === 'object'
      ? (body.payload as Record<string, unknown>)
      : body;
  const formType = clean(raw.formType, 80).toLowerCase();
  const payload = {
    formType,
    customerName: clean(raw.customerName, 160),
    customerEmail: clean(raw.customerEmail, 254).toLowerCase(),
    phone: clean(raw.phone, 80),
    whatsapp: clean(raw.whatsapp || raw.phone, 80),
    organization: clean(raw.organization, 180),
    accountType: clean(raw.accountType || raw.organizationType, 80),
    country: clean(raw.country || 'LY', 2).toUpperCase(),
    package: clean(raw.package, 80),
    productGroup: clean(raw.productGroup || raw.product, 120),
    quantity: Number(raw.quantity || 0),
    deadline: clean(raw.deadline, 40),
    requirements: clean(raw.requirements || raw.notes, 12000),
    paymentTerms: clean(raw.paymentTerms || '50% before production / 50% on arrival', 200),
    estimatedTimeline: clean(raw.estimatedTimeline || '30–60 days', 120),
    language: clean(raw.language || 'en', 5) === 'ar' ? 'ar' : 'en',
    designId: clean(raw.designId, 120) || null,
    rosterId: clean(raw.rosterId, 120) || null,
    design: raw.design && typeof raw.design === 'object' ? raw.design : null,
    roster: Array.isArray(raw.roster) ? raw.roster.slice(0, 500) : [],
    submittedAt: new Date().toISOString(),
  };
  if (!TYPES.has(formType)) throw new Error('invalid_quote_type');
  if (payload.customerName.length < 2 || !EMAIL.test(payload.customerEmail))
    throw new Error('invalid_customer_details');
  if (!/^[A-Z]{2}$/.test(payload.country) || payload.organization.length < 2)
    throw new Error('invalid_organization_details');
  if (!Number.isFinite(payload.quantity) || payload.quantity < 1 || payload.quantity > 100000)
    throw new Error('invalid_quantity');
  if (!payload.productGroup && !payload.requirements) throw new Error('quote_details_required');
  return payload;
}

async function verifiedOrganizationId(
  userId: string | undefined,
  requestedId: unknown,
): Promise<string | null> {
  if (!userId || !UUID.test(clean(requestedId, 36))) return null;
  const rows = (await supabaseAdminRequest(
    `/rest/v1/organization_members?select=organization_id&organization_id=eq.${encodeURIComponent(String(requestedId))}&user_id=eq.${encodeURIComponent(userId)}&limit=1`,
  )) as Array<Record<string, unknown>>;
  return Array.isArray(rows) && rows[0]?.organization_id
    ? String(rows[0].organization_id)
    : null;
}

async function findDuplicate(idempotencyKey: string) {
  const rows = (await supabaseAdminRequest(
    `/rest/v1/quote_requests?select=id,quote_number,status,created_at&idempotency_key=eq.${encodeURIComponent(idempotencyKey)}&limit=1`,
  )) as Array<Record<string, unknown>>;
  return Array.isArray(rows) ? rows[0] || null : null;
}

export default async function handler(req: ApiReq, res: ApiRes) {
  applyApiHeaders(res);
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  if (
    !(await guardPublicPost(req, res, {
      maxBytes: 96_000,
      limit: 6,
      windowMs: 10 * 60_000,
      bucket: 'public-quote',
      allowEphemeralFallback: true,
    }))
  )
    return;

  const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<
    string,
    unknown
  >;
  const forwarded = req.headers?.['x-forwarded-for'];
  const captchaOk = await verifyFormTurnstileToken(
    clean(body.turnstileToken, 3000),
    String(
      (Array.isArray(forwarded) ? forwarded[0] : forwarded) ||
        req.socket?.remoteAddress ||
        '',
    ),
  );
  if (!captchaOk) return res.status(400).json({ ok: false, error: 'captcha_failed' });

  let payload: ReturnType<typeof normalizePayload>;
  try {
    payload = normalizePayload(body);
  } catch (error: unknown) {
    const code = clean(
      error && typeof error === 'object' && 'message' in error
        ? (error as { message?: unknown }).message
        : error,
      160,
    );
    const client = new Set([
      'invalid_quote_type',
      'invalid_customer_details',
      'invalid_organization_details',
      'invalid_quantity',
      'quote_details_required',
    ]);
    return res
      .status(client.has(code) ? 400 : 503)
      .json({ ok: false, error: client.has(code) ? code : 'quote_request_unavailable' });
  }

  const requestedKey = clean(body.idempotencyKey, 36);
  const idempotencyKey = UUID.test(requestedKey) ? requestedKey : randomUUID();
  const subject = `Shababuna ${payload.formType === 'custom_design_quote' ? 'custom design' : 'teams & wholesale'} · ${payload.organization || payload.customerName}`;

  try {
    const authHeader = req.headers?.authorization;
    const user = await resolveSupabaseUser(
      Array.isArray(authHeader) ? authHeader[0] : authHeader,
    );
    const duplicate = await findDuplicate(idempotencyKey);
    if (duplicate) return res.status(200).json({ ok: true, duplicate: true, quote: duplicate });
    const userId =
      user && typeof user === 'object' && 'id' in user
        ? String((user as { id?: unknown }).id || '')
        : undefined;
    const organizationId = await verifiedOrganizationId(userId, body.organizationId);
    const now = new Date();
    const suffix = randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
    const quoteNumber = `QT-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${suffix}`;
    const row = {
      id: `quote-${randomUUID()}`,
      idempotency_key: idempotencyKey,
      user_id: userId || null,
      organization_id: organizationId,
      quote_number: quoteNumber,
      status: 'under_review',
      currency: 'USD',
      subtotal: null,
      shipping_total: null,
      tax_total: 0,
      discount_total: 0,
      total: null,
      deposit_percent: 50,
      request_data: payload,
    };
    const created = await supabaseAdminRequest(
      '/rest/v1/quote_requests?select=id,quote_number,status,created_at',
      {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(row),
      },
    );
    const quote = (
      Array.isArray(created) ? created[0] : created
    ) as Record<string, unknown> | null;
    if (!quote?.id) throw new Error('quote_create_failed');

    // Analytics/audit enrichment is best-effort and must never prevent the
    // actual customer request from reaching the owner.
    try {
      await recordBusinessEvent('quote_created', {
        entityType: 'quote',
        entityReference: quote.quote_number,
        organizationId,
        actorUserId: userId || null,
        customerIdentifier: payload.customerEmail,
        channel: 'web',
        sourceEventId: quote.id,
        properties: {
          form_type: payload.formType,
          product_group: payload.productGroup,
          quantity: payload.quantity,
        },
      });
    } catch {
      /* persisted quote remains authoritative */
    }

    const emailResult = await sendInternalFormNotification(
      {
        form_type: payload.formType,
        quote_number: quote.quote_number,
        quote_id: quote.id,
        persistence_status: 'persisted',
        ...payload,
      },
      subject,
    );
    return res.status(201).json({
      ok: true,
      duplicate: false,
      persisted: true,
      quote,
      notification: emailResult.delivered ? 'delivered' : 'pending',
    });
  } catch (persistenceError: unknown) {
    // A team/custom inquiry is primarily a human follow-up request. If the
    // database is temporarily unavailable, do not discard the customer's
    // message: deliver the complete sanitized request to the owner through the
    // canonical Formspree inbox and return a stable email-only reference.
    const now = new Date();
    const suffix = idempotencyKey.replace(/-/g, '').slice(0, 8).toUpperCase();
    const quoteNumber = `WEB-QT-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${suffix}`;
    const emailResult = await sendInternalFormNotification(
      {
        form_type: payload.formType,
        quote_number: quoteNumber,
        quote_id: `email-${idempotencyKey}`,
        persistence_status: 'email_only_fallback',
        submitted_at: now.toISOString(),
        ...payload,
      },
      subject,
    );
    if (emailResult.delivered) {
      return res.status(202).json({
        ok: true,
        duplicate: false,
        persisted: false,
        quote: {
          id: `email-${idempotencyKey}`,
          quote_number: quoteNumber,
          status: 'received',
          created_at: now.toISOString(),
        },
        notification: 'delivered',
      });
    }
    const detail = clean(
      persistenceError && typeof persistenceError === 'object' && 'message' in persistenceError
        ? (persistenceError as { message?: unknown }).message
        : persistenceError,
      120,
    );
    return res.status(503).json({
      ok: false,
      error: 'quote_request_unavailable',
      ...(process.env.NODE_ENV !== 'production' && detail ? { detail } : {}),
    });
  }
}

import { randomUUID } from 'node:crypto';
import { guardPublicPost, applyApiHeaders } from './_request-security.js';
import { verifyTurnstileToken } from './_turnstile.ts';
import { resolveSupabaseUser, supabaseAdminRequest } from './_supabase-admin.js';
import { recordBusinessEvent } from './_business-events.js';

const clean = (value, max = 2000) =>
  String(value ?? '')
    .trim()
    .replace(/\0/g, '')
    .slice(0, max);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TYPES = new Set(['teams_wholesale_quote', 'custom_design_quote']);

function normalizePayload(body) {
  const raw = body.payload && typeof body.payload === 'object' ? body.payload : body;
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

async function verifiedOrganizationId(userId, requestedId) {
  if (!userId || !UUID.test(clean(requestedId, 36))) return null;
  const rows = await supabaseAdminRequest(
    `/rest/v1/organization_members?select=organization_id&organization_id=eq.${encodeURIComponent(requestedId)}&user_id=eq.${encodeURIComponent(userId)}&limit=1`,
  );
  return Array.isArray(rows) && rows[0]?.organization_id ? rows[0].organization_id : null;
}

async function findDuplicate(idempotencyKey) {
  const rows = await supabaseAdminRequest(
    `/rest/v1/quote_requests?select=id,quote_number,status,created_at&idempotency_key=eq.${encodeURIComponent(idempotencyKey)}&limit=1`,
  );
  return Array.isArray(rows) ? rows[0] || null : null;
}

export default async function handler(req, res) {
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
    }))
  )
    return;
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const captchaOk = await verifyTurnstileToken(
      clean(body.turnstileToken, 3000),
      req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '',
    );
    if (!captchaOk) return res.status(400).json({ ok: false, error: 'captcha_failed' });
    const payload = normalizePayload(body);
    const user = await resolveSupabaseUser(req.headers.authorization);
    const requestedKey = clean(body.idempotencyKey, 36);
    const idempotencyKey = UUID.test(requestedKey) ? requestedKey : randomUUID();
    const duplicate = await findDuplicate(idempotencyKey);
    if (duplicate) return res.status(200).json({ ok: true, duplicate: true, quote: duplicate });
    const organizationId = await verifiedOrganizationId(user?.id, body.organizationId);
    const now = new Date();
    const suffix = randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
    const quoteNumber = `QT-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${suffix}`;
    const row = {
      id: `quote-${randomUUID()}`,
      idempotency_key: idempotencyKey,
      user_id: user?.id || null,
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
    const quote = Array.isArray(created) ? created[0] : created;
    if (!quote?.id) throw new Error('quote_create_failed');
    await recordBusinessEvent('quote_created', {
      entityType: 'quote',
      entityReference: quote.quote_number,
      organizationId,
      actorUserId: user?.id || null,
      customerIdentifier: payload.customerEmail,
      channel: 'web',
      sourceEventId: quote.id,
      properties: {
        form_type: payload.formType,
        product_group: payload.productGroup,
        quantity: payload.quantity,
      },
    });
    return res.status(201).json({ ok: true, duplicate: false, quote });
  } catch (error) {
    const code = clean(error?.message || error, 160);
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
}

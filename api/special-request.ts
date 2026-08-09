import { randomUUID } from 'node:crypto';
import { guardPublicPost, applyApiHeaders } from './_request-security.ts';
import { resolveSupabaseUser, supabaseAdminRequest } from './_supabase-admin.ts';
import { validateEncodedFiles } from './_file-security.ts';
import { verifyTurnstileToken } from './_turnstile.ts';

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

type EncodedFile = {
  name: string;
  sha256: string;
  detectedMime: string;
  declaredMime?: string;
  extension: string;
  byteSize: number;
  buffer: Uint8Array | Buffer;
  role?: string;
};

const clean = (value: unknown, max = 5000): string =>
  String(value ?? '')
    .trim()
    .replace(/\0/g, '')
    .slice(0, max);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isMalwareScannerConfigured(): boolean {
  const endpoint = clean(process.env.MALWARE_SCAN_API_URL, 1500);
  const token = clean(process.env.MALWARE_SCAN_API_KEY, 5000);
  const testMode =
    process.env.NODE_ENV !== 'production' && process.env.MALWARE_SCAN_TEST_MODE === 'true';
  if (testMode) return true;
  try {
    return new URL(endpoint).protocol === 'https:' && token.length >= 16;
  } catch {
    return false;
  }
}

function normalizePayload(body: Record<string, unknown>, hasProductImage: boolean) {
  const productUrl = clean(body.productUrl, 1500);
  if (productUrl) {
    let parsed: URL;
    try {
      parsed = new URL(productUrl);
    } catch {
      throw new Error('invalid_product_url');
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('invalid_product_url');
  }
  const payload = {
    customerName: clean(body.customerName, 160),
    email: clean(body.email, 320).toLowerCase(),
    phone: clean(body.phone, 60),
    whatsapp: clean(body.whatsapp, 60),
    country: clean(body.country, 2).toUpperCase(),
    productUrl,
    hasProductImage,
    description: clean(body.description, 5000),
    preferredBrand: clean(body.preferredBrand, 120),
    desiredQuantity: Number(body.desiredQuantity),
    size: clean(body.size, 120),
    color: clean(body.color, 120),
    targetBudget:
      body.targetBudget === '' || body.targetBudget == null ? null : Number(body.targetBudget),
    requiredDate: clean(body.requiredDate, 10),
    preferredContactMethod: clean(body.preferredContactMethod, 20),
    consent: body.consent === true,
    locale: clean(body.locale, 2) || 'en',
    submittedAt: new Date().toISOString(),
  };
  if (
    payload.customerName.length < 2 ||
    !emailPattern.test(payload.email) ||
    !/^[A-Z]{2}$/.test(payload.country)
  )
    throw new Error('invalid_customer_details');
  if (
    payload.description.length < 10 ||
    !Number.isInteger(payload.desiredQuantity) ||
    payload.desiredQuantity < 1 ||
    payload.desiredQuantity > 100000
  )
    throw new Error('invalid_request_details');
  if (!['email', 'phone', 'whatsapp'].includes(payload.preferredContactMethod) || !payload.consent)
    throw new Error('consent_and_contact_required');
  if (!payload.productUrl && !hasProductImage) throw new Error('product_reference_required');
  if (
    payload.targetBudget != null &&
    (!Number.isFinite(payload.targetBudget) || payload.targetBudget < 0)
  )
    throw new Error('invalid_budget');
  return payload;
}

async function uploadFile(requestId: string, file: EncodedFile) {
  const path = `${requestId}/${file.sha256.slice(0, 24)}-${file.name}`;
  try {
    await supabaseAdminRequest(
      `/storage/v1/object/special-request-quarantine/${encodeURIComponent(path).replace(/%2F/g, '/')}`,
      {
        method: 'POST',
        headers: { 'Content-Type': file.detectedMime, 'x-upsert': 'false' },
        body: new Uint8Array(file.buffer),
      },
    );
  } catch (error: unknown) {
    const status =
      error && typeof error === 'object' && 'status' in error
        ? Number((error as { status?: unknown }).status)
        : 0;
    if (status !== 409) throw error;
  }
  const rows = await supabaseAdminRequest(
    '/rest/v1/special_request_files?on_conflict=storage_path',
    {
      method: 'POST',
      headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
      body: JSON.stringify({
        special_request_id: requestId,
        storage_path: path,
        original_name: file.name,
        declared_mime: file.declaredMime,
        detected_mime: file.detectedMime,
        extension: file.extension,
        byte_size: file.byteSize,
        sha256: file.sha256,
        file_role: file.role,
        quarantine_status: 'quarantined',
      }),
    },
  );
  return Array.isArray(rows) ? rows[0] : rows;
}

export default async function handler(req: ApiReq, res: ApiRes) {
  applyApiHeaders(res as never);
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  if (
    !(await guardPublicPost(req as never, res as never, {
      maxBytes: 4_200_000,
      limit: 5,
      windowMs: 10 * 60_000,
      bucket: 'special-request',
    }))
  )
    return;
  try {
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<
      string,
      unknown
    >;
    const files = validateEncodedFiles(body.files) as EncodedFile[];
    if (
      files.length > 0 &&
      process.env.NODE_ENV === 'production' &&
      !isMalwareScannerConfigured()
    ) {
      return res.status(503).json({ ok: false, error: 'secure_file_scanning_unavailable' });
    }
    const productImages = files.filter((file) => file.role === 'product_image');
    if (productImages.length > 1) throw new Error('one_product_image_allowed');
    const payload = normalizePayload(body, productImages.length === 1);
    const forwarded = req.headers?.['x-forwarded-for'];
    const captchaOk = await verifyTurnstileToken(
      clean(body.turnstileToken, 3000),
      String(
        (Array.isArray(forwarded) ? forwarded[0] : forwarded) ||
          req.socket?.remoteAddress ||
          '',
      ),
    );
    if (!captchaOk) return res.status(400).json({ ok: false, error: 'captcha_failed' });
    const authHeader = req.headers?.authorization;
    const user = await resolveSupabaseUser(
      Array.isArray(authHeader) ? authHeader[0] : authHeader,
    );
    const idempotencyKey = /^[0-9a-f-]{36}$/i.test(clean(body.idempotencyKey, 36))
      ? clean(body.idempotencyKey, 36)
      : randomUUID();
    const created = await supabaseAdminRequest('/rest/v1/rpc/create_special_request_api', {
      method: 'POST',
      body: JSON.stringify({
        p_user_id: user?.id || null,
        p_idempotency_key: idempotencyKey,
        p_payload: payload,
      }),
    });
    const requestRow = (
      Array.isArray(created) ? created[0] : created
    ) as Record<string, unknown> | null;
    if (!requestRow?.id) throw new Error('special_request_create_failed');
    const uploaded = [];
    for (const file of files) uploaded.push(await uploadFile(String(requestRow.id), file));
    return res.status(201).json({
      ok: true,
      request: {
        id: requestRow.id,
        requestNumber: requestRow.request_number,
        status: requestRow.status,
        createdAt: requestRow.created_at,
      },
      filesReceived: uploaded.length,
    });
  } catch (error: unknown) {
    const code = clean(
      error && typeof error === 'object' && 'message' in error
        ? (error as { message?: unknown }).message
        : error,
      200,
    );
    const clientErrors = new Set([
      'too_many_files',
      'unsupported_file_type',
      'invalid_file_encoding',
      'invalid_file_size',
      'files_too_large',
      'executable_file_rejected',
      'file_signature_mismatch',
      'file_mime_mismatch',
      'product_image_must_be_image',
      'one_product_image_allowed',
      'invalid_product_url',
      'invalid_customer_details',
      'invalid_request_details',
      'consent_and_contact_required',
      'product_reference_required',
      'invalid_budget',
    ]);
    return res
      .status(clientErrors.has(code) ? 400 : 503)
      .json({ ok: false, error: clientErrors.has(code) ? code : 'special_request_unavailable' });
  }
}

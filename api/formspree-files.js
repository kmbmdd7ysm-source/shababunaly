import { guardPublicPost } from './_request-security.js';
import { validateEncodedFiles } from './_file-security.js';
import { verifyTurnstileToken } from './_turnstile.ts';

import { resolveFormspreeEndpoint } from './_formspree-endpoint.ts';
const ENDPOINT = resolveFormspreeEndpoint();
const clean = (value, max = 12000) =>
  String(value ?? '')
    .replace(/\0/g, '')
    .slice(0, max);
const keyOf = (value) =>
  String(value || '')
    .trim()
    .replace(/[^A-Za-z0-9_.:-]/g, '_')
    .slice(0, 80);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  if (
    !(await guardPublicPost(req, res, {
      maxBytes: 4_200_000,
      limit: 5,
      windowMs: 10 * 60_000,
      bucket: 'formspree-files',
    }))
  )
    return;
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    if (
      !(await verifyTurnstileToken(
        body.turnstileToken,
        req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '',
      ))
    )
      return res.status(400).json({ ok: false, error: 'captcha_failed' });
    if (!/^https:\/\//i.test(ENDPOINT))
      return res.status(503).json({ ok: false, error: 'formspree_not_configured' });
    const files = validateEncodedFiles(body.files);
    const form = new FormData();
    const payload = body.payload && typeof body.payload === 'object' ? body.payload : {};
    for (const [key, value] of Object.entries(payload).slice(0, 60)) {
      const safeKey = keyOf(key);
      if (safeKey)
        form.set(safeKey, clean(typeof value === 'object' ? JSON.stringify(value) : value));
    }
    files.forEach((file, index) =>
      form.append(
        index === 0 ? 'attachment' : `attachment_${index + 1}`,
        new Blob([file.buffer], { type: file.detectedMime }),
        file.name,
      ),
    );
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    try {
      const upstream = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: form,
        signal: controller.signal,
        cache: 'no-store',
      });
      const text = await upstream.text();
      if (!upstream.ok)
        return res.status(502).json({
          ok: false,
          error: 'formspree_rejected',
          status: upstream.status,
          detail: text.slice(0, 300),
        });
      return res.status(200).json({ ok: true, provider: 'formspree', filesReceived: files.length });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    const code = clean(error?.message || error, 160);
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
    ]);
    return res
      .status(clientErrors.has(code) ? 400 : 502)
      .json({ ok: false, error: clientErrors.has(code) ? code : 'formspree_delivery_failed' });
  }
}

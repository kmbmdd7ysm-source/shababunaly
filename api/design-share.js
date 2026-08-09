import { applyApiHeaders, guardPublicPost, guardPublicRequest } from './_request-security.js';
import { supabaseAdminRequest } from './_supabase-admin.ts';
import { verifyTurnstileToken } from './_turnstile.ts';

const clean = (value, max = 5000) =>
  String(value ?? '')
    .trim()
    .replace(/\0/g, '')
    .slice(0, max);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const tokenPattern = /^[A-Za-z0-9_-]{32,512}$/;
const views = new Set(['front', 'back', 'side']);

function readToken(req) {
  const raw = req.method === 'GET' ? req.query?.token : req.body?.token;
  const token = clean(Array.isArray(raw) ? raw[0] : raw, 512);
  if (!tokenPattern.test(token))
    throw Object.assign(new Error('invalid_share_token'), { status: 400 });
  return token;
}

async function callRpc(name, payload) {
  return supabaseAdminRequest(`/rest/v1/rpc/${name}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function mapDesignShareError(error) {
  const explicitStatus = Number(error?.status);
  if (explicitStatus) return explicitStatus;
  return /not_found|expired|revoked/.test(String(error?.message || '')) ? 404 : 503;
}

function remoteAddress(req) {
  return clean(
    req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket?.remoteAddress || '',
    200,
  )
    .split(',')[0]
    .trim();
}

export default async function handler(req, res) {
  applyApiHeaders(res);
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  try {
    if (req.method === 'GET') {
      if (
        !(await guardPublicRequest(req, res, {
          maxBytes: 2_000,
          limit: 60,
          windowMs: 10 * 60_000,
          bucket: 'design-share-read',
          honeypot: false,
        }))
      )
        return;
      const token = readToken(req);
      const data = await callRpc('get_shared_design', { p_token: token });
      if (!data?.id) return res.status(404).json({ ok: false, error: 'shared_design_not_found' });
      return res.status(200).json({ ok: true, design: data });
    }

    if (
      !(await guardPublicPost(req, res, {
        maxBytes: 16_000,
        limit: 12,
        windowMs: 10 * 60_000,
        bucket: 'design-share-write',
      }))
    )
      return;
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const token = readToken(req);
    const action = clean(body.action, 40);
    if (!['comment', 'approve', 'request_changes'].includes(action))
      return res.status(400).json({ ok: false, error: 'invalid_action' });

    const captchaOk = await verifyTurnstileToken(
      clean(body.turnstileToken, 3000),
      remoteAddress(req),
    );
    if (!captchaOk) return res.status(400).json({ ok: false, error: 'captcha_failed' });

    if (action === 'comment') {
      const name = clean(body.name, 120);
      const email = clean(body.email, 254).toLowerCase();
      const text = clean(body.text, 1000);
      const view = clean(body.view, 20).toLowerCase();
      const x = Number(body.x);
      const y = Number(body.y);
      if (
        name.length < 2 ||
        (email && !emailPattern.test(email)) ||
        text.length < 2 ||
        !views.has(view) ||
        !Number.isFinite(x) ||
        !Number.isFinite(y)
      ) {
        return res.status(400).json({ ok: false, error: 'invalid_comment' });
      }
      const data = await callRpc('add_shared_design_comment', {
        p_token: token,
        p_view: view,
        p_x: Math.min(100, Math.max(0, x)),
        p_y: Math.min(100, Math.max(0, y)),
        p_body: text,
        p_guest_name: name,
        p_guest_email: email,
      });
      return res.status(201).json({ ok: true, comment: data });
    }

    const note = clean(body.note, 2000);
    if (action === 'request_changes' && note.length < 2)
      return res.status(400).json({ ok: false, error: 'change_note_required' });
    const data = await callRpc('respond_to_shared_design', {
      p_token: token,
      p_decision: action,
      p_note: note,
    });
    return res.status(200).json({ ok: true, result: data });
  } catch (error) {
    const status = mapDesignShareError(error);
    return res.status(status).json({
      ok: false,
      error:
        status === 400
          ? clean(error.message, 120)
          : status === 404
            ? 'shared_design_not_found'
            : 'design_share_unavailable',
    });
  }
}

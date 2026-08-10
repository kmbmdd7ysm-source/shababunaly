#!/usr/bin/env node
/**
 * Preview/API verification — never hardcodes tokens.
 *
 * Usage:
 *   PREVIEW_BASE_URL=https://….vercel.app \
 *   VERCEL_AUTOMATION_BYPASS_SECRET=… \
 *   node scripts/verify-preview-api.mjs
 *
 * Without bypass secret against a protected preview → exits 2 with
 * BLOCKED_EXTERNAL_VERCEL_PROTECTION (not a false PASS).
 */
const base = String(process.env.PREVIEW_BASE_URL || '').replace(/\/$/, '');
const bypass = String(process.env.VERCEL_AUTOMATION_BYPASS_SECRET || '').trim();

if (!base) {
  console.error('PREVIEW_BASE_URL is required');
  process.exit(1);
}

const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
if (bypass) headers['x-vercel-protection-bypass'] = bypass;

const body = {
  teamName: 'Preview Audit Club',
  contactName: 'Audit',
  email: 'audit@example.com',
  phone: '+218910000000',
  quantity: 12,
  notes: 'preview api verification',
  productInterest: 'jerseys',
};

const url = `${base}/api/public-quote-request`;
const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
const text = await res.text();
let json = {};
try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 400) }; }

console.log(JSON.stringify({ url, status: res.status, bypassProvided: Boolean(bypass), body: json }, null, 2));

if (res.status === 401 && json?.protection?.vercel_auth_enabled) {
  console.error('BLOCKED_EXTERNAL_VERCEL_PROTECTION');
  process.exit(2);
}
if (!res.ok) {
  console.error('API_VERIFICATION_FAILED');
  process.exit(1);
}
console.info('API_VERIFICATION_OK');

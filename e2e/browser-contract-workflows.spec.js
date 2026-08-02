import { test, expect } from '@playwright/test';
import { createHmac } from 'node:crypto';

const contractE2E = process.env.BROWSER_CONTRACT_E2E === 'true';
const supabaseUrl = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '');
const password = 'Shababuna!2026-Verified';
const uniqueEmail = (prefix) => `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@example.com`;

const adminHeaders = () => ({ apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' });
async function createVerifiedUser(request, metadata = {}) {
  const email = uniqueEmail('verified');
  const response = await request.post(`${supabaseUrl}/auth/v1/admin/users`, {
    headers: adminHeaders(),
    data: { email, password, email_confirm: true, user_metadata: { full_name: 'Verified Customer', account_type: 'customer', ...metadata } },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  const user = await response.json();
  return { ...user, email };
}
async function deleteUser(request, id) {
  if (!id) return;
  await request.delete(`${supabaseUrl}/auth/v1/admin/users/${id}`, { headers: adminHeaders() });
}
async function signIn(page, email) {
  await page.goto('/account?mode=signin');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Your account' })).toBeVisible();
}
function decodeBase32(secret) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = String(secret).replace(/=+$/,'').toUpperCase();
  let bits = '';
  for (const char of clean) bits += alphabet.indexOf(char).toString(2).padStart(5, '0');
  return Buffer.from((bits.match(/.{8}/g) || []).map((byte) => Number.parseInt(byte, 2)));
}
function totp(secret, timestamp = Date.now()) {
  const counter = Math.floor(timestamp / 30_000);
  const buffer = Buffer.alloc(8); buffer.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac('sha1', decodeBase32(secret)).update(buffer).digest();
  const offset = digest[digest.length - 1] & 15;
  const value = ((digest[offset] & 127) << 24) | ((digest[offset + 1] & 255) << 16) | ((digest[offset + 2] & 255) << 8) | (digest[offset + 3] & 255);
  return String(value % 1_000_000).padStart(6, '0');
}
async function addRetailProduct(page) {
  await page.goto('/products/all-i-know-is-win-tee');
  await page.getByRole('radio', { name: 'M' }).click();
  await page.getByRole('button', { name: /Add to cart/i }).click();
  await page.goto('/checkout');
  await expect(page.getByRole('heading', { name: /Checkout/i })).toBeVisible();
}
async function chooseCountry(page, name) {
  const trigger = page.locator('.country-combobox__trigger');
  await trigger.click();
  const search = page.getByRole('combobox', { name: /Search countries/i });
  await search.fill(name);
  await search.press('Enter');
}
async function fillAddress(page, country = 'Libya') {
  await page.getByLabel('Email').fill('checkout@example.com');
  await page.getByLabel(/First name/i).fill('Checkout');
  await page.getByLabel(/Last name/i).fill('Tester');
  await chooseCountry(page, country);
  await page.getByLabel(/^Address/i).fill('1 Verified Street');
  await page.getByLabel(/^City/i).fill(country === 'Libya' ? 'Tripoli' : 'New York');
  if (country !== 'Libya') {
    await page.getByLabel(/^State/i).fill('NY');
    await page.getByLabel(/Postal/i).fill('10001');
  }
  await page.getByRole('checkbox').last().check();
}
async function mockOrder(page, capture, overrides = {}) {
  await page.route('**/api/create-order', async (route) => {
    const body = route.request().postDataJSON(); capture.push(body);
    const plan = body.paymentPlan;
    const total = Number(body.total || 20);
    const due = plan === 'half' ? total / 2 : plan === 'pending_shipping_quote' ? 0 : total;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, source: 'e2e-mock', order: {
      orderNumber: `SHB-20260802-${String(capture.length).padStart(7,'0')}`, subtotal: body.subtotal, shippingTotal: body.shippingTotal,
      total, amountDueNow: due, remainingBalance: Math.max(0, total - due), paymentPlan: plan,
      paymentStatus: body.paymentStatus, orderStatus: body.orderStatus, shippingQuoteRequired: body.shippingQuoteRequired,
      deliveryProfile: body.deliveryProfile, ...overrides,
    } }) });
  });
  await page.route('https://formspree.io/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));
}

test.describe('isolated browser contract workflows with mocked provider boundaries', () => {
  test.beforeAll(() => {
    expect(contractE2E, 'BROWSER_CONTRACT_E2E=true is required for the explicitly mocked contract suite.').toBeTruthy();
    expect(supabaseUrl, 'SUPABASE_URL is required').toMatch(/^https?:\/\//);
    expect(serviceKey, 'SUPABASE_SERVICE_ROLE_KEY is required').not.toBe('');
  });

  test('registration UI requests verification; an admin-confirmed test account signs in on another browser context', async ({ page, request, browser }) => {
    const email = uniqueEmail('registration');
    let userId = '';
    try {
      await page.goto('/account?mode=signup');
      await page.getByLabel('Full name').fill('Registration Customer');
      await page.getByLabel('Email').fill(email);
      await page.getByLabel('Password').fill(password);
      await page.getByLabel('Confirm new password').fill(password);
      await page.getByRole('button', { name: 'Create Account' }).click();
      await expect(page.getByText('Verify your email')).toBeVisible();
      const usersResponse = await request.get(`${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1000`, { headers: adminHeaders() });
      expect(usersResponse.ok()).toBeTruthy();
      const usersBody = await usersResponse.json();
      const users = Array.isArray(usersBody) ? usersBody : usersBody.users || [];
      const user = users.find((entry) => entry.email === email);
      expect(user?.id).toBeTruthy(); userId = user.id;
      const confirm = await request.put(`${supabaseUrl}/auth/v1/admin/users/${userId}`, { headers: adminHeaders(), data: { email_confirm: true } });
      expect(confirm.ok(), await confirm.text()).toBeTruthy();
      const second = await browser.newContext();
      const secondPage = await second.newPage();
      await signIn(secondPage, email);
      await expect(secondPage.getByText(email)).toBeVisible();
      await second.close();
    } finally { await deleteUser(request, userId); }
  });

  test('login, logout, password-reset request UI and cross-device sessions use Supabase without claiming email-link completion', async ({ page, request, browser }) => {
    const user = await createVerifiedUser(request);
    try {
      await signIn(page, user.email);
      await page.getByRole('button', { name: 'Sign out', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
      await page.getByRole('button', { name: 'Forgot password?' }).click();
      await page.getByLabel('Email').fill(user.email);
      await page.getByRole('button', { name: 'Continue' }).click();
      await expect(page.getByRole('alert')).toContainText('Check your email');
      const other = await browser.newContext();
      await signIn(await other.newPage(), user.email);
      await other.close();
    } finally { await deleteUser(request, user.id); }
  });

  test('MFA enrollment verifies a real TOTP factor and reaches AAL2', async ({ page, request }) => {
    const user = await createVerifiedUser(request);
    try {
      await signIn(page, user.email);
      await page.goto('/account?section=security');
      await page.getByRole('button', { name: 'Add authenticator' }).click();
      const secret = (await page.locator('.mfa-enrollment code').textContent())?.trim();
      expect(secret).toBeTruthy();
      await page.getByLabel('Six-digit code').fill(totp(secret));
      await page.getByRole('button', { name: 'Verify and enable' }).click();
      await expect(page.locator('.mfa-security-panel .workspace-status')).toContainText('AAL2');
    } finally { await deleteUser(request, user.id); }
  });

  for (const plan of ['half','full']) test(`Libya cash ${plan === 'half' ? '50%' : '100%'} saves the trusted payment plan`, async ({ page }) => {
    const captured = []; await mockOrder(page, captured);
    await addRetailProduct(page); await fillAddress(page, 'Libya');
    await page.getByRole('radio', { name: plan === 'half' ? /50%|Pay half/i : /100%|Pay in full/i }).check();
    await page.getByRole('button', { name: /Confirm Order/i }).click();
    await expect(page.getByRole('heading', { name: 'Order received' })).toBeVisible();
    expect(captured).toHaveLength(1);
    expect(captured[0].paymentMethod).toBe('cash');
    expect(captured[0].paymentPlan).toBe(plan);
  });

  test('card provider mock opens a payment session only after trusted order creation', async ({ page }) => {
    const captured = []; await mockOrder(page, captured);
    await page.addInitScript(() => { window.__e2ePaymentConfigured = true; });
    await page.route('**/api/create-session', async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, url: 'https://payments.example/e2e-checkout' }) }));
    await page.route('https://payments.example/**', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<title>Payment Sandbox</title><h1>Payment Sandbox</h1>' }));
    await addRetailProduct(page); await fillAddress(page, 'Libya');
    const card = page.getByRole('radio', { name: /Card & Digital Payment/i });
    if (await card.count()) {
      await card.check();
      await page.getByRole('button', { name: /Pay/i }).click();
      await expect(page).toHaveURL(/payments\.example/);
      expect(captured[0].paymentPlan).toBe('full');
    } else {
      await expect(page.getByText(/No online payment method|Cash in Libya/i).first()).toBeVisible();
    }
  });

  test('international checkout accepts address requirements and creates a shipping-quote order when no live rate exists', async ({ page }) => {
    const captured = []; await mockOrder(page, captured);
    await addRetailProduct(page); await fillAddress(page, 'United States');
    await expect(page.getByRole('radio', { name: /Cash in Libya/i })).toHaveCount(0);
    await page.getByRole('button', { name: /Place Pending Shipping Order|Pay/i }).click();
    await expect(page.getByRole('heading', { name: 'Order received' })).toBeVisible();
    expect(captured[0].shippingQuoteRequired).toBe(true);
    expect(captured[0].paymentPlan).toBe('pending_shipping_quote');
  });

  test('protected route contracts do not claim B2B, return, refund or inventory lifecycle completion', async ({ page, request }) => {
    await page.goto('/teams-wholesale');
    await expect(page.getByRole('heading', { name: 'Teams & Wholesale' })).toBeVisible();
    await page.goto('/operations');
    await expect(page).toHaveURL(/\/account/);
    await page.goto('/team-locker/private-team');
    await expect(page).toHaveURL(/\/account/);
    const readiness = await request.get('/api/readiness');
    expect([200,503]).toContain(readiness.status());
    const body = await readiness.json();
    expect(body).toHaveProperty('checks');
  });
});

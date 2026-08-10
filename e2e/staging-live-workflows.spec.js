import { test, expect } from '@playwright/test';

const enabled = process.env.STAGING_LIVE_E2E === 'true';
const supabaseUrl = String(process.env.E2E_SUPABASE_URL || '').replace(/\/$/, '');
const serviceKey = String(process.env.E2E_SUPABASE_SERVICE_ROLE_KEY || '');
const mailpitUrl = String(process.env.MAILPIT_API_URL || '').replace(/\/$/, '');
const password = 'Shababuna!2026-LiveE2E';
const uniqueEmail = (prefix) =>
  `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@example.test`;
const adminHeaders = () => ({
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  'Content-Type': 'application/json',
});

async function pollMail(request, email, pattern) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const response = await request.get(
      `${mailpitUrl}/api/v1/search?query=to:${encodeURIComponent(email)}`,
    );
    if (response.ok()) {
      const body = await response.json();
      for (const message of body.messages || []) {
        const detail = await request.get(`${mailpitUrl}/api/v1/message/${message.ID}`);
        if (!detail.ok()) continue;
        const text = await detail.text();
        const match = text.match(pattern);
        if (match) return match[0].replace(/&amp;/g, '&');
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`mail_link_not_received:${email}`);
}
async function findUser(request, email) {
  const response = await request.get(`${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1000`, {
    headers: adminHeaders(),
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  const body = await response.json();
  return (Array.isArray(body) ? body : body.users || []).find((entry) => entry.email === email);
}
async function deleteUser(request, id) {
  if (id)
    await request.delete(`${supabaseUrl}/auth/v1/admin/users/${id}`, { headers: adminHeaders() });
}
async function signIn(page, email, currentPassword = password) {
  await page.goto('/account?mode=signin');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(currentPassword);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Your account' })).toBeVisible();
}

// No page.route mocks are allowed in this file. It is reserved for an isolated
// staging Supabase project, Mailpit and sandbox providers only.
test.describe('staging live workflows without mocked application APIs', () => {
  test.beforeAll(() => {
    expect(enabled, 'STAGING_LIVE_E2E=true is required.').toBeTruthy();
    expect(supabaseUrl).toMatch(/^https?:\/\//);
    expect(serviceKey.length).toBeGreaterThan(20);
    expect(mailpitUrl).toMatch(/^https?:\/\//);
  });

  test('opens the real verification email and signs in from a second browser context', async ({
    page,
    request,
    browser,
  }) => {
    const email = uniqueEmail('verify');
    let userId = '';
    try {
      await page.goto('/account?mode=signup');
      await page.getByLabel('Full name').fill('Live Verification Customer');
      await page.getByLabel('Email').fill(email);
      await page.getByLabel('Password').fill(password);
      await page.getByLabel('Confirm new password').fill(password);
      await page.getByRole('button', { name: 'Create Account' }).click();
      await expect(page.getByText('Verify your email')).toBeVisible();
      const verificationUrl = await pollMail(
        request,
        email,
        /https?:\/\/[^\s"'<>]+(?:verify|token_hash)[^\s"'<>]*/i,
      );
      await page.goto(verificationUrl);
      const user = await findUser(request, email);
      userId = user?.id || '';
      expect(user?.email_confirmed_at).toBeTruthy();
      const second = await browser.newContext();
      await signIn(await second.newPage(), email);
      await second.close();
    } finally {
      await deleteUser(request, userId);
    }
  });

  test('opens the real password-reset email, changes the password and signs in with it', async ({
    page,
    request,
  }) => {
    const email = uniqueEmail('reset');
    const newPassword = 'Shababuna!2026-Reset';
    let userId = '';
    try {
      const created = await request.post(`${supabaseUrl}/auth/v1/admin/users`, {
        headers: adminHeaders(),
        data: { email, password, email_confirm: true },
      });
      expect(created.ok(), await created.text()).toBeTruthy();
      userId = (await created.json()).id;
      await page.goto('/account?mode=signin');
      await page.getByRole('button', { name: 'Forgot password?' }).click();
      await page.getByLabel('Email').fill(email);
      await page.getByRole('button', { name: 'Continue' }).click();
      const resetUrl = await pollMail(
        request,
        email,
        /https?:\/\/[^\s"'<>]+(?:recovery|token_hash)[^\s"'<>]*/i,
      );
      await page.goto(resetUrl);
      await page.getByLabel('New password').fill(newPassword);
      await page.getByLabel('Confirm new password').fill(newPassword);
      await page.getByRole('button', { name: /Update password/i }).click();
      await signIn(page, email, newPassword);
    } finally {
      await deleteUser(request, userId);
    }
  });

  test('persists a real Libya cash order and customer return in isolated Supabase', async ({
    page,
    request,
  }) => {
    const email = uniqueEmail('order');
    let userId = '';
    try {
      const created = await request.post(`${supabaseUrl}/auth/v1/admin/users`, {
        headers: adminHeaders(),
        data: { email, password, email_confirm: true },
      });
      expect(created.ok(), await created.text()).toBeTruthy();
      userId = (await created.json()).id;
      await signIn(page, email);
      await page.goto('/products/all-i-know-is-win-tee');
      await page.getByRole('radio', { name: 'M' }).click();
      await page.getByRole('button', { name: /Add to cart/i }).click();
      await page.goto('/checkout');
      await page.getByLabel(/First name/i).fill('Live');
      await page.getByLabel(/Last name/i).fill('Customer');
      await page.locator('.country-combobox__trigger').click();
      await page.getByRole('combobox', { name: /Search countries/i }).fill('Libya');
      await page.keyboard.press('Enter');
      await page.getByLabel(/^Address/i).fill('1 Staging Street');
      await page.getByLabel(/^City/i).fill('Tripoli');
      await page.getByRole('checkbox').last().check();
      await page.getByRole('button', { name: /Confirm Order/i }).click();
      const orderNumber = (await page.getByText(/SHB-/).first().textContent())?.match(
        /SHB-[A-Z0-9-]+/,
      )?.[0];
      expect(orderNumber).toBeTruthy();
      const rows = await request.get(
        `${supabaseUrl}/rest/v1/orders?order_number=eq.${encodeURIComponent(orderNumber)}&select=id,order_number,user_id`,
        { headers: adminHeaders() },
      );
      const order = (await rows.json())[0];
      expect(order.user_id).toBe(userId);
      await request.patch(`${supabaseUrl}/rest/v1/orders?id=eq.${order.id}`, {
        headers: { ...adminHeaders(), Prefer: 'return=minimal' },
        data: { order_status: 'delivered', fulfillment_status: 'delivered' },
      });
      await page.goto(`/account?section=orders&order=${encodeURIComponent(orderNumber)}`);
      await page.getByRole('button', { name: /Request return/i }).click();
      await page.getByLabel(/Reason/i).selectOption({ index: 1 });
      await page.getByLabel(/Details/i).fill('Isolated staging return verification.');
      await page.getByRole('button', { name: /Submit return/i }).click();
      const returns = await request.get(
        `${supabaseUrl}/rest/v1/return_requests?order_id=eq.${order.id}&select=id,status`,
        { headers: adminHeaders() },
      );
      expect((await returns.json()).length).toBe(1);
    } finally {
      await deleteUser(request, userId);
    }
  });
});

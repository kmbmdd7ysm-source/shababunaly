import { test, expect } from '@playwright/test';

test('home, shop and customize routes expose the new brand', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Shababuna/i);
  await expect(page.getByText('BUILT DIFFERENT.', { exact: true }).first()).toBeVisible();
  await page.goto('/shop');
  await expect(page.getByRole('heading', { name: 'Shop' })).toBeVisible();
  await page.goto('/customize');
  await expect(page.getByRole('heading', { name: 'Customize Everything' })).toBeVisible();
});

test('mobile layout does not create horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/shop');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('ProductCard renders across storefront discovery routes', async ({ page }) => {
  for (const route of ['/', '/shop', '/lha-store', '/search?q=LHA', '/favorites']) {
    await page.goto(route);
    await expect(page.locator('body')).not.toContainText('isLowStock is not defined');
    await expect(page.locator('body')).not.toContainText('Application error');
  }
});

test('customize accepts a valid product slug without scope errors', async ({ page }) => {
  await page.goto('/customize?product=all-i-know-is-win-tee');
  await expect(page.locator('body')).not.toContainText('getProduct is not defined');
  await expect(page.getByRole('heading', { name: /Customize/i })).toBeVisible();
});

test('special request validates URL-or-image and supports RTL', async ({ page }) => {
  await page.goto('/special-request');
  await expect(page.getByRole('heading', { name: /Can’t find it|لم تجده/i })).toBeVisible();
  await page.getByLabel(/Customer name|اسم العميل/i).fill('Test Customer');
  await page.getByLabel('Email').fill('customer@example.com');
  await page.getByLabel(/Description|الوصف/i).fill('A real basketball product requested for sourcing.');
  await page.getByLabel(/Desired quantity|الكمية المطلوبة/i).fill('2');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: /Submit Special Request|إرسال الطلب الخاص/i }).click();
  await expect(page.getByRole('alert')).toContainText(/link|رابط|image|صورة/i);

  await page.evaluate(() => localStorage.setItem('shababuna-language', 'ar'));
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
});


test('invalid customize product fails safely without runtime errors', async ({ page }) => {
  await page.goto('/customize?product=does-not-exist');
  await expect(page.locator('body')).not.toContainText(/ReferenceError|Application error/);
  await expect(page.getByRole('heading', { name: /Customize/i })).toBeVisible();
});

test('language and currency preferences remain independent', async ({ page }) => {
  await page.goto('/shop');
  await page.evaluate(() => { localStorage.setItem('shababuna-language','ar'); localStorage.setItem('shababuna-currency','USD'); });
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('dir','rtl');
  expect(await page.evaluate(() => localStorage.getItem('shababuna-currency'))).toBe('USD');
});

test('operations is denied to an unauthenticated visitor', async ({ page }) => {
  await page.goto('/operations');
  await expect(page).toHaveURL(/\/account/);
});

test('special request URL submission handles a verified API response', async ({ page }) => {
  await page.route('**/api/special-request', async (route) => route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({ok:true,request:{request_number:'SR-20260801-0000001'}}) }));
  await page.goto('/special-request');
  await page.getByLabel(/Customer name|اسم العميل/i).fill('Test Customer');
  await page.getByLabel('Email').fill('customer@example.com');
  await page.getByLabel(/Product URL|رابط المنتج/i).fill('https://example.com/product');
  await page.getByLabel(/Description|الوصف/i).fill('A verified basketball product sourcing request.');
  await page.getByLabel(/Desired quantity|الكمية المطلوبة/i).fill('2');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name:/Submit Special Request|إرسال الطلب الخاص/i }).click();
  await expect(page.locator('body')).toContainText('SR-20260801-0000001');
});

test('protected staff and team-locker routes never expose private data to guests', async ({ page }) => {
  await page.goto('/operations');
  await expect(page).toHaveURL(/\/account/);
  await page.goto('/team-locker/private-team');
  await expect(page).toHaveURL(/\/account/);
});

test('discovery flows remain stable across Ready to Ship and recently viewed', async ({ page }) => {
  await page.goto('/shop/ready-to-ship');
  await expect(page.locator('body')).not.toContainText('Application error');
  await page.goto('/products/all-i-know-is-win-tee');
  await page.goto('/favorites');
  await expect(page.locator('body')).not.toContainText('isLowStock is not defined');
});

test('all public routes render without runtime, console or network-fatal errors', async ({ page }) => {
  const failures = [];
  page.on('pageerror', (error) => failures.push(`page:${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') failures.push(`console:${message.text()}`); });
  const routes = [
    '/', '/shop', '/shop/ready-to-ship', '/lha-store', '/search?q=LHA', '/favorites', '/compare',
    '/products/all-i-know-is-win-tee', '/customize', '/special-request', '/teams-wholesale',
    '/our-work', '/about', '/help', '/faq', '/contact', '/size-guide', '/cart', '/checkout', '/account',
  ];
  for (const route of routes) {
    await page.goto(route);
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/ReferenceError|Application error|is not defined/);
  }
  expect(failures).toEqual([]);
});

test('custom production studio exposes production-grade controls and XLSX import', async ({ page }) => {
  await page.goto('/customize?product=all-i-know-is-win-tee');
  await expect(page.getByRole('button', { name: /Front/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Back/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Side/i })).toBeVisible();
  await expect(page.getByText(/Import CSV\/XLSX|استيراد CSV\/XLSX/i)).toBeVisible();
  const rosterInput = page.locator('input[type="file"][accept*="xlsx"]');
  await expect(rosterInput).toHaveCount(1);
  await expect(page.getByRole('button', { name: /Download Proof PDF|تحميل بروفة PDF/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Download Tech Pack|تحميل ملف التصنيع/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Production Artwork ZIP|حزمة ملفات الإنتاج ZIP/i })).toBeVisible();
});

test('secure design-share route loads through the protected server boundary', async ({ page }) => {
  const token = 'A'.repeat(48);
  await page.route('**/api/design-share?token=*', async (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, design: {
      id: 'design-1', name: 'Final Uniform', productType: 'game-set', status: 'proof_ready',
      version: 4, permissions: 'approve', expiresAt: '2099-01-01T00:00:00Z',
      designData: { productType: 'game-set', primary: '#050505', secondary: '#ffffff', accent: '#d4af37', studio: { activeView: 'front', layers: [], comments: [] } },
      comments: [],
    } }),
  }));
  await page.goto(`/design-share/${token}`);
  await expect(page.getByRole('heading', { name: /Final Uniform/i })).toBeVisible();
  await expect(page.getByText(/Proof decision|قرار البروفة/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /Approve Final Proof|اعتماد البروفة النهائية/i })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/i);
});

test('product discovery exposes stable related and recommendation cards', async ({ page }) => {
  await page.goto('/products/all-i-know-is-win-tee');
  await expect(page.locator('body')).not.toContainText(/Application error|isLowStock is not defined/);
  const sections = await page.locator('section').filter({ has: page.locator('.product-grid') }).all();
  for (const section of sections) {
    const ids = await section.locator('.product-card').evaluateAll((cards) => cards.map((card) => card.getAttribute('data-product-id')).filter(Boolean));
    expect(new Set(ids).size).toBe(ids.length);
  }
});

test('RTL, focus and mobile navigation stay usable on every primary public destination', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem('shababuna-language', 'ar'));
  for (const route of ['/', '/shop', '/customize', '/special-request', '/teams-wholesale', '/lha-store', '/about']) {
    await page.goto(route);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement !== document.body)).toBe(true);
  }
});

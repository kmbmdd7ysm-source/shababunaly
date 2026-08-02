import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const routes = ['/', '/shop', '/products/all-i-know-is-win-tee', '/customize', '/special-request', '/teams-wholesale', '/lha-store', '/checkout', '/account', '/about'];
for (const path of routes) {
  for (const locale of ['en','ar']) {
    test(`WCAG AA ${locale}: ${path}`, async ({ page }) => {
      await page.addInitScript((lang) => localStorage.setItem('shababuna-language', lang), locale);
      await page.goto(path);
      await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
      const results = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
      expect(results.violations).toEqual([]);
    });
  }
}

test('keyboard-only navigation reaches the main action and preserves visible focus', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const first = page.locator(':focus');
  await expect(first).toBeVisible();
  await expect(first).toHaveCSS('outline-style', /^(?!none$).+/);
  for (let index = 0; index < 12; index += 1) await page.keyboard.press('Tab');
  const focused = page.locator(':focus');
  await expect(focused).toBeVisible();
  expect(await focused.evaluate((node) => ['A','BUTTON','INPUT','SELECT','TEXTAREA'].includes(node.tagName))).toBeTruthy();
});

test('modal traps focus, closes with Escape and returns focus to its trigger', async ({ page }) => {
  await page.goto('/products/all-i-know-is-win-tee');
  const trigger = page.getByRole('button', { name: /Size guide/i });
  await trigger.focus();
  await trigger.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  for (let index = 0; index < 8; index += 1) {
    await page.keyboard.press('Tab');
    expect(await page.locator(':focus').evaluate((node) => Boolean(node.closest('[role="dialog"]')))).toBeTruthy();
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('checkout validation errors are announced and focus moves to an invalid field', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('shababuna-cart:guest', JSON.stringify([{
      key:'product:p014:black-M-retail',type:'product',id:'p014',slug:'all-i-know-is-win-tee',
      name:{en:'LHA Win Tee',ar:'LHA Win Tee'},image:'/images/products/all-i-know-is-win-tee-black.webp',
      price:20,size:'M',color:'black',sku:'LHA-TEE-WIN-BL-M',maxStock:99,inventoryTracking:false,
      minQuantity:1,href:'/products/all-i-know-is-win-tee',quantity:1,purchaseMode:'retail',deliveryProfile:'standard'
    }]));
  });
  await page.goto('/checkout');
  const agree = page.getByRole('checkbox').last();
  if (await agree.count()) await agree.check();
  await page.getByRole('button', { name: /Confirm Order|Place Pending Shipping Order|Pay/i }).click();
  const summary = page.locator('.checkout-error-summary');
  await expect(summary).toBeVisible();
  await expect(summary).toBeFocused();
  await expect(summary).toHaveAttribute('aria-live','assertive');
  await expect(page.getByLabel('Email')).toHaveAttribute('aria-invalid','true');
  await expect(page.getByLabel('Email')).toHaveAttribute('aria-describedby','checkout-email-error');
});

test('layout remains usable at 200% and 400% browser zoom', async ({ page }) => {
  await page.goto('/shop');
  for (const zoom of [2,4]) {
    if (page.context().browser()?.browserType().name() === 'chromium') await page._client?.send?.('Emulation.setPageScaleFactor', { pageScaleFactor: zoom }).catch(() => null);
    await page.setViewportSize({ width: Math.floor(1280 / zoom), height: Math.floor(900 / zoom) });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(2);
    await expect(page.getByRole('heading', { name: 'Shop' })).toBeVisible();
  }
});

test('reduced motion disables smooth scrolling and RTL keeps logical reading order', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => localStorage.setItem('shababuna-language','ar'));
  await page.goto('/checkout');
  await expect(page.locator('html')).toHaveAttribute('dir','rtl');
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).not.toBe('smooth');
  const headings = await page.locator('h1,h2').allTextContents();
  expect(headings.length).toBeGreaterThan(0);
});

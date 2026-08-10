import { test, expect } from '@playwright/test';
const routes = [
  '/',
  '/shop',
  '/products/all-i-know-is-win-tee',
  '/customize',
  '/special-request',
  '/teams-wholesale',
  '/lha-store',
  '/checkout',
  '/account',
];
const viewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 834, height: 1112 },
  { name: 'desktop', width: 1440, height: 1000 },
];
for (const route of routes)
  for (const locale of ['en', 'ar'])
    for (const viewport of viewports) {
      test(`visual ${viewport.name} ${locale} ${route}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.addInitScript(
          (lang) => localStorage.setItem('shababuna-language', lang),
          locale,
        );
        await page.goto(route);
        await page.emulateMedia({ reducedMotion: 'reduce' });
        const slug = route === '/' ? 'home' : route.slice(1).replaceAll('/', '-');
        await expect(page).toHaveScreenshot(`${slug}-${locale}-${viewport.name}.png`, {
          fullPage: true,
          animations: 'disabled',
          maxDiffPixelRatio: 0.015,
        });
      });
    }

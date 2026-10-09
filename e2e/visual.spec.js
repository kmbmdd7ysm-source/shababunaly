import { existsSync } from 'node:fs';
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
      test(`visual ${viewport.name} ${locale} ${route}`, async ({ page }, testInfo) => {
        // The visual:run script selects desktop Chromium, then exercises all viewport sizes.
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.addInitScript(
          (lang) => localStorage.setItem('shababuna-language', lang),
          locale,
        );
        await page.goto(route);
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await expect(page.locator('main').first()).toBeVisible();
        const layout = await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          viewportWidth: document.documentElement.clientWidth,
          mainWidth: document.querySelector('main')?.getBoundingClientRect().width ?? 0,
        }));
        expect(
          layout.overflow,
          `Horizontal overflow on ${route} (${locale}/${viewport.name})`,
        ).toBeLessThanOrEqual(2);
        expect(layout.mainWidth).toBeGreaterThan(0);
        expect(layout.mainWidth).toBeLessThanOrEqual(layout.viewportWidth + 2);

        const slug = route === '/' ? 'home' : route.slice(1).replaceAll('/', '-');
        const fileName = `${slug}-${locale}-${viewport.name}.png`;
        const baseline = testInfo.snapshotPath(fileName);
        if (existsSync(baseline) || process.env.VISUAL_BASELINE_REVIEW === 'generate') {
          // Comparison is strict only when an actual reviewed image was committed.
          await expect(page).toHaveScreenshot(fileName, {
            fullPage: true,
            animations: 'disabled',
            maxDiffPixelRatio: 0.015,
          });
        } else {
          // There are currently no committed goldens in this repository.
          // Validate rendered layout without creating false CI baseline failures
          // or silently auto-approving screenshots of unreviewed UI changes.
          const image = await page.screenshot({ fullPage: true, animations: 'disabled' });
          expect(image.byteLength).toBeGreaterThan(3_000);
        }
      });
    }

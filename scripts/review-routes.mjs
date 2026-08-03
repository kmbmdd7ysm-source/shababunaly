// Route review harness.
//
// Serves a production build and, for each requested route, records: render
// success, page errors, horizontal overflow, axe violations against WCAG 2.2
// AA, and a screenshot. Runs every route in both locales and at whichever
// viewports are asked for.
//
// Usage:
//   node scripts/review-routes.mjs --dist dist --routes /,/shop --out /tmp/shots
//   node scripts/review-routes.mjs --routes /shop --axe --langs en,ar --vp 390x844,1440x1000
//
// Flags: --dist --routes --langs --vp --out --axe --keyboard --reduced-motion
//        --shots --quiet
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const argv = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const index = argv.indexOf(`--${name}`);
  return index === -1 ? fallback : argv[index + 1];
};
const has = (name) => argv.includes(`--${name}`);

const DIST = flag('dist', 'dist');
const ROUTES = String(flag('routes', '/')).split(',').filter(Boolean);
const LANGS = String(flag('langs', 'en,ar')).split(',').filter(Boolean);
const VIEWPORTS = String(flag('vp', '390x844,1440x1000'))
  .split(',')
  .map((entry) => entry.split('x').map(Number));
const OUT = flag('out', '');
const RUN_AXE = has('axe');
const RUN_KEYBOARD = has('keyboard');
const REDUCED = has('reduced-motion');
const SHOTS = has('shots') || Boolean(OUT);

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.json': 'application/json',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
  '.webmanifest': 'application/manifest+json',
  '.ico': 'image/x-icon',
  '.avif': 'image/avif',
  '.mp4': 'video/mp4',
  '.glb': 'model/gltf-binary',
};

function serve(root) {
  return new Promise((resolve) => {
    const server = http.createServer((request, response) => {
      const url = decodeURIComponent(String(request.url).split('?')[0]);
      if (url.startsWith('/api/')) {
        response.writeHead(404, { 'Content-Type': 'application/json' });
        response.end('{}');
        return;
      }
      let file = path.join(root, url);
      if (fs.existsSync(file) && fs.statSync(file).isDirectory())
        file = path.join(file, 'index.html');
      if (!fs.existsSync(file)) {
        const nested = path.join(root, url, 'index.html');
        file = fs.existsSync(nested) ? nested : path.join(root, 'index.html');
      }
      response.writeHead(200, {
        'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
      });
      fs.createReadStream(file).pipe(response);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

const seed = (language) => {
  localStorage.setItem('shababuna-language', language);
  localStorage.setItem('shababuna-commerce-welcome-v1', 'done');
  localStorage.setItem(
    'shababuna-cookie-consent',
    JSON.stringify({
      necessary: true,
      analytics: false,
      marketing: false,
      decidedAt: '2026-01-01T00:00:00.000Z',
    }),
  );
};

const server = await serve(DIST);
const { port } = server.address();
const browser = await chromium.launch({
  executablePath: '/opt/google/chrome/chrome',
  args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'],
});
if (OUT) fs.mkdirSync(OUT, { recursive: true });

const rows = [];
let axeTotal = 0;
let failures = 0;

for (const route of ROUTES) {
  for (const [width, height] of VIEWPORTS) {
    for (const language of LANGS) {
      const context = await browser.newContext({
        viewport: { width, height },
        deviceScaleFactor: SHOTS ? 2 : 1,
        locale: 'en-US',
        ...(REDUCED ? { reducedMotion: 'reduce' } : {}),
      });
      await context.addInitScript(seed, language);
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(String(error.message).slice(0, 120)));

      await page.goto(`http://127.0.0.1:${port}${route}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2200);
      await page.evaluate(async () => {
        const step = window.innerHeight * 0.8;
        for (let y = 0; y < document.body.scrollHeight; y += step) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 90));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(600);

      const facts = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        main: Boolean(document.querySelector('#main-content')),
        textLength: /** @type {HTMLElement|null} */ (
          (document.querySelector('#main-content'))?.innerText || ''
        ).trim().length,
        h1: document.querySelectorAll('h1').length,
      }));

      let violations = [];
      if (RUN_AXE) {
        const result = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
          .analyze();
        violations = result.violations;
        axeTotal += violations.length;
      }

      let focusables = null;
      if (RUN_KEYBOARD) {
        focusables = await page.evaluate(() => {
          const selector = 'a[href],button,input,select,textarea,[tabindex]';
          const nodes = /** @type {HTMLElement[]} */ ([
            ...document.querySelectorAll(selector),
          ]).filter(
            (node) =>
              !(/** @type {HTMLButtonElement} */ (node).disabled) &&
              node.tabIndex !== -1 &&
              node.offsetParent !== null,
          );
          return nodes.length;
        });
      }

      if (SHOTS && OUT) {
        const tag = `${route.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'home'}-${language}-${width}`;
        fs.writeFileSync(path.join(OUT, `${tag}.png`), await page.screenshot());
      }

      const broken =
        !facts.main || facts.textLength < 20 || facts.overflow > 2 || errors.length > 0;
      if (broken || violations.length) failures += 1;
      rows.push({
        route,
        language,
        width,
        ...facts,
        errors: errors.length,
        violations: violations.length,
        focusables,
      });

      if (!has('quiet')) {
        const status = broken ? 'BROKEN' : violations.length ? `axe:${violations.length}` : 'ok';
        console.info(
          `  ${route.padEnd(30)} ${language} ${String(width).padStart(4)}  ${status.padEnd(9)}` +
            ` overflow=${facts.overflow} h1=${facts.h1}` +
            (focusables == null ? '' : ` focusable=${focusables}`) +
            (errors.length ? `\n      ERRORS: ${errors.join(' | ')}` : '') +
            violations
              .map(
                (v) =>
                  `\n      [${v.impact}] ${v.id} x${v.nodes.length}: ${v.nodes[0].html.slice(0, 90)}`,
              )
              .join(''),
        );
      }
      await context.close();
    }
  }
}

await browser.close();
server.close();

console.info(
  `\n  ${rows.length} checks, ${rows.length - failures} clean` +
    (RUN_AXE ? `, ${axeTotal} axe violations` : '') +
    `, ${rows.filter((r) => r.overflow > 2).length} with horizontal overflow.`,
);
if (OUT) console.info(`  Screenshots: ${OUT}`);
process.exitCode = failures > 0 ? 1 : 0;

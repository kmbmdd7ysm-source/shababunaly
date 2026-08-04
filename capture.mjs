import { chromium } from 'playwright';
import fs from 'node:fs';

const URL = fs.readFileSync('/tmp/preview-url.txt', 'utf8').trim();
const EXPECT_SHA = '6bcaa282e608faf139ea2b43a68b6181994699e0';
const EXPECT_DIST = '6bdc2f9311bc81f6d8341ef4b5ec8fb1df3321b0273de88ee63e21d9682559bc';
const OUT = '/opt/cursor/artifacts/assets/preview-verified';

const ROUTES = [
  ['home', '/'],
  ['shop', '/shop'],
  ['product', '/products/all-i-know-is-win-tee'],
  ['customize', '/customize'],
  ['teams', '/teams-wholesale'],
  ['cart', '/cart'],
  ['account', '/account'],
  ['checkout', '/checkout'],
  ['operations', '/operations'],
];

const VIEWPORTS = [
  ['desktop', 1440, 900],
  ['mobile', 390, 844],
];

const b = await chromium.launch({
  executablePath: '/opt/google/chrome/chrome',
  args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'],
});

const ledger = [];

for (const [device, width, height] of VIEWPORTS) {
  for (const lang of ['en', 'ar']) {
    // One fresh context per locale/viewport = a clean incognito session.
    // The service worker is deliberately NOT stubbed: the whole point is to
    // prove the public origin cannot serve a stale shell.
    const ctx = await b.newContext({ viewport: { width, height }, deviceScaleFactor: 2 });
    await ctx.addInitScript((l) => {
      localStorage.setItem('shababuna-language', l);
      localStorage.setItem('shababuna-commerce-welcome-v1', 'done');
      localStorage.setItem('shababuna-currency', 'USD');
      localStorage.setItem('shababuna-cookie-consent', JSON.stringify({ necessary: true }));
    }, lang);
    const p = await ctx.newPage();

    for (const [name, route] of ROUTES) {
      await p.goto(URL + route, { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(3200);

      const state = await p.evaluate(() => ({
        sha: document.documentElement.dataset.buildSha || null,
        dist: document.documentElement.dataset.buildDist || null,
        dir: document.documentElement.dir || getComputedStyle(document.body).direction,
        lang: document.documentElement.lang,
        sw: 'serviceWorker' in navigator ? Boolean(navigator.serviceWorker.controller) : 'n/a',
        title: document.title,
        h1: document.querySelector('h1')?.textContent?.trim().slice(0, 60) || null,
        path: location.pathname,
      }));

      const file = `${name}-${lang}-${device}.png`;
      fs.writeFileSync(`${OUT}/${file}`, await p.screenshot());

      ledger.push({
        file,
        url: URL + route,
        route,
        landedOn: state.path,
        shaInPage: state.sha,
        distInPage: state.dist,
        shaMatches: state.sha === EXPECT_SHA,
        distMatches: state.dist === EXPECT_DIST,
        swControlling: state.sw,
        viewport: `${width}x${height}`,
        locale: lang,
        direction: state.dir,
        h1: state.h1,
      });
      console.log(
        `${file.padEnd(28)} sha=${state.sha === EXPECT_SHA ? 'MATCH' : 'MISMATCH'} dist=${state.dist === EXPECT_DIST ? 'MATCH' : 'MISMATCH'} sw=${state.sw} dir=${state.dir} -> ${state.path}`,
      );
    }
    await ctx.close();
  }
}

await b.close();
fs.writeFileSync(
  `${OUT}/CAPTURE-LEDGER.json`,
  `${JSON.stringify({ publicUrl: URL, expectedSha: EXPECT_SHA, expectedDist: EXPECT_DIST, capturedAt: new Date().toISOString(), shots: ledger }, null, 2)}\n`,
);
const bad = ledger.filter((r) => !r.shaMatches || !r.distMatches || r.swControlling === true);
console.log(`\n${ledger.length} captures, ${bad.length} with a mismatch or an active service worker.`);
process.exit(bad.length ? 1 : 0);

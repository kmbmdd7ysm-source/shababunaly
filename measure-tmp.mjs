import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.jpeg': 'image/jpeg', '.json': 'application/json', '.txt': 'text/plain', '.xml': 'application/xml', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon' };
const DIST = process.env.DIST || '/tmp/dist-p2base';
const FONT_DELAY = Number(process.env.FONT_DELAY_MS || 1200);

const serve = (root) => new Promise((r) => {
  const s = http.createServer((q, res) => {
    const u = decodeURIComponent(q.url.split('?')[0]);
    if (u.startsWith('/api/')) { res.writeHead(404); res.end('{}'); return; }
    let f = path.join(root, u);
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
    if (!fs.existsSync(f)) { const p = path.join(root, u, 'index.html'); f = fs.existsSync(p) ? p : path.join(root, 'index.html'); }
    const send = () => { res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); };
    u.startsWith('/fonts/') ? setTimeout(send, FONT_DELAY) : send();
  });
  s.listen(0, '127.0.0.1', () => r(s));
});

const server = await serve(DIST);
const port = server.address().port;
const browser = await chromium.launch({ executablePath: '/opt/google/chrome/chrome', args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'] });

const CASES = (process.env.ROUTES || '/:en:1440:1000,/:ar:1440:1000,/:en:390:844,/:ar:390:844')
  .split(',').map((c) => { const [r, l, w, h] = c.split(':'); return [r, l, Number(w), Number(h)]; });
const RUNS = Number(process.env.RUNS || 3);

console.log(`DIST=${DIST}  fontDelay=${FONT_DELAY}ms  runs=${RUNS}\n`);
for (const [route, lang, w, h] of CASES) {
  const cls = []; const detail = [];
  for (let i = 0; i < RUNS; i += 1) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, locale: 'en-US' });
    await ctx.addInitScript((l) => {
      localStorage.setItem('shababuna-language', l);
      localStorage.setItem('shababuna-commerce-welcome-v1', 'done');
      localStorage.setItem('shababuna-cookie-consent', JSON.stringify({ necessary: true, analytics: false, marketing: false, decidedAt: '2026-01-01T00:00:00.000Z' }));
      window.__cls = 0; window.__entries = [];
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          if (e.hadRecentInput) continue;
          window.__cls += e.value;
          window.__entries.push({ v: Number(e.value.toFixed(5)), t: Math.round(e.startTime), s: (e.sources || []).slice(0, 5).map((x) => (x.node ? `${x.node.nodeName}.${String(x.node.className || '').slice(0, 28)}` : '?')) });
        }
      }).observe({ type: 'layout-shift', buffered: true });
    }, lang);
    const page = await ctx.newPage();
    await page.goto(`http://127.0.0.1:${port}${route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(FONT_DELAY + 2600);
    const r = await page.evaluate(() => ({ cls: window.__cls, entries: window.__entries }));
    cls.push(r.cls); if (i === 0) detail.push(...r.entries);
    await ctx.close();
  }
  const med = [...cls].sort((a, b) => a - b)[Math.floor(cls.length / 2)];
  console.log(`${route} ${lang} ${w}x${h}  CLS median=${med.toFixed(5)}  [${cls.map((v) => v.toFixed(4)).join(' ')}]`);
  for (const e of detail.slice(0, 4)) console.log(`      +${e.v} @${e.t}ms  <- ${e.s.join(' , ').slice(0, 120)}`);
}
await browser.close();
server.close();

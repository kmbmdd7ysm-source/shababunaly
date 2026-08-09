import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import net from 'node:net';
import { chromium } from 'playwright';

const root = process.cwd();
const workspace = resolve('reports/pwa-upgrade');
const activeDir = join(workspace, 'active');
const versions = [
  { id: `pwa-a-${Date.now()}`, dir: join(workspace, 'version-a') },
  { id: `pwa-b-${Date.now()}`, dir: join(workspace, 'version-b') },
];
const reportPath = 'reports/browser/pwa-upgrade-result.json';
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};
const run = (command, args, env = process.env) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, env, stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`${command} ${args.join(' ')} exited with ${code}`)),
    );
  });
const freePort = () =>
  new Promise((resolve, reject) => {
    const socket = net.createServer();
    socket.once('error', reject);
    socket.listen(0, '127.0.0.1', () => {
      const address = socket.address();
      socket.close(() => resolve(address.port));
    });
  });
const publish = async (directory) => {
  await rm(activeDir, { recursive: true, force: true });
  await cp(directory, activeDir, { recursive: true });
};
const buildVersion = async ({ id, dir }) => {
  await rm('dist', { recursive: true, force: true });
  await run('npm', ['run', 'build'], { ...process.env, VITE_BUILD_ID: id, BUILD_ID: id });
  await rm(dir, { recursive: true, force: true });
  await cp('dist', dir, { recursive: true });
};
const handler = async (request, response) => {
  try {
    const url = new URL(request.url || '/', 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);
    if (pathname.includes('\0') || pathname.includes('..')) throw new Error('unsafe path');
    let candidate = resolve(activeDir, `.${pathname}`);
    if (!candidate.startsWith(activeDir)) throw new Error('unsafe path');
    try {
      if ((await stat(candidate)).isDirectory()) candidate = join(candidate, 'index.html');
    } catch {
      candidate = join(activeDir, 'index.html');
    }
    const body = await readFile(candidate);
    response.statusCode = 200;
    response.setHeader('content-type', mime[extname(candidate)] || 'application/octet-stream');
    response.setHeader(
      'cache-control',
      pathname === '/sw.js' || candidate.endsWith('index.html')
        ? 'no-store'
        : 'public, max-age=31536000, immutable',
    );
    response.end(body);
  } catch (error) {
    response.statusCode = 500;
    response.end(String(error));
  }
};

const result = {
  status: 'failed',
  generatedAt: new Date().toISOString(),
  versions: versions.map((v) => v.id),
  checks: [],
  error: null,
};
let server;
let browser;
try {
  await mkdir(workspace, { recursive: true });
  await mkdir('reports/browser', { recursive: true });
  await buildVersion(versions[0]);
  await buildVersion(versions[1]);
  await publish(versions[0].dir);
  const port = await freePort();
  server = createServer((req, res) => void handler(req, res));
  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
  const baseURL = `http://127.0.0.1:${port}`;
  browser = await chromium.launch(
    process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  );
  const context = await browser.newContext({ serviceWorkers: 'allow' });
  const page = await context.newPage();
  await page.goto(baseURL, { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    if ('serviceWorker' in navigator) await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(
    async (id) => (await caches.keys()).some((key) => key.includes(id)),
    versions[0].id,
  );
  const firstKeys = await page.evaluate(() => caches.keys());
  result.checks.push({
    name: 'version_a_installed',
    passed: firstKeys.some((key) => key.includes(versions[0].id)),
    cacheKeys: firstKeys,
  });

  await publish(versions[1].dir);
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    await registration?.update();
    await new Promise((resolve) => setTimeout(resolve, 1200));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(
    async ([oldId, newId]) => {
      const keys = await caches.keys();
      return keys.some((key) => key.includes(newId)) && keys.every((key) => !key.includes(oldId));
    },
    [versions[0].id, versions[1].id],
  );
  const secondKeys = await page.evaluate(() => caches.keys());
  result.checks.push({
    name: 'old_caches_removed',
    passed: secondKeys.every((key) => !key.includes(versions[0].id)),
    cacheKeys: secondKeys,
  });
  result.checks.push({
    name: 'version_b_active',
    passed: secondKeys.some((key) => key.includes(versions[1].id)),
    cacheKeys: secondKeys,
  });
  const sensitive = await page.evaluate(async () => {
    const matches = [];
    for (const key of await caches.keys()) {
      const cache = await caches.open(key);
      for (const request of await cache.keys())
        if (
          /\/(?:api|account|checkout|operations|orders)(?:\/|\?|$)/.test(
            new URL(request.url).pathname,
          )
        )
          matches.push(request.url);
    }
    return matches;
  });
  result.checks.push({
    name: 'sensitive_routes_not_cached',
    passed: sensitive.length === 0,
    matches: sensitive,
  });
  result.status = result.checks.every((check) => check.passed) ? 'passed' : 'failed';
} catch (error) {
  result.error = error?.stack || String(error);
} finally {
  result.generatedAt = new Date().toISOString();
  await writeFile(reportPath, `${JSON.stringify(result, null, 2)}\n`);
  await browser?.close().catch(() => {});
  await new Promise((resolve) => (server ? server.close(resolve) : resolve()));
}
if (result.status !== 'passed') {
  console.error(result.error || 'PWA upgrade verification failed.');
  process.exit(1);
}
console.info(
  'PWA upgrade verified: the new build activates, old caches are removed and sensitive routes remain uncached.',
);

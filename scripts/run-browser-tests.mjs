import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import net from 'node:net';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const joinedArgs = args.join(' ');
const resultKind = joinedArgs.includes('accessibility')
  ? 'accessibility'
  : joinedArgs.includes('visual')
    ? 'visual'
    : joinedArgs.includes('pwa-upgrade')
      ? 'pwa-upgrade'
      : 'e2e';
let resultStatus = 'failed';
let resultError = '';
let resultStats = null;
const writeResult = async () => {
  await mkdir('reports/browser', { recursive: true });
  await writeFile(
    `reports/browser/${resultKind}-result.json`,
    `${JSON.stringify({ status: resultStatus, generatedAt: new Date().toISOString(), commitSha: process.env.GITHUB_SHA || null, runId: process.env.GITHUB_RUN_ID || null, target: baseURL || null, spec: joinedArgs || 'default', stats: resultStats, error: resultError || null }, null, 2)}\n`,
  );
};
const external = process.env.PLAYWRIGHT_BASE_URL;
let server;
let stopping = false;
const diagnostics = [];
const log = (message) => {
  diagnostics.push(message);
  console.info(message);
};
const freePort = () =>
  new Promise((resolve, reject) => {
    const socket = net.createServer();
    socket.unref();
    socket.on('error', reject);
    socket.listen(0, '127.0.0.1', () => {
      const { port } = socket.address();
      socket.close(() => resolve(port));
    });
  });
const stop = async () => {
  if (stopping) return;
  stopping = true;
  if (server && !server.killed) {
    server.kill('SIGTERM');
    await new Promise((resolve) => {
      const timer = setTimeout(() => {
        if (!server.killed) server.kill('SIGKILL');
        resolve();
      }, 3000);
      server.once('exit', () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }
};
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, async () => {
    await stop();
    process.exit(130);
  });
const waitReady = async (url) => {
  let lastError;
  for (let i = 0; i < 120; i += 1) {
    try {
      const response = await fetch(url, { redirect: 'manual' });
      const body = await response.text();
      if (response.ok && /<div id=["']root["']/.test(body)) return;
      lastError = new Error(`HTTP ${response.status}; expected application HTML`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(
    `Browser server readiness failed for ${url}: ${lastError?.message || 'unknown error'}`,
  );
};
let baseURL = external;
try {
  await mkdir('reports/browser-runner', { recursive: true });
  if (!baseURL) {
    const port = await freePort();
    baseURL = `http://127.0.0.1:${port}`;
    server = spawn(process.execPath, ['scripts/serve-production-test.mjs', String(port)], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PORT: String(port) },
    });
    server.stdout.on('data', (chunk) => process.stdout.write(`[production-test] ${chunk}`));
    server.stderr.on('data', (chunk) => process.stderr.write(`[production-test] ${chunk}`));
  }
  log(`Browser target: ${baseURL}${external ? ' (external)' : ' (local dynamic port)'}`);
  await waitReady(baseURL);
  log('Server readiness check passed.');
  const browser = await chromium.launch(
    process.env.CHROMIUM_PATH
      ? {
          executablePath: process.env.CHROMIUM_PATH,
          args: ['--no-sandbox', '--disable-dev-shm-usage'],
        }
      : {},
  );
  try {
    const page = await browser.newPage();
    await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 10_000 });
    log('Chromium launch and navigation diagnostic passed.');
  } finally {
    await browser.close();
  }
  const child = spawn(
    process.execPath,
    ['./node_modules/@playwright/test/cli.js', 'test', ...args],
    { stdio: 'inherit', env: { ...process.env, PLAYWRIGHT_BASE_URL: baseURL } },
  );
  const code = await new Promise((resolve) => child.once('exit', (value) => resolve(value ?? 1)));
  if (code !== 0)
    log(
      `Playwright exited with code ${code}. Inspect reports/playwright and reports/playwright-artifacts.`,
    );
  try {
    const playwrightResult = JSON.parse(await readFile('reports/playwright/results.json', 'utf8'));
    resultStats = playwrightResult.stats || null;
    const skipped = Number(resultStats?.skipped || 0);
    const unexpected = Number(resultStats?.unexpected || 0);
    const expected = Number(resultStats?.expected || 0);
    if (code === 0 && (unexpected > 0 || skipped > 0 || expected < 1)) {
      resultStatus = 'failed';
      resultError = `Playwright result invalid: expected=${expected}, unexpected=${unexpected}, skipped=${skipped}`;
      process.exitCode = 1;
    } else {
      resultStatus = code === 0 ? 'passed' : 'failed';
      resultError = code === 0 ? '' : `Playwright exited with code ${code}`;
      process.exitCode = code;
    }
  } catch (error) {
    resultStatus = 'failed';
    resultError = `Playwright JSON report missing or invalid: ${error?.message || error}`;
    process.exitCode = 1;
  }
} catch (error) {
  resultError = error?.stack || String(error);
  log(`Browser execution unavailable or failed: ${resultError}`);
  process.exitCode = 1;
} finally {
  await writeFile('reports/browser-runner/last-run.txt', `${diagnostics.join('\n')}\n`);
  await writeResult();
  await stop();
}

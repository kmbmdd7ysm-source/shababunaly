import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const reportDir = resolve(root, 'reports/tests');
mkdirSync(reportDir, { recursive: true });
const testFiles = readdirSync(resolve(root, 'tests')).filter((name) => name.endsWith('.test.js') && name !== 'all-node-coverage.test.js').sort().map((name) => `tests/${name}`);
const run = spawnSync(process.execPath, ['--experimental-strip-types', '--test', '--test-concurrency=4', ...testFiles], {
  cwd: root,
  encoding: 'utf8',
  shell: process.platform === 'win32',
  env: { ...process.env, NO_COLOR: '1' },
  maxBuffer: 30 * 1024 * 1024,
});
const output = `${run.stdout || ''}${run.stderr || ''}`;
writeFileSync(resolve(reportDir, 'node-tests.tap'), output);
process.stdout.write(output);
if (run.status !== 0) process.exit(run.status || 1);

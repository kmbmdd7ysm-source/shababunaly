import { mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const reportDir = resolve(root, 'reports/coverage');
mkdirSync(reportDir, { recursive: true });
const reportName = process.argv.includes('--critical')
  ? 'critical-coverage.txt'
  : 'node-coverage.txt';
const args = [
  '--experimental-test-coverage',
  '--test',
  '--test-concurrency=1',
  '--test-coverage-exclude=tests/**',
  '--test-coverage-lines=100',
  '--test-coverage-functions=100',
  '--test-coverage-branches=100',
  'tests/all-node-coverage.test.js',
];
const run = spawnSync(process.execPath, args, {
  cwd: root,
  encoding: 'utf8',
  shell: process.platform === 'win32',
  env: { ...process.env, TERM: process.env.TERM || 'dumb', NO_COLOR: '1' },
  maxBuffer: 40 * 1024 * 1024,
});
const output = `${run.stdout || ''}${run.stderr || ''}`;
writeFileSync(resolve(reportDir, reportName), output);
process.stdout.write(output);
const summary = output.match(/all files\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)/i);
if (run.status !== 0 || !summary || summary.slice(1).some((value) => Number(value) !== 100)) {
  console.error(
    'Coverage gate failed: runtime lines, branches and functions in the declared Node/API scope must all equal 100.00%.',
  );
  process.exit(run.status || 1);
}
console.log(
  `Verified Node/API runtime coverage: lines ${summary[1]}%, branches ${summary[2]}%, functions ${summary[3]}%.`,
);
console.log('This result is intentionally separate from full React/Vitest project coverage.');

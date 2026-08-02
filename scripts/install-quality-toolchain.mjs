import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const lock = JSON.parse(readFileSync('quality-toolchain-lock.json', 'utf8'));
const packages = Object.entries(lock.packages).map(([name, version]) => `${name}@${version}`);
const run = spawnSync('npm', ['install', '--no-save', '--package-lock=false', '--ignore-scripts', ...packages], {
  stdio: 'inherit', shell: process.platform === 'win32',
});
if (run.status !== 0) process.exit(run.status || 1);

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import moduleApi from 'node:module';
const require = moduleApi.createRequire(import.meta.url);
const lock = JSON.parse(readFileSync('quality-toolchain-lock.json', 'utf8'));
const installed = {};
const mismatches = [];
for (const [name, expected] of Object.entries(lock.packages)) {
  try {
    const pkg = require(`${name}/package.json`);
    installed[name] = pkg.version;
    if (pkg.version !== expected) mismatches.push(`${name}: expected ${expected}, found ${pkg.version}`);
  } catch {
    installed[name] = null;
    mismatches.push(`${name}: not installed`);
  }
}
const required = process.env.REQUIRE_QUALITY_TOOLCHAIN === 'true';
const result = {
  status: mismatches.length ? (required ? 'failed' : 'not_run') : 'passed',
  generatedAt: new Date().toISOString(),
  reproducible: mismatches.length === 0,
  required,
  expected: lock.packages,
  installed,
  mismatches,
};
mkdirSync('reports/quality', { recursive: true });
writeFileSync('reports/quality/toolchain.json', `${JSON.stringify(result, null, 2)}\n`);
if (mismatches.length) {
  console.error(`Quality toolchain is not reproducible:\n- ${mismatches.join('\n- ')}`);
  if (required) process.exit(1);
} else console.log('Quality toolchain versions match quality-toolchain-lock.json.');

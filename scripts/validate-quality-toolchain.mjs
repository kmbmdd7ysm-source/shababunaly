import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const lock = JSON.parse(readFileSync('quality-toolchain-lock.json', 'utf8'));

function resolveInstalledPackageJson(name) {
  try {
    const entry = require.resolve(name);
    let dir = dirname(entry);
    for (let i = 0; i < 8; i += 1) {
      const candidate = join(dir, 'package.json');
      if (existsSync(candidate)) {
        const pkg = JSON.parse(readFileSync(candidate, 'utf8'));
        if (pkg.name === name) return pkg;
      }
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  } catch {
    /* fall through */
  }
  const direct = join(process.cwd(), 'node_modules', ...name.split('/'), 'package.json');
  if (existsSync(direct)) return JSON.parse(readFileSync(direct, 'utf8'));
  return null;
}

const installed = {};
const mismatches = [];
for (const [name, expected] of Object.entries(lock.packages)) {
  const pkg = resolveInstalledPackageJson(name);
  if (!pkg) {
    installed[name] = null;
    mismatches.push(`${name}: not installed`);
    continue;
  }
  installed[name] = pkg.version;
  if (pkg.version !== expected)
    mismatches.push(`${name}: expected ${expected}, found ${pkg.version}`);
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

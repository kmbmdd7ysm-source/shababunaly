/**
 * Quality toolchain is declared in package.json devDependencies and installed
 * by `npm ci` / `npm install`. This script verifies pinned versions match
 * quality-toolchain-lock.json instead of installing with --no-save.
 */
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const lock = JSON.parse(readFileSync('quality-toolchain-lock.json', 'utf8'));
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const declared = { ...packageJson.dependencies, ...packageJson.devDependencies };

const declarationErrors = [];
for (const [name, version] of Object.entries(lock.packages)) {
  const declaredVersion = declared[name];
  if (!declaredVersion) {
    declarationErrors.push(`${name}@${version} (not in package.json)`);
    continue;
  }
  if (String(declaredVersion).startsWith('file:')) continue;
  if (declaredVersion !== version) {
    declarationErrors.push(`${name}: package.json has ${declaredVersion}, lock expects ${version}`);
  }
}

if (declarationErrors.length) {
  console.error('Quality toolchain must be declared in package.json:');
  for (const line of declarationErrors) console.error(`- ${line}`);
  process.exit(1);
}

function resolveInstalledPackageJson(name) {
  // Prefer Node resolution of the package entry, then walk to its package.json.
  // Some packages block `./package.json` via "exports", so require.resolve(name/package.json) fails.
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

const missingInstalled = [];
const versionMismatches = [];
for (const [name, expected] of Object.entries(lock.packages)) {
  const pkg = resolveInstalledPackageJson(name);
  if (!pkg) {
    missingInstalled.push(`${name}@${expected}`);
    continue;
  }
  if (pkg.version !== expected)
    versionMismatches.push(`${name}: expected ${expected}, found ${pkg.version}`);
}

if (missingInstalled.length || versionMismatches.length) {
  console.error('Quality toolchain is not reproducible after npm ci:');
  for (const line of [...missingInstalled, ...versionMismatches]) console.error(`- ${line}`);
  console.error('Fix package.json / package-lock.json and re-run npm ci.');
  process.exit(1);
}

console.log(
  `Quality toolchain verified (${Object.keys(lock.packages).length} packages via npm ci).`,
);

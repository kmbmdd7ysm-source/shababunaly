import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const allowed = new Set([
  path.normalize('src/config/commerce.ts'),
  path.normalize('tests/commerce.test.js'),
]);
const patterns = [/USD_TO_LYD\s*=\s*9\b/g, /return\s+9\s*;/g, /fallback\s+9\b/gi];
const findings = [];

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(?:js|jsx|mjs|ts|tsx)$/.test(entry.name)) inspect(full);
  }
}

function inspect(full) {
  const relative = path.normalize(path.relative(root, full));
  if (allowed.has(relative)) return;
  const text = fs.readFileSync(full, 'utf8');
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) findings.push(`${relative}: ${pattern}`);
  }
}

for (const directory of ['src', 'scripts']) {
  const full = path.join(root, directory);
  if (fs.existsSync(full)) walk(full);
}

if (findings.length) {
  console.error(`Duplicate production exchange-rate fallback detected:\n${findings.join('\n')}`);
  process.exit(1);
}
console.info('Commerce validation passed: one authoritative production exchange-rate source.');

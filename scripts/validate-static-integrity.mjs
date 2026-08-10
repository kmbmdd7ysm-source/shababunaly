import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const failures = [];
const walk = (directory) =>
  existsSync(directory)
    ? readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(directory, entry.name);
        return entry.isDirectory() ? walk(full) : [full];
      })
    : [];

for (const file of walk('.').filter(
  (name) => name.endsWith('.json') && !name.includes('node_modules') && !name.includes('reports'),
)) {
  try {
    JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    failures.push(`${file}: invalid JSON (${error.message})`);
  }
}

for (const file of walk('src').filter((name) => name.endsWith('.css'))) {
  const source = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  let depth = 0;
  for (const character of source) {
    if (character === '{') depth += 1;
    if (character === '}') depth -= 1;
    if (depth < 0) break;
  }
  if (depth !== 0) failures.push(`${file}: unbalanced CSS braces (${depth})`);
}

const index = readFileSync('index.html', 'utf8');
for (const required of ['<html', '<head>', 'id="root"', 'viewport', 'theme-color']) {
  if (!index.includes(required)) failures.push(`index.html missing ${required}`);
}

const app = readFileSync('src/App.tsx', 'utf8');
if (!app.includes('<main')) failures.push('App shell is missing the main landmark');
const importTargets = [...app.matchAll(/import\(['"](\.\.?\/[^'"]+)['"]\)/g)].map(
  (match) => match[1],
);
for (const target of importTargets) {
  const base = path.resolve('src', target.replace(/^\.\//, ''));
  if (
    ![
      base,
      `${base}.js`,
      `${base}.jsx`,
      path.join(base, 'index.js'),
      path.join(base, 'index.jsx'),
    ].some(existsSync)
  ) {
    failures.push(`App lazy import target is missing: ${target}`);
  }
}

if (failures.length) {
  console.error(
    `Static-integrity validation failed:\n${failures.map((item) => `- ${item}`).join('\n')}`,
  );
  process.exit(1);
}
console.info(
  'Static integrity passed: JSON, CSS, HTML shell and lazy-route targets are structurally valid.',
);

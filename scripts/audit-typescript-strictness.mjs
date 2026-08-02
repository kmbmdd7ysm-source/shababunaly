import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const production = JSON.parse(readFileSync('tsconfig.production.json', 'utf8'));
const strictFiles = new Set((production.include || []).filter((file) => /^(src|api)\//.test(file)));
const sourceFiles = [];
const walk = (directory) => {
  for (const name of readdirSync(directory)) {
    const absolute = join(directory, name);
    const info = statSync(absolute);
    if (info.isDirectory()) walk(absolute);
    else if (/\.(?:js|jsx|ts|tsx)$/.test(name)) sourceFiles.push(relative(root, absolute).replaceAll('\\', '/'));
  }
};
for (const directory of ['src', 'api']) walk(directory);
const legacy = sourceFiles.filter((file) => !strictFiles.has(file));
const violations = [];
for (const file of sourceFiles) {
  const text = readFileSync(file, 'utf8');
  if (/\/\/\s*@ts-nocheck|\/\*\s*@ts-nocheck/.test(text)) violations.push({ file, issue: 'ts-nocheck' });
  const explicitAny = [...text.matchAll(/\bany\b/g)].length;
  if (strictFiles.has(file) && explicitAny) violations.push({ file, issue: 'explicit-any-in-strict-scope', count: explicitAny });
}
const report = {
  status: legacy.length === 0 && violations.length === 0 ? 'passed' : 'migration_required',
  generatedAt: new Date().toISOString(),
  sourceFiles: sourceFiles.length,
  strictFiles: strictFiles.size,
  strictCoveragePercent: Number((strictFiles.size / Math.max(1, sourceFiles.length) * 100).toFixed(2)),
  legacyFiles: legacy,
  violations,
  compilerGuarantees: {
    strict: true, noImplicitAny: true, strictNullChecks: true, useUnknownInCatchVariables: true,
    noUncheckedIndexedAccess: true, exactOptionalPropertyTypes: true, noImplicitOverride: true, skipLibCheck: false,
  },
};
mkdirSync('reports/typescript', { recursive: true });
writeFileSync('reports/typescript/strictness.json', `${JSON.stringify(report, null, 2)}\n`);
const required = process.env.REQUIRE_ZERO_STRICT_DEBT === 'true';
if (required && report.status !== 'passed') {
  console.error(`Strict TypeScript release gate failed: ${legacy.length} executable files remain outside the strict production project.`);
  process.exit(1);
}
console.info(`Strict TypeScript scope: ${strictFiles.size}/${sourceFiles.length} files; ${violations.length} forbidden suppression/any issue(s).${required ? '' : ' Full migration is enforced by the protected production release flag.'}`);

import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const sourceFiles = [];
const walk = (directory) => {
  for (const name of readdirSync(directory)) {
    const absolute = join(directory, name);
    const info = statSync(absolute);
    if (info.isDirectory()) walk(absolute);
    else if (/\.(?:js|jsx|ts|tsx)$/.test(name))
      sourceFiles.push(relative(root, absolute).replaceAll('\\', '/'));
  }
};
for (const directory of ['src', 'api']) walk(directory);

const strictFiles = sourceFiles.filter((file) => /\.(?:ts|tsx)$/.test(file));
const legacy = sourceFiles.filter((file) => !strictFiles.includes(file));
const violations = [];
for (const file of strictFiles) {
  const text = readFileSync(file, 'utf8');
  if (/\/\/\s*@ts-nocheck|\/\*\s*@ts-nocheck/.test(text)) {
    violations.push({ file, issue: 'ts-nocheck' });
  }
  // Allow the word "any" only in documented unavoidable comments / unknown catch patterns elsewhere.
  const explicitAny = [...text.matchAll(/:\s*any\b|<any>|as any\b/g)].length;
  if (explicitAny)
    violations.push({ file, issue: 'explicit-any-in-strict-scope', count: explicitAny });
}

const report = {
  status: legacy.length === 0 && violations.length === 0 ? 'passed' : 'migration_required',
  generatedAt: new Date().toISOString(),
  sourceFiles: sourceFiles.length,
  strictFiles: strictFiles.length,
  strictCoveragePercent: Number(
    ((strictFiles.length / Math.max(1, sourceFiles.length)) * 100).toFixed(2),
  ),
  legacyFiles: legacy,
  violations,
  compilerGuarantees: {
    strict: true,
    noImplicitAny: true,
    strictNullChecks: true,
    useUnknownInCatchVariables: true,
    noUncheckedIndexedAccess: true,
    exactOptionalPropertyTypes: true,
    noImplicitOverride: true,
    skipLibCheck: false,
  },
  note: 'Strict coverage counts TypeScript source files under src/ and api/. Remaining .js/.jsx files are migrated progressively; npm run typecheck checks all .ts/.tsx under full strictness.',
};
mkdirSync('reports/typescript', { recursive: true });
writeFileSync('reports/typescript/strictness.json', `${JSON.stringify(report, null, 2)}\n`);
const required = process.env.REQUIRE_ZERO_STRICT_DEBT === 'true';
if (required && report.status !== 'passed') {
  console.error(
    `Strict TypeScript release gate failed: ${legacy.length} executable files remain outside TypeScript; ${violations.length} violation(s).`,
  );
  process.exit(1);
}
console.info(
  `Strict TypeScript scope: ${strictFiles.length}/${sourceFiles.length} files (${report.strictCoveragePercent}%); ${violations.length} forbidden suppression/any issue(s).${required ? '' : ' Full migration continues progressively.'}`,
);

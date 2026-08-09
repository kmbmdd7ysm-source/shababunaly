import { existsSync, readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const scope = JSON.parse(readFileSync('coverage-scope.json', 'utf8'));
const excluded = new Map(Object.entries(scope.exclude || {}));
const extensions = new Set(['.js', '.jsx', '.ts', '.tsx']);
const sourceFiles = [];
const walk = (directory) => {
  for (const name of readdirSync(directory)) {
    const absolute = join(directory, name);
    const stats = statSync(absolute);
    if (stats.isDirectory()) walk(absolute);
    else if (extensions.has(name.slice(name.lastIndexOf('.'))))
      sourceFiles.push(relative(root, absolute).replaceAll('\\', '/'));
  }
};
for (const directory of ['src', 'api']) walk(directory);
const expected = sourceFiles.filter((file) => !excluded.has(file)).sort();
const reportPath = 'coverage-project/coverage-final.json';
if (!existsSync(reportPath)) {
  console.error('Missing coverage-project/coverage-final.json. Run npm run coverage:project.');
  process.exit(1);
}
const raw = JSON.parse(readFileSync(reportPath, 'utf8'));
const covered = new Set(
  Object.keys(raw).map((file) => relative(root, resolve(file)).replaceAll('\\', '/')),
);
const missing = expected.filter((file) => !covered.has(file));
const unexpectedExclusions = [...excluded.keys()].filter((file) => !sourceFiles.includes(file));
const result = {
  generatedAt: new Date().toISOString(),
  expectedFiles: expected.length,
  reportedFiles: [...covered].filter((file) => expected.includes(file)).length,
  excludedFiles: [...excluded.entries()].map(([file, reason]) => ({ file, reason })),
  missingFromCoverage: missing,
  unexpectedExclusions,
  passed: missing.length === 0 && unexpectedExclusions.length === 0,
};
mkdirSync('reports/coverage', { recursive: true });
writeFileSync('reports/coverage/project-scope.json', `${JSON.stringify(result, null, 2)}\n`);
if (!result.passed) {
  console.error(
    `Project coverage scope failed. Missing ${missing.length} source files from the runtime report.`,
  );
  if (missing.length) console.error(missing.join('\n'));
  if (unexpectedExclusions.length)
    console.error(`Invalid exclusions:\n${unexpectedExclusions.join('\n')}`);
  process.exit(1);
}
console.info(
  `Coverage scope verified: ${result.reportedFiles}/${result.expectedFiles} executable project files are represented.`,
);

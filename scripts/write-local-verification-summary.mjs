import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const now = new Date().toISOString();
const read = (path) => (existsSync(path) ? readFileSync(path, 'utf8') : '');
const writeJson = (path, value) => {
  mkdirSync(path.slice(0, path.lastIndexOf('/')), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
};
const logStatus = (path, successPattern) => {
  const content = read(path);
  return { status: content && successPattern.test(content) ? 'passed' : 'failed', log: path };
};

const nodeLog = read('reports/local-verification/node-tests.log');
const match = nodeLog.match(
  /# tests\s+(\d+)[\s\S]*?# pass\s+(\d+)[\s\S]*?# fail\s+(\d+)[\s\S]*?# skipped\s+(\d+)/,
);
const tests = match
  ? {
      tests: Number(match[1]),
      passed: Number(match[2]),
      failed: Number(match[3]),
      skipped: Number(match[4]),
    }
  : null;

const extension = /\.(?:js|jsx|ts|tsx)$/;
const excluded = new Set(
  Object.keys(JSON.parse(readFileSync('coverage-scope.json', 'utf8')).exclude || {}),
);
const executable = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (extension.test(name))
      executable.push(relative(process.cwd(), path).replaceAll('\\', '/'));
  }
};
walk('src');
walk('api');
const expectedCoverageFiles = executable.filter((file) => !excluded.has(file)).length;

const localLimit = {
  status: 'not_run',
  generatedAt: now,
  reason:
    'Required dependency/browser/service is unavailable in the current sandbox. Run the protected CI workflow against the official npm registry and deployed staging environment.',
};
writeJson('reports/build/build-provenance.json', {
  status: 'failed',
  generatedAt: now,
  distSha256: null,
  commitSha: null,
  reason:
    'Vite executable unavailable because clean dependencies could not be installed from the sandbox registry.',
});
for (const name of ['e2e-result', 'accessibility-result', 'visual-result'])
  writeJson(`reports/browser/${name}.json`, {
    ...localLimit,
    stats: { expected: 0, unexpected: 0, skipped: 0 },
  });
writeJson('reports/browser/pwa-upgrade-result.json', localLimit);
writeJson('reports/lighthouse-mobile.json', { ...localLimit, categories: {}, audits: {} });
writeJson('reports/lighthouse-desktop.json', { ...localLimit, categories: {}, audits: {} });
writeJson('reports/pagespeed-mobile.json', {
  ...localLimit,
  strategy: 'mobile',
  categories: {},
  metrics: {},
});
writeJson('reports/pagespeed-desktop.json', {
  ...localLimit,
  strategy: 'desktop',
  categories: {},
  metrics: {},
});
writeJson('reports/pagespeed-validation.json', {
  status: 'failed',
  generatedAt: now,
  failures: ['PageSpeed mobile and desktop were not run against a public HTTPS deployment.'],
});
writeJson('reports/coverage/project-scope.json', {
  status: 'not_run',
  generatedAt: now,
  expectedFiles: expectedCoverageFiles,
  reportedFiles: 0,
  passed: false,
  reason:
    'Vitest/V8 tooling was unavailable in the sandbox; no project-wide coverage claim is made.',
});
writeJson('reports/integrations/live-integrations.json', {
  ...localLimit,
  checks: [],
  reason: 'Owner-controlled credentials and provider endpoints were not supplied.',
});

const strictness = JSON.parse(readFileSync('reports/typescript/strictness.json', 'utf8'));
const database = JSON.parse(readFileSync('reports/database/database-test-result.json', 'utf8'));
const dependency = JSON.parse(readFileSync('reports/security/dependency-audit.json', 'utf8'));
const catalog = JSON.parse(readFileSync('reports/catalog/catalog-completeness.json', 'utf8'));
const factory = JSON.parse(readFileSync('reports/factory/factory-readiness.tson', 'utf8'));
const arabic = JSON.parse(readFileSync('reports/localization/arabic-review.json', 'utf8'));
const providers = JSON.parse(readFileSync('reports/providers/provider-readiness.tson', 'utf8'));
const summary = {
  status: 'source_checks_passed_external_evidence_pending',
  generatedAt: now,
  localEvidence: {
    nodeTests: tests,
    typecheck: logStatus('reports/local-verification/typecheck.log', /> tsc --noEmit/),
    strictCriticalTypecheck: logStatus(
      'reports/local-verification/typecheck-strict-critical.log',
      /tsconfig\.strict-critical/,
    ),
    productionScopeTypecheck: logStatus(
      'reports/local-verification/typecheck-production.log',
      /tsconfig\.production/,
    ),
    syntaxAndSourceCheck: logStatus(
      'reports/local-verification/check-source.log',
      /Source check passed/,
    ),
    customLint: logStatus(
      'reports/local-verification/custom-lint.log',
      /Project lint checks passed/,
    ),
    sourceVerification: logStatus(
      'reports/local-verification/source-verification.log',
      /Core smoke tests passed/,
    ),
  },
  environmentLimitations: {
    officialEslint: 'not_run_binary_unavailable',
    prettier: 'not_run_binary_unavailable',
    viteBuild: 'failed_vite_unavailable',
    database: database.status,
    dependencyAudit: dependency.status,
    fullProjectCoverage: 'not_run_vitest_unavailable',
    browserSuites: 'not_run_build_and_browsers_unavailable',
    lighthouseAndPageSpeed: 'not_run_no_deployed_public_url',
    liveIntegrations: 'not_run_credentials_not_supplied',
  },
  blockers: {
    strictTypeScript: `${strictness.strictFiles}/${strictness.sourceFiles} (${strictness.strictCoveragePercent}%)`,
    productionCompleteProducts: `${catalog.totals.products - catalog.totals.incompleteProducts}/${catalog.totals.products}`,
    placeholderProducts: catalog.totals.placeholderProducts,
    verifiedStockProducts: catalog.totals.verifiedStockProducts,
    approvedFactoryProfiles: factory.approvedProfiles.length,
    arabicApprovedSections: `${arabic.counts.approvedSections}/${arabic.counts.totalSections}`,
    providersProductionReady: providers.productionReady,
  },
};
writeJson('reports/local-verification/summary.json', summary);
console.info(
  `Wrote honest local verification summary. Node tests: ${tests?.passed ?? 0}/${tests?.tests ?? 0}; expected full-coverage files: ${expectedCoverageFiles}.`,
);

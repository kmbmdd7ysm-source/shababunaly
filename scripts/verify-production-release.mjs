import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const maxAgeMs = Number(process.env.RELEASE_REPORT_MAX_AGE_MS || 6 * 60 * 60 * 1000);
const now = Date.now();
const failures = [];
const checks = [];
const evidenceBundle = existsSync('reports/release/evidence-bundle.json')
  ? JSON.parse(readFileSync('reports/release/evidence-bundle.json', 'utf8'))
  : null;
if (!evidenceBundle || evidenceBundle.schemaVersion !== 3 || evidenceBundle.status !== 'generated')
  failures.push('Release evidence: verified schema-v3 bundle is missing or failed');
const load = (label, file, validator) => {
  if (!existsSync(file)) {
    failures.push(`${label}: missing ${file}`);
    return;
  }
  let value;
  try {
    value = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    failures.push(`${label}: invalid JSON in ${file}`);
    return;
  }
  const generatedAt = Date.parse(value.generatedAt || value.timestamp || '');
  if (!Number.isFinite(generatedAt) || now - generatedAt > maxAgeMs)
    failures.push(`${label}: stale or missing generatedAt in ${file}`);
  const verdict = validator(value);
  if (verdict !== true) failures.push(`${label}: ${verdict || 'failed'}`);
  checks.push({
    label,
    file,
    status: verdict === true ? 'passed' : 'failed',
    generatedAt: value.generatedAt || null,
  });
};

load('Quality evidence', 'reports/quality/quality-evidence.json', (v) =>
  v.status === 'passed' &&
  Array.isArray(v.checks) &&
  v.checks.length >= 9 &&
  v.checks.every((x) => x.status === 'passed')
    ? true
    : 'format, ESLint, TypeScript, Node tests and Node coverage must all have current passing receipts',
);
load('Locked quality toolchain', 'reports/quality/toolchain.json', (v) =>
  v.status === 'passed' && v.reproducible === true
    ? true
    : 'quality, UI-test and SBOM tools must match the exact locked versions',
);
load('Test evidence matrix', 'reports/tests/test-matrix.json', (v) =>
  v.status === 'informational' &&
  Array.isArray(v.categories) &&
  v.categories.some(
    (x) => String(x.type).startsWith('Node unit/API/source-contract') && x.status === 'passed',
  )
    ? true
    : 'test evidence matrix is missing or does not record the Node suite',
);
load('Action pinning', 'reports/security/action-pinning.json', (v) =>
  v.status === 'passed' && Array.isArray(v.findings) && v.findings.length === 0
    ? true
    : 'every third-party GitHub Action must be pinned to an immutable commit SHA',
);
load('TypeScript strict migration', 'reports/typescript/strictness.json', (v) =>
  v.status === 'passed' &&
  Number(v.sourceFiles) === Number(v.strictFiles) &&
  Number(v.strictCoveragePercent) === 100
    ? true
    : 'all source and API files must be covered by the strict compiler project',
);
load('Arabic human review', 'reports/localization/arabic-review.json', (v) =>
  v.status === 'passed' && v.productionReady === true
    ? true
    : 'Arabic commercial, legal and RTL review is not approved',
);
load('Visual baseline approval', 'reports/browser/visual-baseline-review.json', (v) =>
  v.status === 'passed' && v.productionReady === true
    ? true
    : 'visual baselines have not been hash-reviewed',
);
load('Provider readiness', 'reports/providers/provider-readiness.tson', (v) =>
  v.status === 'passed' && v.productionReady === true
    ? true
    : 'payment and signature providers are not fully approved',
);
load('Build', 'reports/build/build-provenance.json', (v) => {
  if (v.status !== 'passed' || !v.distSha256 || !v.commitSha)
    return 'build provenance is not passed';
  let head = '';
  try {
    head = execFileSync('git', ['rev-parse', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return 'unable to read current HEAD for provenance comparison';
  }
  if (!/^[0-9a-f]{40}$/i.test(String(v.commitSha)))
    return 'build provenance commitSha is not a full SHA';
  if (String(v.commitSha) !== head) {
    return `build provenance SHA ${v.commitSha} != current HEAD ${head}`;
  }
  return true;
});
load('Database/RLS', 'reports/database/database-test-result.json', (v) =>
  v.status === 'passed' && Number(v.runs) >= 3
    ? true
    : 'database suite must pass at least three clean runs',
);
load('E2E', 'reports/browser/e2e-result.json', (v) =>
  v.status === 'passed' &&
  Number(v.stats?.expected) > 0 &&
  Number(v.stats?.unexpected || 0) === 0 &&
  Number(v.stats?.skipped || 0) === 0
    ? true
    : 'E2E must pass with zero unexpected and zero skipped tests',
);
load('Accessibility', 'reports/browser/accessibility-result.json', (v) =>
  v.status === 'passed' &&
  Number(v.stats?.expected) > 0 &&
  Number(v.stats?.unexpected || 0) === 0 &&
  Number(v.stats?.skipped || 0) === 0
    ? true
    : 'accessibility must pass with zero skipped tests',
);
load('Visual regression', 'reports/browser/visual-result.json', (v) =>
  v.status === 'passed' &&
  Number(v.stats?.expected) > 0 &&
  Number(v.stats?.unexpected || 0) === 0 &&
  Number(v.stats?.skipped || 0) === 0
    ? true
    : 'visual regression must pass with zero skipped tests',
);
load('PWA upgrade', 'reports/browser/pwa-upgrade-result.json', (v) =>
  v.status === 'passed' ? true : 'PWA upgrade test did not pass',
);
load('Mobile Lighthouse', 'reports/lighthouse-mobile.json', (v) =>
  v.status !== 'not_run' &&
  Number(v.categories?.performance?.score) >= 0.99 &&
  ['accessibility', 'best-practices', 'seo'].every((k) => Number(v.categories?.[k]?.score) === 1)
    ? true
    : 'mobile Lighthouse thresholds not met',
);
load('Desktop Lighthouse', 'reports/lighthouse-desktop.json', (v) =>
  v.status !== 'not_run' &&
  ['performance', 'accessibility', 'best-practices', 'seo'].every(
    (k) => Number(v.categories?.[k]?.score) === 1,
  )
    ? true
    : 'desktop Lighthouse thresholds not met',
);
load('Mobile PageSpeed', 'reports/pagespeed-mobile.json', (v) =>
  v.status === 'completed' &&
  Number(v.categories?.performance?.score) >= 0.99 &&
  ['accessibility', 'best-practices', 'seo'].every((k) => Number(v.categories?.[k]?.score) === 1)
    ? true
    : 'mobile PageSpeed thresholds not met',
);
load('Desktop PageSpeed', 'reports/pagespeed-desktop.json', (v) =>
  v.status === 'completed' &&
  ['performance', 'accessibility', 'best-practices', 'seo'].every(
    (k) => Number(v.categories?.[k]?.score) === 1,
  )
    ? true
    : 'desktop PageSpeed thresholds not met',
);
load('PageSpeed validation', 'reports/pagespeed-validation.json', (v) =>
  v.status === 'passed' ? true : 'PageSpeed validation did not pass',
);
load('Dependency audit', 'reports/security/dependency-audit.json', (v) =>
  v.status === 'passed' && Number(v.blockingVulnerabilities) === 0
    ? true
    : 'dependency audit failed',
);

if (!existsSync('reports/coverage/critical-coverage.txt'))
  failures.push('Node/API coverage: missing reports/coverage/critical-coverage.txt');
else {
  const coverageText = readFileSync('reports/coverage/critical-coverage.txt', 'utf8');
  const match = coverageText.match(/all files\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)/i);
  const passed = match && match.slice(1).every((value) => Number(value) === 100);
  if (!passed)
    failures.push(
      'Node/API coverage: declared runtime scope is not 100% lines, branches and functions',
    );
  checks.push({
    label: 'Node/API runtime coverage',
    file: 'reports/coverage/critical-coverage.txt',
    status: passed ? 'passed' : 'failed',
    generatedAt: null,
  });
}
if (!existsSync('reports/sbom.cdx.json')) failures.push('SBOM: reports/sbom.cdx.json is missing');
load('Coverage scope', 'reports/coverage/project-scope.json', (v) =>
  v.passed === true && v.expectedFiles === v.reportedFiles
    ? true
    : 'coverage does not represent every executable project file',
);
load('Live integrations', 'reports/integrations/live-integrations.json', (v) =>
  v.status === 'passed' ? true : 'required live integration verification did not pass',
);
load('Malware full pipeline', 'reports/integrations/malware-pipeline.json', (v) =>
  v.status === 'passed' &&
  v.infectedDeleted === true &&
  v.securityEvent === true &&
  v.cleanStatus === 'clean'
    ? true
    : 'upload, private quarantine, worker, infected deletion and security alert pipeline did not pass',
);
load('Catalog readiness', 'reports/catalog/catalog-completeness.json', (v) =>
  v.productionReady === true
    ? true
    : 'catalog still contains unverified stock, placeholders or incomplete commercial data',
);
load('Factory readiness', 'reports/factory/factory-readiness.tson', (v) =>
  v.productionReady === true ? true : 'factory profiles are not approved',
);
const summary = {
  status: failures.length ? 'failed' : 'passed',
  generatedAt: new Date().toISOString(),
  checks,
  failures,
};
mkdirSync('reports/release', { recursive: true });
writeFileSync(
  'reports/release/production-release-verdict.json',
  `${JSON.stringify(summary, null, 2)}\n`,
);
if (failures.length) {
  console.error(
    `Production release blocked by ${failures.length} condition(s):\n- ${failures.join('\n- ')}`,
  );
  process.exit(1);
}
console.info(
  'Production release verified: every required build, database, browser, security, integration, catalog and factory gate passed in the current run.',
);

import { createHash, timingSafeEqual } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

export const sha256 = (value) => createHash('sha256').update(value).digest('hex');
export const fileHash = (file) => sha256(readFileSync(file));
export const releaseIdentity = () => ({
  repository: process.env.GITHUB_REPOSITORY || null,
  workflowRef: process.env.GITHUB_WORKFLOW_REF || null,
  runId: process.env.GITHUB_RUN_ID || null,
  runAttempt: process.env.GITHUB_RUN_ATTEMPT || null,
  commitSha: process.env.GITHUB_SHA || process.env.VERCEL_GIT_COMMIT_SHA || null,
  ref: process.env.GITHUB_REF || null,
});
export function directoryManifest(directory, options = {}) {
  if (!existsSync(directory)) return { entries: [], sha256: null };
  const excluded = new Set(options.exclude || []);
  const entries = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const abs = join(dir, name);
      const rel = relative(directory, abs).replaceAll('\\', '/');
      const s = statSync(abs);
      if (s.isDirectory()) walk(abs);
      else if (!excluded.has(rel))
        entries.push({ path: rel, bytes: s.size, sha256: fileHash(abs) });
    }
  };
  walk(directory);
  entries.sort((a, b) => a.path.localeCompare(b.path));
  return { entries, sha256: sha256(entries.map((e) => `${e.sha256}  ${e.path}`).join('\n')) };
}
export function verifySourceManifest(file = 'RELEASE_MANIFEST.sha256', root = process.cwd()) {
  const failures = [];
  const entries = [];
  const seen = new Set();
  if (!existsSync(file))
    return { status: 'failed', entries, failures: [`${file} missing`], sha256: null };
  for (const [index, line] of readFileSync(file, 'utf8').split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    const match = line.match(/^([0-9a-f]{64})\s{2}(.+)$/i);
    if (!match) {
      failures.push(`line ${index + 1}: invalid manifest syntax`);
      continue;
    }
    const expected = match[1].toLowerCase();
    const path = match[2];
    if (path === file) {
      failures.push(`line ${index + 1}: manifest must not hash itself`);
      continue;
    }
    if (seen.has(path)) {
      failures.push(`line ${index + 1}: duplicate path ${path}`);
      continue;
    }
    seen.add(path);
    const absolute = resolve(root, path);
    const rootPrefix = resolve(root) + sep;
    if (!absolute.startsWith(rootPrefix)) {
      failures.push(`line ${index + 1}: unsafe path ${path}`);
      continue;
    }
    if (!existsSync(absolute) || !statSync(absolute).isFile()) {
      failures.push(`missing file ${path}`);
      continue;
    }
    const actual = fileHash(absolute);
    if (actual !== expected) failures.push(`hash mismatch ${path}`);
    entries.push({
      path,
      expectedSha256: expected,
      actualSha256: actual,
      bytes: statSync(absolute).size,
    });
  }
  return {
    status: failures.length ? 'failed' : 'passed',
    entries,
    failures,
    sha256: fileHash(file),
    entriesSha256: sha256(entries.map((x) => `${x.actualSha256}  ${x.path}`).join('\n')),
  };
}
export function safeJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}
export function sameHash(a, b) {
  if (!/^[0-9a-f]{64}$/i.test(String(a)) || !/^[0-9a-f]{64}$/i.test(String(b))) return false;
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}
export function evidenceReports() {
  return [
    'reports/quality/quality-evidence.json',
    'reports/quality/toolchain.json',
    'reports/tests/test-matrix.json',
    'reports/coverage/critical-coverage.txt',
    'reports/coverage/project-scope.json',
    'reports/build/build-provenance.json',
    'reports/build/bundle-report.json',
    'reports/database/database-test-result.json',
    'reports/browser/e2e-result.json',
    'reports/browser/accessibility-result.json',
    'reports/browser/visual-result.json',
    'reports/browser/pwa-upgrade-result.json',
    'reports/lighthouse-mobile.json',
    'reports/lighthouse-desktop.json',
    'reports/pagespeed-mobile.json',
    'reports/pagespeed-desktop.json',
    'reports/pagespeed-validation.json',
    'reports/security/dependency-audit.json',
    'reports/security/action-pinning.json',
    'reports/sbom.cdx.json',
    'reports/integrations/live-integrations.json',
    'reports/integrations/malware-pipeline.json',
    'reports/catalog/catalog-completeness.json',
    'reports/factory/factory-readiness.json',
    'reports/localization/arabic-review.json',
    'reports/typescript/strictness.json',
    'reports/providers/provider-readiness.json',
    'reports/browser/visual-baseline-review.json',
  ];
}

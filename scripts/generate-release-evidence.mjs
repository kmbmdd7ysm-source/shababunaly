import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import {
  directoryManifest,
  evidenceReports,
  fileHash,
  releaseIdentity,
  safeJson,
  sha256,
  verifySourceManifest,
} from './lib/release-evidence.mjs';
const git = (args) => {
  try {
    return (
      execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() ||
      null
    );
  } catch {
    return null;
  }
};
const identity = releaseIdentity();
identity.commitSha ||= git(['rev-parse', 'HEAD']);
identity.ref ||= git(['branch', '--show-current']);
const source = verifySourceManifest();
const dist = directoryManifest('dist', { exclude: ['BUILD_PROVENANCE.json'] });
const reports = evidenceReports().map((path) => {
  const exists = existsSync(path);
  const parsed = exists && /\.json$/i.test(path) ? safeJson(path) : null;
  return {
    path,
    exists,
    sha256: exists ? fileHash(path) : null,
    bytes: exists ? readFileSync(path).byteLength : 0,
    status: parsed?.status ?? parsed?.productionReady ?? null,
    generatedAt: parsed?.generatedAt ?? parsed?.timestamp ?? null,
    commitSha: parsed?.commitSha ?? null,
    runId: parsed?.runId ?? null,
  };
});
const build = safeJson('reports/build/build-provenance.json');
const bundle = {
  schemaVersion: 3,
  status: source.status === 'passed' ? 'generated' : 'failed',
  generatedAt: new Date().toISOString(),
  ...identity,
  sourceManifest: {
    path: 'RELEASE_MANIFEST.sha256',
    sha256: source.sha256,
    entriesSha256: source.entriesSha256,
    fileCount: source.entries.length,
    verified: source.status === 'passed',
    failures: source.failures,
  },
  dist: {
    sha256: dist.sha256,
    fileCount: dist.entries.length,
    entriesSha256: dist.sha256,
    buildReportedSha256: build?.distSha256 || null,
    buildCommitSha: build?.commitSha || null,
  },
  reports,
  evidenceDigest: sha256(
    JSON.stringify({
      identity,
      source: source.entriesSha256,
      dist: dist.sha256,
      reports: reports.map(({ path, sha256 }) => ({ path, sha256 })),
    }),
  ),
  attestationRequired: Boolean(process.env.GITHUB_ACTIONS),
  attestationSubjects: ['dist/**', 'reports/release/evidence-bundle.json'],
};
mkdirSync('reports/release', { recursive: true });
writeFileSync('reports/release/evidence-bundle.json', `${JSON.stringify(bundle, null, 2)}\n`);
if (source.status !== 'passed') {
  console.error(`Source manifest verification failed:\n- ${source.failures.join('\n- ')}`);
  process.exit(1);
}
console.log(
  `Release evidence bundle generated and bound to ${reports.filter((x) => x.exists).length} report files.`,
);

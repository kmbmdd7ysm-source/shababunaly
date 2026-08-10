/**
 * Fail when recorded build provenance does not match the exact current HEAD SHA.
 * Short / fuzzy SHA matching is forbidden.
 */
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const git = (args) =>
  execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

const head = git(['rev-parse', 'HEAD']);
const path = 'reports/build/build-provenance.json';
if (!existsSync(path)) {
  console.error('MISSING build provenance:', path);
  process.exit(1);
}
const provenance = JSON.parse(readFileSync(path, 'utf8'));
const recorded = String(provenance.commitSha || '');
const failures = [];
if (!/^[0-9a-f]{40}$/i.test(recorded)) {
  failures.push(`commitSha must be a full 40-char SHA (got ${recorded || 'empty'})`);
}
if (recorded !== head) {
  failures.push(`build provenance SHA ${recorded} != current HEAD ${head}`);
}
if (provenance.dirty === true || provenance.workingTreeClean === false) {
  // Dirty builds are allowed for local iteration but must not claim release readiness.
  console.warn('WARNING: provenance was generated with a dirty working tree.');
}
if (!provenance.distSha256 || !/^[0-9a-f]{64}$/i.test(provenance.distSha256)) {
  failures.push('distSha256 missing or invalid');
}
if (!provenance.lockfileSha256) failures.push('lockfileSha256 missing');
if (!provenance.node) failures.push('node version missing');
if (!provenance.generatedAt) failures.push('generatedAt missing');

if (failures.length) {
  console.error('Build provenance verification FAILED:');
  for (const line of failures) console.error(`- ${line}`);
  process.exit(1);
}
console.info(`Build provenance matches HEAD ${head}; dist ${provenance.distSha256}`);

import { mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

mkdirSync('reports/security', { recursive: true });
const run = spawnSync('npm', ['audit', '--omit=dev', '--audit-level=high', '--json'], {
  encoding: 'utf8',
  shell: process.platform === 'win32',
  maxBuffer: 20 * 1024 * 1024,
});
let parsed;
try { parsed = JSON.parse(run.stdout || '{}'); }
catch { parsed = { error: { message: 'invalid_npm_audit_json' }, stdout: run.stdout || '', stderr: run.stderr || '' }; }
const vulnerabilities = parsed.metadata?.vulnerabilities || {};
const blocking = Number(vulnerabilities.high || 0) + Number(vulnerabilities.critical || 0);
const auditCompleted = !run.error && run.status === 0 && Boolean(parsed.metadata?.vulnerabilities) && !parsed.error;
const report = {
  status: auditCompleted && blocking === 0 ? 'passed' : 'failed',
  generatedAt: new Date().toISOString(),
  auditCompleted,
  blockingVulnerabilities: blocking,
  vulnerabilities,
  npmExitCode: run.status,
  spawnError: run.error?.message || null,
  audit: parsed,
};
writeFileSync('reports/security/dependency-audit.json', `${JSON.stringify(report, null, 2)}\n`);
if (!auditCompleted || blocking > 0) {
  const reason = run.error?.message || parsed.error?.message || parsed.message || (blocking > 0 ? `Dependency audit found ${blocking} high/critical vulnerabilities.` : `npm audit did not complete successfully (exit ${run.status}).`);
  console.error(reason);
  process.exit(1);
}
console.info('Dependency audit passed with no high or critical production vulnerabilities.');

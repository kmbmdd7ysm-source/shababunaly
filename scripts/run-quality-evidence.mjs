import { mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const commands = [
  ['format', ['npm', 'run', 'format:check']],
  ['eslint', ['npm', 'run', 'lint:eslint']],
  ['customSource', ['node', 'scripts/check-source.mjs']],
  ['customLint', ['node', 'scripts/lint-project.mjs']],
  ['typecheck', ['npm', 'run', 'typecheck']],
  ['strictCritical', ['npm', 'run', 'typecheck:strict-critical']],
  ['strictProduction', ['npm', 'run', 'typecheck:production']],
  ['nodeTests', ['npm', 'run', 'test:node']],
  ['nodeCoverage', ['npm', 'run', 'coverage:node']],
];
const evidence = {
  status: 'passed',
  generatedAt: new Date().toISOString(),
  commitSha: process.env.GITHUB_SHA || null,
  runId: process.env.GITHUB_RUN_ID || null,
  checks: [],
};
mkdirSync('reports/quality', { recursive: true });
for (const [name, command] of commands) {
  const [bin, ...args] = command;
  const run = spawnSync(bin, args, {
    encoding: 'utf8',
    shell: process.platform === 'win32',
    maxBuffer: 40 * 1024 * 1024,
  });
  const output = `${run.stdout || ''}${run.stderr || ''}`;
  writeFileSync(`reports/quality/${name}.log`, output);
  evidence.checks.push({
    name,
    status: run.status === 0 ? 'passed' : 'failed',
    exitCode: run.status ?? 1,
  });
  if (run.status !== 0) evidence.status = 'failed';
}
writeFileSync('reports/quality/quality-evidence.json', `${JSON.stringify(evidence, null, 2)}\n`);
if (evidence.status !== 'passed') process.exit(1);

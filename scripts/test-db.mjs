import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const generatedAt = new Date().toISOString();
const report = {
  status: 'failed',
  generatedAt,
  commitSha: process.env.GITHUB_SHA || null,
  runId: process.env.GITHUB_RUN_ID || null,
  runs: 0,
  reset: false,
  cli: null,
  failures: [],
};
mkdirSync('reports/database', { recursive: true });
function save() {
  writeFileSync(
    'reports/database/database-test-result.json',
    `${JSON.stringify(report, null, 2)}\n`,
  );
}
function commandAvailable(command) {
  const result = spawnSync(command, ['--version'], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  if (!result.error && result.status === 0)
    report.cli = String(result.stdout || result.stderr || '').trim();
  return !result.error && result.status === 0;
}
const command = commandAvailable('supabase') ? 'supabase' : 'npx';
const prefix = command === 'supabase' ? [] : ['--yes', 'supabase@2.109.1'];
const run = (args, allowFailure = false) => {
  const result = spawnSync(command, [...prefix, ...args], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, SUPABASE_NON_INTERACTIVE: '1' },
  });
  if (result.error) {
    report.failures.push(`${args.join(' ')}: ${result.error.message}`);
    save();
    throw result.error;
  }
  if (!allowFailure && result.status !== 0) {
    report.failures.push(`${args.join(' ')} exited ${result.status}`);
    save();
    process.exit(result.status || 1);
  }
  return result.status === 0;
};
let started = false;
try {
  started = run(['start']);
  run(['db', 'reset']);
  report.reset = true;
  for (let index = 1; index <= 3; index += 1) {
    console.info(`Database/RLS/concurrency verification run ${index}/3`);
    run(['test', 'db']);
    report.runs = index;
    save();
  }
  report.status = 'passed';
  save();
} finally {
  if (started) run(['stop', '--no-backup'], true);
}

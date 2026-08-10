import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const readJson = (file) => {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
};
const tap = existsSync('reports/tests/node-tests.tap')
  ? readFileSync('reports/tests/node-tests.tap', 'utf8')
  : '';
const pass = Number(tap.match(/# pass (\d+)/)?.[1] || 0);
const fail = Number(tap.match(/# fail (\d+)/)?.[1] || 0);
const nodeStatus = pass > 0 && fail === 0 ? 'passed' : 'not_run';
const sources = {
  projectCoverage: readJson('reports/coverage/project-scope.json'),
  database: readJson('reports/database/database-test-result.json'),
  browser: readJson('reports/browser/e2e-result.json'),
  accessibility: readJson('reports/browser/accessibility-result.json'),
  visual: readJson('reports/browser/visual-result.json'),
  integrations: readJson('reports/integrations/live-integrations.json'),
};
const matrix = {
  status: 'informational',
  generatedAt: new Date().toISOString(),
  commitSha: process.env.GITHUB_SHA || null,
  runId: process.env.GITHUB_RUN_ID || null,
  warning:
    'Counts from static/source-contract, mocked unit, database, browser and live-provider tests are not equivalent and must never be presented as one production-verification number.',
  categories: [
    {
      type: 'Node unit/API/source-contract (includes mocks and static contract checks)',
      written: true,
      executed: nodeStatus === 'passed',
      status: nodeStatus,
      passedTests: pass,
      failedTests: fail,
    },
    {
      type: 'Full React component coverage',
      written: Boolean(sources.projectCoverage),
      executed: sources.projectCoverage?.status === 'passed',
      status: sources.projectCoverage?.status || 'not_run',
    },
    {
      type: 'Database/RLS',
      written: true,
      executed: Number(sources.database?.runs || 0) > 0,
      status: sources.database?.status || 'not_run',
    },
    {
      type: 'Browser contract workflows (mock-backed)',
      written: true,
      executed: sources.browser?.status === 'passed',
      status: sources.browser?.status || 'not_run',
    },
    {
      type: 'Accessibility',
      written: true,
      executed: sources.accessibility?.status === 'passed',
      status: sources.accessibility?.status || 'not_run',
    },
    {
      type: 'Visual regression',
      written: true,
      executed: sources.visual?.status === 'passed',
      status: sources.visual?.status || 'not_run',
    },
    {
      type: 'Staging-live browser and external providers',
      written: true,
      executed: sources.integrations?.status === 'passed',
      status: sources.integrations?.status || 'not_run',
    },
  ],
};
mkdirSync('reports/tests', { recursive: true });
writeFileSync('reports/tests/test-matrix.json', `${JSON.stringify(matrix, null, 2)}\n`);
console.log(JSON.stringify(matrix, null, 2));

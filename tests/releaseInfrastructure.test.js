import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { readFileSync } from 'node:fs';

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

describe('release infrastructure hardening', () => {
  test('enforces real 100 percent runtime coverage for lines, branches and functions', () => {
    const runner = read('scripts/run-coverage.mjs');
    for (const gate of [
      '--test-coverage-lines=100',
      '--test-coverage-branches=100',
      '--test-coverage-functions=100',
      'Number(value) !== 100',
    ])
      assert.match(runner, new RegExp(gate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    const vitest = read('vitest.config.mjs');
    const scopeAudit = read('scripts/audit-coverage-scope.mjs');
    for (const metric of ['lines: 100', 'branches: 100', 'functions: 100', 'statements: 100'])
      assert.match(vitest, new RegExp(metric));
    assert.match(vitest, /all:\s*true/);
    assert.match(vitest, /src\/\*\*\/\*\.\{js,jsx,ts,tsx\}/);
    assert.match(vitest, /api\/\*\*\/\*\.\{js,ts\}/);
    assert.match(scopeAudit, /missingFromCoverage/);
    const packageJson = JSON.parse(read('package.json'));
    assert.equal(packageJson.scripts.coverage, 'npm run coverage:node && npm run coverage:project');
    assert.equal(packageJson.scripts['coverage:critical'], 'npm run coverage:node');
  });

  test('uses Supabase CLI setup and executable pgTAP database assertions in CI', () => {
    const workflow = read('.github/workflows/world-class-quality.yml');
    assert.match(workflow, /supabase\/setup-cli@[0-9a-f]{40}/);
    assert.match(workflow, /# v3\.0\.0/);
    assert.match(workflow, /version:\s*2\.109\.1/);
    for (const file of [
      'supabase/tests/order_security.sql',
      'supabase/tests/enterprise_workflows.sql',
    ]) {
      const sql = read(file);
      assert.match(sql, /select plan\(/i);
      assert.match(sql, /select ok\(/i);
      assert.match(sql, /select \* from finish\(\)/i);
      assert.match(sql, /rollback;/i);
    }
  });

  test('ships generic factory specifications and fail-closed production preflight artifacts', () => {
    const preflight = read('src/services/productionPreflight.ts');
    const exports = read('src/utils/designExports.js');
    const customize = read('src/pages/CustomizePage.jsx');
    for (const token of [
      'FACTORY_TEMPLATE_SPECS',
      'minimumRasterDpi',
      'manual_factory_match_required',
      'readyForManufacturing',
    ])
      assert.match(preflight, new RegExp(token));
    for (const token of [
      'preflight.json',
      'factory-specification.json',
      'color-specifications.csv',
    ])
      assert.match(exports, new RegExp(token.replace('.', '\\.')));
    assert.match(customize, /productionPreflight\.readyForQuote/);
    assert.match(customize, /Factory proof approval remains mandatory/);
  });
});

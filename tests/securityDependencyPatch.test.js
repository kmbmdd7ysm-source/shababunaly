import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from './test-api.js';

const require = createRequire(import.meta.url);
const micromatch = require('micromatch');

describe('patched micromatch brace security boundary', () => {
  it('keeps the vulnerable braces package out of the dependency lock', () => {
    const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
    const packages = lock.packages || {};
    expect(
      Object.keys(packages).some(
        (path) => path === 'node_modules/braces' || path.endsWith('/node_modules/braces'),
      ),
    ).toBe(false);
  });

  it('rejects brace nesting beyond the guarded depth', () => {
    const hostile = '{'.repeat(101) + 'a,b' + '}'.repeat(101);
    let rejected = false;
    try {
      micromatch.braces(hostile);
    } catch (error) {
      rejected = /exceeds max depth/i.test(String(error?.message || error));
    }
    expect(rejected).toBe(true);
  });
});

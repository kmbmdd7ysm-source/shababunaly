#!/usr/bin/env node
/**
 * Fail if any CURRENT release evidence artifact references a SHA
 * other than HEAD (or the SHA passed as RELEASE_SHA).
 *
 * Historical archives under reports/archive/ are ignored.
 */
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const head = (process.env.RELEASE_SHA || execSync('git rev-parse HEAD', { encoding: 'utf8' })).trim();
const required = [
  'reports/release/current.json',
  'reports/release/PRODUCTION_RELEASE_VERDICT.md',
];

const shaRe = /\b[0-9a-f]{40}\b/g;
const failures = [];

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === 'archive' || name === 'node_modules' || name === 'historical') continue;
      walk(p, out);
    } else if (/\.(md|json|txt)$/i.test(name)) {
      out.push(p);
    }
  }
  return out;
}

for (const file of required) {
  if (!existsSync(file)) {
    failures.push(`missing required evidence: ${file}`);
    continue;
  }
  const text = readFileSync(file, 'utf8');
  const found = [...text.matchAll(shaRe)].map((m) => m[0]);
  if (!found.length) {
    failures.push(`${file}: no 40-char SHA found`);
    continue;
  }
  const bad = [...new Set(found)].filter((s) => s !== head);
  if (bad.length) failures.push(`${file}: SHA mismatch vs HEAD ${head}: ${bad.join(', ')}`);
}

// Any file under reports/release labeled current/final must match
for (const file of walk('reports/release')) {
  const text = readFileSync(file, 'utf8');
  if (!/FINAL|current\.json|VERDICT|SOFTWARE_VERIFIED|PRODUCTION_VERIFIED/i.test(text + file)) continue;
  const found = [...new Set([...text.matchAll(shaRe)].map((m) => m[0]))];
  const bad = found.filter((s) => s !== head);
  if (bad.length) failures.push(`${file}: disagrees with HEAD (${bad.join(', ')})`);
}

if (failures.length) {
  console.error('RELEASE_EVIDENCE_SHA_MISMATCH');
  for (const f of failures) console.error(`- ${f}`);
  console.error(`Expected HEAD: ${head}`);
  process.exit(1);
}

console.info(`Release evidence SHA consistency PASS for ${head}`);

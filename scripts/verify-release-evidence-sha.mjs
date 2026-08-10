#!/usr/bin/env node
/**
 * Verify all CURRENT release evidence artifacts share one implementation SHA.
 * Historical archives under reports/archive/ are ignored.
 *
 * Canonical source: reports/release/current.json → .sha
 * That SHA must appear in git history near HEAD (HEAD or within 2 parents),
 * allowing a final evidence-only commit after implementation freeze.
 */
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const head = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
const recent = execSync('git rev-list -n 5 HEAD', { encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(Boolean);

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
    } else if (/\.(md|json)$/i.test(name)) out.push(p);
  }
  return out;
}

if (!existsSync('reports/release/current.json')) {
  console.error('RELEASE_EVIDENCE_SHA_MISMATCH');
  console.error('- missing reports/release/current.json');
  process.exit(1);
}

const current = JSON.parse(readFileSync('reports/release/current.json', 'utf8'));
const canonical = String(current.sha || '').trim();
if (!/^[0-9a-f]{40}$/.test(canonical)) {
  console.error('RELEASE_EVIDENCE_SHA_MISMATCH');
  console.error('- current.json missing canonical 40-char sha');
  process.exit(1);
}

if (!recent.includes(canonical)) {
  failures.push(
    `canonical sha ${canonical} is not among recent commits (${recent.join(', ')})`,
  );
}

for (const file of required) {
  if (!existsSync(file)) {
    failures.push(`missing required evidence: ${file}`);
    continue;
  }
  const text = readFileSync(file, 'utf8');
  const found = [...new Set([...text.matchAll(shaRe)].map((m) => m[0]))];
  if (!found.includes(canonical)) failures.push(`${file}: missing canonical sha`);
  const bad = found.filter((s) => s !== canonical && s !== head);
  // Allow HEAD itself if evidence commit differs from implementation sha
  const unexpected = found.filter((s) => s !== canonical && !recent.includes(s));
  if (unexpected.length) failures.push(`${file}: unexpected SHAs ${unexpected.join(', ')}`);
}

const checkDirs = [
  'reports/release',
  'reports/performance',
  'reports/browser',
  'reports/typescript',
  'reports/products',
];

for (const dir of checkDirs) {
  for (const file of walk(dir)) {
    if (file.includes('/archive/')) continue;
    const base = file.split('/').pop() || '';
    if (!/current|VERDICT|e2e-result|lighthouse-current|type-quality-current|media-manifest-current|commercial-master-current/i.test(base + file)) {
      continue;
    }
    const text = readFileSync(file, 'utf8');
    const found = [...new Set([...text.matchAll(shaRe)].map((m) => m[0]))];
    if (!found.length) continue;
    if (!found.includes(canonical)) failures.push(`${file}: does not include canonical sha`);
    const foreign = found.filter((s) => s !== canonical && !recent.includes(s));
    if (foreign.length) failures.push(`${file}: foreign SHAs ${foreign.join(', ')}`);
  }
}

if (failures.length) {
  console.error('RELEASE_EVIDENCE_SHA_MISMATCH');
  for (const f of failures) console.error(`- ${f}`);
  console.error(`Canonical: ${canonical}`);
  console.error(`HEAD: ${head}`);
  process.exit(1);
}

console.info(`Release evidence SHA consistency PASS for implementation ${canonical} (HEAD ${head})`);

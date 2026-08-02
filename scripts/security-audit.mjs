import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';

const root = process.cwd();
const ignored = new Set(['.git', 'node_modules', 'dist', 'coverage', 'coverage-critical', 'playwright-report', 'test-results', 'reports']);
const sourceExtensions = new Set(['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.json', '.yml', '.yaml', '.html', '.sql', '.md']);
const findings = [];
const scanned = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) await walk(absolute);
    else if (sourceExtensions.has(extname(entry.name).toLowerCase()) || entry.name.startsWith('.env')) scanned.push(absolute);
  }
}

/** @type {Array<[string, RegExp]>} */
const secretPatterns = [
  ['Supabase service-role JWT', /eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/g],
  ['Private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  ['Stripe-style live secret', /sk_live_[a-zA-Z0-9]{16,}/g],
  ['GitHub token', /gh[pousr]_[a-zA-Z0-9]{30,}/g],
  ['AWS access key', /AKIA[0-9A-Z]{16}/g],
];
/** @type {Array<[string, RegExp]>} */
const productionHazards = [
  ['Sensitive localStorage', /localStorage\.(?:setItem|getItem)\([^\n]*(?:address|phone|whatsapp|password|token|secret|order)/i],
  ['Editable user metadata role', /user_metadata\??\.role|user_metadata\[['"]role['"]\]/i],
  ['Untrusted SVG rendering', /dangerouslySetInnerHTML[^\n]*(?:svg|image)/i],
  ['Stack trace exposed to client', /res\.(?:json|send)\([^\n]*(?:stack|stackTrace)/i],
];

await walk(root);
for (const file of scanned) {
  const rel = relative(root, file);
  const size = (await stat(file)).size;
  if (size > 5_000_000) continue;
  const text = await readFile(file, 'utf8').catch(() => '');
  if (!text) continue;
  if (rel !== '.env.example') {
    for (const entry of secretPatterns) {
      const label = String(entry[0]);
      const pattern = /** @type {RegExp} */ (entry[1]);
      pattern.lastIndex = 0;
      if (pattern.test(text)) findings.push({ severity: 'critical', file: rel, issue: label });
    }
  }
  if (/^(src|api)\//.test(rel)) {
    for (const entry of productionHazards) {
      const label = String(entry[0]);
      const pattern = /** @type {RegExp} */ (entry[1]);
      pattern.lastIndex = 0;
      if (pattern.test(text)) findings.push({ severity: 'high', file: rel, issue: label });
    }
  }
}

const headers = JSON.parse(await readFile('vercel.json', 'utf8'));
const serializedHeaders = JSON.stringify(headers);
for (const required of ['Content-Security-Policy', 'Strict-Transport-Security', 'X-Content-Type-Options', 'Referrer-Policy', 'Permissions-Policy']) {
  if (!serializedHeaders.includes(required)) findings.push({ severity: 'high', file: 'vercel.json', issue: `Missing ${required}` });
}

const migrations = (await readdir('supabase/migrations')).filter((name) => name.endsWith('.sql')).sort();
const migrationDigest = createHash('sha256').update(migrations.join('\n')).digest('hex');
const lines = [
  'SHABABUNA static security audit',
  `Generated: ${new Date().toISOString()}`,
  `Files scanned: ${scanned.length}`,
  `Migrations indexed: ${migrations.length}`,
  `Migration index SHA-256: ${migrationDigest}`,
  `Findings: ${findings.length}`,
  '',
  ...(findings.length ? findings.map((item) => `[${item.severity.toUpperCase()}] ${item.file}: ${item.issue}`) : ['No blocking static findings detected.']),
  '',
  'Scope note: this is a source/configuration audit. It does not replace live penetration testing, provider verification, dependency installation, or Supabase RLS execution against a running database.',
];
await mkdir('reports', { recursive: true });
await writeFile('reports/security-audit.txt', `${lines.join('\n')}\n`);
if (findings.length) {
  console.error(lines.join('\n'));
  process.exit(1);
}
console.info(lines.join('\n'));

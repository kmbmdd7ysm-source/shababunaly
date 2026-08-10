import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const workflowDir = '.github/workflows';
const files = readdirSync(workflowDir).filter((name) => /\.ya?ml$/i.test(name));
const findings = [];
const pinned = [];
for (const name of files) {
  const file = join(workflowDir, name);
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    const match = line.match(/^\s*-?\s*uses:\s*([^\s#]+)(?:\s*#\s*(.*))?$/);
    if (!match) return;
    const value = match[1];
    if (value.startsWith('./') || value.startsWith('docker://')) return;
    const at = value.lastIndexOf('@');
    const ref = at >= 0 ? value.slice(at + 1) : '';
    if (!/^[0-9a-f]{40}$/i.test(ref))
      findings.push({
        file,
        line: index + 1,
        action: value,
        reason: 'action reference is not a full immutable 40-character commit SHA',
      });
    else
      pinned.push({
        file,
        line: index + 1,
        action: value.slice(0, at),
        sha: ref,
        annotation: match[2] || null,
      });
  });
}
const report = {
  status: findings.length ? 'failed' : 'passed',
  generatedAt: new Date().toISOString(),
  workflowFiles: files.length,
  pinnedActions: pinned,
  findings,
};
mkdirSync('reports/security', { recursive: true });
writeFileSync('reports/security/action-pinning.json', `${JSON.stringify(report, null, 2)}\n`);
if (findings.length) {
  console.error(
    `GitHub Actions pinning validation failed:\n${findings.map((x) => `- ${x.file}:${x.line} ${x.action}`).join('\n')}`,
  );
  process.exit(1);
}
console.log(
  `Verified ${pinned.length} immutable GitHub Action references across ${files.length} workflow files.`,
);

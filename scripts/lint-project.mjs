import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
const roots = ['src', 'api', 'tests', 'e2e', 'scripts'];
const extensions = new Set(['.js', '.jsx', '.mjs', '.ts', '.tsx']);
const failures = [];
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(file);
    else if (extensions.has(path.extname(entry.name))) {
      const source = await readFile(file, 'utf8');
      if (file !== 'scripts/lint-project.mjs' && /\bdebugger\b/.test(source))
        failures.push(`${file}: debugger statement`);
      if (
        file !== 'scripts/lint-project.mjs' &&
        /console\.(log|debug|warn|error)\s*\(/.test(source) &&
        !file.startsWith('scripts/')
      )
        failures.push(`${file}: runtime console output`);
      if (/\b(?:test|it|describe)\.(?:skip|todo)\s*\(/.test(source))
        failures.push(`${file}: skipped/todo test`);
      if (
        !file.startsWith('scripts/') &&
        /user_metadata\?*\.role|user_metadata\[['"]role['"]\]/.test(source)
      )
        failures.push(`${file}: untrusted user_metadata role`);
      if (!file.startsWith('scripts/') && /dangerouslySetInnerHTML/.test(source))
        failures.push(`${file}: unsafe HTML injection surface`);
      if (
        file.startsWith('src/') &&
        /localStorage/.test(source) &&
        /(address|phone|whatsapp|order|quote|roster|design|organization)/i.test(source) &&
        !/import\.meta\.env\.DEV|allowLocalPersistence|allowLocalAuth/.test(source)
      )
        failures.push(`${file}: sensitive localStorage without an explicit development gate`);
      if (/\beval\s*\(/.test(source)) failures.push(`${file}: eval usage`);
      if (file.startsWith('src/') && /style\s*=\s*\{|\.style\./.test(source))
        failures.push(`${file}: CSP-unsafe inline style mutation`);
      if (file.startsWith('src/') && /document\.write\s*\(/.test(source))
        failures.push(`${file}: document.write usage`);
      if (
        /from\s+['"][^'"]+['"]\s*;?\s*$/m.test(source) === false &&
        /^import\s/m.test(source) &&
        /from\s*;/.test(source)
      )
        failures.push(`${file}: malformed import`);
    }
  }
}
for (const root of roots) await walk(root);
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.info('Project lint checks passed.');

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
async function walk(d) {
  let out = [];
  for (const x of await readdir(d, { withFileTypes: true })) {
    const p = join(d, x.name);
    out = x.isDirectory() ? out.concat(await walk(p)) : out.concat(p);
  }
  return out;
}
const files = (await walk('src')).filter((x) => /\.(js|jsx)$/.test(x));
let bad = 0;
for (const f of files) {
  const s = await readFile(f, 'utf8');
  if (/TO(?:DO)|FIX(?:ME)/.test(s)) {
    console.error('unfinished marker:', f);
    bad++;
  }
}
if (bad) process.exit(1);
console.info(`Source check passed: ${files.length} files`);

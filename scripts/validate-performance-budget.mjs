import { existsSync, readdirSync, statSync, readFileSync } from 'node:fs';
import path from 'node:path';

const failures = [];
const required = [
  ['public/images/categories/clothing-hero-player.opt.webp', 80_000],
  ['public/images/categories/accessories-hero-player.opt.webp', 80_000],
];


const shell = readFileSync('index.html', 'utf8');
if (!/rel="preload"[\s\S]{0,500}href="https:\/\/i\.ytimg\.com\/vi\/_Ra6wkIoJp0\/maxresdefault\.jpg"/i.test(shell)) {
  failures.push('Home hero preload must use the approved external official-film poster');
}
if (/href="\/media\/heroes\//i.test(shell)) {
  failures.push('Home shell must not preload legacy local hero media');
}

for (const [file, maximum] of required) {
  if (!existsSync(file)) failures.push(`${file} is missing`);
  else if (statSync(file).size > maximum)
    failures.push(`${file} is ${statSync(file).size} bytes; budget is ${maximum}`);
}

const optimizedProducts = readdirSync('public/images/products')
  .filter((file) => file.endsWith('.opt.webp'))
  .map((file) => path.join('public/images/products', file));
if (!optimizedProducts.length) failures.push('No optimized WebP product assets were found');
for (const file of optimizedProducts) {
  const bytes = statSync(file).size;
  if (bytes > 120_000)
    failures.push(`${file} exceeds the 120 KB optimized product-media budget (${bytes})`);
}

const forbiddenVideoExtensions = new Set(['.mp4', '.mov', '.webm', '.m4v']);
function walk(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}
for (const file of walk('public')) {
  if (
    forbiddenVideoExtensions.has(path.extname(file).toLowerCase()) &&
    statSync(file).size > 4_000_000
  ) {
    failures.push(
      `${file} is bundled above the 4 MB launch-media budget; compress the local hero video`,
    );
  }
}

if (failures.length) {
  console.error(
    `Performance-budget validation failed:\n${failures.map((item) => `- ${item}`).join('\n')}`,
  );
  process.exit(1);
}
console.info(
  `Performance budgets passed: ${optimizedProducts.length} optimized product assets; home uses the approved external official-film poster and no bundled video exceeds 4 MB.`,
);

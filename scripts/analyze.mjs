import { build } from 'vite';
import { brotliCompressSync, gzipSync } from 'node:zlib';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';

await build();

const rows = [];
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) await walk(absolute);
    else {
      const extension = extname(entry.name).toLowerCase();
      if (
        ![
          '.js',
          '.css',
          '.html',
          '.json',
          '.svg',
          '.webp',
          '.png',
          '.jpg',
          '.jpeg',
          '.woff2',
        ].includes(extension)
      )
        continue;
      const buffer = await readFile(absolute);
      rows.push({
        file: relative('dist', absolute),
        type: extension.slice(1) || 'file',
        bytes: (await stat(absolute)).size,
        gzipBytes: gzipSync(buffer).length,
        brotliBytes: brotliCompressSync(buffer).length,
      });
    }
  }
}
await walk('dist');
rows.sort((a, b) => b.bytes - a.bytes);
const totals = rows.reduce(
  (acc, row) => ({
    bytes: acc.bytes + row.bytes,
    gzipBytes: acc.gzipBytes + row.gzipBytes,
    brotliBytes: acc.brotliBytes + row.brotliBytes,
  }),
  { bytes: 0, gzipBytes: 0, brotliBytes: 0 },
);
const format = (value) => `${(value / 1024).toFixed(1)} KB`;
const htmlRows = rows
  .map(
    (row) =>
      `<tr><td>${row.file}</td><td>${row.type}</td><td>${format(row.bytes)}</td><td>${format(row.gzipBytes)}</td><td>${format(row.brotliBytes)}</td></tr>`,
  )
  .join('');
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SHABABUNA Bundle Analysis</title><style>body{font:14px/1.5 system-ui;margin:32px;color:#111}h1{font-size:28px}table{border-collapse:collapse;width:100%}th,td{border-bottom:1px solid #ddd;padding:10px;text-align:left}th{position:sticky;top:0;background:#fff}.summary{display:flex;gap:24px;margin:20px 0}.summary strong{display:block;font-size:20px}</style></head><body><h1>SHABABUNA Bundle Analysis</h1><p>Generated ${new Date().toISOString()}</p><div class="summary"><span><strong>${format(totals.bytes)}</strong>raw</span><span><strong>${format(totals.gzipBytes)}</strong>gzip</span><span><strong>${format(totals.brotliBytes)}</strong>brotli</span></div><table><thead><tr><th>Asset</th><th>Type</th><th>Raw</th><th>Gzip</th><th>Brotli</th></tr></thead><tbody>${htmlRows}</tbody></table></body></html>`;
await mkdir('reports', { recursive: true });
await writeFile('reports/bundle-analysis.html', html);
await writeFile(
  'reports/bundle-stats.json',
  `${JSON.stringify({ generatedAt: new Date().toISOString(), totals, assets: rows }, null, 2)}\n`,
);
console.info(`Bundle reports written for ${rows.length} assets.`);

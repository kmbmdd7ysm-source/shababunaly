import { readdir } from 'node:fs/promises';
import path from 'node:path';
const { basename, dirname, join } = path;
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const self = basename(fileURLToPath(import.meta.url));
const files = (await readdir(here))
  .filter((name) => name.endsWith('.test.js') && name !== self)
  .sort();

for (const file of files) {
  await import(pathToFileURL(join(here, file)).href);
}

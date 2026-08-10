import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { products } from '../src/data/products.ts';
import {
  createHomeSchema,
  createProductSchema,
  serializeStructuredData,
} from './structured-data.mjs';

const payloads = [createHomeSchema(), ...products.map(createProductSchema).filter(Boolean)].map(
  serializeStructuredData,
);
const hashes = [
  ...new Set(
    payloads.map((payload) => `'sha256-${createHash('sha256').update(payload).digest('base64')}'`),
  ),
];
const configPath = new URL('../vercel.json', import.meta.url);
const config = JSON.parse(await readFile(configPath, 'utf8'));
const header = config.headers
  ?.find((entry) => entry.source === '/(.*)')
  ?.headers?.find((entry) => entry.key === 'Content-Security-Policy');
if (!header) throw new Error('Content-Security-Policy header not found');
header.value = header.value.replace(/\s+'sha256-[A-Za-z0-9+/=]+'/g, '');
header.value = header.value.replace("script-src 'self'", `script-src 'self' ${hashes.join(' ')}`);
await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
console.info(`Synchronized ${hashes.length} JSON-LD CSP hashes.`);

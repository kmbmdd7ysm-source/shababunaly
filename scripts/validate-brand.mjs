import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const required = [
  'public/brand/shababuna-mark-black.png',
  'public/brand/shababuna-mark-white.png',
  'public/brand/shababuna-wordmark-black.png',
  'public/brand/shababuna-wordmark-white.png',
  'public/brand/shababuna-wordmark-ar-black.png',
  'public/brand/shababuna-wordmark-ar-white.png',
  'public/brand/shababuna-social.png',
  'public/favicon.svg',
  'public/favicon.png',
  'public/site.webmanifest',
];
let errors = 0;
const validateSvg = (file) => {
  const source = readFileSync(file, 'utf8');
  if (!/<svg[\s>]/.test(source) || !/viewBox=/.test(source)) {
    console.error('INVALID SVG', file);
    errors += 1;
  }
  if (/<script/i.test(source)) {
    console.error('UNSAFE SVG SCRIPT', file);
    errors += 1;
  }
};
for (const file of required) {
  if (!existsSync(file)) {
    console.error('BROKEN CONFIGURATION: MISSING REQUIRED', file);
    errors += 1;
  } else if (file.endsWith('.svg')) validateSvg(file);
}
const html = readFileSync('index.html', 'utf8');
const configFiles = ['src/config.js', 'src/config/brand.js'];
const referenced = new Set();
for (const match of html.matchAll(/(?:href|content)=["'](\/[^"']+)["']/g)) referenced.add(match[1]);
for (const file of configFiles) {
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(/["'](\/(?:images|brand|icons|favicon)[^"']+)["']/g)) referenced.add(match[1]);
}
let manifest;
try { manifest = JSON.parse(readFileSync('public/site.webmanifest', 'utf8')); }
catch (error) { console.error('BROKEN CONFIGURATION: INVALID MANIFEST JSON', error.message); errors += 1; manifest = {}; }
for (const icon of manifest.icons || []) {
  if (!icon.src || !icon.sizes || !icon.type) { console.error('BROKEN CONFIGURATION: INVALID PWA ICON ENTRY', icon); errors += 1; continue; }
  referenced.add(icon.src);
}
for (const url of referenced) {
  if (/^\/\//.test(url)) continue;
  const clean = url.split(/[?#]/)[0];
  const file = path.join('public', clean.replace(/^\//, ''));
  if (!existsSync(file)) { console.error('BROKEN CONFIGURATION: REFERENCED ASSET MISSING', url, '->', file); errors += 1; }
}
if (!html.includes('SHABABUNA') || !html.includes('BUILT DIFFERENT')) { console.error('BROKEN CONFIGURATION: production brand metadata missing'); errors += 1; }
console.info(`Brand validation: ${errors} errors`);
process.exitCode = errors ? 1 : 0;

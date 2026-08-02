import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const imagePath = path.join(root, 'public/brand/shababuna-social.png');
if (!fs.existsSync(imagePath)) throw new Error('Shababuna Open Graph PNG is missing.');
const png = fs.readFileSync(imagePath);
if (png.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('Open Graph asset is not a PNG.');
const width = png.readUInt32BE(16);
const height = png.readUInt32BE(20);
if (width !== 1200 || height !== 630) throw new Error(`Open Graph PNG must be 1200x630; received ${width}x${height}.`);
const config = fs.readFileSync(path.join(root, 'src/config.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const seo = fs.readFileSync(path.join(root, 'src/components/common/Seo.jsx'), 'utf8');
if (!config.includes("defaultOg: '/brand/shababuna-social.png'")) throw new Error('Central SEO configuration does not reference the Shababuna Open Graph PNG.');
if (!html.includes('/brand/shababuna-social.png')) throw new Error('Static metadata does not reference the Shababuna Open Graph PNG.');
if (!html.includes('https://shababuna.ly/')) throw new Error('Static metadata does not reference the production Shababuna domain.');
if (!seo.includes('og:image:type') || !seo.includes('image/png')) throw new Error('Route metadata does not declare the Open Graph PNG MIME type.');
console.info('SEO validation passed: Shababuna Open Graph PNG is 1200x630 and metadata is production-ready.');

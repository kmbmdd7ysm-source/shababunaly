/*
 * Media pipeline.
 *
 * Takes the generated source artwork in assets/source/ and emits responsive,
 * web-optimised derivatives into public/media/atmosphere/, then writes an asset
 * manifest recording provenance, intrinsic dimensions and byte size for every
 * derivative.
 *
 * There is no sharp, ImageMagick or PIL in this environment, so encoding runs
 * through Chrome's canvas via Playwright — which gives us real WebP encoding
 * rather than a renamed PNG. Every derivative's true decoded dimensions are read
 * back from the browser so the manifest cannot drift from the files, and so
 * every <img> can carry correct width/height and reserve its space.
 *
 * Run: node scripts/build-media.mjs
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const SOURCE = 'assets/source';
const OUT = 'public/media/atmosphere';
const MANIFEST = 'reports/media-manifest.json';

/*
 * Every asset declares what it is for and how it may be described, so nothing
 * ships without an accessible alternative and nothing conceptual can be mistaken
 * for verified product photography.
 */
const ASSETS = [
  {
    file: 'arena-atmosphere-wide.png',
    slug: 'arena-wide',
    widths: [1024, 1600, 2048],
    role: 'Homepage opening — desktop atmosphere',
    kind: 'generated-atmosphere',
    decorative: true,
  },
  {
    file: 'arena-atmosphere-tall.png',
    slug: 'arena-tall',
    widths: [640, 900, 1200],
    role: 'Homepage opening — mobile atmosphere',
    kind: 'generated-atmosphere',
    decorative: true,
  },
  {
    file: 'court-overhead.png',
    slug: 'court-overhead',
    widths: [1024, 1600],
    role: 'Teams chapter atmosphere',
    kind: 'generated-atmosphere',
    decorative: true,
  },
  {
    file: 'fabric-macro.png',
    slug: 'fabric-macro',
    widths: [900, 1400],
    role: 'Workshop chapter — material texture',
    kind: 'generated-atmosphere',
    decorative: true,
  },
  {
    file: 'product-stage-backdrop.png',
    slug: 'product-stage',
    widths: [900, 1400],
    role: 'Product viewer backdrop',
    kind: 'generated-atmosphere',
    decorative: true,
  },
];

const QUALITY = 0.82;

fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(path.dirname(MANIFEST), { recursive: true });

const browser = await chromium.launch({
  executablePath: '/opt/google/chrome/chrome',
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await (await browser.newContext()).newPage();
await page.goto('about:blank');

const manifest = [];

for (const asset of ASSETS) {
  const source = path.join(SOURCE, asset.file);
  if (!fs.existsSync(source)) {
    console.error('MISSING SOURCE', source);
    process.exitCode = 1;
    continue;
  }
  const dataUrl = `data:image/png;base64,${fs.readFileSync(source).toString('base64')}`;

  for (const width of asset.widths) {
    const encoded = await page.evaluate(
      async ({ src, w, quality }) => {
        const image = new Image();
        image.src = src;
        await image.decode();
        const height = Math.round((image.naturalHeight / image.naturalWidth) * w);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = height;
        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0, w, height);
        /*
         * toDataURL is synchronous and returns the encoded bytes directly.
         * The toBlob callback route needed type gymnastics to satisfy
         * typecheck for no benefit at this scale.
         */
        const url = canvas.toDataURL('image/webp', quality);
        const [header, base64] = url.split(',');
        return { type: header.slice(5).split(';')[0], base64, width: w, height };
      },
      { src: dataUrl, w: width, quality: QUALITY },
    );

    if (encoded.type !== 'image/webp') {
      console.error('ENCODER DID NOT PRODUCE WEBP for', asset.slug, '- got', encoded.type);
      process.exitCode = 1;
      continue;
    }

    const name = `${asset.slug}-${width}.webp`;
    const bytes = Buffer.from(encoded.base64, 'base64');
    fs.writeFileSync(path.join(OUT, name), bytes);
    manifest.push({
      src: `/media/atmosphere/${name}`,
      width: encoded.width,
      height: encoded.height,
      bytes: bytes.length,
      source: `${SOURCE}/${asset.file}`,
      role: asset.role,
      kind: asset.kind,
      decorative: asset.decorative,
    });
    console.info(
      `${name}  ${encoded.width}x${encoded.height}  ${(bytes.length / 1024).toFixed(0)}KB`,
    );
  }
}

await browser.close();

fs.writeFileSync(
  MANIFEST,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      note: 'Original artwork generated for Shababuna. No third-party marks, no people, no product photography. Atmosphere only.',
      assets: manifest,
    },
    null,
    2,
  )}\n`,
);
console.info(`\n${manifest.length} derivatives -> ${OUT}`);
console.info(`Manifest -> ${MANIFEST}`);

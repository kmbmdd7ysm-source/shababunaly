// Static route pre-rendering, structured data and sitemap generation.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SITE } from '../src/config.ts';
import { products } from '../src/data/products.js';
import { legal } from '../src/data/legal.js';
import {
  createHomeSchema,
  createProductSchema,
  serializeStructuredData,
} from './structured-data.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, '..', 'dist');
const INDEX = join(DIST, 'index.html');

if (!existsSync(INDEX)) {
  console.error('✗ dist/index.html not found — run "vite build" first.');
  process.exit(1);
}

const template = await readFile(INDEX, 'utf8');
const esc = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
const en = (value) => (value && typeof value === 'object' ? (value.en ?? '') : (value ?? ''));
const ABS = (path) => `${SITE.domain}${path === '/' ? '' : path}`;
const OG = SITE.defaultOg.startsWith('http') ? SITE.defaultOg : `${SITE.domain}${SITE.defaultOg}`;
const safeJson = serializeStructuredData;

function setMeta(html, attr, key, value) {
  const expression = new RegExp(`<meta\\s+${attr}="${key}"[^>]*>`, 'i');
  const tag = `<meta ${attr}="${key}" content="${value}">`;
  return expression.test(html)
    ? html.replace(expression, tag)
    : html.replace('</head>', `  ${tag}\n</head>`);
}

function render(route) {
  const title = route.title.includes(SITE.name) ? route.title : `${route.title} | ${SITE.name}`;
  const url = ABS(route.path);
  const image = route.image
    ? route.image.startsWith('http')
      ? route.image
      : `${SITE.domain}${route.image}`
    : OG;
  const description = esc(route.description || '');
  let html = template;

  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(title)}</title>`);
  html = html.replace(
    /<meta\s+name="description"[^>]*>/i,
    `<meta name="description" content="${description}">`,
  );
  html = setMeta(
    html,
    'name',
    'robots',
    route.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large',
  );

  if (/rel="canonical"/i.test(html)) {
    html = html.replace(/<link\s+rel="canonical"[^>]*>/i, `<link rel="canonical" href="${url}">`);
  } else {
    html = html.replace('</head>', `  <link rel="canonical" href="${url}">\n</head>`);
  }

  html = setMeta(html, 'property', 'og:title', esc(title));
  html = setMeta(html, 'property', 'og:description', description);
  html = setMeta(html, 'property', 'og:url', url);
  html = setMeta(html, 'property', 'og:image', esc(image));
  html = setMeta(html, 'property', 'og:type', route.type || 'website');
  html = setMeta(html, 'name', 'twitter:title', esc(title));
  html = setMeta(html, 'name', 'twitter:description', description);
  html = setMeta(html, 'name', 'twitter:image', esc(image));

  if (route.jsonLd) {
    html = html.replace(
      '</head>',
      `  <script type="application/ld+json">${safeJson(route.jsonLd)}</script>\n</head>`,
    );
  }
  return html;
}

async function emit(route) {
  const outDir = route.path === '/' ? DIST : join(DIST, route.path);
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, 'index.html'), render(route), 'utf8');
}

const homeSchema = createHomeSchema();

/** @type {Array<Record<string, any>>} */
const routes = [
  {
    path: '/',
    title: `${SITE.name} — ${en(SITE.slogan)}`,
    description:
      'Premium basketball retail, custom manufacturing, team supply and wholesale from Libya to the world.',
    jsonLd: homeSchema,
  },
  {
    path: '/shop',
    title: 'Shop',
    description: 'Shop basketball clothing, footwear, accessories, basketballs and equipment.',
  },
  {
    path: '/shop/ready-to-ship',
    title: 'Ready to Ship',
    description: 'Verified in-stock basketball products delivered inside Libya in 24–72 hours.',
  },
  {
    path: '/shop/clothing',
    title: 'Basketball Clothing',
    description: 'Gamewear, practice wear, team apparel, compression and basketball clothing.',
  },
  {
    path: '/shop/footwear',
    title: 'Basketball Footwear',
    description: 'In-court and off-court basketball footwear from leading brands.',
  },
  {
    path: '/shop/accessories',
    title: 'Basketball Accessories',
    description: 'Bags, sleeves, supports, headwear, bottles and training accessories.',
  },
  {
    path: '/shop/basketballs',
    title: 'Basketballs',
    description: 'Indoor, outdoor and custom basketballs by the piece and wholesale.',
  },
  {
    path: '/shop/equipment',
    title: 'Basketball Equipment',
    description: 'Hoops, backboards, rims, shot clocks, ball carts and court equipment.',
  },
  {
    path: '/customize',
    title: 'Customize',
    description:
      'Design custom basketball uniforms, team apparel, accessories, basketballs and branded equipment.',
  },
  {
    path: '/teams-wholesale',
    title: 'Teams & Wholesale',
    description:
      'Club, academy, federation and wholesale basketball supply with staged payments and production tracking.',
  },
  {
    path: '/lha-store',
    title: 'LHA Official Store',
    description: 'Official Libya Hoops Academy clothing and accessories inside Shababuna.',
  },
  {
    path: '/our-work',
    title: 'Our Work',
    description:
      'Shababuna custom manufacturing, club supply and basketball equipment capabilities.',
  },
  {
    path: '/about',
    title: 'About',
    description:
      'Shababuna is a basketball retail, custom manufacturing, team supply and wholesale platform based in Tripoli, Libya.',
  },
  {
    path: '/contact',
    title: 'Contact',
    description:
      'Contact Shababuna for orders, custom manufacturing, teams, wholesale and partnerships.',
  },
  {
    path: '/help',
    title: 'Help',
    description: 'Support for shopping, accounts, custom orders, delivery and payment.',
  },
  {
    path: '/faq',
    title: 'FAQ',
    description:
      'Answers about Shababuna products, custom production, payments and worldwide shipping.',
  },
  {
    path: '/size-guide',
    title: 'Size Guide',
    description: 'Measurements and fit guidance for basketball apparel.',
  },
  {
    path: '/order-tracking',
    title: 'Order Tracking',
    description: 'Track a Shababuna retail, custom or wholesale order.',
    noindex: true,
  },
  {
    path: '/account',
    title: 'Account',
    description: 'Manage your Shababuna profile, saved products and orders.',
    noindex: true,
  },
  {
    path: '/compare',
    title: 'Compare Products',
    description: 'Compare selected Shababuna products.',
    noindex: true,
  },
  { path: '/cart', title: 'Cart', description: 'Review your Shababuna cart.', noindex: true },
];

for (const key of Object.keys(legal)) {
  routes.push({ path: `/${key}`, title: en(legal[key].title), description: en(legal[key].intro) });
}

for (const product of products) {
  const productSchema = createProductSchema(product);
  routes.push({
    path: `/products/${product.slug}`,
    title: en(product.seoTitle) || en(product.name),
    description: en(product.seoDescription) || en(product.description),
    image: product.socialImage || product.image,
    type: 'product',
    jsonLd: productSchema,
  });
}

for (const route of routes) await emit(route);

const sitemapRoutes = routes.filter(
  (route) => !route.noindex && !['/shop/ready-to-ship'].includes(route.path),
);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapRoutes.map((route) => `  <url><loc>${esc(ABS(route.path))}</loc><changefreq>${route.path.startsWith('/products/') ? 'weekly' : route.path === '/shop' ? 'daily' : 'monthly'}</changefreq><priority>${route.path === '/' ? '1.0' : route.path.startsWith('/products/') ? '0.7' : '0.6'}</priority></url>`).join('\n')}\n</urlset>\n`;
await writeFile(join(DIST, 'sitemap.xml'), sitemap, 'utf8');

console.info(`\n✓ Pre-rendered ${routes.length} static HTML pages and generated sitemap.xml.\n`);

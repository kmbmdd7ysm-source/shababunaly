import { existsSync } from 'node:fs';
import { products } from '../src/data/products.js';

let errors = 0;
let warnings = 0;
const owners = new Map();
const conceptArtwork = (source = '') => source.startsWith('/images/catalog/');

for (const product of products) {
  const sources = [product.image, product.hoverImage, ...(product.gallery || [])].filter(Boolean);

  if (!product.image) {
    if (product.mediaStatus !== 'missing') {
      console.error('Missing media must be explicitly marked:', product.id, product.slug);
      errors++;
    }
    continue;
  }

  const expectedStatus = conceptArtwork(product.image) ? 'placeholder' : 'supplied';
  if (product.mediaStatus !== expectedStatus) {
    console.error('Product media has incorrect status:', product.id, product.slug, product.mediaStatus, 'expected', expectedStatus);
    errors++;
  }

  if (product.hoverImage && product.hoverImage === product.image) {
    console.error('Primary and hover media are identical:', product.id, product.slug);
    errors++;
  }

  for (const source of sources) {
    if (!source.startsWith('/')) {
      console.error('Product media must use a public absolute path:', product.id, source);
      errors++;
      continue;
    }
    if (!existsSync(`public${source}`)) {
      console.error('Product media file is missing:', product.id, source);
      errors++;
      continue;
    }
    // Purpose-built catalogue concept artwork may be reused until real product
    // photography is uploaded. Supplied customer media must stay product-owned.
    if (conceptArtwork(source)) {
      warnings++;
      continue;
    }
    const owner = owners.get(source);
    if (owner && owner !== product.id) {
      console.error('Supplied product image borrowed by unrelated products:', owner, product.id, source);
      errors++;
    } else {
      owners.set(source, product.id);
    }
  }
}

console.info(`Media validation: ${errors} errors, ${warnings} warnings`);
const productionRequired = process.env.REQUIRE_FINAL_MEDIA === 'true';
if (productionRequired && warnings) console.error(`Final-media gate failed: ${warnings} placeholder asset reference(s) remain.`);
process.exitCode = errors || (productionRequired && warnings) ? 1 : 0;

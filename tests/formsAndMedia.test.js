import { describe, expect, it } from './test-api.js';
import fs from 'node:fs';
import { products } from '../src/data/products.js';

describe('forms and media readiness', () => {
  it('does not silently send Shababuna forms to an old hard-coded endpoint', () => {
    const browser = fs.readFileSync('src/services/formspree.js', 'utf8');
    const server = fs.readFileSync('api/formspree.js', 'utf8');
    expect(browser).not.toContain('mqerbqvd');
    expect(server).not.toContain('mqerbqvd');
    expect(browser).toContain('formspree_not_configured');
  });

  it('has a valid public media file for every product', () => {
    for (const product of products) expect(fs.existsSync(`public${product.image}`)).toBe(true);
  });

  it('ships the approved brand derivatives', () => {
    for (const file of [
      'public/brand/shababuna-mark-black.png',
      'public/brand/shababuna-mark-white.png',
      'public/brand/shababuna-wordmark-black.png',
      'public/brand/shababuna-wordmark-white.png',
      'public/brand/shababuna-wordmark-ar-black.png',
      'public/brand/shababuna-wordmark-ar-white.png',
    ]) expect(fs.existsSync(file)).toBe(true);
  });
});

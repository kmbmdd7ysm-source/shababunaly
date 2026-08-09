import { describe, expect, it } from './test-api.js';
import fs from 'node:fs';
import { products } from '../src/data/products.js';

describe('forms and media readiness', () => {
  it('uses the approved Formspree endpoint as the only application fallback', () => {
    const integrations = fs.readFileSync('src/config/integrations.ts', 'utf8');
    const serverEndpoint = fs.readFileSync('api/_formspree-endpoint.js', 'utf8');
    const browser = fs.readFileSync('src/services/formspree.js', 'utf8');
    expect(integrations).toContain('https://formspree.io/f/mqerbqvd');
    expect(serverEndpoint).toContain('https://formspree.io/f/mqerbqvd');
    expect(integrations).not.toContain('mvzenjgv');
    expect(serverEndpoint).not.toContain('mvzenjgv');
    expect(browser).toContain('formspree_not_configured');
  });

  it('has a valid public media file for every product', () => {
    for (const product of products) expect(fs.existsSync(`public${product.image}`)).toBe(true);
  });

  it('ships the approved brand derivatives', () => {
    // Quarantined NBA-Logoman-derived mark PNGs must never be reintroduced.
    // The interim typographic monogram + verified script wordmarks are canonical.
    for (const file of [
      'public/brand/shababuna-monogram.svg',
      'public/brand/shababuna-wordmark-black.png',
      'public/brand/shababuna-wordmark-white.png',
      'public/brand/shababuna-wordmark-ar-black.png',
      'public/brand/shababuna-wordmark-ar-white.png',
      'public/brand/shababuna-social.png',
    ])
      expect(fs.existsSync(file)).toBe(true);
    for (const quarantined of [
      'public/brand/shababuna-mark-black.png',
      'public/brand/shababuna-mark-white.png',
    ])
      expect(fs.existsSync(quarantined)).toBe(false);
  });
});

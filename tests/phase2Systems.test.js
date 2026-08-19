import { readFileSync } from 'node:fs';
import { describe, expect, it } from './test-api.js';
import { getSearchSuggestions, searchSite } from '../src/utils/search.ts';

describe('phase 2 production systems', () => {
  it('matches Kobe in Arabic and through one-character typo tolerance', () => {
    const arabic = searchSite('كوبي', 5);
    const typo = searchSite('kobee', 5);
    expect(arabic.products.length).toBeGreaterThan(0);
    expect(typo.products.length).toBeGreaterThan(0);
    expect(String(arabic.products[0]?.name?.en || '')).toContain('Kobe');
    expect(String(typo.products[0]?.name?.en || '')).toContain('Kobe');
  });

  it('routes category suggestions directly to the category', () => {
    const suggestions = getSearchSuggestions('footwear', 8);
    expect(suggestions.some((item) => item.to === '/shop/footwear')).toBe(true);
  });

  it('uses native hero video with no YouTube player runtime', () => {
    const map = readFileSync('src/data/localHeroMedia.ts', 'utf8');
    const home = readFileSync('src/components/experience/CinematicHero.tsx', 'utf8');
    const editorial = readFileSync('src/components/common/EditorialMedia.tsx', 'utf8');
    expect(home).toContain('<video');
    expect(home).toContain('autoPlay');
    expect(editorial).toContain('<video');
    const localMp4s = map.match(/\/media\/hero-videos\/[a-z-]+\.mp4/g) || [];
    expect(localMp4s.length).toBe(13);
    expect(new Set(localMp4s).size).toBe(13);
    expect(`${map}\n${home}\n${editorial}`).not.toContain('youtube-nocookie.com');
  });

  it('uploads the actual custom logo into quarantine before quote association', () => {
    const page = readFileSync('src/pages/CustomizePage.tsx', 'utf8');
    const client = readFileSync('src/services/customDesignAssets.ts', 'utf8');
    const api = readFileSync('api/custom-design-asset.ts', 'utf8');
    const quote = readFileSync('api/public-quote-request.ts', 'utf8');
    expect(page).toContain('uploadCustomDesignAsset');
    expect(client).toContain("fetch('/api/custom-design-asset'");
    expect(api).toContain('validateEncodedFiles');
    expect(api).toContain('media-quarantine');
    expect(quote).toContain('verifyCustomLogoAsset');
    expect(quote).toContain('quote_logo');
  });

  it('does not expose the development spinset fixture in production', () => {
    const viewer = readFileSync('src/components/product/ProductMediaViewer.tsx', 'utf8');
    const engine = readFileSync('src/components/product/engines/SpinsetEngine.tsx', 'utf8');
    expect(viewer).toContain('import.meta.env.DEV');
    expect(engine).toContain('allowDevelopmentFixture = false');
  });

  it('keeps protected PWA routes network-only', () => {
    const sw = readFileSync('public/sw.js', 'utf8');
    for (const route of ['account', 'checkout', 'order-tracking', 'operations', 'team-locker', 'design-share', 'special-request']) {
      expect(sw).toContain(route);
    }
    expect(sw).toContain('url.origin !== self.location.origin');
  });
});

import { readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from './test-api.js';

describe('performance architecture', () => {
  it('uses a high-priority local first-paint poster and native background video', () => {
    const html = readFileSync('index.html', 'utf8');
    const hero = readFileSync('src/components/experience/CinematicHero.tsx', 'utf8');
    const media = readFileSync('src/data/localHeroMedia.ts', 'utf8');
    expect(html).toContain('fetchpriority="high"');
    expect(html).toContain('/media/hero-posters/home.webp');
    expect(html).not.toContain('i.ytimg.com');
    expect(hero).toContain('<video');
    expect(hero).toContain('autoPlay');
    expect(hero).not.toContain('YouTubeBackground');
    expect(media).toContain('/media/hero-posters/home.webp');
    expect(media).toContain('underarmour.scene7.com/is/content/Underarmour/');
  });

  it('keeps the bundled home fallback poster within the current draft budget', () => {
    expect(statSync('public/media/hero-posters/home.webp').size).toBeLessThan(160_000);
  });

  it('enforces repeated-run median Lighthouse score and metric gates', () => {
    const validator = readFileSync('scripts/lighthouse/validate-lighthouse.mjs', 'utf8');
    expect(validator).toContain('LH_MOBILE_PERFORMANCE');
    expect(validator).toContain('LH_MOBILE_ACCESSIBILITY');
    expect(validator).toContain('LH_DESKTOP_PERFORMANCE');
    expect(validator).toContain('report.runCount');
    expect(validator).toContain('lcpMs');
    expect(validator).toContain('cls');
    expect(validator).toContain('tbtMs');
    expect(validator).toContain('repeated-run median scores and budgets are satisfied');
  });
});

import { readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from './test-api.js';

describe('performance architecture', () => {
  it('uses responsive preloaded hero posters and defers video', () => {
    const html = readFileSync('index.html', 'utf8');
    const hero = readFileSync('src/components/experience/CinematicHero.jsx', 'utf8');
    expect(html).toContain('imagesrcset');
    expect(html).toContain('fetchpriority="high"');
    expect(hero).toContain('preload="none"');
    expect(hero).toContain('shababuna-hero-poster-mobile.webp');
  });

  it('keeps critical hero posters tiny', () => {
    expect(statSync('public/media/hero/shababuna-hero-poster.webp').size).toBeLessThan(40_000);
    expect(statSync('public/media/hero/shababuna-hero-poster-mobile.webp').size).toBeLessThan(30_000);
  });

  it('enforces repeated-run median Lighthouse score and metric gates', () => {
    const validator = readFileSync('scripts/lighthouse/validate-lighthouse.mjs', 'utf8');
    expect(validator).toContain('LH_MOBILE_PERFORMANCE,.99');
    expect(validator).toContain('LH_MOBILE_ACCESSIBILITY,1');
    expect(validator).toContain('LH_DESKTOP_PERFORMANCE,1');
    expect(validator).toContain('Number(report.runCount)<3');
    expect(validator).toContain('report.metrics?.lcpMs');
    expect(validator).toContain('report.metrics?.cls');
    expect(validator).toContain('report.metrics?.tbtMs');
    expect(validator).toContain('repeated-run median scores and budgets are satisfied');
  });
});

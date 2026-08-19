import { readFileSync } from 'node:fs';
import { describe, expect, it } from './test-api.js';

describe('performance architecture', () => {
  it('uses supplied local video directly with no image poster first-paint', () => {
    const html = readFileSync('index.html', 'utf8');
    const hero = readFileSync('src/components/experience/CinematicHero.tsx', 'utf8');
    const media = readFileSync('src/data/localHeroMedia.ts', 'utf8');
    expect(html).not.toContain('/media/hero-posters/');
    expect(html).not.toContain('i.ytimg.com');
    expect(hero).toContain('<video');
    expect(hero).toContain('autoPlay');
    expect(hero).not.toContain('YouTubeBackground');
    expect(media).toContain('/media/hero-videos/home-desktop.mp4');
    expect(media.match(/\/media\/hero-videos\/[a-z-]+\.mp4/g)?.length).toBe(15);
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

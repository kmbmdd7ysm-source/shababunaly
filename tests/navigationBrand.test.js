import { readFileSync } from 'node:fs';
import { describe, expect, it } from './test-api.js';
import { SITE } from '../src/config.js';
import { mainNav } from '../src/data/navigation.js';

describe('brand and navigation', () => {
  it('uses the approved brand identity and contact data', () => {
    expect(SITE.name).toBe('Shababuna');
    expect(SITE.nameAr).toBe('شبابنا');
    expect(SITE.slogan.en).toBe('BUILT DIFFERENT.');
    expect(SITE.domain).toBe('https://shababuna.ly');
    expect(SITE.email).toBe('shababuna.info@gmail.com');
    expect(SITE.whatsapp).toBe('218926578062');
  });

  it('keeps the requested minimal main navigation', () => {
    expect(mainNav.map((item) => item.to)).toEqual([
      '/', '/shop', '/customize', '/teams-wholesale', '/lha-store', '/our-work', '/about',
    ]);
  });

  it('supports both personal and team/business registration paths', () => {
    const source = readFileSync(new URL('../src/pages/AccountPage.jsx', import.meta.url), 'utf8');
    expect(source).toContain("accountType === 'customer'");
    expect(source).toContain("accountType === 'organization'");
    expect(source).toContain('organization_name');
    expect(source).toContain('organization_type');
  });

});

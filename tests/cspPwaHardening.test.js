import { readFile } from 'node:fs/promises';
import { describe, expect, it, vi } from './test-api.js';
import { lockDocumentScroll } from '../src/utils/scrollLock.ts';

function classListMock() {
  const values = new Set();
  return {
    add: (...names) => names.forEach((name) => values.add(name)),
    remove: (...names) => names.forEach((name) => values.delete(name)),
    contains: (name) => values.has(name),
  };
}

describe('CSP and PWA hardening', { concurrency: false }, () => {
  it('uses a reference-counted class scroll lock without inline style mutation', () => {
    const noDocumentRelease = lockDocumentScroll();
    noDocumentRelease();
    const html = { classList: classListMock() };
    const body = { classList: classListMock() };
    vi.stubGlobal('document', { documentElement: html, body });
    const releaseOne = lockDocumentScroll();
    const releaseTwo = lockDocumentScroll();
    expect(html.classList.contains('scroll-locked')).toBe(true);
    expect(body.classList.contains('scroll-locked')).toBe(true);
    releaseOne();
    expect(body.classList.contains('scroll-locked')).toBe(true);
    releaseOne();
    releaseTwo();
    expect(html.classList.contains('scroll-locked')).toBe(false);
    expect(body.classList.contains('scroll-locked')).toBe(false);
    vi.restoreAllMocks();
  });

  it('forbids inline style attributes and authorizes only declared analytics origins', async () => {
    const vercel = await readFile(new URL('../vercel.json', import.meta.url), 'utf8');
    expect(vercel).toContain("style-src-attr 'none'");
    expect(vercel).toContain("script-src-attr 'none'");
    expect(vercel).not.toContain("style-src-attr 'unsafe-inline'");
    expect(vercel).toContain('https://www.clarity.ms');
    expect(vercel).toContain('https://*.clarity.ms');
  });

  it('keeps sensitive routes network-only and revisions caches by build id', async () => {
    const worker = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
    expect(worker).toContain("PARAMS.get('v')");
    for (const route of [
      '/api',
      '/account',
      '/checkout',
      '/operations',
      '/team-locker',
      '/design-share',
      '/special-request',
    ]) {
      expect(worker).toContain(route.replace('/', '\\/'));
    }
    expect(worker).toContain('key.startsWith(CACHE_PREFIX)');
    expect(worker).toContain('await caches.delete(key)');
    expect(worker).toContain('Promise.allSettled');
    expect(worker).not.toContain('cache.addAll(');
    expect(worker.includes('\b')).toBe(false);
    expect(worker).toContain('\\b');
  });

  it('contains no React inline style props or direct style mutations', async () => {
    const sourceFiles = [
      '../src/pages/CartPage.jsx',
      '../src/components/layout/CartDrawer.jsx',
      '../src/components/custom/ProductionDesignEditor.jsx',
      '../src/components/media/MediaLightbox.jsx',
      '../src/components/common/SmartImage.tsx',
    ];
    for (const file of sourceFiles) {
      const source = await readFile(new URL(file, import.meta.url), 'utf8');
      expect(source).not.toContain('style={{');
      expect(source).not.toContain('.style.');
    }
  });
});

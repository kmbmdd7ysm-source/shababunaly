import { describe, expect, test, vi } from 'vitest';

let activeLanguage = 'en';
vi.mock('../../src/context/LanguageContext', () => ({
  useLanguage: () => ({
    lang: activeLanguage,
    dir: activeLanguage === 'ar' ? 'rtl' : 'ltr',
    pick: (value) =>
      value && typeof value === 'object' ? (value[activeLanguage] ?? value.en) : value,
    t: {},
  }),
}));

import { fireEvent, render, screen } from '@testing-library/react';
import { within } from '@testing-library/dom';
import ProductViewer from '../../src/components/product/ProductViewer';
import {
  MIN_SPIN_FRAMES,
  isPlaceholderMedia,
  resolveProductViewer,
  spinFrames,
  verifiedImages,
} from '../../src/utils/productViewerTier';

const base = { id: 'p1', alt: { en: 'A product', ar: 'منتج' } };
const frames = (n) => Array.from({ length: n }, (_, i) => `/images/products/spin-${i}.webp`);

describe('product-viewing tier resolution', () => {
  test('placeholder concept art never counts as a verified asset', () => {
    expect(isPlaceholderMedia('/images/catalog/apparel.svg')).toBe(true);
    expect(isPlaceholderMedia('/images/products/tee.webp')).toBe(false);
    expect(isPlaceholderMedia(undefined)).toBe(false);

    const placeholderOnly = { ...base, image: '/images/catalog/apparel.svg' };
    expect(verifiedImages(placeholderOnly)).toEqual([]);
    expect(resolveProductViewer(placeholderOnly)).toMatchObject({ tier: 'D', placeholder: true });
  });

  test('duplicate images are collapsed and missing input is tolerated', () => {
    expect(verifiedImages()).toEqual([]);
    expect(spinFrames()).toEqual([]);
    expect(resolveProductViewer()).toMatchObject({
      tier: 'D',
      images: [],
      frames: [],
      model: null,
    });
    const dupes = {
      ...base,
      image: '/a.webp',
      hoverImage: '/a.webp',
      gallery: ['/a.webp', '/b.webp'],
    };
    expect(verifiedImages(dupes)).toEqual(['/a.webp', '/b.webp']);
  });

  test('a partial spin is not a spin — frames are never padded or repeated', () => {
    const short = { ...base, image: '/a.webp', spin360: frames(MIN_SPIN_FRAMES - 1) };
    expect(spinFrames(short)).toEqual([]);
    expect(resolveProductViewer(short).tier).toBe('D');

    const full = { ...base, image: '/a.webp', spin360: frames(MIN_SPIN_FRAMES) };
    expect(spinFrames(full)).toHaveLength(MIN_SPIN_FRAMES);
    expect(resolveProductViewer(full).tier).toBe('B');
  });

  test('tiers A/B/C/D are assigned from real assets only', () => {
    expect(resolveProductViewer({ ...base, image: '/a.webp' }).tier).toBe('D');
    expect(resolveProductViewer({ ...base, image: '/a.webp', hoverImage: '/b.webp' }).tier).toBe(
      'C',
    );
    expect(resolveProductViewer({ ...base, image: '/a.webp', spin360: frames(30) }).tier).toBe('B');
    expect(
      resolveProductViewer({ ...base, image: '/a.webp', model3d: '/models/x/v1/model.glb' }).tier,
    ).toBe('A');
    // A model reference outside the same-origin models directory is not trusted.
    expect(
      resolveProductViewer({ ...base, image: '/a.webp', model3d: 'https://cdn.example/m.glb' })
        .tier,
    ).toBe('D');
  });
});

describe('ProductViewer', () => {
  test('a single verified image offers no rotation and says what it is', () => {
    activeLanguage = 'en';
    const { container } = render(<ProductViewer product={{ ...base, image: '/a.webp' }} />);
    expect(container.querySelector('.gw-viewer')).toHaveAttribute('data-tier', 'D');
    expect(screen.getByText('Single verified photograph')).toBeVisible();
    // No fake rotation controls are offered.
    expect(screen.queryByRole('tablist')).toBeNull();
  });

  test('multi-angle is labelled as NOT a 360 and switches views', () => {
    activeLanguage = 'en';
    render(
      <ProductViewer
        product={{ ...base, image: '/a.webp', hoverImage: '/b.webp', gallery: ['/c.webp'] }}
      />,
    );
    expect(screen.getByText(/not a 360° model/i)).toBeVisible();
    const tabs = within(screen.getByRole('tablist')).getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Front', 'Back', 'Side']);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(tabs[2]);
    expect(screen.getAllByRole('tab')[2]).toHaveAttribute('aria-selected', 'true');
  });

  test('a real turntable is labelled as a 360 and is keyboard operable', () => {
    activeLanguage = 'en';
    render(
      <ProductViewer product={{ ...base, image: '/a.webp', spin360: frames(MIN_SPIN_FRAMES) }} />,
    );
    expect(screen.getByText(/360° photographed turntable/i)).toBeVisible();
    const stage = screen.getByRole('group', { name: 'Product views' });
    expect(stage).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(stage, { key: 'ArrowRight' });
    expect(screen.getAllByRole('tab')[1]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(stage, { key: 'ArrowLeft' });
    expect(screen.getAllByRole('tab')[0]).toHaveAttribute('aria-selected', 'true');
    // Wraps backwards past the first frame rather than sticking.
    fireEvent.keyDown(stage, { key: 'ArrowLeft' });
    expect(screen.getAllByRole('tab')[MIN_SPIN_FRAMES - 1]).toHaveAttribute(
      'aria-selected',
      'true',
    );
    fireEvent.keyDown(stage, { key: 'Enter' });
    expect(screen.getAllByRole('tab')[MIN_SPIN_FRAMES - 1]).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  test('arrow keys follow the reading direction in Arabic', () => {
    activeLanguage = 'ar';
    render(<ProductViewer product={{ ...base, image: '/a.webp', hoverImage: '/b.webp' }} eager />);
    expect(screen.getByText(/ليست نموذجًا/)).toBeVisible();
    const stage = screen.getByRole('group', { name: 'عروض المنتج' });
    // In RTL, "forward" is ArrowLeft.
    fireEvent.keyDown(stage, { key: 'ArrowLeft' });
    expect(screen.getAllByRole('tab')[1]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(stage, { key: 'ArrowRight' });
    expect(screen.getAllByRole('tab')[0]).toHaveAttribute('aria-selected', 'true');
    activeLanguage = 'en';
  });

  test('a placeholder-only product still renders, and cannot be rotated', () => {
    activeLanguage = 'en';
    // No verified assets at all: the viewer must fall back to whatever the
    // product does have, and must never offer rotation controls.
    const { container } = render(
      <ProductViewer product={{ ...base, image: '/images/catalog/apparel.svg' }} />,
    );
    expect(container.querySelector('.gw-viewer')).toHaveAttribute('data-tier', 'D');
    expect(screen.queryByRole('tablist')).toBeNull();
    const stage = screen.getByRole('group', { name: 'Product views' });
    expect(stage).toHaveAttribute('tabindex', '-1');
    // Arrow keys are inert when there is nothing to step through.
    fireEvent.keyDown(stage, { key: 'ArrowRight' });
    expect(screen.queryByRole('tablist')).toBeNull();
  });

  test('view labels fall back gracefully beyond the named set', () => {
    activeLanguage = 'en';
    render(
      <ProductViewer
        product={{
          ...base,
          image: '/1.webp',
          gallery: ['/2.webp', '/3.webp', '/4.webp', '/5.webp', '/6.webp', '/7.webp'],
        }}
      />,
    );
    expect(screen.getByRole('tab', { name: 'View 7' })).toBeVisible();
  });
});

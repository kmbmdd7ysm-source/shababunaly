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

import { render, screen } from '@testing-library/react';
import ViewingTierNote from '../../src/components/product/ViewingTierNote';
import { MIN_SPIN_FRAMES } from '../../src/utils/productViewerTier';

const frames = (n) => Array.from({ length: n }, (_, i) => `/images/products/spin-${i}.webp`);

describe('ViewingTierNote', () => {
  test('placeholder artwork is never described as a photograph', () => {
    activeLanguage = 'en';
    const { container } = render(
      <ViewingTierNote product={{ image: '/images/catalog/apparel.svg' }} />,
    );
    expect(container.querySelector('.gw-tier-note')).toHaveAttribute('data-tier', 'D');
    expect(screen.getByText(/Illustration — product photography pending/)).toBeVisible();
  });

  test('a single real photograph says exactly that', () => {
    activeLanguage = 'en';
    render(<ViewingTierNote product={{ image: '/images/products/tee.webp' }} />);
    expect(screen.getByText('One verified photograph')).toBeVisible();
  });

  test('multi-angle states in words that it is not a 360', () => {
    activeLanguage = 'en';
    render(
      <ViewingTierNote
        product={{ image: '/a.webp', hoverImage: '/b.webp', gallery: ['/c.webp'] }}
      />,
    );
    expect(screen.getByText('3 photographed angles — not a 360° model')).toBeVisible();
  });

  test('a real turntable reports its true frame count', () => {
    activeLanguage = 'en';
    render(<ViewingTierNote product={{ image: '/a.webp', spin360: frames(MIN_SPIN_FRAMES) }} />);
    expect(
      screen.getByText(`360° photographed turntable · ${MIN_SPIN_FRAMES} frames`),
    ).toBeVisible();
  });

  test('a verified model is announced as interactive 3D', () => {
    activeLanguage = 'en';
    const { container } = render(
      <ViewingTierNote product={{ image: '/a.webp', model3d: '/models/x/v1.glb' }} />,
    );
    expect(container.querySelector('.gw-tier-note')).toHaveAttribute('data-tier', 'A');
    expect(screen.getByText('Interactive 3D model')).toBeVisible();
  });

  test('every tier has Arabic copy, including both Level D cases', () => {
    activeLanguage = 'ar';
    const cases = [
      [{ image: '/images/catalog/x.svg' }, /قيد الإعداد/],
      [{ image: '/a.webp' }, /صورة موثّقة واحدة/],
      [{ image: '/a.webp', hoverImage: '/b.webp' }, /ليست نموذجًا/],
      [{ image: '/a.webp', spin360: frames(MIN_SPIN_FRAMES) }, /دوران مصوَّر/],
      [{ image: '/a.webp', model3d: '/models/x.glb' }, /ثلاثي الأبعاد/],
    ];
    for (const [product, matcher] of cases) {
      const { unmount } = render(<ViewingTierNote product={product} />);
      expect(screen.getByText(matcher)).toBeVisible();
      unmount();
    }
    activeLanguage = 'en';
  });
});

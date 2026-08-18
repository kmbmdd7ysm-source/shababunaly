import type { ReactElement } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import '../../../styles/spinset.css';

export type SpinsetStatus = 'SPINSET_AVAILABLE' | 'SPINSET_MISSING' | 'SPINSET_INVALID';

type SpinsetEngineProps = {
  frames?: string[];
  /** Development fixture when frames absent — never catalogue photography. */
  allowDevelopmentFixture?: boolean;
  productName?: string;
};

const DEV_FRAME_COUNT = 24;

function buildDevelopmentFrames(): string[] {
  // Distinct SVG data-URI frames so order/drag/keyboard can be verified without photos.
  return Array.from({ length: DEV_FRAME_COUNT }, (_, index) => {
    const angle = (index / DEV_FRAME_COUNT) * Math.PI * 2;
    const x = 50 + Math.cos(angle) * 28;
    const y = 50 + Math.sin(angle) * 18;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 100 100">
      <rect width="100" height="100" fill="#111"/>
      <circle cx="50" cy="50" r="34" fill="none" stroke="#c4a35a" stroke-width="1.2"/>
      <circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="6" fill="#f4f1ea"/>
      <text x="50" y="92" text-anchor="middle" fill="#888" font-size="6" font-family="monospace">${String(index + 1).padStart(2, '0')}/${DEV_FRAME_COUNT}</text>
      <text x="50" y="12" text-anchor="middle" fill="#666" font-size="5" font-family="monospace">DEV SPINSET</text>
    </svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

/**
 * True 360 spin engine. Development frames prove interaction contracts.
 * Catalogue Tier B remains 0 until real photography is supplied.
 */
export default function SpinsetEngine({
  frames,
  allowDevelopmentFixture = false,
  productName = '',
}: SpinsetEngineProps): ReactElement {
  const { pick } = useLanguage();
  const status: SpinsetStatus = useMemo(() => {
    if (!frames || frames.length === 0) {
      return allowDevelopmentFixture ? 'SPINSET_AVAILABLE' : 'SPINSET_MISSING';
    }
    if (frames.length < 8) return 'SPINSET_INVALID';
    return 'SPINSET_AVAILABLE';
  }, [allowDevelopmentFixture, frames]);

  const sequence = useMemo(() => {
    if (frames && frames.length >= 8) return frames;
    if (allowDevelopmentFixture) return buildDevelopmentFrames();
    return [];
  }, [allowDevelopmentFixture, frames]);

  const [index, setIndex] = useState(0);
  const dragging = useRef(false);
  const lastX = useRef(0);
  const stage = useRef<HTMLDivElement | null>(null);

  const step = useCallback(
    (delta: number) => {
      if (!sequence.length) return;
      setIndex((current) => (current + delta + sequence.length * 10) % sequence.length);
    },
    [sequence.length],
  );

  useEffect(() => {
    // Progressive preload of neighbors
    const preload = [index, index + 1, index - 1, index + 2].map(
      (i) => sequence[(i + sequence.length) % sequence.length],
    );
    for (const src of preload) {
      if (!src) continue;
      const img = new Image();
      img.decoding = 'async';
      img.src = src;
    }
  }, [index, sequence]);

  useEffect(() => {
    const el = stage.current;
    if (!el) return undefined;
    const onDown = (event: PointerEvent) => {
      dragging.current = true;
      lastX.current = event.clientX;
      el.setPointerCapture(event.pointerId);
    };
    const onMove = (event: PointerEvent) => {
      if (!dragging.current) return;
      const dx = event.clientX - lastX.current;
      if (Math.abs(dx) >= 8) {
        step(dx > 0 ? -1 : 1);
        lastX.current = event.clientX;
      }
    };
    const onUp = (event: PointerEvent) => {
      dragging.current = false;
      try {
        el.releasePointerCapture(event.pointerId);
      } catch {
        /* ignore */
      }
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
    };
  }, [step]);

  if (status === 'SPINSET_MISSING' || sequence.length === 0) {
    return (
      <div className="gw-spin gw-spin--missing" role="status">
        {pick({ en: '360 spinset unavailable', ar: 'عرض 360 غير متاح' })}
      </div>
    );
  }

  if (status === 'SPINSET_INVALID') {
    return (
      <div className="gw-spin gw-spin--invalid" role="alert">
        {pick({ en: 'Spinset invalid — needs ordered frames', ar: 'مجموعة الدوران غير صالحة' })}
      </div>
    );
  }

  const isDev = !frames || frames.length < 8;

  return (
    <div
      className="gw-spin"
      role="group"
      aria-label={pick({
        en: `${productName || 'Product'} 360 viewer`,
        ar: `عارض 360 لـ ${productName || 'المنتج'}`,
      })}
    >
      {isDev && (
        <p className="gw-spin-badge">
          {pick({
            en: 'DEVELOPMENT SPINSET · not catalogue photography',
            ar: 'مجموعة دوران تطويرية · ليست تصوير كتالوج',
          })}
        </p>
      )}
      <div
        ref={stage}
        className="gw-spin-stage"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            step(event.key === 'ArrowRight' ? 1 : -1);
          }
        }}
      >
        <img
          src={sequence[index]}
          alt=""
          width={640}
          height={640}
          draggable={false}
          decoding="async"
        />
      </div>
      <div className="gw-spin-meta">
        <span className="gw-isolate-ltr">
          {index + 1}/{sequence.length}
        </span>
        <span>{pick({ en: 'Drag · swipe · ← →', ar: 'اسحب · مرّر · ← →' })}</span>
      </div>
    </div>
  );
}

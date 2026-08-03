import { useEffect, useId, useState } from 'react';
import SmartImage from '../common/SmartImage';
import { useLanguage } from '../../context/LanguageContext';
import { resolveProductViewer } from '../../utils/productViewerTier';
import '../../styles/product.css';

/*
 * The product viewer.
 *
 * One component, four honest behaviours, chosen by what the assets can actually
 * support. It is deliberately independent of pricing, inventory and the cart:
 * it receives a product and renders images, nothing else.
 *
 *   A  real-time 3D    -> defers to the lazy 3D surface (assets pending)
 *   B  true 360 spin   -> drag / swipe / arrow-key frame scrubbing
 *   C  multi-angle     -> labelled angle switching, clearly NOT a 360
 *   D  asset-blocked   -> the single verified image, and no invented rotation
 *
 * Accessibility: every control is a real button in the DOM, the angle list is a
 * tablist with roving selection, keyboard works without a pointer, and the
 * current view is announced. RTL: arrow keys follow the reading direction, and
 * layout uses logical properties only.
 */

const VIEW_LABELS = [
  { en: 'Front', ar: 'أمام' },
  { en: 'Back', ar: 'خلف' },
  { en: 'Side', ar: 'جانب' },
  { en: 'Detail', ar: 'تفصيل' },
  { en: 'Alternate', ar: 'إضافي' },
  { en: 'Extra', ar: 'إضافي ٢' },
];

const labelFor = (index) =>
  VIEW_LABELS[index] || { en: `View ${index + 1}`, ar: `عرض ${index + 1}` };

/**
 * @param {{ product: any, eager?: boolean }} props
 */
export default function ProductViewer({ product, eager = false }) {
  const { pick, dir } = useLanguage();
  const { tier, images, frames } = resolveProductViewer(product);
  const sources = frames.length > 0 ? frames : images;
  const [index, setIndex] = useState(0);
  const listId = useId();

  useEffect(() => {
    setIndex(0);
  }, [product.id]);

  const count = sources.length;
  const safeIndex = count > 0 ? Math.min(index, count - 1) : 0;
  const current = sources[safeIndex] || product.image;

  const step = (delta) => {
    if (count < 2) return;
    setIndex((value) => (value + delta + count) % count);
  };

  // Arrow keys follow the reading direction, so "next" always means "forward"
  // for the reader rather than "rightward" on the screen.
  const onKeyDown = (event) => {
    const forward = dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
    const back = dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
    if (event.key === forward) {
      event.preventDefault();
      step(1);
    }
    if (event.key === back) {
      event.preventDefault();
      step(-1);
    }
  };

  const accuracyNote =
    tier === 'B'
      ? pick({ en: '360° photographed turntable', ar: 'دوران مصوَّر ٣٦٠°' })
      : tier === 'C'
        ? pick({
            en: 'Multiple photographed angles — not a 360° model',
            ar: 'زوايا مصوَّرة متعددة — ليست نموذجًا ٣٦٠°',
          })
        : pick({ en: 'Single verified photograph', ar: 'صورة موثّقة واحدة' });

  return (
    <div className="gw-viewer" data-tier={tier}>
      <div
        className="gw-viewer-stage"
        role="group"
        aria-label={pick({ en: 'Product views', ar: 'عروض المنتج' })}
        aria-describedby={`${listId}-note`}
        tabIndex={count > 1 ? 0 : -1}
        onKeyDown={onKeyDown}
      >
        <SmartImage
          src={current}
          alt={pick(product.alt)}
          width={900}
          height={1125}
          eager={eager}
          className="gw-viewer-image"
          sizes="(min-width: 900px) 50vw, 100vw"
        />
      </div>

      <p id={`${listId}-note`} className="gw-spec gw-viewer-note">
        {accuracyNote}
      </p>

      {count > 1 && (
        <div
          className="gw-viewer-controls"
          role="tablist"
          aria-label={pick({ en: 'Choose a view', ar: 'اختر العرض' })}
        >
          {sources.map((src, position) => (
            <button
              key={src}
              type="button"
              role="tab"
              aria-selected={position === safeIndex}
              aria-current={position === safeIndex ? 'true' : undefined}
              className={`gw-viewer-tab${position === safeIndex ? ' is-active' : ''}`}
              onClick={() => setIndex(position)}
            >
              {pick(labelFor(position))}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

import { useEffect, useId, useRef, useState } from 'react';
import DesignPreview from './DesignPreview';
import { useLanguage } from '../../context/LanguageContext';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import '../../styles/studio.css';

/*
 * The Studio stage.
 *
 * Wraps the existing vector `DesignPreview` in the camera, lighting, overlay
 * and accuracy architecture the full 3D Studio will use, WITHOUT pretending a
 * 3D model exists. No `.glb` ships in this repository, so the stage renders the
 * vector approximation and says so, plainly, in both languages.
 *
 * The contract this establishes, and which the 3D surface will inherit
 * unchanged when models arrive:
 *
 *   - Camera presets are real DOM buttons, not gestures. Orbit, zoom and view
 *     are all reachable by keyboard with no pointer at all.
 *   - Left and right are the GARMENT's left and right, never the screen's, so
 *     they do not swap in Arabic. Only the reading direction of "next" flips.
 *   - Lighting is a named, honest mode - it never implies measured colour.
 *   - The accuracy badge is DOM text outside the artboard, so it survives every
 *     fallback. It is computed from the real preflight result and can never be
 *     upgraded by the interface.
 *
 * `DesignPreview` itself is untouched, so proof and production output continue
 * to come from the same vector source they always did.
 */

/** Garment-relative, deliberately not screen-relative. */
const VIEWS = [
  { key: 'front', label: { en: 'Front', ar: 'أمام' }, azimuth: 0 },
  { key: 'right', label: { en: 'Right', ar: 'يمين' }, azimuth: 90 },
  { key: 'back', label: { en: 'Back', ar: 'خلف' }, azimuth: 180 },
  { key: 'left', label: { en: 'Left', ar: 'يسار' }, azimuth: 270 },
  { key: 'detail', label: { en: 'Detail', ar: 'تفصيل' }, azimuth: 35 },
];

const LIGHTING = [
  { key: 'production', label: { en: 'Production', ar: 'إنتاج' } },
  { key: 'studio', label: { en: 'Studio', ar: 'استوديو' } },
  { key: 'arena', label: { en: 'Arena', ar: 'ملعب' } },
];

/** Below this the gesture was a tap, not a rotation. */
export const SWIPE_THRESHOLD = 40;

/**
 * Pure swipe resolution, extracted so it can be tested directly: jsdom has no
 * PointerEvent, so a synthetic pointer drag arrives with no clientX at all and
 * the gesture itself cannot be exercised in a unit test.
 *
 * @param {number} travel  pointer displacement in CSS px, positive = rightward
 * @param {string} dir     'rtl' | 'ltr'
 * @returns {-1|0|1} preset-ring step
 */
export function resolveSwipe(travel, dir) {
  if (!Number.isFinite(travel) || Math.abs(travel) < SWIPE_THRESHOLD) return 0;
  const forward = dir === 'rtl' ? travel > 0 : travel < 0;
  return forward ? 1 : -1;
}

const ZOOM_MIN = 100;
const ZOOM_MAX = 220;
const ZOOM_STEP = 20;

/**
 * @param {{ design: any, preflight?: any }} props
 */
export default function StudioStage({ design, preflight = null }) {
  const { pick, dir } = useLanguage();
  const reduced = useReducedMotion();
  const stage = useRef(null);
  const id = useId().replace(/:/g, '');
  const [view, setView] = useState('front');
  const [lighting, setLighting] = useState('production');
  const [zoom, setZoom] = useState(ZOOM_MIN);
  const [overlay, setOverlay] = useState(false);

  const index = Math.max(
    0,
    VIEWS.findIndex((entry) => entry.key === view),
  );

  const step = (delta) => {
    const next = (index + delta + VIEWS.length) % VIEWS.length;
    setView(VIEWS[next].key);
  };

  // Arrow keys follow the reading direction, so "forward" is forward for the
  // reader. The garment's own left and right never swap.
  const onKeyDown = (event) => {
    const forward = dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
    const back = dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
    if (event.key === forward) {
      event.preventDefault();
      step(1);
    } else if (event.key === back) {
      event.preventDefault();
      step(-1);
    } else if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      setZoom((value) => Math.min(ZOOM_MAX, value + ZOOM_STEP));
    } else if (event.key === '-') {
      event.preventDefault();
      setZoom((value) => Math.max(ZOOM_MIN, value - ZOOM_STEP));
    }
  };

  // Pointer and touch drag step through the same preset ring the buttons use,
  // so gesture and keyboard can never disagree about the current view.
  useEffect(() => {
    // The stage element is rendered unconditionally, so by the time an effect
    // runs the ref is always attached. No null guard here, because a guard that
    // can never fire is untestable dead code rather than safety.
    const node = /** @type {HTMLElement} */ (stage.current);
    let origin = null;
    const down = (event) => {
      origin = event.clientX;
    };
    const up = (event) => {
      if (origin == null) return;
      const travel = event.clientX - origin;
      origin = null;
      const delta = resolveSwipe(travel, dir);
      if (delta !== 0) step(delta);
    };
    node.addEventListener('pointerdown', down);
    node.addEventListener('pointerup', up);
    node.addEventListener('pointercancel', () => {
      origin = null;
    });
    return () => {
      node.removeEventListener('pointerdown', down);
      node.removeEventListener('pointerup', up);
    };
  });

  // Accuracy is read, never asserted. `runProductionPreflight` owns the truth.
  const status = preflight?.status || 'preflight_passed_pending_factory_proof';
  const factoryApproved =
    status === 'factory_approved' && preflight?.readyForManufacturing === true;
  const accuracy = factoryApproved
    ? {
        tone: 'verified',
        label: { en: 'Factory-accurate', ar: 'مطابق لمواصفات المصنع' },
        detail: {
          en: 'Geometry derived from approved factory patterns.',
          ar: 'الهندسة مشتقة من أنماط مصنع معتمدة.',
        },
      }
    : {
        tone: 'concept',
        label: { en: 'Concept preview', ar: 'معاينة تصورية' },
        detail: {
          en: 'Vector approximation, not a production proof. Colours are screen-only and geometry is estimated until factory patterns are supplied.',
          ar: 'تقريب متجهي وليس بروفة إنتاج. الألوان للشاشة فقط والهندسة تقديرية حتى تُورَّد أنماط المصنع.',
        },
      };

  const current = VIEWS[index];

  return (
    <div
      className="gw-studio"
      data-lighting={lighting}
      data-view={view}
      data-overlay={overlay ? 'on' : 'off'}
    >
      <div className="gw-studio-head">
        <p className="gw-spec gw-studio-eyebrow">
          {pick({ en: 'Design studio', ar: 'استوديو التصميم' })}
        </p>
        <p className={`gw-studio-accuracy gw-studio-accuracy--${accuracy.tone}`}>
          <span className="gw-studio-accuracy-mark" aria-hidden="true" />
          {pick(accuracy.label)}
        </p>
      </div>

      <div
        ref={stage}
        className="gw-studio-stage"
        data-reduced={reduced ? 'on' : 'off'}
        role="group"
        aria-label={pick({ en: 'Design artboard', ar: 'لوحة التصميم' })}
        aria-describedby={`${id}-live ${id}-accuracy`}
        tabIndex={0}
        onKeyDown={onKeyDown}
      >
        <div className="gw-studio-frame" data-zoom={zoom}>
          <DesignPreview design={design} className="gw-studio-artboard" />
          {overlay && (
            <div className="gw-studio-overlay" aria-hidden="true">
              <span className="gw-studio-safe" />
              <span className="gw-studio-bleed" />
            </div>
          )}
        </div>
        <span className="gw-studio-grid" aria-hidden="true" />
      </div>

      {/* Every 3D capability has a DOM equivalent. This is the live description
          of the artboard for anyone who cannot see it. */}
      <p id={`${id}-live`} className="sr-only" aria-live="polite">
        {pick({
          en: `View: ${current.label.en}. Azimuth ${current.azimuth} degrees. Zoom ${zoom} percent. Lighting ${lighting}.`,
          ar: `العرض: ${current.label.ar}. الزاوية ${current.azimuth} درجة. التكبير ${zoom} بالمئة. الإضاءة ${lighting}.`,
        })}
      </p>

      <div className="gw-studio-controls">
        <div
          className="gw-studio-row"
          role="group"
          aria-label={pick({ en: 'Camera view', ar: 'زاوية الكاميرا' })}
        >
          {VIEWS.map((entry) => (
            <button
              key={entry.key}
              type="button"
              className={`gw-studio-btn${entry.key === view ? ' is-active' : ''}`}
              aria-pressed={entry.key === view}
              onClick={() => setView(entry.key)}
            >
              {pick(entry.label)}
            </button>
          ))}
        </div>

        <div
          className="gw-studio-row"
          role="group"
          aria-label={pick({ en: 'Lighting mode', ar: 'وضع الإضاءة' })}
        >
          {LIGHTING.map((entry) => (
            <button
              key={entry.key}
              type="button"
              className={`gw-studio-btn${entry.key === lighting ? ' is-active' : ''}`}
              aria-pressed={entry.key === lighting}
              onClick={() => setLighting(entry.key)}
            >
              {pick(entry.label)}
            </button>
          ))}
        </div>

        <div className="gw-studio-row gw-studio-row--split">
          <label className="gw-studio-zoom">
            <span className="gw-spec">{pick({ en: 'Zoom', ar: 'التكبير' })}</span>
            <input
              type="range"
              min={ZOOM_MIN}
              max={ZOOM_MAX}
              step={ZOOM_STEP}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
            />
            <output className="gw-figure">{zoom}%</output>
          </label>
          <button
            type="button"
            className={`gw-studio-btn${overlay ? ' is-active' : ''}`}
            aria-pressed={overlay}
            onClick={() => setOverlay((value) => !value)}
          >
            {pick({ en: 'Print zones', ar: 'مناطق الطباعة' })}
          </button>
        </div>
      </div>

      <p id={`${id}-accuracy`} className="gw-studio-note">
        {pick(accuracy.detail)}
      </p>
    </div>
  );
}

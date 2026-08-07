import { useCallback, useRef } from 'react';
import StaticMediaEngine from './StaticMediaEngine';

/**
 * Verified photographic 360 — requires a real aligned spinset (MIN_SPIN_FRAMES+).
 * Drag / swipe / keyboard. Never pads a single frame into a fake turntable.
 */
export default function Spin360Engine({
  frames,
  index,
  setIndex,
  alt,
  eager,
  pick,
  listId,
  onKeyDown,
}) {
  const drag = useRef({ active: false, startX: 0, startIndex: 0 });
  const count = frames.length;
  const safeIndex = count > 0 ? Math.min(index, count - 1) : 0;

  const scrub = useCallback(
    (clientX) => {
      if (!drag.current.active || count < 2) return;
      const delta = clientX - drag.current.startX;
      const steps = Math.round(delta / 8);
      const next = (drag.current.startIndex - steps + count * 100) % count;
      setIndex(next);
    },
    [count, setIndex],
  );

  const onPointerDown = (event) => {
    drag.current = { active: true, startX: event.clientX, startIndex: safeIndex };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const onPointerMove = (event) => scrub(event.clientX);
  const onPointerUp = (event) => {
    drag.current.active = false;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  return (
    <>
      <div
        className="gw-viewer-stage gw-viewer-stage--spin"
        role="group"
        aria-label={pick({ en: 'Product views', ar: 'عروض المنتج' })}
        aria-describedby={`${listId}-note`}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <StaticMediaEngine src={frames[safeIndex]} alt={alt} eager={eager} />
        <p className="gw-viewer-spin-hint" aria-hidden="true">
          {pick({ en: 'Drag to rotate', ar: 'اسحب للتدوير' })}
        </p>
      </div>
      <div
        className="gw-viewer-controls gw-viewer-controls--spin"
        role="tablist"
        aria-label={pick({ en: 'Choose a frame', ar: 'اختر إطارًا' })}
      >
        {frames.map((src, position) => (
          <button
            key={src}
            type="button"
            role="tab"
            aria-selected={position === safeIndex}
            className={`gw-viewer-tab${position === safeIndex ? ' is-active' : ''}`}
            onClick={() => setIndex(position)}
          >
            {position + 1}
          </button>
        ))}
      </div>
    </>
  );
}

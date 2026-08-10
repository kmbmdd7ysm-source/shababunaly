import { useCallback, useRef, type PointerEvent, type KeyboardEvent } from 'react';
import StaticMediaEngine from './StaticMediaEngine';

type PickFn = (value: { en?: string; ar?: string } | string) => string;

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
}: {
  frames: string[];
  index: number;
  setIndex: (n: number) => void;
  alt: string;
  eager?: boolean;
  pick: PickFn;
  listId: string;
  onKeyDown: (event: KeyboardEvent) => void;
}) {
  const drag = useRef({ active: false, startX: 0, startIndex: 0 });
  const count = frames.length;
  const safeIndex = count > 0 ? Math.min(index, count - 1) : 0;
  const current = frames[safeIndex];

  const scrub = useCallback(
    (clientX: number) => {
      if (!drag.current.active || count < 2) return;
      const delta = clientX - drag.current.startX;
      const steps = Math.round(delta / 8);
      const next = (drag.current.startIndex - steps + count * 100) % count;
      setIndex(next);
    },
    [count, setIndex],
  );

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    drag.current = { active: true, startX: event.clientX, startIndex: safeIndex };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => scrub(event.clientX);
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
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
        <StaticMediaEngine
          {...(current ? { src: current } : {})}
          alt={alt}
          {...(eager ? { eager } : {})}
        />
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

import Icon from '../icons/Icon';
import { useEffect, useRef, useState } from 'react';
import { lockDocumentScroll } from '../../utils/scrollLock';
export default function MediaLightbox({
  open,
  onClose,
  items,
  index = 0,
  onIndexChange,
  label = 'Media viewer',
}) {
  const dialog = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [i, setI] = useState(index);
  useEffect(() => setI(index), [index]);
  useEffect(() => {
    if (!open) return undefined;
    const old = document.activeElement;
    dialog.current?.focus();
    const key = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    document.addEventListener('keydown', key);
    const unlock = lockDocumentScroll();
    return () => {
      document.removeEventListener('keydown', key);
      unlock();
      if (old instanceof HTMLElement) old.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional dependency scope
  }, [open, i]);
  if (!open) return null;
  const go = (n) => {
    const x = (n + items.length) % items.length;
    setI(x);
    onIndexChange?.(x);
    setZoom(1);
  };
  const next = () => go(i + 1),
    prev = () => go(i - 1);
  return (
    <div
      className="media-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      ref={dialog}
      tabIndex="-1"
    >
      <button className="lightbox-close" onClick={onClose} aria-label="Close">
        <Icon name="close" />
      </button>
      <button className="lightbox-nav prev" onClick={prev} aria-label="Previous">
        <Icon name="previous" />
      </button>
      <div
        className="lightbox-stage"
        role="presentation"
        onDoubleClick={() => setZoom((z) => (z === 1 ? 2 : 1))}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') setZoom((z) => (z === 1 ? 2 : 1));
        }}
        onWheel={(e) => {
          e.preventDefault();
          setZoom((z) => Math.max(1, Math.min(3, z + (e.deltaY < 0 ? 0.25 : -0.25))));
        }}
      >
        <img
          src={items[i]}
          alt=""
          width="1600"
          height="2000"
          className={`lightbox-zoom-${Math.round(zoom * 100)}`}
          draggable="false"
          decoding="async"
        />
      </div>
      <button className="lightbox-nav next" onClick={next} aria-label="Next">
        <Icon name="next" />
      </button>
      <div className="lightbox-tools">
        <button onClick={() => setZoom((z) => Math.max(1, z - 0.25))} aria-label="Zoom out">
          <Icon name="minus" />
        </button>
        <span>
          {i + 1} / {items.length}
        </span>
        <button onClick={() => setZoom((z) => Math.min(3, z + 0.25))} aria-label="Zoom in">
          <Icon name="plus" />
        </button>
      </div>
    </div>
  );
}

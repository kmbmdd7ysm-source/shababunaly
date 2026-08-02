import { useEffect, useRef } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import Icon from '../icons/Icon';
import { lockDocumentScroll } from '../../utils/scrollLock';

// Accessible modal with focus handling + Escape to close + backdrop click.
export default function Modal({ open, onClose, title = '', children = null, labelledBy = '' }) {
  const { t } = useLanguage();
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    ref.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !ref.current) return;
      const focusable = [
        ...ref.current.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ].filter((node) => !node.hasAttribute('hidden'));
      if (!focusable.length) {
        e.preventDefault();
        ref.current.focus();
        return;
      }
      const first = /** @type {HTMLElement} */ (focusable[0]);
      const last = /** @type {HTMLElement} */ (focusable[focusable.length - 1]);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    const unlock = lockDocumentScroll();
    return () => {
      document.removeEventListener('keydown', onKey);
      unlock();
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy || undefined}
        aria-label={labelledBy ? undefined : title}
        ref={ref}
        tabIndex={-1}
      >
        <div className="modal-head">
          {title && <h2 className="modal-title">{title}</h2>}
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label={t.common.close}
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

import { useEffect, useRef, type KeyboardEvent, type ReactElement, type ReactNode } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import Icon from '../icons/Icon';
import { lockDocumentScroll } from '../../utils/scrollLock.ts';

export default function Modal({
  open,
  onClose,
  title = '',
  children = null,
  labelledBy = '',
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children?: ReactNode;
  labelledBy?: string;
}): ReactElement | null {
  const { t } = useLanguage();
  const common = (t.common || {}) as Record<string, string>;
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    ref.current?.focus();
    const onKey = (e: globalThis.KeyboardEvent) => {
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
      ].filter((node) => !node.hasAttribute('hidden')) as HTMLElement[];
      if (!focusable.length) {
        e.preventDefault();
        ref.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
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

  const dialogProps: Record<string, string | undefined> = {};
  if (labelledBy) dialogProps['aria-labelledby'] = labelledBy;
  else if (title) dialogProps['aria-label'] = title;

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        {...dialogProps}
        ref={ref}
        tabIndex={-1}
      >
        <div className="modal-head">
          {title ? <h2 className="modal-title">{title}</h2> : null}
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label={common.close || 'Close'}
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

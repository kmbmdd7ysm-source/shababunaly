let activeLocks = 0;

/**
 * Applies a reference-counted, class-based scroll lock without writing inline styles.
 * @returns {() => void}
 */
export function lockDocumentScroll() {
  if (typeof document === 'undefined') return () => {};
  activeLocks += 1;
  document.documentElement.classList.add('scroll-locked');
  document.body.classList.add('scroll-locked');
  let released = false;
  return () => {
    if (released) return;
    released = true;
    activeLocks = Math.max(0, activeLocks - 1);
    if (activeLocks === 0) {
      document.documentElement.classList.remove('scroll-locked');
      document.body.classList.remove('scroll-locked');
    }
  };
}

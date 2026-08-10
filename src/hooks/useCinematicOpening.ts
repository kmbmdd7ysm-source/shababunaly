import { useLayoutEffect } from 'react';

/*
 * Declares that this route opens with a full-bleed dark composition.
 * The shell reads `html[data-cinematic-open]`.
 * Uses layout effect so the header condensed flag can sync before paint.
 */
export function useCinematicOpening(active = true): void {
  useLayoutEffect(() => {
    if (!active) {
      delete document.documentElement.dataset.cinematicOpen;
      return undefined;
    }
    document.documentElement.dataset.cinematicOpen = 'yes';
    return () => {
      delete document.documentElement.dataset.cinematicOpen;
    };
  }, [active]);
}

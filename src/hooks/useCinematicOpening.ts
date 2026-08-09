import { useEffect } from 'react';

/*
 * Declares that this route opens with a full-bleed dark composition.
 * The shell reads `html[data-cinematic-open]`.
 */
export function useCinematicOpening(active = true): void {
  useEffect(() => {
    if (!active) return undefined;
    document.documentElement.dataset.cinematicOpen = 'yes';
    return () => {
      delete document.documentElement.dataset.cinematicOpen;
    };
  }, [active]);
}

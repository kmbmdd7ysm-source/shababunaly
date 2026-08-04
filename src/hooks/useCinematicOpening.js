import { useEffect } from 'react';

/*
 * Declares that this route opens with a full-bleed dark composition.
 *
 * The shell header floats over the page and is transparent at the top of the
 * scroll so a cinematic opening is not cut off by a bar. But its ink is light,
 * so over a light page a transparent header would be invisible. The shell
 * cannot guess — only the page knows what it opens with.
 *
 * A route calls this hook to declare it; the shell reads
 * `html[data-cinematic-open]`. Anything that does not declare it gets a solid
 * header and top padding, which is the safe default.
 */
export function useCinematicOpening(active = true) {
  useEffect(() => {
    if (!active) return undefined;
    document.documentElement.dataset.cinematicOpen = 'yes';
    return () => {
      delete document.documentElement.dataset.cinematicOpen;
    };
  }, [active]);
}

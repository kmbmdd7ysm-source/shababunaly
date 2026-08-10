import { useEffect, useState } from 'react';

export const CAPABILITY_ATTRIBUTE = 'data-capability';

const SLOW_CONNECTIONS = new Set(['slow-2g', '2g', '3g']);

/**
 * Resolve the rendering tier for this device.
 *
 *   a  full experience
 *   b  mid — heavy media withheld, quality reduced
 *   c  low — motion and heavy media withheld entirely
 *
 * Kept as a pure function of an injected navigator so every branch is
 * unit-testable without touching globals, and so the hook stays trivial.
 *
 * @param {any} [nav]
 * @returns {'a'|'b'|'c'}
 */
export function resolveCapabilityTier(
  nav?: {
    connection?: { saveData?: boolean; effectiveType?: string };
    deviceMemory?: number;
    hardwareConcurrency?: number;
  } | null,
) {
  const source = nav || {};
  const connection = source.connection || {};
  const memory = Number(source.deviceMemory) || 0;
  const cores = Number(source.hardwareConcurrency) || 0;
  const effectiveType = String(connection.effectiveType || '');

  if (connection.saveData === true) return 'c';
  if (memory > 0 && memory < 4) return 'c';
  if (cores > 0 && cores < 4) return 'c';
  if (SLOW_CONNECTIONS.has(effectiveType)) return 'c';
  if (memory > 0 && memory < 8) return 'b';
  return 'a';
}

/**
 * Resolve the tier once and publish it as an attribute on the document root so
 * that CSS alone can gate expensive work.
 *
 * Nothing here mutates inline styling. `scripts/lint-project.mjs` fails the
 * build on any inline style mutation in `src/`, and the CSP sets
 * `style-src-attr 'none'`, so capability-driven presentation travels through
 * an attribute and is read by stylesheets — which is also why it costs no
 * main-thread work.
 *
 * @returns {'a'|'b'|'c'}
 */
export function useDeviceCapability(): 'a' | 'b' | 'c' {
  const [tier, setTier] = useState<'a' | 'b' | 'c'>('a');

  useEffect(() => {
    const resolved = resolveCapabilityTier(globalThis.navigator);
    setTier(resolved);
    document.documentElement.setAttribute(CAPABILITY_ATTRIBUTE, resolved);
  }, []);

  return tier;
}

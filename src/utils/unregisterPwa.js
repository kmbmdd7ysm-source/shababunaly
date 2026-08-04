/*
 * Review-build service-worker purge.
 *
 * A reviewer's browser may already carry a worker and its caches from an
 * earlier session on the same origin. Simply not registering a new one is not
 * enough — the previously installed worker stays in control and keeps serving
 * its cached app shell, which is exactly how the preview came to show an old
 * build.
 *
 * This removes every registration for the origin and deletes every cache the
 * site created, then reloads once if a worker was actually in control, so the
 * page is repainted from the network rather than from the worker that was
 * controlling it at load time.
 *
 * Only ever called from a build with VITE_SHOW_BUILD_MARKER set. Production
 * keeps its offline support untouched.
 */
const RELOAD_FLAG = 'shababuna-sw-purged';

export async function purgeServiceWorkers() {
  if (!('serviceWorker' in navigator)) return;

  const wasControlled = Boolean(navigator.serviceWorker.controller);

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  } catch {
    /* Nothing to do: an origin with no registrations throws in some browsers. */
  }

  try {
    if ('caches' in globalThis) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch {
    /* Cache Storage can be unavailable in private modes. Not fatal. */
  }

  /*
   * A controlled page is still being served by the worker we just removed.
   * Reload once — guarded by sessionStorage so this can never loop — so the
   * reviewer sees the network's response.
   */
  if (wasControlled && !sessionStorage.getItem(RELOAD_FLAG)) {
    sessionStorage.setItem(RELOAD_FLAG, '1');
    globalThis.location.reload();
  }
}

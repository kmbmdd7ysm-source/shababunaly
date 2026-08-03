import { reportClientError } from '../services/telemetry';
const listeners = new Set();
let registration = null,
  deferredPrompt = null;

/*
 * `controllerchange` fires in TWO different situations and they must not be
 * treated the same:
 *
 *   1. FIRST CONTROL — the page loaded with no controller, registered a worker,
 *      and that worker activated and claimed the page. Nothing about the app
 *      changed. Reloading here throws away whatever the visitor was doing, and
 *      because registration is triggered by the first pointerdown, it lands
 *      mid-interaction on their very first tap.
 *
 *   2. GENUINE UPDATE — a waiting worker replaced the active one after the
 *      visitor asked for it. Reloading here is correct and expected.
 *
 * The discriminator is whether a controller already existed when we registered.
 * We additionally require that the swap was *requested*, so a reload can only
 * ever follow a deliberate action and a loop is structurally impossible.
 */
let hadControllerAtRegistration = false;
let updateRequested = false;
export const onPwaEvent = (fn) => (listeners.add(fn), () => listeners.delete(fn));
const emit = (type, detail = {}) => listeners.forEach((fn) => fn({ type, ...detail }));
export function registerPwa() {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;
  addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    emit('install-available');
  });
  addEventListener('appinstalled', () => {
    deferredPrompt = null;
    emit('installed');
  });
  hadControllerAtRegistration = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker
    .register(`/sw.js?v=${encodeURIComponent(import.meta.env.VITE_BUILD_ID || 'dev')}`, {
      scope: '/',
    })
    .then((reg) => {
      registration = reg;
      if (reg.waiting) emit('update-ready', { registration: reg });
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        w?.addEventListener('statechange', () => {
          if (w.state === 'installed' && navigator.serviceWorker.controller)
            emit('update-ready', { registration: reg });
        });
      });
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // `first-control` is informational only. Consumers must never reload on
        // it; see the comment above.
        emit('controller-changed', {
          reason: hadControllerAtRegistration && updateRequested ? 'update' : 'first-control',
        });
      });
    })
    .catch((error) => reportClientError(error, { source: 'pwa_registration' }));
}
export async function promptInstall() {
  if (!deferredPrompt) return false;
  await deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  return outcome === 'accepted';
}
export function applyPwaUpdate() {
  const w = registration?.waiting;
  if (!w) return false;
  // Mark the swap as deliberate BEFORE asking for it, so the resulting
  // controllerchange is correctly classified as an update.
  updateRequested = true;
  w.postMessage({ type: 'SKIP_WAITING' });
  return true;
}

/** Test seam: reset module state between cases. */
export function __resetPwaStateForTests() {
  registration = null;
  deferredPrompt = null;
  hadControllerAtRegistration = false;
  updateRequested = false;
  listeners.clear();
}
export const isStandalone = () =>
  matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

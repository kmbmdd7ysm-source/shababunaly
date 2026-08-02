import { reportClientError } from '../services/telemetry';
const listeners = new Set();
let registration = null,
  deferredPrompt = null;
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
  navigator.serviceWorker
    .register(`/sw.js?v=${encodeURIComponent(import.meta.env.VITE_BUILD_ID || 'dev')}`, { scope: '/' })
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
      navigator.serviceWorker.addEventListener('controllerchange', () =>
        emit('controller-changed'),
      );
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
  if (w) w.postMessage({ type: 'SKIP_WAITING' });
}
export const isStandalone = () =>
  matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

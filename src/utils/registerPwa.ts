import { reportClientError } from '../services/telemetry.ts';

type PwaListener = (event: { type: string; [key: string]: unknown }) => void;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const listeners = new Set<PwaListener>();
let registration: ServiceWorkerRegistration | null = null;
let deferredPrompt: BeforeInstallPromptEvent | null = null;

/*
 * `controllerchange` fires in TWO different situations and they must not be
 * treated the same — see historical comment in git history.
 */
let hadControllerAtRegistration = false;
let updateRequested = false;

export const onPwaEvent = (fn: PwaListener) => (
  listeners.add(fn),
  () => {
    listeners.delete(fn);
  }
);

const emit = (type: string, detail: Record<string, unknown> = {}) =>
  listeners.forEach((fn) => fn({ type, ...detail }));

export function registerPwa(): void {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;
  addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    emit('install-available');
  });
  addEventListener('appinstalled', () => {
    deferredPrompt = null;
    emit('installed');
  });
  hadControllerAtRegistration = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker
    .register(`/sw.js?v=${encodeURIComponent(String(import.meta.env.VITE_BUILD_ID || 'dev'))}`, {
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
        emit('controller-changed', {
          reason: hadControllerAtRegistration && updateRequested ? 'update' : 'first-control',
        });
      });
    })
    .catch((error: unknown) => reportClientError(error, { source: 'pwa_registration' }));
}

export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  await deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  return outcome === 'accepted';
}

export function applyPwaUpdate(): boolean {
  const w = registration?.waiting;
  if (!w) return false;
  updateRequested = true;
  w.postMessage({ type: 'SKIP_WAITING' });
  return true;
}

/** Test seam: reset module state between cases. */
export function __resetPwaStateForTests(): void {
  registration = null;
  deferredPrompt = null;
  hadControllerAtRegistration = false;
  updateRequested = false;
  listeners.clear();
}

export const isStandalone = (): boolean =>
  matchMedia('(display-mode: standalone)').matches ||
  Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

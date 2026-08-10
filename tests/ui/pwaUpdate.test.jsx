import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

/*
 * Regression tests for the service-worker update flow.
 *
 * The defect: `controllerchange` fires both when a worker first claims an
 * uncontrolled page and when a genuine update replaces the active worker. The
 * old code reloaded on both. Because registration is triggered by the first
 * pointerdown, that meant the visitor's very first tap reloaded the page and
 * discarded cart, Customize and form state.
 *
 * These tests pin the discriminator so it cannot regress.
 */

let listeners;
let swListeners;
let registerCalls;
let postedMessages;

function installServiceWorkerMock({ controller = null, waiting = null } = {}) {
  swListeners = {};
  registerCalls = [];
  postedMessages = [];
  const registration = {
    waiting,
    addEventListener: vi.fn(),
  };
  const serviceWorker = {
    controller,
    register: (...args) => {
      registerCalls.push(args);
      return Promise.resolve(registration);
    },
    addEventListener: (type, handler) => {
      swListeners[type] = handler;
    },
  };
  Object.defineProperty(navigator, 'serviceWorker', {
    value: serviceWorker,
    configurable: true,
    writable: true,
  });
  if (waiting) waiting.postMessage = (message) => postedMessages.push(message);
  return { registration, serviceWorker };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('service-worker update flow', () => {
  let originalDev;

  beforeEach(() => {
    listeners = [];
    vi.resetModules();
    // `registerPwa` deliberately no-ops in dev so a worker is never installed
    // during local development. Production behaviour is what is under test.
    originalDev = import.meta.env.DEV;
    import.meta.env.DEV = false;
  });

  afterEach(() => {
    listeners = [];
    import.meta.env.DEV = originalDev;
  });

  test('a worker claiming an UNCONTROLLED page reports first-control, never update', async () => {
    installServiceWorkerMock({ controller: null });
    const mod = await import('../../src/utils/registerPwa.js');
    mod.onPwaEvent((event) => listeners.push(event));
    mod.registerPwa();
    await flush();

    swListeners.controllerchange();

    const events = listeners.filter((e) => e.type === 'controller-changed');
    expect(events).toHaveLength(1);
    expect(events[0].reason).toBe('first-control');
  });

  test('a controllerchange with an existing controller but NO requested update is still first-control', async () => {
    installServiceWorkerMock({ controller: {} });
    const mod = await import('../../src/utils/registerPwa.js');
    mod.onPwaEvent((event) => listeners.push(event));
    mod.registerPwa();
    await flush();

    swListeners.controllerchange();

    expect(listeners.at(-1).reason).toBe('first-control');
  });

  test('only a deliberate applyPwaUpdate on a controlled page reports update', async () => {
    const waiting = {};
    installServiceWorkerMock({ controller: {}, waiting });
    const mod = await import('../../src/utils/registerPwa.js');
    mod.onPwaEvent((event) => listeners.push(event));
    mod.registerPwa();
    await flush();

    expect(mod.applyPwaUpdate()).toBe(true);
    expect(postedMessages).toEqual([{ type: 'SKIP_WAITING' }]);

    swListeners.controllerchange();
    expect(listeners.at(-1).reason).toBe('update');
  });

  test('applyPwaUpdate with nothing waiting does nothing and cannot arm a reload', async () => {
    installServiceWorkerMock({ controller: {}, waiting: null });
    const mod = await import('../../src/utils/registerPwa.js');
    mod.onPwaEvent((event) => listeners.push(event));
    mod.registerPwa();
    await flush();

    expect(mod.applyPwaUpdate()).toBe(false);
    swListeners.controllerchange();
    expect(listeners.at(-1).reason).toBe('first-control');
  });
});

describe('PwaPrompt reload policy', () => {
  let reloadSpy;
  let emit;

  beforeEach(async () => {
    vi.resetModules();
    reloadSpy = vi.fn();
    // jsdom forbids assigning location.reload directly.
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload: reloadSpy },
      configurable: true,
      writable: true,
    });
    vi.doMock('../../src/utils/registerPwa', () => ({
      onPwaEvent: (fn) => {
        emit = fn;
        return () => {};
      },
      promptInstall: vi.fn(),
      applyPwaUpdate: vi.fn(),
      isStandalone: () => false,
    }));
    vi.doMock('../../src/context/LanguageContext', () => ({
      useLanguage: () => ({ pick: (value) => (value && value.en) || value, lang: 'en' }),
    }));
  });

  const renderPrompt = async () => {
    const { render } = await import('@testing-library/react');
    const { default: PwaPrompt } = await import('../../src/components/pwa/PwaPrompt');
    return render(<PwaPrompt />);
  };

  test('first-control never reloads — the visitor keeps their state', async () => {
    await renderPrompt();
    emit({ type: 'controller-changed', reason: 'first-control' });
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  test('a controller-changed with no reason at all never reloads', async () => {
    await renderPrompt();
    emit({ type: 'controller-changed' });
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  test('a deliberate update reloads exactly once, however many events arrive', async () => {
    await renderPrompt();
    emit({ type: 'controller-changed', reason: 'update' });
    emit({ type: 'controller-changed', reason: 'update' });
    emit({ type: 'controller-changed', reason: 'update' });
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  test('an update never reloads while a form field has focus', async () => {
    const { container } = await renderPrompt();
    const form = document.createElement('form');
    const input = document.createElement('input');
    form.appendChild(input);
    container.appendChild(form);
    input.focus();

    emit({ type: 'controller-changed', reason: 'update' });
    expect(reloadSpy).not.toHaveBeenCalled();
  });
});

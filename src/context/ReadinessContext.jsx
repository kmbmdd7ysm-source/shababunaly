import { createContext, useContext, useEffect, useMemo, useState } from 'react';

function validHttps(value) {
  try {
    return new URL(String(value || '')).protocol === 'https:';
  } catch {
    return false;
  }
}

export function getProductionReadiness() {
  const isLocal = ['localhost', '127.0.0.1', '::1'].includes(globalThis.location?.hostname || '');
  if (!import.meta.env.PROD || isLocal) {
    return { ready: true, needsServerCheck: false, missing: [] };
  }
  const missing = [];
  if (!validHttps(import.meta.env.VITE_SUPABASE_URL)) missing.push('account_service');
  if (!String(import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()) missing.push('account_key');
  if (!String(import.meta.env.VITE_TURNSTILE_SITE_KEY || '').trim()) missing.push('request_verification');
  if (!validHttps(import.meta.env.VITE_FORM_ENDPOINT || 'https://formspree.io/f/mqerbqvd')) {
    missing.push('message_delivery');
  }
  return { ready: missing.length === 0, needsServerCheck: missing.length === 0, missing };
}

const ReadinessContext = createContext({
  state: 'ready',
  open: false,
  dismiss: () => {},
});

export function ReadinessProvider({ children }) {
  const localReadiness = useMemo(() => getProductionReadiness(), []);
  const [state, setState] = useState(() =>
    localReadiness.ready && localReadiness.needsServerCheck
      ? 'checking'
      : localReadiness.ready
        ? 'ready'
        : 'degraded',
  );
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem('shababuna-readiness-dismissed') === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!localReadiness.needsServerCheck) return undefined;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    fetch('/api/readiness', {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => ({
        response,
        payload: await response.json().catch(() => ({})),
      }))
      .then(({ response, payload }) =>
        setState(response.ok && payload?.ready === true ? 'ready' : 'degraded'),
      )
      .catch(() => setState('degraded'))
      .finally(() => clearTimeout(timeout));
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [localReadiness.needsServerCheck]);

  useEffect(() => {
    document.documentElement.dataset.cloudReadiness = state;
    return () => {
      delete document.documentElement.dataset.cloudReadiness;
    };
  }, [state]);

  const open = state === 'degraded' && !dismissed;

  useEffect(() => {
    document.documentElement.dataset.sysBanner = open ? 'open' : 'closed';
    return () => {
      delete document.documentElement.dataset.sysBanner;
    };
  }, [open]);

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem('shababuna-readiness-dismissed', '1');
    } catch {
      /* private mode */
    }
  };

  const value = useMemo(() => ({ state, open, dismiss }), [state, open]);

  return <ReadinessContext.Provider value={value}>{children}</ReadinessContext.Provider>;
}

export function useReadiness() {
  return useContext(ReadinessContext);
}

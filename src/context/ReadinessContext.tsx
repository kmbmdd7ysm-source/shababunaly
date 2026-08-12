import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type ReadinessState = 'ready' | 'checking' | 'degraded';

export type ReadinessContextValue = {
  state: ReadinessState;
  open: boolean;
  dismiss: () => void;
  readiness?: Record<string, unknown>;
};

function validHttps(value: unknown): boolean {
  try {
    return new URL(String(value || '')).protocol === 'https:';
  } catch {
    return false;
  }
}

export function getProductionReadiness(): {
  ready: boolean;
  needsServerCheck: boolean;
  missing: string[];
} {
  const isLocal = ['localhost', '127.0.0.1', '::1'].includes(globalThis.location?.hostname || '');
  if (!import.meta.env.PROD || isLocal) {
    return { ready: true, needsServerCheck: false, missing: [] };
  }
  const missing: string[] = [];
  if (!validHttps(import.meta.env.VITE_SUPABASE_URL)) missing.push('account_service');
  if (!String(import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()) missing.push('account_key');
  if (!String(import.meta.env.VITE_TURNSTILE_SITE_KEY || '').trim())
    missing.push('request_verification');
  if (!validHttps('https://formspree.io/f/mvzenjgv')) {
    missing.push('message_delivery');
  }
  return { ready: missing.length === 0, needsServerCheck: missing.length === 0, missing };
}

const ReadinessContext = createContext<ReadinessContextValue>({
  state: 'ready',
  open: false,
  dismiss: () => undefined,
});

export function ReadinessProvider({ children }: { children?: ReactNode }) {
  const localReadiness = useMemo(() => getProductionReadiness(), []);
  // When a server check is required, start degraded so the banner occupies
  // document flow from the first paint. Flipping checking→degraded after fetch
  // was shifting main content (~0.05–0.17 CLS on home).
  const [state, setState] = useState<ReadinessState>(() =>
    localReadiness.ready && localReadiness.needsServerCheck
      ? 'degraded'
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
        payload: (await response.json().catch(() => ({}))) as { ready?: boolean },
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

  // Show the operational warning only while the deployment is actually degraded.
  // The previous latched behavior kept the warning visible even after /api/readiness
  // confirmed a healthy production environment.
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

  const value = useMemo<ReadinessContextValue>(
    () => ({ state, open, dismiss, readiness: localReadiness }),
    [state, open, localReadiness],
  );

  return <ReadinessContext.Provider value={value}>{children}</ReadinessContext.Provider>;
}

export function useReadiness(): ReadinessContextValue {
  return useContext(ReadinessContext);
}

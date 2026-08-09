const MAX_MESSAGE = 600;
const MAX_CONTEXT_KEYS = 24;

const clean = (value, max = MAX_MESSAGE) =>
  String(value ?? '')
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[email]')
    .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, '[phone]')
    .replace(/(access|refresh|service|secret|password|token)[=:][^\s,&]+/gi, '$1=[redacted]')
    .slice(0, max);

function sanitizeContext(context) {
  if (!context || typeof context !== 'object') return {};
  return Object.fromEntries(
    Object.entries(context)
      .slice(0, MAX_CONTEXT_KEYS)
      .map(([key, value]) => {
        if (/password|token|secret|address|email|phone|whatsapp/i.test(key))
          return [key, '[redacted]'];
        if (value == null || typeof value === 'number' || typeof value === 'boolean')
          return [key, value];
        return [key, clean(Array.isArray(value) ? value.join(',') : value, 300)];
      }),
  );
}

export function reportClientError(error, context = {}) {
  const payload = {
    event: 'client_error',
    name: clean(error?.name || 'Error', 100),
    message: clean(error?.message || error || 'Unknown error'),
    code: clean(error?.code || '', 100),
    path: clean(globalThis.location?.pathname || '', 250),
    context: sanitizeContext(context),
    occurredAt: new Date().toISOString(),
  };
  try {
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/client-error', new Blob([body], { type: 'application/json' }));
      return;
    }
    void fetch('/api/client-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      keepalive: true,
      body,
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}

export function installGlobalErrorMonitoring() {
  if (globalThis.__shababunaErrorMonitoringInstalled) return;
  globalThis.__shababunaErrorMonitoringInstalled = true;
  globalThis.addEventListener?.('error', (event) =>
    reportClientError(event.error || event.message, { source: 'window.error' }),
  );
  globalThis.addEventListener?.('unhandledrejection', (event) =>
    reportClientError(event.reason, { source: 'unhandledrejection' }),
  );
}

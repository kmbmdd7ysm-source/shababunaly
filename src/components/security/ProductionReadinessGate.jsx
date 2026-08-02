import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';

function validHttps(value) {
  try { return new URL(String(value || '')).protocol === 'https:'; }
  catch { return false; }
}

export function getProductionReadiness() {
  const isLocal = ['localhost', '127.0.0.1', '::1'].includes(globalThis.location?.hostname || '');
  if (!import.meta.env.PROD || isLocal) return { ready: true, needsServerCheck: false, missing: [] };
  const missing = [];
  if (!validHttps(import.meta.env.VITE_SUPABASE_URL)) missing.push('account_service');
  if (!String(import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()) missing.push('account_key');
  if (!String(import.meta.env.VITE_TURNSTILE_SITE_KEY || '').trim()) missing.push('request_verification');
  if (!validHttps(import.meta.env.VITE_FORM_ENDPOINT || 'https://formspree.io/f/mvzenjgv')) missing.push('message_delivery');
  return { ready: missing.length === 0, needsServerCheck: missing.length === 0, missing };
}

export default function ProductionReadinessGate({ children }) {
  const { pick } = useLanguage();
  const localReadiness = useMemo(() => getProductionReadiness(), []);
  const [state, setState] = useState(() => localReadiness.ready && localReadiness.needsServerCheck ? 'checking' : localReadiness.ready ? 'ready' : 'degraded');
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!localReadiness.needsServerCheck) return undefined;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    fetch('/api/readiness', { headers: { Accept: 'application/json' }, credentials: 'same-origin', cache: 'no-store', signal: controller.signal })
      .then(async (response) => ({ response, payload: await response.json().catch(() => ({})) }))
      .then(({ response, payload }) => setState(response.ok && payload?.ready === true ? 'ready' : 'degraded'))
      .catch(() => setState('degraded'))
      .finally(() => clearTimeout(timeout));
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [localReadiness.needsServerCheck]);

  useEffect(() => {
    document.documentElement.dataset.cloudReadiness = state;
    return () => { delete document.documentElement.dataset.cloudReadiness; };
  }, [state]);

  return (
    <>
      {state === 'degraded' && !dismissed && (
        <div className="notice notice--info production-readiness-notice" role="status">
          <span>{pick({
            en: 'The store is available. Some account, payment or message services are temporarily unavailable until their secure connection is restored.',
            ar: 'المتجر متاح. قد تكون بعض خدمات الحساب أو الدفع أو الرسائل غير متاحة مؤقتًا إلى أن يعود الاتصال الآمن بها.',
          })}</span>
          <button type="button" className="link-btn" onClick={() => setDismissed(true)}>
            {pick({ en: 'Dismiss', ar: 'إغلاق' })}
          </button>
        </div>
      )}
      {children}
    </>
  );
}

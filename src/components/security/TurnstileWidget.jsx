import { useEffect, useRef } from 'react';

const SITE_KEY = String(import.meta.env.VITE_TURNSTILE_SITE_KEY || '').trim();

export default function TurnstileWidget({ onToken, language = 'en', action = 'form-submit' }) {
  const host = useRef(null);
  useEffect(() => {
    if (!SITE_KEY) {
      if (import.meta.env.DEV) onToken?.('test-pass');
      return undefined;
    }
    let widgetId;
    let cancelled = false;
    const render = () => {
      if (cancelled || !host.current || !globalThis.turnstile) return;
      widgetId = globalThis.turnstile.render(host.current, {
        sitekey: SITE_KEY,
        language: language === 'ar' ? 'ar' : 'en',
        theme: 'light',
        action: String(action || 'form-submit').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32),
        callback: (token) => onToken?.(token),
        'expired-callback': () => onToken?.(''),
        'error-callback': () => onToken?.(''),
      });
    };
    const existing = document.querySelector('script[data-shababuna-turnstile]');
    if (existing) {
      if (globalThis.turnstile) render();
      else existing.addEventListener('load', render, { once: true });
    } else {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.dataset.shababunaTurnstile = '1';
      script.addEventListener('load', render, { once: true });
      document.head.appendChild(script);
    }
    return () => {
      cancelled = true;
      if (widgetId != null && globalThis.turnstile) globalThis.turnstile.remove(widgetId);
    };
  }, [action, language, onToken]);

  if (!SITE_KEY && !import.meta.env.DEV) return <p className="form-status form-status--error" role="alert">Request verification is temporarily unavailable.</p>;
  return <div className="turnstile-wrap" ref={host} aria-label="Bot verification" />;
}

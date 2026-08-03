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
        action: String(action || 'form-submit')
          .replace(/[^A-Za-z0-9_-]/g, '')
          .slice(0, 32),
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

  // When no site key is configured, verification genuinely is unavailable and
  // we must keep saying so — the server still rejects a request with no token,
  // and pretending otherwise would misrepresent a security control.
  //
  // But this rendered as a red `role="alert"` inside the footer newsletter,
  // which appears on EVERY route. Two consequences: a permanent error box on
  // every page of the site, and an unprompted live-region announcement fired at
  // screen-reader users on every single navigation for something they never
  // did. It is a standing condition, not an event, so it is now a quiet
  // `role="status"` note. The behaviour and the wording are unchanged.
  if (!SITE_KEY && !import.meta.env.DEV)
    return (
      <p className="gw-verify-note" role="status">
        Request verification is temporarily unavailable.
      </p>
    );
  return <div className="turnstile-wrap" ref={host} aria-label="Bot verification" />;
}

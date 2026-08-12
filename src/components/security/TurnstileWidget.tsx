import { useEffect, useRef } from 'react';

const SITE_KEY = String(import.meta.env.VITE_TURNSTILE_SITE_KEY || '').trim();

type TurnstileApi = {
  render: (
    host: HTMLElement,
    options: Record<string, unknown>,
  ) => string | number;
  remove: (widgetId: string | number) => void;
};

export default function TurnstileWidget({
  onToken,
  language = 'en',
  action = 'form-submit',
  optionalWhenUnconfigured = false,
}: {
  onToken?: (token: string) => void;
  language?: string;
  action?: string;
  optionalWhenUnconfigured?: boolean;
}) {
  const host = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!SITE_KEY) {
      if (import.meta.env.DEV) onToken?.('test-pass');
      else if (optionalWhenUnconfigured) onToken?.('verification-not-configured');
      return undefined;
    }
    let widgetId: string | number | undefined;
    let cancelled = false;
    const turnstile = (globalThis as typeof globalThis & { turnstile?: TurnstileApi }).turnstile;
    const render = () => {
      const api = (globalThis as typeof globalThis & { turnstile?: TurnstileApi }).turnstile;
      if (cancelled || !host.current || !api) return;
      widgetId = api.render(host.current, {
        sitekey: SITE_KEY,
        language: language === 'ar' ? 'ar' : 'en',
        theme: 'light',
        action: String(action || 'form-submit')
          .replace(/[^A-Za-z0-9_-]/g, '')
          .slice(0, 32),
        callback: (token: string) => onToken?.(token),
        'expired-callback': () => onToken?.(''),
        'error-callback': () => onToken?.(''),
      });
    };
    const existing = document.querySelector('script[data-shababuna-turnstile]');
    if (existing) {
      if (turnstile) render();
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
      const api = (globalThis as typeof globalThis & { turnstile?: TurnstileApi }).turnstile;
      if (widgetId != null && api) api.remove(widgetId);
    };
  }, [action, language, onToken, optionalWhenUnconfigured]);

  if (!SITE_KEY && !import.meta.env.DEV) {
    if (optionalWhenUnconfigured) return null;
    return (
      <p className="gw-verify-note" role="status">
        Request verification is temporarily unavailable.
      </p>
    );
  }
  return <div className="turnstile-wrap" ref={host} aria-label="Bot verification" />;
}

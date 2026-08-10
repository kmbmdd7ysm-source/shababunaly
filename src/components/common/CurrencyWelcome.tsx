import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { useCommerce } from '../../context/CommerceContext';
import { useLanguage } from '../../context/LanguageContext';
import { STORAGE_KEYS } from '../../config';

export default function CurrencyWelcome(): ReactElement | null {
  const { currency, setCurrency, setCountryCode } = useCommerce();
  const { pick } = useLanguage();
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.welcome) !== 'done';
    } catch {
      return true;
    }
  });
  const [suggested, setSuggested] = useState(currency);

  useEffect(() => {
    if (!open) return undefined;
    const controller = new AbortController();
    fetch('/api/geo', { cache: 'no-store', signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((geo) => {
        const inLibya = geo?.country === 'LY';
        // Only suggest — do not mutate live commerce state until the shopper confirms.
        // Applying currency/country here caused homepage price/layout CLS.
        setSuggested(inLibya ? 'LYD' : 'USD');
        try {
          sessionStorage.setItem(
            'shababuna-geo-suggest',
            JSON.stringify({
              currency: inLibya ? 'LYD' : 'USD',
              country: inLibya ? 'LY' : geo?.country || 'US',
            }),
          );
        } catch {
          /* ignore */
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [open]);

  if (!open) return null;
  const confirm = (value: string) => {
    setCurrency(value);
    try {
      const suggestedGeo = JSON.parse(sessionStorage.getItem('shababuna-geo-suggest') || '{}');
      if (suggestedGeo?.country) setCountryCode(String(suggestedGeo.country));
      else if (value === 'LYD') setCountryCode('LY');
      localStorage.setItem(STORAGE_KEYS.welcome, 'done');
    } catch {
      if (value === 'LYD') setCountryCode('LY');
    }
    setOpen(false);
  };

  return (
    <div
      className="commerce-welcome"
      role="dialog"
      aria-modal="true"
      aria-labelledby="commerce-welcome-title"
    >
      <div className="commerce-welcome-backdrop" />
      <div className="commerce-welcome-panel">
        <img
          src="/brand/shababuna-wordmark-black.png"
          alt="Shababuna"
          className="commerce-welcome-logo"
          width={244}
          height={68}
        />
        <p className="section-label">BUILT DIFFERENT.</p>
        <h2 id="commerce-welcome-title">
          {pick({ en: 'Choose your currency', ar: 'اختر العملة' })}
        </h2>
        <p>
          {pick({
            en: 'Prices are stored in USD and converted using the current Shababuna rate.',
            ar: 'الأسعار محفوظة بالدولار ويتم تحويلها حسب سعر الصرف المعتمد في شبابنا.',
          })}
        </p>
        <div className="currency-welcome-options">
          <button
            type="button"
            className={suggested === 'LYD' ? 'recommended' : ''}
            onClick={() => confirm('LYD')}
          >
            <strong>LYD</strong>
            <span>{pick({ en: 'Libyan Dinar', ar: 'الدينار الليبي' })}</span>
            {suggested === 'LYD' && (
              <small>{pick({ en: 'Recommended for Libya', ar: 'مقترح لليبيا' })}</small>
            )}
          </button>
          <button
            type="button"
            className={suggested === 'USD' ? 'recommended' : ''}
            onClick={() => confirm('USD')}
          >
            <strong>USD</strong>
            <span>{pick({ en: 'US Dollar', ar: 'الدولار الأمريكي' })}</span>
            {suggested === 'USD' && (
              <small>{pick({ en: 'Recommended outside Libya', ar: 'مقترح خارج ليبيا' })}</small>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

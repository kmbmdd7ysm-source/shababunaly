import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCookies } from '../../context/CookieContext';
import { useLanguage } from '../../context/LanguageContext';

export default function CookieBanner() {
  const { consent, save, preferencesOpen, openPreferences, closePreferences } = useCookies();
  const { t } = useLanguage();
  const [manage, setManage] = useState(false);
  const [analytics, setAnalytics] = useState(Boolean(consent?.analytics));
  const dialogRef = useRef(null);
  const visible = !consent || preferencesOpen;

  useEffect(() => {
    if (preferencesOpen) {
      setManage(true);
      setAnalytics(Boolean(consent?.analytics));
    }
  }, [preferencesOpen, consent]);

  useEffect(() => {
    if (!visible) return undefined;
    const previous = document.activeElement;
    dialogRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape' && consent) closePreferences();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [visible, consent, closePreferences]);

  if (!visible) return null;
  return (
    <section
      ref={dialogRef}
      tabIndex={-1}
      className="cookie-banner"
      role="dialog"
      aria-modal="true"
      aria-label={t.a11y.cookieDialog}
    >
      <div className="cookie-banner-inner">
        <div className="cookie-banner-text">
          <h2>{t.cookie.title}</h2>
          <p>
            {t.cookie.text} <Link to="/cookies">{t.nav.cookies}</Link>
          </p>
        </div>
        {manage && (
          <div className="cookie-options">
            <label className="cookie-option">
              <input type="checkbox" checked disabled />
              <span>
                <b>{t.cookie.necessary}</b>
                <small>{t.cookie.always}</small>
              </span>
            </label>
            <label className="cookie-option">
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
              />
              <span>
                <b>{t.cookie.analytics}</b>
                <small>{t.cookie.analyticsHelp}</small>
              </span>
            </label>
          </div>
        )}
        <div className="cookie-buttons">
          <button className="btn-primary" onClick={() => save(true)}>
            {t.cookie.accept}
          </button>
          <button className="btn-secondary" onClick={() => save(false)}>
            {t.cookie.reject}
          </button>
          {manage ? (
            <button className="btn-secondary" onClick={() => save(analytics)}>
              {t.cookie.save}
            </button>
          ) : (
            <button
              className="btn-secondary"
              onClick={() => {
                setManage(true);
                openPreferences();
              }}
            >
              {t.cookie.manage}
            </button>
          )}
          {consent && (
            <button className="btn-ghost" onClick={closePreferences}>
              {t.cookie.close}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

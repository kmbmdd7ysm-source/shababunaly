import { useEffect, useRef, useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { useCookies } from '../../context/CookieContext';
import { useLanguage } from '../../context/LanguageContext';

export default function CookieBanner(): ReactElement | null {
  const { consent, save, preferencesOpen, openPreferences, closePreferences } = useCookies();
  const { t } = useLanguage();
  const cookie = (t.cookie || {}) as Record<string, string>;
  const a11y = (t.a11y || {}) as Record<string, string>;
  const nav = (t.nav || {}) as Record<string, string>;
  const [manage, setManage] = useState(false);
  const [analytics, setAnalytics] = useState(Boolean(consent?.analytics));
  const dialogRef = useRef<HTMLDivElement | null>(null);
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
    const onKey = (e: globalThis.KeyboardEvent) => {
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
      aria-label={a11y.cookieDialog}
    >
      <div className="cookie-banner-inner">
        <div className="cookie-banner-text">
          <h2>{cookie.title}</h2>
          <p>
            {cookie.text} <Link to="/cookies">{nav.cookies}</Link>
          </p>
        </div>
        {manage && (
          <div className="cookie-options">
            <label className="cookie-option">
              <input type="checkbox" checked disabled />
              <span>
                <b>{cookie.necessary}</b>
                <small>{cookie.always}</small>
              </span>
            </label>
            <label className="cookie-option">
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
              />
              <span>
                <b>{cookie.analytics}</b>
                <small>{cookie.analyticsHelp}</small>
              </span>
            </label>
          </div>
        )}
        <div className="cookie-buttons">
          <button className="btn-primary" onClick={() => save(true)}>
            {cookie.accept}
          </button>
          <button className="btn-secondary" onClick={() => save(false)}>
            {cookie.reject}
          </button>
          {manage ? (
            <button className="btn-secondary" onClick={() => save(analytics)}>
              {cookie.save}
            </button>
          ) : (
            <button
              className="btn-secondary"
              onClick={() => {
                setManage(true);
                openPreferences();
              }}
            >
              {cookie.manage}
            </button>
          )}
          {consent && (
            <button className="btn-ghost" onClick={closePreferences}>
              {cookie.close}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

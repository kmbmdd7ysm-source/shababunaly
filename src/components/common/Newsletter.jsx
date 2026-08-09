import { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { trackEvent } from '../../utils/analytics';
import { sendFormspree } from '../../services/formspree';
import TurnstileWidget from '../security/TurnstileWidget';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Newsletter({ compact = false }) {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | sending | success | error
  const [error, setError] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!EMAIL_RE.test(email)) {
      setError(t.newsletter.invalid);
      return;
    }
    if (!consent) {
      setError(t.newsletter.required);
      return;
    }
    if (!turnstileToken) {
      setError(t.newsletter.required);
      return;
    }
    setStatus('sending');
    try {
      await sendFormspree(
        {
          email,
          source: 'newsletter',
          consent: true,
          turnstileToken,
          submittedAt: new Date().toISOString(),
        },
        'Shababuna newsletter subscription',
      );
      setStatus('success');
      trackEvent('newsletter_success', { source: compact ? 'footer' : 'section' });
    } catch {
      setStatus('error');
      setError(t.newsletter.error);
    }
  };

  if (status === 'success')
    return (
      <p className="newsletter-success" role="status">
        {t.newsletter.success}
      </p>
    );

  return (
    <form
      className={`newsletter-form${compact ? ' newsletter-form--compact' : ''}`}
      onSubmit={submit}
      noValidate
    >
      <div className="newsletter-input-row">
        <label className="sr-only" htmlFor="nl-email">
          {t.newsletter.placeholder}
        </label>
        <input
          id="nl-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t.newsletter.placeholder}
          required
          autoComplete="email"
        />
        <button type="submit" className="btn-primary" disabled={status === 'sending'}>
          {status === 'sending' ? t.newsletter.subscribing : t.newsletter.subscribe}
        </button>
      </div>
      <label className="newsletter-consent">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>{t.newsletter.consent}</span>
      </label>
      <TurnstileWidget
        onToken={setTurnstileToken}
        language={document.documentElement.lang || 'en'}
      />
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

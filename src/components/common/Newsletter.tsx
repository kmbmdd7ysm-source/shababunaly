import type { FormEvent, ChangeEvent, ReactElement } from 'react';
import { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { trackEvent } from '../../utils/analytics';
import { sendFormspree } from '../../services/formspree';
import TurnstileWidget from '../security/TurnstileWidget';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Newsletter({ compact = false }: { compact?: boolean } = {}): ReactElement {
  const { t } = useLanguage();
  const newsletter = (t.newsletter || {}) as Record<string, string>;
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | sending | success | error
  const [error, setError] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    if (!EMAIL_RE.test(email)) {
      setError(newsletter.invalid || '');
      return;
    }
    if (!consent) {
      setError(newsletter.required || '');
      return;
    }
    if (!turnstileToken) {
      setError(newsletter.required || '');
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
      setError(newsletter.error || '');
    }
  };

  if (status === 'success')
    return (
      <p className="newsletter-success" role="status">
        {newsletter.success}
      </p>
    );

  return (
    <form
      className={`newsletter-form${compact ? ' newsletter-form--compact' : ''}`}
      onSubmit={(event) => {
        void submit(event);
      }}
      noValidate
    >
      <div className="newsletter-input-row">
        <label className="sr-only" htmlFor="nl-email">
          {newsletter.placeholder}
        </label>
        <input
          id="nl-email"
          type="email"
          value={email}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
          placeholder={newsletter.placeholder}
          required
          autoComplete="email"
        />
        <button type="submit" className="btn-primary" disabled={status === 'sending'}>
          {status === 'sending' ? newsletter.subscribing : newsletter.subscribe}
        </button>
      </div>
      <label className="newsletter-consent">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setConsent(e.target.checked)}
        />
        <span>{newsletter.consent}</span>
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

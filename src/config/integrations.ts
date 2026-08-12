/** Canonical Formspree endpoint. Prefer VITE_FORM_ENDPOINT; never silently diverge. */
export const FORMSPREE_ENDPOINT = 'https://formspree.io/f/mvzenjgv';

export const integrations = Object.freeze({
  formspreeEndpoint: FORMSPREE_ENDPOINT,
  turnstileSiteKey: String(import.meta.env.VITE_TURNSTILE_SITE_KEY || '').trim(),
  onlineCard: Object.freeze({
    provider: String(import.meta.env.VITE_PAYMENTS_PROVIDER || '').trim(),
    publishableKey: String(
      import.meta.env.VITE_PAYMENTS_PUBLISHABLE_KEY ||
        import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ||
        '',
    ).trim(),
    apiBase: String(import.meta.env.VITE_CHECKOUT_API_BASE || '/api').trim(),
  }),
  libyanBankCard: Object.freeze({
    provider: String(import.meta.env.VITE_LIBYAN_BANK_CARD_PROVIDER || '').trim(),
    publishableKey: String(import.meta.env.VITE_LIBYAN_BANK_CARD_PUBLISHABLE_KEY || '').trim(),
    apiBase: String(import.meta.env.VITE_LIBYAN_BANK_CARD_CHECKOUT_API_BASE || '/api').trim(),
  }),
});

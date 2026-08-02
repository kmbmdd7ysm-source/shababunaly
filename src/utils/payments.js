// Secure payment-provider abstraction.
// No secret is stored in the browser. Every real card payment is created by a
// server endpoint that revalidates the trusted catalogue, amount and order.

const GENERIC_PROVIDER = String(import.meta.env.VITE_PAYMENTS_PROVIDER || '').trim() || '';
const GENERIC_PUBLISHABLE = String(
  import.meta.env.VITE_PAYMENTS_PUBLISHABLE_KEY ||
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ||
  ''
).trim();
const GENERIC_API_BASE = String(import.meta.env.VITE_CHECKOUT_API_BASE || '').trim() || '';

const LIBYAN_PROVIDER = String(import.meta.env.VITE_LIBYAN_BANK_CARD_PROVIDER || '').trim() || '';
const LIBYAN_PUBLISHABLE = String(import.meta.env.VITE_LIBYAN_BANK_CARD_PUBLISHABLE_KEY || '').trim() || '';
const LIBYAN_API_BASE = String(import.meta.env.VITE_LIBYAN_BANK_CARD_CHECKOUT_API_BASE || '').trim() || '';

const configured = (provider, apiBase, publishable, publishableOptional = false) =>
  Boolean(provider && apiBase && (publishableOptional || publishable));

export function isPaymentMethodConfigured(method = 'online_card') {
  if (method === 'libyan_bank_card') {
    return configured(LIBYAN_PROVIDER, LIBYAN_API_BASE, LIBYAN_PUBLISHABLE, true);
  }
  return configured(GENERIC_PROVIDER, GENERIC_API_BASE, GENERIC_PUBLISHABLE);
}

export function isPaymentsConfigured() {
  return isPaymentMethodConfigured('online_card') || isPaymentMethodConfigured('libyan_bank_card');
}

export function paymentProviderName(method = 'online_card') {
  return method === 'libyan_bank_card' ? LIBYAN_PROVIDER : GENERIC_PROVIDER;
}

export async function detectWallets() {
  if (!isPaymentMethodConfigured('online_card')) return [];
  const wallets = [];
  try {
    if (window.ApplePaySession?.canMakePayments?.()) wallets.push('apple_pay');
  } catch {}
  try {
    if (window.PaymentRequest) wallets.push('google_pay');
  } catch {}
  return wallets;
}

export async function createCheckoutSession(payload) {
  const method = payload?.paymentMethod || 'online_card';
  if (!isPaymentMethodConfigured(method)) {
    const error = new Error('PAYMENTS_NOT_CONFIGURED');
    error.code = 'not_configured';
    throw error;
  }
  const apiBase = method === 'libyan_bank_card' ? LIBYAN_API_BASE : GENERIC_API_BASE;
  const response = await fetch(`${apiBase.replace(/\/$/, '')}/create-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    credentials: 'same-origin',
    cache: 'no-store',
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const error = new Error('CHECKOUT_SESSION_FAILED');
    error.code = 'session_failed';
    throw error;
  }
  const result = await response.json();
  if (!result?.url || !/^https:\/\//i.test(result.url)) {
    const error = new Error('INVALID_CHECKOUT_REDIRECT');
    error.code = 'invalid_redirect';
    throw error;
  }
  return result;
}

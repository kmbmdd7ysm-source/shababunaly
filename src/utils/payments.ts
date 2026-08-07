// Secure payment-provider abstraction.
// No secret is stored in the browser. Every real card payment is created by a
// server endpoint that revalidates the trusted catalogue, amount and order.

import type { PaymentVerificationState } from '../domain/types.ts';

const GENERIC_PROVIDER = String(import.meta.env.VITE_PAYMENTS_PROVIDER || '').trim() || '';
const GENERIC_PUBLISHABLE = String(
  import.meta.env.VITE_PAYMENTS_PUBLISHABLE_KEY || import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '',
).trim();
const GENERIC_API_BASE = String(import.meta.env.VITE_CHECKOUT_API_BASE || '').trim() || '';

const LIBYAN_PROVIDER = String(import.meta.env.VITE_LIBYAN_BANK_CARD_PROVIDER || '').trim() || '';
const LIBYAN_PUBLISHABLE = String(import.meta.env.VITE_LIBYAN_BANK_CARD_PUBLISHABLE_KEY || '').trim() || '';
const LIBYAN_API_BASE = String(import.meta.env.VITE_LIBYAN_BANK_CARD_CHECKOUT_API_BASE || '').trim() || '';

type PaymentMethod = 'online_card' | 'libyan_bank_card' | string;

interface AppError extends Error {
  code?: string;
  status?: number;
}

const configured = (
  provider: string,
  apiBase: string,
  publishable: string,
  publishableOptional = false,
): boolean => Boolean(provider && apiBase && (publishableOptional || publishable));

export function isPaymentMethodConfigured(method: PaymentMethod = 'online_card'): boolean {
  if (method === 'libyan_bank_card') {
    return configured(LIBYAN_PROVIDER, LIBYAN_API_BASE, LIBYAN_PUBLISHABLE, true);
  }
  return configured(GENERIC_PROVIDER, GENERIC_API_BASE, GENERIC_PUBLISHABLE);
}

export function isPaymentsConfigured(): boolean {
  return isPaymentMethodConfigured('online_card') || isPaymentMethodConfigured('libyan_bank_card');
}

export function paymentProviderName(method: PaymentMethod = 'online_card'): string {
  return method === 'libyan_bank_card' ? LIBYAN_PROVIDER : GENERIC_PROVIDER;
}

/** Unconfigured providers must never claim LIVE_VERIFIED. */
export function paymentVerificationState(method: PaymentMethod = 'online_card'): PaymentVerificationState {
  if (!isPaymentMethodConfigured(method)) return 'UNCONFIGURED';
  const mode = String(import.meta.env.MODE || '');
  if (mode === 'test' || import.meta.env.VITE_PAYMENTS_MOCK === 'true') return 'MOCK_VERIFIED';
  if (String(import.meta.env.VITE_PAYMENTS_SANDBOX || '').toLowerCase() === 'true') return 'SANDBOX_VERIFIED';
  // Live credentials may exist, but live verification requires external provider proof.
  return 'UNCONFIGURED';
}

export async function detectWallets(): Promise<string[]> {
  if (!isPaymentMethodConfigured('online_card')) return [];
  const wallets: string[] = [];
  try {
    const apple = window.ApplePaySession as { canMakePayments?: () => boolean } | undefined;
    if (apple?.canMakePayments?.()) wallets.push('apple_pay');
  } catch {
    /* wallet probe */
  }
  try {
    if (window.PaymentRequest) wallets.push('google_pay');
  } catch {
    /* wallet probe */
  }
  return wallets;
}

export interface CheckoutSessionPayload {
  paymentMethod?: PaymentMethod;
  [key: string]: unknown;
}

export async function createCheckoutSession(payload: CheckoutSessionPayload): Promise<{ url: string }> {
  const method = payload?.paymentMethod || 'online_card';
  if (!isPaymentMethodConfigured(method)) {
    const error: AppError = new Error('PAYMENTS_NOT_CONFIGURED');
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
    const error: AppError = new Error('CHECKOUT_SESSION_FAILED');
    error.code = 'session_failed';
    throw error;
  }
  const result: unknown = await response.json();
  const url = typeof result === 'object' && result && 'url' in result ? String((result as { url: unknown }).url) : '';
  if (!url || !/^https:\/\//i.test(url)) {
    const error: AppError = new Error('INVALID_CHECKOUT_REDIRECT');
    error.code = 'invalid_redirect';
    throw error;
  }
  return { url };
}

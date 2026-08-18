import type { Currency } from '../domain/types.ts';

export const commerceConfig = Object.freeze({
  baseCurrency: 'USD' as const satisfies Currency,
  defaultDisplayCurrency: 'USD' as const satisfies Currency,
  defaultCountryCode: 'US',
  supportedDisplayCurrencies: Object.freeze(['USD', 'LYD'] as const satisfies readonly Currency[]),
  /** Canonical store rate: 1 USD = 9 LYD. */
  fallbackUsdToLydRate: 9,
});

export function isSupportedDisplayCurrency(value: unknown): value is Currency {
  return (
    typeof value === 'string' &&
    (commerceConfig.supportedDisplayCurrencies as readonly string[]).includes(value)
  );
}


/**
 * Customer-facing prices are intentionally clean whole numbers in 5-unit steps.
 * The catalogue and currency conversion layers both use this helper so a price
 * cannot render as 153.62 in one place and 155 somewhere else.
 */
export function roundStorePrice(value: unknown): number {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return amount;
  if (amount <= 0) return 0;
  const rounded = Math.ceil(amount / 5) * 5;
  return Object.is(rounded, -0) ? 0 : rounded;
}


/** Clean wholesale price floor. Returns 0 when no lower 5-unit price exists. */
export function roundStorePriceDown(value: unknown): number {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const rounded = Math.floor(amount / 5) * 5;
  return rounded > 0 ? rounded : 0;
}

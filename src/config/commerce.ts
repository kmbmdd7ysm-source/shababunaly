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

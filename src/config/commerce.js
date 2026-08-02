export const commerceConfig = Object.freeze({
  baseCurrency: 'USD',
  defaultDisplayCurrency: 'USD',
  defaultCountryCode: 'US',
  supportedDisplayCurrencies: Object.freeze(['USD', 'LYD']),
  fallbackUsdToLydRate: 9,
});
/** @param {unknown} value */
export function isSupportedDisplayCurrency(value) {
  return typeof value === 'string' && commerceConfig.supportedDisplayCurrencies.includes(value);
}

import { commerceConfig, isSupportedDisplayCurrency, roundStorePrice } from '../config/commerce.ts';
import type { Currency } from '../domain/types.ts';

const MINOR_SCALE = 100;
const BIDI_ISOLATE_START = '\u2068';
const BIDI_ISOLATE_END = '\u2069';

function assertCurrency(currency: string): asserts currency is Currency {
  if (!isSupportedDisplayCurrency(currency)) throw new TypeError('Unsupported currency');
}

export class Money {
  readonly minorUnits: number;
  readonly currency: Currency;

  constructor(minorUnits: number, currency: Currency = commerceConfig.baseCurrency) {
    if (!Number.isSafeInteger(minorUnits)) {
      throw new TypeError('Money minorUnits must be a safe integer');
    }
    assertCurrency(currency);
    this.minorUnits = minorUnits;
    this.currency = currency;
    Object.freeze(this);
  }

  static fromMajor(amount: unknown, currency: Currency = commerceConfig.baseCurrency): Money {
    const value = Number(amount);
    if (!Number.isFinite(value)) throw new TypeError('Invalid monetary amount');
    const minorUnits = Math.round(value * MINOR_SCALE);
    if (!Number.isSafeInteger(minorUnits)) throw new RangeError('Monetary amount is too large');
    return new Money(minorUnits, currency);
  }

  toMajor(): number {
    return this.minorUnits / MINOR_SCALE;
  }

  add(other: unknown): Money {
    if (!(other instanceof Money) || other.currency !== this.currency) {
      throw new TypeError('Cannot add money with different currencies');
    }
    return new Money(this.minorUnits + other.minorUnits, this.currency);
  }

  multiply(quantity: unknown): Money {
    const value = Number(quantity);
    if (!Number.isFinite(value)) throw new TypeError('Invalid quantity');
    return new Money(Math.round(this.minorUnits * value), this.currency);
  }

  percent(percentValue: unknown): Money {
    const value = Number(percentValue);
    if (!Number.isFinite(value)) throw new TypeError('Invalid percentage');
    return new Money(Math.round((this.minorUnits * value) / 100), this.currency);
  }

  convert(targetCurrency: string, rate: unknown): Money {
    assertCurrency(targetCurrency);
    if (targetCurrency === this.currency) return this;
    const validRate = Number(rate);
    if (!Number.isFinite(validRate) || validRate <= 0) {
      throw new TypeError('Valid exchange rate required');
    }
    const sourceMajor = this.toMajor();
    const converted = this.currency === 'USD' ? sourceMajor * validRate : sourceMajor / validRate;
    return Money.fromMajor(converted, targetCurrency);
  }
}

export function roundLydPrice(value: unknown): number {
  return roundStorePrice(value);
}

export function convertPrice(
  amount: unknown,
  fromCurrency: string,
  toCurrency: string,
  rate: unknown,
): number {
  assertCurrency(fromCurrency);
  assertCurrency(toCurrency);
  const converted = Money.fromMajor(amount, fromCurrency).convert(toCurrency, rate).toMajor();
  return roundStorePrice(converted);
}

export function sumMoney(
  values: Array<Money | number>,
  currency: Currency = commerceConfig.baseCurrency,
): Money {
  assertCurrency(currency);
  let total = new Money(0, currency);
  for (const value of values) {
    total = total.add(value instanceof Money ? value : Money.fromMajor(value, currency));
  }
  return total;
}

export function formatMoney(amount: unknown, currency: string, lang: 'en' | 'ar' = 'en'): string {
  const value = Number(amount);
  if (!Number.isFinite(value) || !isSupportedDisplayCurrency(currency)) {
    return lang === 'ar' ? 'السعر غير متاح' : 'Price unavailable';
  }

  const locale = lang === 'ar' ? 'ar-LY-u-nu-latn' : 'en-US';
  const displayValue = roundStorePrice(value);
  const number = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    useGrouping: true,
  }).format(displayValue);

  if (currency === 'LYD') {
    const label = lang === 'ar' ? 'د.ل' : 'LYD';
    return `${BIDI_ISOLATE_START}${number} ${label}${BIDI_ISOLATE_END}`;
  }

  const rendered = `$${number}`;
  return lang === 'ar' ? `${BIDI_ISOLATE_START}${rendered} USD${BIDI_ISOLATE_END}` : rendered;
}

export function getAccessibleMoneyLabel(
  amount: unknown,
  currency: string,
  lang: 'en' | 'ar' = 'en',
): string {
  const value = Number(amount);
  if (!Number.isFinite(value)) return lang === 'ar' ? 'السعر غير متاح' : 'Price unavailable';
  const displayValue = roundStorePrice(value);
  const formatted = new Intl.NumberFormat(lang === 'ar' ? 'ar-LY-u-nu-latn' : 'en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(displayValue);
  if (lang === 'ar') {
    return currency === 'LYD' ? `${formatted} دينار ليبي` : `${formatted} دولار أمريكي`;
  }
  return currency === 'LYD' ? `${formatted} Libyan dinars` : `${formatted} US dollars`;
}

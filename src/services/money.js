import { commerceConfig, isSupportedDisplayCurrency } from '../config/commerce.js';

const MINOR_SCALE = 100;
const BIDI_ISOLATE_START = '\u2068';
const BIDI_ISOLATE_END = '\u2069';

/** @param {string} currency */
function assertCurrency(currency) {
  if (!isSupportedDisplayCurrency(currency)) throw new TypeError('Unsupported currency');
}

export class Money {
  /** @param {number} minorUnits @param {string} [currency] */
  constructor(minorUnits, currency = commerceConfig.baseCurrency) {
    if (!Number.isSafeInteger(minorUnits)) {
      throw new TypeError('Money minorUnits must be a safe integer');
    }
    assertCurrency(currency);
    this.minorUnits = minorUnits;
    this.currency = currency;
    Object.freeze(this);
  }

  /** @param {unknown} amount @param {string} [currency] */
  static fromMajor(amount, currency = commerceConfig.baseCurrency) {
    const value = Number(amount);
    if (!Number.isFinite(value)) throw new TypeError('Invalid monetary amount');
    const minorUnits = Math.round(value * MINOR_SCALE);
    if (!Number.isSafeInteger(minorUnits)) throw new RangeError('Monetary amount is too large');
    return new Money(minorUnits, currency);
  }

  toMajor() {
    return this.minorUnits / MINOR_SCALE;
  }

  /** @param {unknown} other */
  add(other) {
    if (!(other instanceof Money) || other.currency !== this.currency) {
      throw new TypeError('Cannot add money with different currencies');
    }
    return new Money(this.minorUnits + other.minorUnits, this.currency);
  }

  /** @param {unknown} quantity */
  multiply(quantity) {
    const value = Number(quantity);
    if (!Number.isFinite(value)) throw new TypeError('Invalid quantity');
    return new Money(Math.round(this.minorUnits * value), this.currency);
  }

  /** @param {unknown} percentValue */
  percent(percentValue) {
    const value = Number(percentValue);
    if (!Number.isFinite(value)) throw new TypeError('Invalid percentage');
    return new Money(Math.round((this.minorUnits * value) / 100), this.currency);
  }

  /** @param {string} targetCurrency @param {unknown} rate */
  convert(targetCurrency, rate) {
    assertCurrency(targetCurrency);
    if (targetCurrency === this.currency) return this;
    const validRate = Number(rate);
    if (!Number.isFinite(validRate) || validRate <= 0)
      throw new TypeError('Valid exchange rate required');
    const sourceMajor = this.toMajor();
    const converted = this.currency === 'USD' ? sourceMajor * validRate : sourceMajor / validRate;
    return Money.fromMajor(converted, targetCurrency);
  }
}

/** @param {unknown} value */
export function roundLydPrice(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return amount;
  const rounded = Math.ceil(amount / 5) * 5;
  return Object.is(rounded, -0) ? 0 : rounded;
}

/** @param {unknown} amount @param {string} fromCurrency @param {string} toCurrency @param {unknown} rate */
export function convertPrice(amount, fromCurrency, toCurrency, rate) {
  const converted = Money.fromMajor(amount, fromCurrency).convert(toCurrency, rate).toMajor();
  return toCurrency === 'LYD' ? roundLydPrice(converted) : converted;
}


/** @param {Array<Money|number>} values @param {string} [currency] */
export function sumMoney(values, currency = commerceConfig.baseCurrency) {
  assertCurrency(currency);
  let total = new Money(0, currency);
  for (const value of values) total = total.add(value instanceof Money ? value : Money.fromMajor(value, currency));
  return total;
}

/** @param {unknown} amount @param {string} currency @param {'en'|'ar'} [lang] */
export function formatMoney(amount, currency, lang = 'en') {
  const value = Number(amount);
  if (!Number.isFinite(value) || !isSupportedDisplayCurrency(currency)) {
    return lang === 'ar' ? 'السعر غير متاح' : 'Price unavailable';
  }

  const locale = lang === 'ar' ? 'ar-LY-u-nu-latn' : 'en-US';
  const displayValue = currency === 'LYD' ? roundLydPrice(value) : value;
  const number = new Intl.NumberFormat(locale, {
    minimumFractionDigits: currency === 'LYD' ? 0 : 2,
    maximumFractionDigits: currency === 'LYD' ? 0 : 2,
    useGrouping: true,
  }).format(displayValue);

  if (currency === 'LYD') {
    const label = lang === 'ar' ? 'د.ل' : 'LYD';
    return `${BIDI_ISOLATE_START}${number} ${label}${BIDI_ISOLATE_END}`;
  }

  const rendered = `$${number}`;
  return lang === 'ar' ? `${BIDI_ISOLATE_START}${rendered} USD${BIDI_ISOLATE_END}` : rendered;
}

/** @param {unknown} amount @param {string} currency @param {'en'|'ar'} [lang] */
export function getAccessibleMoneyLabel(amount, currency, lang = 'en') {
  const value = Number(amount);
  if (!Number.isFinite(value)) return lang === 'ar' ? 'السعر غير متاح' : 'Price unavailable';
  const displayValue = currency === 'LYD' ? roundLydPrice(value) : value;
  const formatted = new Intl.NumberFormat(lang === 'ar' ? 'ar-LY-u-nu-latn' : 'en-US', {
    minimumFractionDigits: currency === 'LYD' ? 0 : 2,
    maximumFractionDigits: currency === 'LYD' ? 0 : 2,
  }).format(displayValue);
  if (lang === 'ar') {
    return currency === 'LYD' ? `${formatted} دينار ليبي` : `${formatted} دولار أمريكي`;
  }
  return currency === 'LYD' ? `${formatted} Libyan dinars` : `${formatted} US dollars`;
}

import { describe, expect, it } from './test-api.js';
import {
  convertPrice,
  formatMoney,
  getAccessibleMoneyLabel,
  Money,
  roundLydPrice,
  sumMoney,
} from '../src/services/money.ts';

describe('currency conversion', () => {
  it('stores canonical USD and converts using rate 9', () => {
    expect(convertPrice(100, 'USD', 'LYD', 9)).toBe(900);
    expect(convertPrice(900, 'LYD', 'USD', 9)).toBe(100);
    const usd = Money.fromMajor(10, 'USD');
    expect(usd.convert('USD', 9)).toBe(usd);
  });
  it('rounds displayed LYD prices and handles invalid display values', () => {
    expect(roundLydPrice(901)).toBe(905);
    expect(Number.isNaN(roundLydPrice('x'))).toBe(true);
    expect(formatMoney(901, 'LYD', 'en')).toContain('905 LYD');
    expect(formatMoney(10, 'USD', 'en')).toBe('$10.00');
    expect(formatMoney(10, 'USD', 'ar')).toContain('USD');
    expect(formatMoney('x', 'USD', 'en')).toBe('Price unavailable');
    expect(formatMoney('x', 'USD', 'ar')).toBe('السعر غير متاح');
    expect(formatMoney(1, /** @type {any} */ ('EUR'), 'en')).toBe('Price unavailable');
  });
  it('uses integer minor units for arithmetic, sums and percentages', () => {
    const total = Money.fromMajor(10.25).multiply(3).add(Money.fromMajor(1.25));
    expect(total.toMajor()).toBe(32);
    expect(Money.fromMajor(100).percent(12.5).toMajor()).toBe(12.5);
    expect(sumMoney([1, Money.fromMajor(2), 3]).toMajor()).toBe(6);
  });
  it('rejects invalid amounts, quantities, rates and currencies', () => {
    expect(() => new Money(1.2)).toThrow('safe integer');
    expect(() => new Money(100, /** @type {any} */ ('EUR'))).toThrow('Unsupported currency');
    expect(() => Money.fromMajor('not-money')).toThrow('Invalid monetary amount');
    expect(() => Money.fromMajor(Number.MAX_VALUE)).toThrow('too large');
    expect(() => Money.fromMajor(1).add(Money.fromMajor(1, /** @type {any} */ ('LYD')))).toThrow(
      'different currencies',
    );
    expect(() => Money.fromMajor(1).add(/** @type {any} */ ({}))).toThrow('different currencies');
    expect(() => Money.fromMajor(1).multiply('x')).toThrow('Invalid quantity');
    expect(() => Money.fromMajor(1).percent('x')).toThrow('Invalid percentage');
    expect(() => Money.fromMajor(1).convert('LYD', 0)).toThrow('Valid exchange rate');
    expect(() => sumMoney([], /** @type {any} */ ('EUR'))).toThrow('Unsupported currency');
  });
  it('builds accessible labels in both languages and currencies', () => {
    expect(getAccessibleMoneyLabel(12.5, 'USD', 'en')).toContain('US dollars');
    expect(getAccessibleMoneyLabel(12.5, 'USD', 'ar')).toContain('دولار أمريكي');
    expect(getAccessibleMoneyLabel(12.5, 'LYD', 'en')).toContain('Libyan dinars');
    expect(getAccessibleMoneyLabel(12.5, 'LYD', 'ar')).toContain('دينار ليبي');
    expect(getAccessibleMoneyLabel('x', 'USD', 'en')).toBe('Price unavailable');
    expect(getAccessibleMoneyLabel('x', 'USD', 'ar')).toBe('السعر غير متاح');
  });
});

describe('money edge coverage', () => {
  it('supports zero, negative arithmetic and exact language fallbacks', () => {
    expect(Money.fromMajor(0).toMajor()).toBe(0);
    expect(Money.fromMajor(-5).multiply(-2).toMajor()).toBe(10);
    expect(roundLydPrice(-1)).toBe(0);
    expect(convertPrice(0, 'USD', 'LYD', 9)).toBe(0);
    expect(getAccessibleMoneyLabel(1, 'USD', /** @type {any} */ ('fr'))).toContain('US dollars');
  });
  it('rejects unsupported target currencies before conversion', () => {
    expect(() => Money.fromMajor(1).convert(/** @type {any} */ ('EUR'), 9)).toThrow(
      'Unsupported currency',
    );
  });
});

describe('money Arabic LYD rendering', () => {
  it('renders the Arabic dinar label', () => {
    expect(formatMoney(20, 'LYD', 'ar')).toContain('د.ل');
  });
});

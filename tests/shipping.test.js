import { describe, expect, it } from './test-api.js';
import {
  getLibyaFreeShippingProgress,
  resolveShipping,
  shippingConfig,
  SHIPPING_MESSAGES,
} from '../src/config/shipping.ts';

describe('shipping rules', () => {
  it('uses 20 LYD inside Libya below the 70 USD free threshold', () => {
    const result = resolveShipping('ly', { subtotalUsd: 50, usdToLydRate: 9 });
    expect(result.status).toBe('physical_paid');
    expect(result.amount).toBe(20);
    expect(result.currency).toBe('LYD');
    expect(result.canonicalAmount).toBeGreaterThan(0);
  });

  it('unlocks free delivery at 70 USD (630 LYD at the canonical rate)', () => {
    const progress = getLibyaFreeShippingProgress(70, 9);
    expect(progress.eligible).toBe(true);
    expect(progress.thresholdUsd).toBe(70);
    expect(progress.thresholdLyd).toBe(630);
    expect(progress.progressPercent).toBe(100);
    expect(progress.remainingUsd).toBe(0);
    expect(resolveShipping('LY', { subtotalUsd: 70, usdToLydRate: 9 }).status).toBe(
      'physical_free',
    );
    expect(shippingConfig.libya.freeThreshold.amount).toBe(630);
    expect(shippingConfig.libya.freeThresholdUsd).toBe(70);
  });

  it('applies paid shipping at 629 LYD equivalent and frees at 630/631 LYD', () => {
    const rate = 9;
    const justBelow = 629 / rate;
    const atThreshold = 630 / rate;
    const justAbove = 631 / rate;
    expect(getLibyaFreeShippingProgress(justBelow, rate).eligible).toBe(false);
    expect(resolveShipping('LY', { subtotalUsd: justBelow, usdToLydRate: rate }).status).toBe(
      'physical_paid',
    );
    expect(getLibyaFreeShippingProgress(atThreshold, rate).eligible).toBe(true);
    expect(resolveShipping('LY', { subtotalUsd: atThreshold, usdToLydRate: rate }).status).toBe(
      'physical_free',
    );
    expect(getLibyaFreeShippingProgress(justAbove, rate).eligible).toBe(true);
    expect(resolveShipping('LY', { subtotalUsd: justAbove, usdToLydRate: rate }).status).toBe(
      'physical_free',
    );
  });

  it('safely handles invalid rate and subtotal', () => {
    const progress = getLibyaFreeShippingProgress('bad', /** @type {any} */ (0));
    expect(progress.subtotalUsd).toBe(0);
    expect(progress.thresholdLyd).toBe(630);
    expect(progress.progressPercent).toBe(0);
  });

  it('does not charge shipping for digital-only carts', () => {
    const result = resolveShipping('US', { hasPhysical: false });
    expect(result.status).toBe('no_physical_shipping');
    expect(result.amount).toBe(0);
    expect(result.currency).toBe(null);
  });

  it('requires quotes for custom and large equipment', () => {
    expect(resolveShipping('US', { subtotalUsd: 100 }).status).toBe('quote_required');
    expect(
      /** @type {any} */ (resolveShipping('LY', { customOrder: true })).pendingShippingQuote,
    ).toBe(true);
    expect(resolveShipping('LY', { largeEquipment: true }).status).toBe('quote_required');
  });

  it('uses configured international shipping including free rates', () => {
    const paid = resolveShipping('us', { internationalRates: { US: 35 } });
    expect(paid).toMatchObject({
      status: 'international_configured',
      amount: 35,
      currency: 'USD',
      pendingShippingQuote: false,
    });
    const free = resolveShipping('GB', { internationalRates: { GB: 0 } });
    expect(free.amount).toBe(0);
  });

  it('exposes promised delivery ranges and bilingual messages', () => {
    expect(shippingConfig.libya.readyDelivery).toEqual({ minHours: 24, maxHours: 72 });
    expect(shippingConfig.libya.standardDelivery).toEqual({ minDays: 14, maxDays: 18 });
    expect(shippingConfig.custom).toEqual({ minDays: 30, maxDays: 60 });
    expect(SHIPPING_MESSAGES.ready.en).toContain('24–72');
    expect(SHIPPING_MESSAGES.custom.ar).toContain('30–60');
    expect(SHIPPING_MESSAGES.announcement.en).toContain('70 USD');
    expect(SHIPPING_MESSAGES.announcement.en).toContain('630 LYD');
  });
});

describe('shipping edge coverage', () => {
  it('normalizes empty and lowercase countries and invalid international rates', () => {
    expect(resolveShipping('', { internationalRates: { '': 15 } })).toMatchObject({
      status: 'international_configured',
      countryCode: '',
      amount: 15,
    });
    expect(
      resolveShipping('fr', { internationalRates: { FR: /** @type {any} */ ('bad') } }).status,
    ).toBe('quote_required');
    expect(resolveShipping('de', { internationalRates: { DE: -1 } }).status).toBe('quote_required');
  });

  it('uses fallback rates for NaN, negative and missing exchange values', () => {
    const a = resolveShipping('LY', /** @type {any} */ ({ subtotalUsd: 1, usdToLydRate: 'bad' }));
    const b = resolveShipping('LY', /** @type {any} */ ({ subtotalUsd: 1, usdToLydRate: -3 }));
    expect(a.canonicalAmount).toBe(b.canonicalAmount);
    expect(/** @type {any} */ (a).originalRate).toEqual({ amount: 20, currency: 'LYD' });
  });

  it('clamps negative and huge subtotals and default options', () => {
    expect(getLibyaFreeShippingProgress(-100, 9).subtotalUsd).toBe(0);
    expect(resolveShipping('LY').status).toBe('physical_paid');
    expect(resolveShipping('LY', /** @type {any} */ (undefined)).status).toBe('physical_paid');
  });
});

describe('shipping nullish subtotal branch', () => {
  it('treats a null subtotal as zero', () => {
    expect(getLibyaFreeShippingProgress(null, 9).subtotalUsd).toBe(0);
  });
});

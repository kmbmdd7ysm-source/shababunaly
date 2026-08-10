import { Money, convertPrice } from '../services/money.ts';
import type { Currency, ShippingQuote } from '../domain/types.ts';
import { commerceConfig } from './commerce.ts';

/**
 * Libya free shipping threshold is defined in USD (approved commercial rule: 70 USD),
 * then displayed as the LYD equivalent at the canonical rate (1 USD = 9 LYD → 630 LYD).
 */
const LIBYA_FREE_SHIPPING_USD = 70;

export const shippingConfig = Object.freeze({
  libya: Object.freeze({
    countryCode: 'LY',
    deliveryFee: Object.freeze({ amount: 20, currency: 'LYD' as const satisfies Currency }),
    freeThresholdUsd: LIBYA_FREE_SHIPPING_USD,
    /** Derived display amount at the canonical USD→LYD rate. Not an independent rule. */
    freeThreshold: Object.freeze({
      amount: LIBYA_FREE_SHIPPING_USD * commerceConfig.fallbackUsdToLydRate,
      currency: 'LYD' as const satisfies Currency,
    }),
    readyDelivery: Object.freeze({ minHours: 24, maxHours: 72 }),
    standardDelivery: Object.freeze({ minDays: 14, maxDays: 18 }),
  }),
  custom: Object.freeze({ minDays: 30, maxDays: 60 }),
  fallback: Object.freeze({ status: 'quote_required' }),
});

function safeRate(value: unknown): number {
  const rate = Number(value);
  return Number.isFinite(rate) && rate > 0 ? rate : commerceConfig.fallbackUsdToLydRate;
}

function safeSubtotal(value: unknown): number {
  try {
    return Math.max(0, Money.fromMajor(value ?? 0, 'USD').toMajor());
  } catch {
    return 0;
  }
}

export function getLibyaFreeShippingProgress(
  subtotalUsd: unknown,
  usdToLydRate: unknown = commerceConfig.fallbackUsdToLydRate,
) {
  const subtotal = safeSubtotal(subtotalUsd);
  const rate = safeRate(usdToLydRate);
  const thresholdUsd = LIBYA_FREE_SHIPPING_USD;
  const thresholdLyd = thresholdUsd * rate;
  const remainingUsd = Math.max(0, thresholdUsd - subtotal);
  return Object.freeze({
    eligible: subtotal + 1e-9 >= thresholdUsd,
    subtotalUsd: subtotal,
    subtotalLyd: subtotal * rate,
    thresholdUsd,
    thresholdLyd,
    remainingUsd,
    remainingLyd: Math.max(0, thresholdLyd - subtotal * rate),
    progressPercent: Math.min(100, (subtotal / thresholdUsd) * 100),
  });
}

export interface ResolveShippingOptions {
  hasPhysical?: boolean;
  subtotalUsd?: unknown;
  usdToLydRate?: unknown;
  customOrder?: boolean;
  largeEquipment?: boolean;
  internationalRates?: Record<string, number>;
}

export function resolveShipping(
  countryCode: unknown,
  {
    hasPhysical = true,
    subtotalUsd = 0,
    usdToLydRate = commerceConfig.fallbackUsdToLydRate,
    customOrder = false,
    largeEquipment = false,
    internationalRates = {},
  }: ResolveShippingOptions = {},
): Readonly<ShippingQuote> {
  if (!hasPhysical) {
    return Object.freeze({
      status: 'no_physical_shipping',
      amount: 0,
      currency: null,
      canonicalAmount: 0,
      reason: 'no_physical_shipping',
    });
  }

  const code = String(countryCode || '')
    .trim()
    .toUpperCase();
  if (customOrder || largeEquipment) {
    return Object.freeze({
      status: shippingConfig.fallback.status,
      countryCode: code,
      amount: null,
      currency: null,
      canonicalAmount: null,
      freeShippingEligible: false,
      pendingShippingQuote: true,
    });
  }

  if (code !== shippingConfig.libya.countryCode) {
    const configuredRate = Number(internationalRates?.[code]);
    if (Number.isFinite(configuredRate) && configuredRate >= 0) {
      return Object.freeze({
        status: 'international_configured',
        countryCode: code,
        amount: configuredRate,
        currency: 'USD' as const,
        canonicalAmount: configuredRate,
        freeShippingEligible: false,
        pendingShippingQuote: false,
      });
    }
    return Object.freeze({
      status: shippingConfig.fallback.status,
      countryCode: code,
      amount: null,
      currency: null,
      canonicalAmount: null,
      freeShippingEligible: false,
      pendingShippingQuote: true,
    });
  }

  const progress = getLibyaFreeShippingProgress(subtotalUsd, usdToLydRate);
  if (progress.eligible) {
    return Object.freeze({
      status: 'physical_free',
      countryCode: code,
      amount: 0,
      currency: 'LYD' as const,
      canonicalAmount: 0,
      discountReason: 'libya_free_shipping_70_usd',
      freeShippingEligible: true,
    });
  }

  const rate = shippingConfig.libya.deliveryFee;
  return Object.freeze({
    status: 'physical_paid',
    countryCode: code,
    amount: rate.amount,
    currency: rate.currency,
    canonicalAmount: convertPrice(rate.amount, rate.currency, 'USD', safeRate(usdToLydRate)),
    originalRate: rate,
    freeShippingEligible: false,
  });
}

const freeThresholdLyd = LIBYA_FREE_SHIPPING_USD * commerceConfig.fallbackUsdToLydRate;

export const SHIPPING_MESSAGES = Object.freeze({
  announcement: Object.freeze({
    en: `Libya delivery: 20 LYD. Free on orders of ${LIBYA_FREE_SHIPPING_USD} USD (${freeThresholdLyd} LYD) or more.`,
    ar: `التوصيل داخل ليبيا 20 د.ل، ومجاني للطلبات بقيمة ${LIBYA_FREE_SHIPPING_USD} دولار أمريكي (${freeThresholdLyd} د.ل) أو أكثر.`,
  }),
  progress: Object.freeze({
    en: 'away from free delivery in Libya',
    ar: 'تفصلك عن التوصيل المجاني داخل ليبيا',
  }),
  unlocked: Object.freeze({
    en: 'Free delivery unlocked in Libya.',
    ar: 'حصلت على توصيل مجاني داخل ليبيا.',
  }),
  configured: Object.freeze({
    en: 'Libya delivery: 20 LYD',
    ar: 'التوصيل داخل ليبيا: 20 د.ل',
  }),
  ready: Object.freeze({
    en: 'Ready to ship in Libya — delivery in 24–72 hours.',
    ar: 'جاهز للتسليم داخل ليبيا خلال 24–72 ساعة.',
  }),
  standard: Object.freeze({
    en: 'Estimated delivery to Libya: 14–18 days.',
    ar: 'المدة المتوقعة للوصول إلى ليبيا: 14–18 يومًا.',
  }),
  custom: Object.freeze({
    en: 'Custom, club and wholesale orders: approximately 30–60 days depending on the product, quantity and order date.',
    ar: 'طلبات التصميم الخاص والأندية والجملة: تقريبًا 30–60 يومًا حسب المنتج والكمية ووقت الطلب.',
  }),
  internationalConfigured: Object.freeze({
    en: 'International shipping is priced at checkout. Delivery time will be confirmed after ordering.',
    ar: 'يتم احتساب الشحن الدولي عند الدفع، وتُؤكَّد مدة التوصيل بعد الطلب.',
  }),
  quoteRequired: Object.freeze({
    en: 'Shipping is available worldwide. The order will remain pending until the shipping price for this country is added and approved.',
    ar: 'الشحن متاح إلى جميع دول العالم. يبقى الطلب قيد الانتظار حتى تتم إضافة واعتماد سعر الشحن لهذه الدولة.',
  }),
});

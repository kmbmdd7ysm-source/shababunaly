import type { ChangeEvent, ReactElement } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { createIdempotencyKey, createOrder } from '../services/orders';
import { sendFormspree } from '../services/formspree';
import { SITE } from '../config';
import { resolveShipping, SHIPPING_MESSAGES } from '../config/shipping';
import { useCommerce } from '../context/CommerceContext';
import CheckoutContactStage from './checkout/CheckoutContactStage';
import CheckoutAddressStage from './checkout/CheckoutAddressStage';
import CheckoutPaymentStage from './checkout/CheckoutPaymentStage';
import Icon from '../components/icons/Icon';
import {
  getAddressRequirements,
  isCashEligibleCountry,
  isSupportedCountryCode,
  normalizeCountryCode,
} from '../data/countries';
import { isPaymentMethodConfigured, createCheckoutSession } from '../utils/payments';
import { trackCommerceEvent, trackEvent } from '../utils/analytics';
import Seo from '../components/common/Seo';
import SmartImage from '../components/common/SmartImage';
import EmptyState from '../components/common/EmptyState';
import '../styles/domain-account.css';
import '../styles/domain-commerce.css';
import '../styles/checkout.css';
import { listAddresses } from '../services/account/addressService';
import { reportClientError } from '../services/telemetry';
import '../styles/transact.css';
import '../styles/domain-misc.css';
import '../styles/domain-forms.css';
import '../styles/consumer-commerce.css';
import type { LocaleText } from '../types/i18n';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CHECKOUT_KEY = 'shababuna-checkout-idempotency';

type CheckoutForm = {
  email: string;
  firstName: string;
  lastName: string;
  country: string;
  address: string;
  apartment: string;
  city: string;
  state: string;
  postal: string;
  phone: string;
};

export default function CheckoutPage(): ReactElement {
  const { t, pick, lang } = useLanguage();
  const checkout = (t.checkout || {}) as Record<string, string>;
  const cartCopy = (t.cart || {}) as Record<string, string>;
  const nav = (t.nav || {}) as Record<string, string>;
  const common = (t.common || {}) as Record<string, string>;
  const { items, subtotal, digitalOnly, hasPhysical, clearCart } = useCart();
  const {
    currency,
    countryCode,
    setCountryCode,
    format,
    convert,
    usdToLydRate,
    rateReady,
    shippingRates,
  } = useCommerce();
  const auth = useAuth();
  const [form, setForm] = useState<CheckoutForm>({
    email: '',
    firstName: '',
    lastName: '',
    country: String(countryCode || ''),
    address: '',
    apartment: '',
    city: '',
    state: '',
    postal: '',
    phone: '',
  });
  const [agree, setAgree] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(
    isCashEligibleCountry(countryCode) ? 'cash' : 'online_card',
  );
  const [cashPlan, setCashPlan] = useState('half');
  const [orderConfirmed, setOrderConfirmed] = useState<Record<string, unknown> | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState('');
  const [savedAddresses, setSavedAddresses] = useState<Array<Record<string, unknown>>>([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const idempotencyRef = useRef(sessionStorage.getItem(CHECKOUT_KEY) || createIdempotencyKey());
  const errorSummaryRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    sessionStorage.setItem(CHECKOUT_KEY, idempotencyRef.current);
  }, []);
  useEffect(() => {
    if (auth.user?.email)
      setForm((current) => ({
        ...current,
        email: current.email || String(auth.user?.email || ''),
      }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional dependency scope
  }, [auth.user?.id]);
  useEffect(() => {
    if (items.length) {
      const details = {
        value: subtotal,
        currency: SITE.currency,
        display_currency: currency,
        items: items.length,
      };
      trackEvent('begin_checkout', details);
      void trackCommerceEvent('checkout_started', details);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional dependency scope
  }, []);

  const set = (key: string) => (event: ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));
  const fieldA11y = (key: string) => {
    const describedBy = errors[key] ? `checkout-${key}-error` : undefined;
    return {
      'aria-invalid': Boolean(errors[key]),
      ...(describedBy ? { 'aria-describedby': describedBy } : {}),
    };
  };
  const shippingCountryCode = isSupportedCountryCode(form.country)
    ? String(form.country).toUpperCase()
    : '';
  const addressRequirements = getAddressRequirements(shippingCountryCode);
  const isLibya = shippingCountryCode === 'LY';
  const stagedOrder = items.some(
    (item) => item.purchaseMode === 'wholesale' || item.deliveryProfile === 'custom',
  );
  const largeEquipment = items.some((item) => item.largeEquipment);
  const allReady =
    items.length > 0 && items.every((item) => item.type !== 'product' || item.readyToShip);
  const immediateLibyaCash = isLibya && allReady && !stagedOrder;
  const allowCashPlanChoice = isLibya && !allReady;

  const changeCountry = (nextCode: string) => {
    const normalized = String(normalizeCountryCode(nextCode) || '');
    setForm((current) => ({ ...current, country: normalized }));
    setCountryCode(normalized);
    setErrors((current) => {
      const next = { ...current };
      delete next.country;
      delete next.postal;
      delete next.state;
      return next;
    });
    if (!isCashEligibleCountry(normalized) && paymentMethod === 'cash')
      setPaymentMethod('online_card');
  };

  const applySavedAddress = (address: Record<string, unknown> | undefined) => {
    if (!address) return;
    setSelectedAddressId(String(address.id || ''));
    const nextCountry = String(normalizeCountryCode(String(address.country || countryCode)) || '');
    setForm((current) => ({
      ...current,
      firstName: String(address.first_name || current.firstName),
      lastName: String(address.last_name || current.lastName),
      country: nextCountry,
      address: String(address.address_line_1 || address.line1 || ''),
      apartment: String(address.address_line_2 || address.line2 || ''),
      city: String(address.city || ''),
      state: String(address.region || ''),
      postal: String(address.postal_code || ''),
      phone: String(address.phone || current.phone),
    }));
    setCountryCode(nextCountry);
    if (!isCashEligibleCountry(nextCountry) && paymentMethod === 'cash')
      setPaymentMethod('online_card');
  };

  useEffect(() => {
    let active = true;
    if (!auth.user?.id) {
      setSavedAddresses([]);
      return undefined;
    }
    listAddresses(String(auth.user.id))
      .then((rows) => {
        if (!active) return;
        const list = Array.isArray(rows) ? rows : [];
        setSavedAddresses(list);
        const preferred = list.find((row) => row.is_default) || list[0];
        if (preferred) applySavedAddress(preferred);
      })
      .catch(() => {
        if (active) setSavedAddresses([]);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional dependency scope
  }, [auth.user?.id]);

  const shipping = useMemo(
    () =>
      resolveShipping(shippingCountryCode, {
        hasPhysical,
        subtotalUsd: subtotal,
        usdToLydRate,
        largeEquipment,
        customOrder: stagedOrder,
        internationalRates: shippingRates,
      }),
    [
      shippingCountryCode,
      hasPhysical,
      subtotal,
      usdToLydRate,
      largeEquipment,
      stagedOrder,
      shippingRates,
    ],
  );
  const shippingQuoteRequired = shipping.status === 'quote_required';
  const shippingEstimate = shipping.canonicalAmount ?? 0;
  const total = subtotal + shippingEstimate;
  const deliveryProfile = stagedOrder
    ? 'custom'
    : isLibya && allReady
      ? 'ready'
      : isLibya
        ? 'standard'
        : shippingQuoteRequired
          ? 'international_pending'
          : 'international';
  const onlineCardConfigured = isPaymentMethodConfigured('online_card');
  const libyanCardConfigured = isPaymentMethodConfigured('libyan_bank_card');
  const paymentConfigured = paymentMethod === 'cash' || isPaymentMethodConfigured(paymentMethod);
  // prettier-ignore
  const paymentPlan = shippingQuoteRequired ? 'pending_shipping_quote' : paymentMethod === 'cash' ? (immediateLibyaCash ? 'full' : allowCashPlanChoice ? cashPlan : 'full') : 'full';
  const dueRatio = paymentPlan === 'half' ? 0.5 : paymentPlan === 'pending_shipping_quote' ? 0 : 1;
  const amountDueNow = total * dueRatio;
  const remainingBalance = Math.max(0, total - amountDueNow);

  const deliveryCopy =
    deliveryProfile === 'ready'
      ? SHIPPING_MESSAGES.ready
      : deliveryProfile === 'custom'
        ? SHIPPING_MESSAGES.custom
        : deliveryProfile === 'standard'
          ? SHIPPING_MESSAGES.standard
          : deliveryProfile === 'international'
            ? SHIPPING_MESSAGES.internationalConfigured
            : SHIPPING_MESSAGES.quoteRequired;

  const validate = () => {
    const next: Record<string, string> = {};
    if (!EMAIL_RE.test(form.email)) next.email = checkout.emailError || '';
    if (!digitalOnly) {
      (['firstName', 'lastName', 'country', 'address', 'city'] as const).forEach((key) => {
        if (!form[key].trim()) next[key] = checkout.requiredError || '';
      });
      if (!addressRequirements)
        next.country = pick({ en: 'Invalid country.', ar: 'الدولة غير صالحة.' });
      if (addressRequirements?.regionRequired && !form.state.trim())
        next.state = checkout.requiredError || '';
      if (addressRequirements?.postalCodeRequired && !form.postal.trim())
        next.postal = checkout.requiredError || '';
    }
    if (
      !shippingQuoteRequired &&
      paymentMethod !== 'cash' &&
      !isPaymentMethodConfigured(paymentMethod)
    )
      next.payment = pick({
        en: 'No online payment method is currently available.',
        ar: 'لا توجد وسيلة دفع إلكتروني متاحة حاليًا.',
      });
    if (paymentMethod === 'cash' && !isCashEligibleCountry(shippingCountryCode))
      next.payment = pick({
        en: 'Cash is available only for deliveries inside Libya.',
        ar: 'الدفع النقدي متاح فقط للتوصيل داخل ليبيا.',
      });
    if (!rateReady && currency === 'LYD')
      next.shipping = pick({
        en: 'The exchange rate is temporarily unavailable.',
        ar: 'سعر الصرف غير متاح مؤقتًا.',
      });
    if (items.some((item) => item.unavailable))
      next.cart = pick({
        en: 'One or more cart items are no longer available. Remove them or choose another variant.',
        ar: 'منتج أو أكثر في السلة لم يعد متوفرًا. احذفه أو اختر خيارًا آخر.',
      });
    if (!agree) next.agree = checkout.termsError || '';
    setErrors(next);
    if (Object.keys(next).length) requestAnimationFrame(() => errorSummaryRef.current?.focus());
    return Object.keys(next).length === 0;
  };

  const savePendingOrder = async (payload: Record<string, unknown>) => {
    const now = new Date();
    const date = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}`;
    const serial = String(Date.now() % 10_000_000).padStart(7, '0');
    const fallbackOrderNumber = `SHB-${date}-${serial}`;
    const methodLabel =
      paymentMethod === 'cash'
        ? 'Cash in Libya'
        : paymentMethod === 'libyan_bank_card'
          ? 'Libyan Bank Card'
          : 'Card / Digital Payment';
    const requestedOrderStatus = shippingQuoteRequired
      ? 'pending_shipping_quote'
      : paymentMethod === 'cash'
        ? 'awaiting_cash_confirmation'
        : 'awaiting_payment';
    const requestedPaymentStatus = shippingQuoteRequired ? 'shipping_quote_pending' : 'pending';
    const payloadItems = Array.isArray(payload.items)
      ? (payload.items as Array<Record<string, unknown>>)
      : [];
    const customer = (payload.customer || {}) as Record<string, unknown>;
    const clientItems = payloadItems.map((item) => {
      const unitPrice = Number(item.unitPrice) || 0;
      const lineTotal = Number(item.lineTotal) || 0;
      return {
        ...item,
        quantity: Number(item.quantity) || 0,
        name: String(item.name || ''),
        purchaseMode: item.purchaseMode ? String(item.purchaseMode) : '',
        displayUnitPrice: Number(convert(unitPrice) ?? unitPrice),
        displayLineTotal: Number(convert(lineTotal) ?? lineTotal),
      };
    });

    const result = (await createOrder(
      {
        ...payload,
        items: clientItems,
        email: form.email,
        userId: auth.user?.id || null,
        total,
        subtotal,
        shippingTotal: shippingEstimate,
        displaySubtotal: convert(subtotal) ?? subtotal,
        displayShippingTotal: convert(shippingEstimate) ?? shippingEstimate,
        displayTotal: convert(total) ?? total,
        displayAmountDueNow: convert(amountDueNow) ?? amountDueNow,
        displayRemainingBalance: convert(remainingBalance) ?? remainingBalance,
        displayOutstandingBalance: convert(remainingBalance) ?? remainingBalance,
        displayAmountPaid: 0,
        displayAmountRefunded: 0,
        canonicalCurrency: SITE.currency,
        displayCurrency: currency,
        paymentMethod,
        paymentPlan,
        amountDueNow,
        remainingBalance,
        paymentStatus: requestedPaymentStatus,
        orderStatus: requestedOrderStatus,
        fulfillmentStatus: 'unfulfilled',
        orderNumber: fallbackOrderNumber,
        createdAt: new Date().toISOString(),
        idempotencyKey: idempotencyRef.current,
        shippingQuoteRequired,
        deliveryProfile,
        shippingRate: {
          countryCode: shipping.countryCode || shippingCountryCode,
          amount: shipping.amount,
          currency: shipping.currency,
          originalAmount: shipping.originalRate?.amount ?? shipping.amount,
          originalCurrency: shipping.originalRate?.currency ?? shipping.currency,
          discountReason: shipping.discountReason || null,
          pendingQuote: shippingQuoteRequired,
        },
        taxTotal: 0,
        discountTotal: 0,
      } as Record<string, unknown>,
      { idempotencyKey: idempotencyRef.current, allowPending: true },
    )) as { order?: Record<string, unknown>; source?: string; notification?: string | null; accessToken?: string | null };

    const trusted = (result?.order || {}) as Record<string, unknown>;
    const confirmedNumber = String(trusted.orderNumber || fallbackOrderNumber);
    const canonicalSubtotal = Number.isFinite(Number(trusted.subtotal))
      ? Number(trusted.subtotal)
      : subtotal;
    const canonicalShipping = Number.isFinite(Number(trusted.shippingTotal))
      ? Number(trusted.shippingTotal)
      : shippingEstimate;
    const canonicalTotal = Number.isFinite(Number(trusted.total)) ? Number(trusted.total) : total;
    const canonicalDueNow = Number.isFinite(Number(trusted.amountDueNow))
      ? Number(trusted.amountDueNow)
      : amountDueNow;
    const canonicalRemaining = Number.isFinite(Number(trusted.remainingBalance))
      ? Number(trusted.remainingBalance)
      : remainingBalance;
    const displaySubtotal = convert(canonicalSubtotal) ?? canonicalSubtotal;
    const displayShippingTotal = convert(canonicalShipping) ?? canonicalShipping;
    const displayTotal = convert(canonicalTotal) ?? canonicalTotal;
    const displayDueNow = convert(canonicalDueNow) ?? canonicalDueNow;
    const displayRemaining = convert(canonicalRemaining) ?? canonicalRemaining;
    const trustedQuoteRequired = Boolean(trusted.shippingQuoteRequired ?? shippingQuoteRequired);
    const trustedPlan = String(trusted.paymentPlan || paymentPlan);
    const trustedDeliveryProfile = String(trusted.deliveryProfile || deliveryProfile);
    const trustedOrderStatus = String(trusted.orderStatus || requestedOrderStatus);
    const trustedPaymentStatus = String(trusted.paymentStatus || requestedPaymentStatus);

    const orderMessage = [
      `SHABABUNA ORDER: ${confirmedNumber}`,
      `Customer: ${String(customer.name || '')}`,
      `Email: ${String(customer.email || '')}`,
      `Phone: ${String(customer.phone || 'Not provided')}`,
      `Country: ${shippingCountryCode}`,
      `Payment method: ${methodLabel}`,
      `Payment plan: ${trustedPlan}`,
      `Shipping quote pending: ${trustedQuoteRequired ? 'YES' : 'NO'}`,
      `Delivery profile: ${trustedDeliveryProfile}`,
      `Address: ${[form.address, form.apartment, form.city, form.state, form.postal, shippingCountryCode].filter(Boolean).join(', ')}`,
      '',
      'Items:',
      ...clientItems.map((item) => {
        const attributes = [
          item.sku ? `SKU ${String(item.sku)}` : '',
          item.size ? `Size ${String(item.size)}` : '',
          item.color ? `Color ${String(item.color)}` : '',
          item.variantKey ? `Variant ${String(item.variantKey)}` : '',
        ].filter(Boolean);
        return `${item.quantity} × ${item.name}${item.purchaseMode ? ` [${item.purchaseMode}]` : ''}${attributes.length ? ` — ${attributes.join(' · ')}` : ''} — ${item.displayUnitPrice.toFixed(2)} ${currency} each — ${item.displayLineTotal.toFixed(2)} ${currency}`;
      }),
      '',
      `Subtotal: ${displaySubtotal.toFixed(2)} ${currency}`,
      `Shipping: ${trustedQuoteRequired ? 'PENDING QUOTE' : `${displayShippingTotal.toFixed(2)} ${currency}`}`,
      `Order total: ${displayTotal.toFixed(2)} ${currency}`,
      `Due now: ${displayDueNow.toFixed(2)} ${currency}`,
      `Remaining: ${displayRemaining.toFixed(2)} ${currency}`,
      `Storage source: ${result?.source || 'local'}`,
    ].join('\n');
    if (result?.notification !== 'delivered') {
      try {
        await sendFormspree(
          {
            formType: 'order',
            orderNumber: confirmedNumber,
            customerName: String(customer.name || ''),
            customerEmail: String(customer.email || ''),
            phone: String(customer.phone || ''),
            country: shippingCountryCode,
            paymentMethod: methodLabel,
            paymentPlan: trustedPlan,
            deliveryProfile: trustedDeliveryProfile,
            subtotal: displaySubtotal.toFixed(2),
            shipping: trustedQuoteRequired ? 'PENDING QUOTE' : displayShippingTotal.toFixed(2),
            total: displayTotal.toFixed(2),
            amountDueNow: displayDueNow.toFixed(2),
            remainingBalance: displayRemaining.toFixed(2),
            currency,
            items: clientItems,
            message: orderMessage,
            submittedAt: new Date().toISOString(),
          },
          `New Shababuna order ${confirmedNumber}`,
        );
      } catch {
        // The local/trusted order still remains visible to the customer. A
        // subsequent retry can re-send the same idempotent order reference.
      }
    }


    const guestAccessToken = String(result?.accessToken || '').trim();
    if (guestAccessToken) {
      try {
        sessionStorage.setItem(`shababuna-order-access:${confirmedNumber}`, guestAccessToken);
      } catch {
        /* Tracking can still be unlocked later with order number + email. */
      }
    }

    return {
      number: confirmedNumber,
      accessToken: guestAccessToken || null,
      displayDueNow,
      displayRemaining,
      orderStatus: trustedOrderStatus,
      paymentStatus: trustedPaymentStatus,
      paymentPlan: trustedPlan,
      shippingQuoteRequired: trustedQuoteRequired,
      deliveryProfile: trustedDeliveryProfile,
      source: result?.source || 'local',
    };
  };

  const submit = async () => {
    setFailed('');
    if (!validate()) return;
    setBusy(true);
    try {
      const payload = {
        currency: SITE.currency,
        displayCurrency: currency,
        locale: lang,
        customer: {
          email: form.email,
          name: `${form.firstName} ${form.lastName}`.trim(),
          phone: form.phone,
        },
        shipping: digitalOnly
          ? {
              country: shippingCountryCode || String(countryCode || 'LY'),
              digital: true,
            }
          : {
              firstName: form.firstName,
              lastName: form.lastName,
              line1: form.address,
              country: shippingCountryCode,
              address: form.address,
              apartment: form.apartment,
              city: form.city,
              state: form.state,
              postal: form.postal,
            },
        items: items.map((item) => {
          const price = Number(item.price) || 0;
          const quantity = Number(item.quantity) || 0;
          return {
            id: item.id,
            type: item.type,
            sku: item.sku,
            variantKey: item.key,
            size: String(item.size || ''),
            color: String(item.color || ''),
            name: pick((item.name || "") as LocaleText),
            quantity,
            unitPrice: price,
            lineTotal: price * quantity,
            purchaseMode: item.purchaseMode || 'retail',
            readyToShip: Boolean(item.readyToShip),
            fulfillmentType: item.fulfillmentType,
            registrationId: item.registrationId || null,
          };
        }),
        totals: { subtotal, shipping: shippingEstimate, total, amountDueNow, remainingBalance },
        paymentMethod,
        paymentPlan,
        shippingQuoteRequired,
        deliveryProfile,
      };

      const confirmation = (await savePendingOrder(payload as Record<string, unknown>)) as Record<
        string,
        unknown
      >;
      trackEvent('order_created', {
        value: total,
        currency: SITE.currency,
        payment_method: paymentMethod,
        payment_plan: confirmation.paymentPlan,
        shipping_quote_required: confirmation.shippingQuoteRequired,
      });

      if (
        !confirmation.shippingQuoteRequired &&
        paymentMethod !== 'cash' &&
        paymentConfigured &&
        confirmation.source === 'cloud'
      ) {
        try {
          const session = await createCheckoutSession({
            paymentMethod,
            orderNumber: confirmation.number,
            idempotencyKey: idempotencyRef.current,
            customerEmail: form.email,
          });
          if (session?.url) {
            trackEvent('payment_session_opened', {
              payment_method: paymentMethod,
              value: amountDueNow,
              currency: SITE.currency,
            });
            clearCart();
            sessionStorage.removeItem(CHECKOUT_KEY);
            window.location.href = session.url;
            return;
          }
        } catch (paymentError) {
          reportClientError(paymentError, { source: 'checkout_payment_session' });
          trackEvent('payment_failed', {
            payment_method: paymentMethod,
            stage: 'session_creation',
          });
          void trackCommerceEvent('payment_failed', {
            payment_method: paymentMethod,
            stage: 'session_creation',
            value: amountDueNow,
            currency: SITE.currency,
            items: items.length,
          });
          setFailed(
            pick({
              en: 'Your order was saved, but the payment page could not be opened. Use the order number to try again or contact Shababuna.',
              ar: 'تم حفظ طلبك، لكن تعذر فتح صفحة الدفع. استخدم رقم الطلب للمحاولة مرة أخرى أو تواصل مع شبابنا.',
            }),
          );
        }
      }

      trackEvent(
        confirmation.shippingQuoteRequired
          ? 'shipping_quote_order_created'
          : paymentMethod === 'cash'
            ? 'cash_order_confirmed'
            : 'order_awaiting_payment',
        { value: total, currency: SITE.currency, payment_plan: confirmation.paymentPlan },
      );
      setOrderConfirmed({ ...confirmation, paymentMethod });
      clearCart();
      sessionStorage.removeItem(CHECKOUT_KEY);
    } catch (error) {
      reportClientError(error, { source: 'checkout_order_creation' });
      trackEvent('checkout_failed', {
        stage: 'trusted_order_creation',
        payment_method: paymentMethod,
      });
      void trackCommerceEvent('payment_failed', {
        payment_method: paymentMethod,
        stage: 'trusted_order_creation',
        value: total,
        currency: SITE.currency,
        items: items.length,
      });
      setFailed(
        pick({
          en: 'We could not create a trusted order. Check the information and try again safely.',
          ar: 'تعذر إنشاء طلب موثوق. راجع البيانات وحاول مرة أخرى بأمان.',
        }),
      );
    } finally {
      setBusy(false);
    }
  };

  if (items.length === 0)
    return (
      <>
        <Seo
          title={String(checkout.title || '')}
          description={String(checkout.title || '')}
          path="/checkout"
          noindex
        />
        <section className="gw-checkout gw-checkout--terminal" aria-labelledby="gw-checkout-title">
          <div className="gw-checkout-inner">
            <div className="gw-checkout-head">
              <p className="gw-kicker">{nav.cart}</p>
              <h1 id="gw-checkout-title" className="gw-checkout-title">
                {checkout.title}
              </h1>
            </div>
            {orderConfirmed ? (
              <div className="order-confirmed">
                <span>
                  <Icon name="check" size={18} />
                </span>
                <h2>{pick({ en: 'Order received', ar: 'تم استلام طلبك' })}</h2>
                <p>
                  {pick({ en: 'Order number', ar: 'رقم الطلب' })}:{' '}
                  <strong>{String(orderConfirmed.number || '')}</strong>
                </p>
                <p>
                  {orderConfirmed.shippingQuoteRequired
                    ? pick(SHIPPING_MESSAGES.quoteRequired)
                    : orderConfirmed.paymentMethod === 'cash'
                      ? orderConfirmed.deliveryProfile === 'ready'
                        ? pick({
                            en: 'Your ready-to-ship order is confirmed. Pay the full cash amount when the order is delivered in Libya.',
                            ar: 'تم تأكيد طلبك الجاهز للتسليم. ادفع القيمة النقدية كاملة عند استلام الطلب داخل ليبيا.',
                          })
                        : pick({
                            en: 'Your reservation order is confirmed. We will contact you with the cash deposit and delivery steps.',
                            ar: 'تم تأكيد طلب الحجز. سنتواصل معك بشأن الدفعة النقدية وخطوات التسليم.',
                          })
                      : pick({
                          en: 'Your order is awaiting payment confirmation.',
                          ar: 'طلبك في انتظار تأكيد الدفع.',
                        })}
                </p>
                <div className="payment-balance-card">
                  <div>
                    <span>{orderConfirmed.paymentMethod === 'cash' && orderConfirmed.deliveryProfile === 'ready' ? pick({ en: 'Pay on delivery', ar: 'الدفع عند الاستلام' }) : pick({ en: 'Due now', ar: 'المطلوب الآن' })}</span>
                    <strong>
                      {(Number(orderConfirmed.displayDueNow) || 0).toFixed(2)} {currency}
                    </strong>
                  </div>
                  <div>
                    <span>{pick({ en: 'Remaining', ar: 'المتبقي' })}</span>
                    <strong>
                      {(Number(orderConfirmed.displayRemaining) || 0).toFixed(2)} {currency}
                    </strong>
                  </div>
                </div>
                <div className="button-row">
                  <Link to={`/order-tracking/${encodeURIComponent(String(orderConfirmed.number || ''))}`} className="btn-primary">
                    {pick({ en: 'Track Order', ar: 'تتبع الطلب' })}
                  </Link>
                  <Link to="/shop" className="btn-secondary">
                    {cartCopy.continue}
                  </Link>
                </div>
              </div>
            ) : (
              <EmptyState
                message={String(checkout.emptyCart || '')}
                action={{ label: String(cartCopy.startShopping || ''), to: '/shop' }}
              />
            )}
          </div>
        </section>
      </>
    );

  return (
    <>
      <Seo
        title={String(checkout.title || '')}
        description={String(checkout.title || '')}
        path="/checkout"
        noindex
      />

      {/* A COMMIT SEQUENCE, not a page with a hero. The masthead states where the
        visitor is and what remains; the form below is a numbered run of steps
        rather than an undifferentiated stack of fieldsets. */}
      <section className="gw-checkout" aria-labelledby="gw-checkout-title">
        <div className="gw-checkout-inner">
          <div className="gw-checkout-head">
            <p className="gw-kicker">{nav.cart}</p>
            <h1 id="gw-checkout-title" className="gw-checkout-title">
              {checkout.title}
            </h1>
            <p className="gw-checkout-assurance">{checkout.secureNote}</p>
          </div>

          <div className="gw-checkout-body">
            <div className="checkout-main gw-checkout-steps">
              {!auth.user && (
                <div className="checkout-access">
                  <div>
                    <strong>{pick({ en: 'Checkout as guest', ar: 'أكمل كزائر' })}</strong>
                    <p>{pick({ en: 'No account is required.', ar: 'لا تحتاج إلى حساب.' })}</p>
                  </div>
                  <Link to="/account?mode=signup" className="btn-secondary">
                    {pick({ en: 'Create account / Sign in', ar: 'إنشاء حساب / تسجيل الدخول' })}
                  </Link>
                </div>
              )}
              {auth.user && (
                <div className="checkout-access">
                  <div>
                    <strong>{pick({ en: 'Signed in', ar: 'تم تسجيل الدخول' })}</strong>
                    <p>{auth.user.email}</p>
                  </div>
                  <Link to="/account" className="inline-link">
                    {pick({ en: 'Manage account', ar: 'إدارة الحساب' })}
                  </Link>
                </div>
              )}

              <form
                className="checkout-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submit();
                }}
                noValidate
              >
                {Object.keys(errors).length > 0 && (
                  <div
                    ref={errorSummaryRef}
                    className="notice notice--error checkout-error-summary"
                    role="alert"
                    aria-live="assertive"
                    tabIndex={-1}
                  >
                    <strong>
                      {pick({
                        en: 'Fix the highlighted fields before continuing.',
                        ar: 'صحح الحقول المحددة قبل المتابعة.',
                      })}
                    </strong>
                    <ul>
                      {Object.entries(errors).map(([key, message]) => (
                        <li key={key}>{message}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {errors.cart && (
                  <div className="notice notice--error" role="alert">
                    <p>{errors.cart}</p>
                  </div>
                )}
                <CheckoutContactStage
                  pick={pick}
                  form={form}
                  errors={errors}
                  setField={set}
                  fieldA11y={fieldA11y}
                />

                {!digitalOnly && (
                  <CheckoutAddressStage
                    pick={pick}
                    form={form}
                    errors={errors}
                    setField={set}
                    fieldA11y={fieldA11y}
                    checkout={checkout}
                    isLibya={isLibya}
                    savedAddresses={savedAddresses}
                    selectedAddressId={selectedAddressId}
                    applySavedAddress={applySavedAddress}
                    changeCountry={changeCountry}
                  />
                )}

                <CheckoutPaymentStage
                  pick={pick}
                  isLibya={isLibya}
                  paymentMethod={paymentMethod}
                  setPaymentMethod={setPaymentMethod}
                  cashPlan={cashPlan}
                  setCashPlan={setCashPlan}
                  onlineCardConfigured={onlineCardConfigured}
                  libyanCardConfigured={libyanCardConfigured}
                  stagedOrder={stagedOrder}
                  shippingQuoteRequired={shippingQuoteRequired}
                  allowCashPlanChoice={allowCashPlanChoice}
                  immediateCash={immediateLibyaCash}
                />

                <div className={`checkout-context-card${shippingQuoteRequired ? ' is-pending' : ''}`}>
                  <span className="checkout-context-card__icon" aria-hidden="true">
                    <Icon name={shippingQuoteRequired ? 'alert' : deliveryProfile === 'ready' ? 'check' : 'orders'} size={20} />
                  </span>
                  <span className="checkout-context-card__copy">
                    <strong>
                      {shippingQuoteRequired
                        ? pick({ en: 'Shipping quote required', ar: 'يحتاج تسعير الشحن' })
                        : deliveryProfile === 'ready'
                          ? pick({ en: 'Ready for delivery', ar: 'جاهز للتسليم' })
                          : stagedOrder
                            ? pick({ en: 'Made to order', ar: 'تصنيع حسب الطلب' })
                            : pick({ en: 'Delivery', ar: 'التوصيل' })}
                    </strong>
                    <small>
                      {shippingQuoteRequired
                        ? pick({
                            en: 'Place the order now. We confirm the shipping price before collecting payment.',
                            ar: 'أرسل الطلب الآن. نؤكد سعر الشحن قبل تحصيل أي دفع.',
                          })
                        : stagedOrder
                          ? paymentMethod === 'cash' && cashPlan === 'full'
                            ? pick({
                                en: 'Paid in full at confirmation; production starts after approval.',
                                ar: 'دفع كامل عند التأكيد؛ يبدأ الإنتاج بعد الاعتماد.',
                              })
                            : pick({
                                en: '50% confirms production; the remaining 50% is due when the goods arrive.',
                                ar: '50% لتأكيد الإنتاج، و50% عند وصول البضاعة.',
                              })
                          : pick(deliveryCopy)}
                    </small>
                  </span>
                </div>

                {errors.payment && (
                  <div className="form-error" role="alert">
                    {errors.payment}
                  </div>
                )}
                {errors.shipping && (
                  <div className="form-error" role="alert">
                    {errors.shipping}
                  </div>
                )}
                <label className="field-check">
                  <input
                    type="checkbox"
                    checked={agree}
                    onChange={(event) => setAgree(event.target.checked)}
                    aria-invalid={Boolean(errors.agree)}
                    aria-describedby={errors.agree ? 'checkout-agree-error' : undefined}
                  />
                  <span>
                    {checkout.terms}{' '}
                    <Link to="/terms" className="inline-link">
                      {nav.terms}
                    </Link>
                  </span>
                </label>
                {errors.agree && (
                  <span id="checkout-agree-error" className="form-error" role="status">
                    {errors.agree}
                  </span>
                )}
                {failed && (
                  <div className="notice notice--info" role="alert">
                    {failed}
                  </div>
                )}
                <button
                  type="submit"
                  className="btn-primary block checkout-submit"
                  disabled={busy || !rateReady}
                >
                  {busy
                    ? checkout.processing
                    : shippingQuoteRequired
                      ? pick({
                          en: 'Place Pending Shipping Order',
                          ar: 'إرسال الطلب بانتظار سعر الشحن',
                        })
                      : paymentMethod !== 'cash' && paymentConfigured
                        ? `${checkout.pay} · ${format(amountDueNow, lang)}`
                        : `${pick({ en: 'Confirm Order', ar: 'تأكيد الطلب' })} · ${format(amountDueNow, lang)}`}
                </button>
                <p className="summary-note">
                  {pick({
                    en: 'Card details are never stored on Shababuna. Real card processing is completed by the connected payment provider.',
                    ar: 'لا يتم تخزين بيانات البطاقة داخل شبابنا. تتم معالجة الدفع الفعلي عبر مزود الدفع المرتبط.',
                  })}
                </p>
                <Link to="/cart" className="link-btn">
                  <Icon name="back" size={18} /> {checkout.backToCart}
                </Link>
              </form>
            </div>

            <aside className="checkout-summary">
              <h2 className="summary-title">{checkout.summary}</h2>
              <ul className="summary-items">
                {items.map((item) => {
                  const price = Number(item.price) || 0;
                  const quantity = Number(item.quantity) || 0;
                  return (
                    <li key={String(item.key)} className="summary-item">
                      <div className="summary-item-media">
                        <SmartImage src={String(item.image || '')} alt={pick((item.name || "") as LocaleText)} />
                        <span className="summary-item-qty">{quantity}</span>
                      </div>
                      <div className="summary-item-name">
                        <span>{pick((item.name || "") as LocaleText)}</span>
                        {item.size && item.size !== 'OS' ? (
                          <small>{String(item.size)}</small>
                        ) : null}
                        {item.purchaseMode === 'wholesale' ? (
                          <small>{pick({ en: 'Wholesale', ar: 'جملة' })}</small>
                        ) : null}
                      </div>
                      <span className="summary-item-price">{format(price * quantity, lang)}</span>
                    </li>
                  );
                })}
              </ul>
              <div className="summary-row">
                <span>{cartCopy.subtotal}</span>
                <span>{format(subtotal, lang)}</span>
              </div>
              <div className="summary-row">
                <span>{cartCopy.shipping}</span>
                <span>
                  {shippingQuoteRequired
                    ? pick({ en: 'Pending quote', ar: 'قيد التسعير' })
                    : shipping.status === 'physical_paid'
                      ? format(Number(shipping.amount) || 0, lang, String(shipping.currency || ''))
                      : common.free}
                </span>
              </div>
              <div className="summary-row total">
                <span>{cartCopy.total}</span>
                <span>
                  {shippingQuoteRequired
                    ? pick({ en: 'Pending shipping', ar: 'بانتظار الشحن' })
                    : format(total, lang)}
                </span>
              </div>
              <div className="payment-balance-card">
                <div>
                  <span>{pick({ en: 'Due now', ar: 'المطلوب الآن' })}</span>
                  <strong>{shippingQuoteRequired ? '—' : format(amountDueNow, lang)}</strong>
                </div>
                <div>
                  <span>{pick({ en: 'Remaining', ar: 'المتبقي' })}</span>
                  <strong>{shippingQuoteRequired ? '—' : format(remainingBalance, lang)}</strong>
                </div>
              </div>
              {isLibya && (
                <p className="summary-note">
                  {SHIPPING_MESSAGES.announcement[lang] || SHIPPING_MESSAGES.announcement.en}
                </p>
              )}
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}

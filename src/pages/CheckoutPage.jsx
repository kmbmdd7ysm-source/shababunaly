import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { createIdempotencyKey, createOrder } from '../services/orders';
import { SITE } from '../config';
import { resolveShipping, SHIPPING_MESSAGES } from '../config/shipping';
import { useCommerce } from '../context/CommerceContext';
import CountrySelect from '../components/common/CountrySelect';
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
import '../styles/checkout.css';
import { sendFormspree } from '../services/formspree';
import { listAddresses } from '../services/account/addressService';
import { reportClientError } from '../services/telemetry';
import '../styles/transact.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CHECKOUT_KEY = 'shababuna-checkout-idempotency';

export default function CheckoutPage() {
  const { t, pick, lang } = useLanguage();
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
  const [form, setForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    country: countryCode,
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
  const [orderConfirmed, setOrderConfirmed] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState('');
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const idempotencyRef = useRef(sessionStorage.getItem(CHECKOUT_KEY) || createIdempotencyKey());
  const errorSummaryRef = useRef(null);

  useEffect(() => {
    sessionStorage.setItem(CHECKOUT_KEY, idempotencyRef.current);
  }, []);
  useEffect(() => {
    if (auth.user?.email)
      setForm((current) => ({ ...current, email: current.email || auth.user.email }));
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
  }, []);

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const fieldA11y = (key) => ({
    'aria-invalid': Boolean(errors[key]),
    'aria-describedby': errors[key] ? `checkout-${key}-error` : undefined,
  });
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

  const changeCountry = (nextCode) => {
    const normalized = normalizeCountryCode(nextCode);
    setForm((current) => ({ ...current, country: normalized }));
    setCountryCode(normalized);
    setErrors((current) => ({
      ...current,
      country: undefined,
      postal: undefined,
      state: undefined,
    }));
    if (!isCashEligibleCountry(normalized) && paymentMethod === 'cash')
      setPaymentMethod('online_card');
  };

  const applySavedAddress = (address) => {
    if (!address) return;
    setSelectedAddressId(address.id || '');
    const nextCountry = normalizeCountryCode(address.country || countryCode);
    setForm((current) => ({
      ...current,
      firstName: address.first_name || current.firstName,
      lastName: address.last_name || current.lastName,
      country: nextCountry,
      address: address.address_line_1 || address.line1 || '',
      apartment: address.address_line_2 || address.line2 || '',
      city: address.city || '',
      state: address.region || '',
      postal: address.postal_code || '',
      phone: address.phone || current.phone,
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
    listAddresses(auth.user.id)
      .then((rows) => {
        if (!active) return;
        const list = rows || [];
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
  const paymentPlan = shippingQuoteRequired ? 'pending_shipping_quote' : stagedOrder ? 'half' : paymentMethod === 'cash' ? cashPlan : 'full';
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
    const next = {};
    if (!EMAIL_RE.test(form.email)) next.email = t.checkout.emailError;
    if (!digitalOnly) {
      ['firstName', 'lastName', 'country', 'address', 'city'].forEach((key) => {
        if (!form[key].trim()) next[key] = t.checkout.requiredError;
      });
      if (!addressRequirements)
        next.country = pick({ en: 'Invalid country.', ar: 'الدولة غير صالحة.' });
      if (addressRequirements?.regionRequired && !form.state.trim())
        next.state = t.checkout.requiredError;
      if (addressRequirements?.postalCodeRequired && !form.postal.trim())
        next.postal = t.checkout.requiredError;
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
    if (!agree) next.agree = t.checkout.termsError;
    setErrors(next);
    if (Object.keys(next).length) requestAnimationFrame(() => errorSummaryRef.current?.focus());
    return Object.keys(next).length === 0;
  };

  const savePendingOrder = async (payload) => {
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
    const clientItems = payload.items.map((item) => ({
      ...item,
      displayUnitPrice: convert(item.unitPrice) ?? item.unitPrice,
      displayLineTotal: convert(item.lineTotal) ?? item.lineTotal,
    }));

    const result = await createOrder(
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
      },
      { idempotencyKey: idempotencyRef.current, allowPending: true },
    );

    const trusted = result?.order || {};
    const confirmedNumber = trusted.orderNumber || fallbackOrderNumber;
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
    const trustedPlan = trusted.paymentPlan || paymentPlan;
    const trustedDeliveryProfile = trusted.deliveryProfile || deliveryProfile;
    const trustedOrderStatus = trusted.orderStatus || requestedOrderStatus;
    const trustedPaymentStatus = trusted.paymentStatus || requestedPaymentStatus;

    const orderMessage = [
      `SHABABUNA ORDER: ${confirmedNumber}`,
      `Customer: ${payload.customer.name}`,
      `Email: ${payload.customer.email}`,
      `Phone: ${payload.customer.phone || 'Not provided'}`,
      `Country: ${shippingCountryCode}`,
      `Payment method: ${methodLabel}`,
      `Payment plan: ${trustedPlan}`,
      `Shipping quote pending: ${trustedQuoteRequired ? 'YES' : 'NO'}`,
      `Delivery profile: ${trustedDeliveryProfile}`,
      `Address: ${[form.address, form.apartment, form.city, form.state, form.postal, shippingCountryCode].filter(Boolean).join(', ')}`,
      '',
      'Items:',
      ...clientItems.map(
        (item) =>
          `${item.quantity} × ${item.name}${item.purchaseMode ? ` [${item.purchaseMode}]` : ''} — ${item.displayLineTotal.toFixed(2)} ${currency}`,
      ),
      '',
      `Subtotal: ${displaySubtotal.toFixed(2)} ${currency}`,
      `Shipping: ${trustedQuoteRequired ? 'PENDING QUOTE' : `${displayShippingTotal.toFixed(2)} ${currency}`}`,
      `Order total: ${displayTotal.toFixed(2)} ${currency}`,
      `Due now: ${displayDueNow.toFixed(2)} ${currency}`,
      `Remaining: ${displayRemaining.toFixed(2)} ${currency}`,
      `Storage source: ${result?.source || 'local'}`,
    ].join('\n');
    try {
      await sendFormspree(
        {
          formType: 'order',
          message: orderMessage,
          email: payload.customer.email,
          orderNumber: confirmedNumber,
          paymentMethod: methodLabel,
          paymentPlan: trustedPlan,
          paymentStatus: trustedPaymentStatus,
          customerName: payload.customer.name,
          customerEmail: payload.customer.email,
          customerPhone: payload.customer.phone,
          subtotal: displaySubtotal,
          shippingTotal: trustedQuoteRequired ? 'pending' : displayShippingTotal,
          total: displayTotal,
          dueNow: displayDueNow,
          remainingBalance: displayRemaining,
          currency,
          canonicalSubtotal,
          canonicalShippingTotal: canonicalShipping,
          canonicalTotal,
          canonicalDueNow,
          canonicalRemainingBalance: canonicalRemaining,
          canonicalCurrency: SITE.currency,
          language: lang,
          shippingQuoteRequired: trustedQuoteRequired,
          deliveryProfile: trustedDeliveryProfile,
          createdAt: new Date().toISOString(),
          storageSource: result?.source || 'local',
        },
        `New Shababuna order ${confirmedNumber}`,
      );
    } catch {
      /* Durable database outbox remains authoritative. */
    }

    return {
      number: confirmedNumber,
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
          ? null
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
        items: items.map((item) => ({
          id: item.id,
          type: item.type,
          sku: item.sku,
          name: pick(item.name),
          quantity: item.quantity,
          unitPrice: item.price,
          lineTotal: item.price * item.quantity,
          purchaseMode: item.purchaseMode || 'retail',
          readyToShip: Boolean(item.readyToShip),
          fulfillmentType: item.fulfillmentType,
          registrationId: item.registrationId || null,
        })),
        totals: { subtotal, shipping: shippingEstimate, total, amountDueNow, remainingBalance },
        paymentMethod,
        paymentPlan,
        shippingQuoteRequired,
        deliveryProfile,
      };

      const confirmation = await savePendingOrder(payload);
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
        <Seo title={t.checkout.title} description={t.checkout.title} path="/checkout" noindex />
        <section className="gw-checkout gw-checkout--terminal">
          <div className="gw-checkout-inner">
            {orderConfirmed ? (
              <div className="order-confirmed">
                <span>
                  <Icon name="check" size={18} />
                </span>
                <h2>{pick({ en: 'Order received', ar: 'تم استلام طلبك' })}</h2>
                <p>
                  {pick({ en: 'Order number', ar: 'رقم الطلب' })}:{' '}
                  <strong>{orderConfirmed.number}</strong>
                </p>
                <p>
                  {orderConfirmed.shippingQuoteRequired
                    ? pick(SHIPPING_MESSAGES.quoteRequired)
                    : orderConfirmed.paymentMethod === 'cash'
                      ? pick({
                          en: 'Your order is pending cash confirmation. We will contact you with the next step.',
                          ar: 'طلبك قيد تأكيد الدفع النقدي، وسنتواصل معك بالخطوة التالية.',
                        })
                      : pick({
                          en: 'Your order is awaiting payment confirmation.',
                          ar: 'طلبك في انتظار تأكيد الدفع.',
                        })}
                </p>
                <div className="payment-balance-card">
                  <div>
                    <span>{pick({ en: 'Due now', ar: 'المطلوب الآن' })}</span>
                    <strong>
                      {orderConfirmed.displayDueNow.toFixed(2)} {currency}
                    </strong>
                  </div>
                  <div>
                    <span>{pick({ en: 'Remaining', ar: 'المتبقي' })}</span>
                    <strong>
                      {orderConfirmed.displayRemaining.toFixed(2)} {currency}
                    </strong>
                  </div>
                </div>
                <div className="button-row">
                  <Link to="/order-tracking" className="btn-primary">
                    {pick({ en: 'Track Order', ar: 'تتبع الطلب' })}
                  </Link>
                  <Link to="/shop" className="btn-secondary">
                    {t.cart.continue}
                  </Link>
                </div>
              </div>
            ) : (
              <EmptyState
                message={t.checkout.emptyCart}
                action={{ label: t.cart.startShopping, to: '/shop' }}
              />
            )}
          </div>
        </section>
      </>
    );

  return (
    <>
      <Seo title={t.checkout.title} description={t.checkout.title} path="/checkout" noindex />

      {/* A COMMIT SEQUENCE, not a page with a hero. The masthead states where the
        visitor is and what remains; the form below is a numbered run of steps
        rather than an undifferentiated stack of fieldsets. */}
      <section className="gw-checkout" aria-labelledby="gw-checkout-title">
        <div className="gw-checkout-inner">
          <div className="gw-checkout-head">
            <p className="gw-spec">{t.nav.cart}</p>
            <h1 id="gw-checkout-title" className="gw-checkout-title">
              {t.checkout.title}
            </h1>
            <p className="gw-checkout-assurance">{t.checkout.secureNote}</p>
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
                  submit();
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
                <fieldset className="form-block">
                  <legend>{pick({ en: 'Contact', ar: 'التواصل' })}</legend>
                  <label className="field">
                    <span>Email</span>
                    <input
                      type="email"
                      value={form.email}
                      onChange={set('email')}
                      autoComplete="email"
                      {...fieldA11y('email')}
                    />
                    {errors.email && (
                      <span id="checkout-email-error" className="form-error" role="status">
                        {errors.email}
                      </span>
                    )}
                  </label>
                  <label className="field">
                    <span>{pick({ en: 'Phone / WhatsApp', ar: 'الهاتف / واتساب' })}</span>
                    <input value={form.phone} onChange={set('phone')} autoComplete="tel" />
                  </label>
                </fieldset>

                {!digitalOnly && (
                  <fieldset className="form-block">
                    <legend>{pick({ en: 'Delivery address', ar: 'عنوان التوصيل' })}</legend>
                    {savedAddresses.length > 0 && (
                      <label className="field">
                        <span>{pick({ en: 'Saved address', ar: 'عنوان محفوظ' })}</span>
                        <select
                          value={selectedAddressId}
                          onChange={(event) =>
                            applySavedAddress(
                              savedAddresses.find((row) => row.id === event.target.value),
                            )
                          }
                        >
                          <option value="">
                            {pick({ en: 'Choose an address', ar: 'اختر عنوانًا' })}
                          </option>
                          {savedAddresses.map((address) => (
                            <option key={address.id} value={address.id}>
                              {address.label || 'Address'} —{' '}
                              {address.address_line_1 || address.line1}, {address.city}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <div className="field-row">
                      <label className="field">
                        <span>{t.checkout.firstName}</span>
                        <input
                          value={form.firstName}
                          onChange={set('firstName')}
                          autoComplete="given-name"
                          {...fieldA11y('firstName')}
                        />
                        {errors.firstName && (
                          <span id="checkout-firstName-error" className="form-error" role="status">
                            {errors.firstName}
                          </span>
                        )}
                      </label>
                      <label className="field">
                        <span>{t.checkout.lastName}</span>
                        <input
                          value={form.lastName}
                          onChange={set('lastName')}
                          autoComplete="family-name"
                          {...fieldA11y('lastName')}
                        />
                        {errors.lastName && (
                          <span id="checkout-lastName-error" className="form-error" role="status">
                            {errors.lastName}
                          </span>
                        )}
                      </label>
                    </div>
                    <label className="field">
                      <span>{t.checkout.country}</span>
                      <CountrySelect
                        value={form.country}
                        onChange={changeCountry}
                        required
                        aria-invalid={Boolean(errors.country)}
                        aria-describedby={errors.country ? 'checkout-country-error' : undefined}
                      />
                      {errors.country && (
                        <span id="checkout-country-error" className="form-error" role="status">
                          {errors.country}
                        </span>
                      )}
                    </label>
                    <label className="field">
                      <span>{t.checkout.address}</span>
                      <input
                        value={form.address}
                        onChange={set('address')}
                        autoComplete="address-line1"
                        {...fieldA11y('address')}
                      />
                      {errors.address && (
                        <span id="checkout-address-error" className="form-error" role="status">
                          {errors.address}
                        </span>
                      )}
                    </label>
                    <label className="field">
                      <span>{t.checkout.apartment}</span>
                      <input
                        value={form.apartment}
                        onChange={set('apartment')}
                        autoComplete="address-line2"
                      />
                    </label>
                    <div className="field-row">
                      <label className="field">
                        <span>{t.checkout.city}</span>
                        <input
                          value={form.city}
                          onChange={set('city')}
                          autoComplete="address-level2"
                          {...fieldA11y('city')}
                        />
                        {errors.city && (
                          <span id="checkout-city-error" className="form-error" role="status">
                            {errors.city}
                          </span>
                        )}
                      </label>
                      {!isLibya && (
                        <label className="field">
                          <span>{t.checkout.state}</span>
                          <input
                            value={form.state}
                            onChange={set('state')}
                            autoComplete="address-level1"
                            {...fieldA11y('state')}
                          />
                          {errors.state && (
                            <span id="checkout-state-error" className="form-error" role="status">
                              {errors.state}
                            </span>
                          )}
                        </label>
                      )}
                      {!isLibya && (
                        <label className="field">
                          <span>{t.checkout.postal}</span>
                          <input
                            value={form.postal}
                            onChange={set('postal')}
                            autoComplete="postal-code"
                            {...fieldA11y('postal')}
                          />
                          {errors.postal && (
                            <span id="checkout-postal-error" className="form-error" role="status">
                              {errors.postal}
                            </span>
                          )}
                        </label>
                      )}
                    </div>
                  </fieldset>
                )}

                <fieldset className="form-block payment-methods">
                  <legend>{pick({ en: 'Payment method', ar: 'طريقة الدفع' })}</legend>
                  {isLibya && (
                    <label className={`payment-choice ${paymentMethod === 'cash' ? 'active' : ''}`}>
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentMethod === 'cash'}
                        onChange={() => setPaymentMethod('cash')}
                      />
                      <span>
                        <strong>{pick({ en: 'Cash in Libya', ar: 'دفع نقدي داخل ليبيا' })}</strong>
                        <small>
                          {pick({
                            en: 'Choose 50% to confirm or pay the full amount.',
                            ar: 'اختر دفع 50% للتأكيد أو دفع القيمة كاملة.',
                          })}
                        </small>
                      </span>
                    </label>
                  )}
                  {isLibya && libyanCardConfigured && (
                    <label
                      className={`payment-choice ${paymentMethod === 'libyan_bank_card' ? 'active' : ''}`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentMethod === 'libyan_bank_card'}
                        onChange={() => setPaymentMethod('libyan_bank_card')}
                      />
                      <span>
                        <strong>
                          {pick({ en: 'Libyan Bank Card', ar: 'بطاقة مصرفية ليبية' })}
                        </strong>
                        <small>
                          {pick({
                            en: 'Full payment for retail orders through the connected bank provider.',
                            ar: 'دفع كامل للطلبات العادية عبر مزود المصرف المرتبط.',
                          })}
                        </small>
                      </span>
                    </label>
                  )}
                  {onlineCardConfigured && (
                    <label
                      className={`payment-choice ${paymentMethod === 'online_card' ? 'active' : ''}`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentMethod === 'online_card'}
                        onChange={() => setPaymentMethod('online_card')}
                      />
                      <span>
                        <strong>
                          {pick({ en: 'Card & Digital Payment', ar: 'بطاقة ودفع إلكتروني' })}
                        </strong>
                        <small>Visa · Mastercard · Apple Pay · Google Pay · Samsung Pay</small>
                      </span>
                    </label>
                  )}
                </fieldset>

                {paymentMethod === 'cash' && !stagedOrder && !shippingQuoteRequired && (
                  <fieldset className="form-block payment-plan">
                    <legend>
                      {pick({ en: 'Cash confirmation amount', ar: 'قيمة تأكيد الطلب النقدي' })}
                    </legend>
                    <div className="payment-plan-grid">
                      <label className={cashPlan === 'half' ? 'active' : ''}>
                        <input
                          type="radio"
                          name="cash-plan"
                          checked={cashPlan === 'half'}
                          onChange={() => setCashPlan('half')}
                        />
                        <strong>50%</strong>
                        <span>
                          {pick({ en: 'Pay half to confirm', ar: 'ادفع النصف لتأكيد الطلب' })}
                        </span>
                      </label>
                      <label className={cashPlan === 'full' ? 'active' : ''}>
                        <input
                          type="radio"
                          name="cash-plan"
                          checked={cashPlan === 'full'}
                          onChange={() => setCashPlan('full')}
                        />
                        <strong>100%</strong>
                        <span>{pick({ en: 'Pay in full', ar: 'ادفع القيمة كاملة' })}</span>
                      </label>
                    </div>
                  </fieldset>
                )}

                {stagedOrder && (
                  <div className="notice notice--info">
                    <strong>
                      {pick({ en: 'Wholesale payment terms', ar: 'شروط دفع الجملة' })}
                    </strong>
                    <p>
                      {pick({
                        en: '50% before production and 50% when the goods arrive. Estimated 30–60 days.',
                        ar: '50% قبل التصنيع و50% عند وصول البضاعة. المدة التقديرية 30–60 يومًا.',
                      })}
                    </p>
                  </div>
                )}
                {shippingQuoteRequired && (
                  <div className="notice notice--info">
                    <strong>
                      {pick({
                        en: 'Worldwide shipping — quote pending',
                        ar: 'شحن عالمي — السعر قيد التحديد',
                      })}
                    </strong>
                    <p>{pick(SHIPPING_MESSAGES.quoteRequired)}</p>
                    <p>
                      {pick({
                        en: 'No payment is collected until the shipping price is added and approved.',
                        ar: 'لن يتم تحصيل الدفع حتى تتم إضافة واعتماد سعر الشحن.',
                      })}
                    </p>
                  </div>
                )}
                {!shippingQuoteRequired && (
                  <div className="delivery-promise">
                    <i className={deliveryProfile === 'ready' ? 'ready-dot' : ''} />
                    <span>{pick(deliveryCopy)}</span>
                  </div>
                )}

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
                    {t.checkout.terms}{' '}
                    <Link to="/terms" className="inline-link">
                      {t.nav.terms}
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
                    ? t.checkout.processing
                    : shippingQuoteRequired
                      ? pick({
                          en: 'Place Pending Shipping Order',
                          ar: 'إرسال الطلب بانتظار سعر الشحن',
                        })
                      : paymentMethod !== 'cash' && paymentConfigured
                        ? `${t.checkout.pay} · ${format(amountDueNow, lang)}`
                        : `${pick({ en: 'Confirm Order', ar: 'تأكيد الطلب' })} · ${format(amountDueNow, lang)}`}
                </button>
                <p className="summary-note">
                  {pick({
                    en: 'Card details are never stored on Shababuna. Real card processing is completed by the connected payment provider.',
                    ar: 'لا يتم تخزين بيانات البطاقة داخل شبابنا. تتم معالجة الدفع الفعلي عبر مزود الدفع المرتبط.',
                  })}
                </p>
                <Link to="/cart" className="link-btn">
                  <Icon name="back" size={18} /> {t.checkout.backToCart}
                </Link>
              </form>
            </div>

            <aside className="checkout-summary">
              <h2 className="summary-title">{t.checkout.summary}</h2>
              <ul className="summary-items">
                {items.map((item) => (
                  <li key={item.key} className="summary-item">
                    <div className="summary-item-media">
                      <SmartImage src={item.image} alt={pick(item.name)} />
                      <span className="summary-item-qty">{item.quantity}</span>
                    </div>
                    <div className="summary-item-name">
                      <span>{pick(item.name)}</span>
                      {item.size && item.size !== 'OS' && <small>{item.size}</small>}
                      {item.purchaseMode === 'wholesale' && (
                        <small>{pick({ en: 'Wholesale', ar: 'جملة' })}</small>
                      )}
                    </div>
                    <span className="summary-item-price">
                      {format(item.price * item.quantity, lang)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="summary-row">
                <span>{t.cart.subtotal}</span>
                <span>{format(subtotal, lang)}</span>
              </div>
              <div className="summary-row">
                <span>{t.cart.shipping}</span>
                <span>
                  {shippingQuoteRequired
                    ? pick({ en: 'Pending quote', ar: 'قيد التسعير' })
                    : shipping.status === 'physical_paid'
                      ? format(shipping.amount, lang, shipping.currency)
                      : t.common.free}
                </span>
              </div>
              <div className="summary-row total">
                <span>{t.cart.total}</span>
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
                  {pick({
                    en: 'Libya delivery: 20 LYD. Free from 500 LYD.',
                    ar: 'التوصيل داخل ليبيا 20 د.ل، ومجاني من 500 د.ل.',
                  })}
                </p>
              )}
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
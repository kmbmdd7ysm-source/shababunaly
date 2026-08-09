import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { getOrderDetails } from '../services/orders';
import { retryOrderPayment } from '../services/paymentRecovery';
import { presentOrderStatus } from '../services/orderStatus';
import Seo from '../components/common/Seo';
import RouteMasthead from '../components/composition/RouteMasthead';
import '../styles/composition.css';
import TurnstileWidget from '../components/security/TurnstileWidget';

const payableStatuses = new Set(['pending', 'partially_paid', 'failed']);
const payableOrderStatuses = new Set(['awaiting_payment', 'received', 'final_payment_required']);

export default function OrderDetailPage() {
  const { orderNumber = '' } = useParams();
  const location = useLocation();
  const auth = useAuth();
  const { pick, lang } = useLanguage();
  const storageKey = `shababuna-order-access:${orderNumber}`;
  const [accessToken, setAccessToken] = useState(
    location.state?.accessToken || sessionStorage.getItem(storageKey) || '',
  );
  const [email, setEmail] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [state, setState] = useState({ state: 'loading', order: null, error: null });
  const [paymentState, setPaymentState] = useState({ busy: false, message: '', error: false });

  const load = useCallback(
    async ({ verifiedEmail = '', captcha = '', token = accessToken } = {}) => {
      setState((current) => ({ ...current, state: 'loading' }));
      const result = await getOrderDetails({
        orderNumber,
        userId: auth.user?.id,
        email: verifiedEmail,
        turnstileToken: captcha,
        accessToken: token,
      });
      if (result.accessToken) {
        setAccessToken(result.accessToken);
        sessionStorage.setItem(storageKey, result.accessToken);
      }
      setState(result);
    },
    [accessToken, auth.user?.id, orderNumber, storageKey],
  );

  useEffect(() => {
    if (!auth.loading) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional dependency scope
  }, [auth.loading, auth.user?.id, orderNumber]);

  const order = state.order;
  const payment = order ? presentOrderStatus('payment', order.paymentStatus, lang) : null;
  const status = order ? presentOrderStatus('order', order.orderStatus, lang) : null;
  const fulfillment = order
    ? presentOrderStatus('fulfillment', order.fulfillmentStatus, lang)
    : null;
  const canRetryPayment = Boolean(
    order &&
    order.paymentMethod !== 'cash_on_delivery' &&
    payableStatuses.has(order.paymentStatus) &&
    payableOrderStatuses.has(order.orderStatus) &&
    !order.shippingQuoteRequired &&
    Number(order.amountDueNow || order.outstandingBalance || 0) > 0,
  );

  const payNow = async () => {
    setPaymentState({ busy: true, message: '', error: false });
    try {
      const result = await retryOrderPayment({ orderNumber: order.orderNumber, accessToken });
      setPaymentState({
        busy: false,
        message: pick({ en: 'Secure checkout is opening…', ar: 'جاري فتح صفحة الدفع الآمنة…' }),
        error: false,
      });
      globalThis.location.assign(result.url);
    } catch (error) {
      const providerMissing = error?.message === 'payment_provider_not_connected';
      setPaymentState({
        busy: false,
        error: true,
        message: providerMissing
          ? pick({
              en: 'Online payment is temporarily unavailable. Your order remains saved; contact support to complete payment.',
              ar: 'الدفع الإلكتروني غير متاح مؤقتًا. طلبك ما زال محفوظًا؛ تواصل مع الدعم لإكمال الدفع.',
            })
          : pick({
              en: 'Payment could not be started. No additional order was created. Try again or contact support.',
              ar: 'تعذر بدء الدفع. لم يتم إنشاء طلب إضافي. حاول مرة أخرى أو تواصل مع الدعم.',
            }),
      });
    }
  };

  return (
    <>
      <Seo
        title={pick({ en: 'Order Details', ar: 'تفاصيل الطلب' })}
        path={`/order-tracking/${encodeURIComponent(orderNumber)}`}
        noindex
      />
      <RouteMasthead
        eyebrow={pick({ en: 'Order', ar: 'الطلب' })}
        title={pick({ en: 'Order Details', ar: 'تفاصيل الطلب' })}
        trail={[
          { label: pick({ en: 'Order Tracking', ar: 'تتبع الطلب' }), to: '/order-tracking' },
          { label: pick({ en: 'Order Details', ar: 'تفاصيل الطلب' }) },
        ]}
        figure={{ value: orderNumber, label: pick({ en: 'reference', ar: 'المرجع' }) }}
      />
      {/* A DESK, matching the tracking lookup it follows: one narrow measured
          column, because reading an order is a single focused task. */}
      <section className="gw-desk">
        <div className="gw-desk-inner">
          {state.state === 'loading' && (
            <p role="status">{pick({ en: 'Loading order…', ar: 'جارٍ تحميل الطلب…' })}</p>
          )}
          {state.state === 'verification-required' && (
            <form
              className="track-form"
              onSubmit={(event) => {
                event.preventDefault();
                void load({ verifiedEmail: email, captcha: turnstileToken, token: '' });
              }}
            >
              <p>
                {pick({
                  en: 'Enter the checkout email and complete the security check. A short-lived access token will be created for this order.',
                  ar: 'أدخل البريد المستخدم عند الدفع وأكمل فحص الأمان. سيتم إنشاء رمز وصول قصير المدة لهذا الطلب.',
                })}
              </p>
              <label className="field">
                <span>{pick({ en: 'Order email', ar: 'بريد الطلب' })}</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
              </label>
              <TurnstileWidget action="guest-order-detail" onToken={setTurnstileToken} />
              <button className="btn-primary" type="submit" disabled={!turnstileToken}>
                {pick({ en: 'Verify Order', ar: 'التحقق من الطلب' })}
              </button>
            </form>
          )}
          {['not-found', 'error', 'invalid'].includes(state.state) && (
            <div className="notice notice--info" role="alert">
              <p>
                {state.state === 'not-found'
                  ? pick({
                      en: 'This order was not found or you do not have permission to view it.',
                      ar: 'لم يتم العثور على هذا الطلب أو لا تملك صلاحية عرضه.',
                    })
                  : pick({
                      en: 'Order details are temporarily unavailable.',
                      ar: 'تفاصيل الطلب غير متاحة مؤقتاً.',
                    })}
              </p>
              <button className="btn-secondary" onClick={() => void load()}>
                {pick({ en: 'Retry', ar: 'إعادة المحاولة' })}
              </button>
            </div>
          )}
          {order && (
            <article className="order-detail">
              <div className="order-detail-head">
                <div>
                  <p className="section-label">{pick({ en: 'Order number', ar: 'رقم الطلب' })}</p>
                  <h2>{order.orderNumber}</h2>
                  <time dateTime={order.createdAt}>
                    {new Intl.DateTimeFormat(lang === 'ar' ? 'ar' : 'en', {
                      dateStyle: 'long',
                    }).format(new Date(order.createdAt))}
                  </time>
                </div>
              </div>
              <dl className="order-detail-status">
                <div>
                  <dt>{pick({ en: 'Order status', ar: 'حالة الطلب' })}</dt>
                  <dd>{status.label}</dd>
                </div>
                <div>
                  <dt>{pick({ en: 'Payment status', ar: 'حالة الدفع' })}</dt>
                  <dd>{payment.label}</dd>
                </div>
                <div>
                  <dt>{pick({ en: 'Fulfillment status', ar: 'حالة التنفيذ' })}</dt>
                  <dd>{fulfillment.label}</dd>
                </div>
                <div>
                  <dt>{pick({ en: 'Payment method', ar: 'طريقة الدفع' })}</dt>
                  <dd>
                    {order.paymentMethod === 'cash_on_delivery'
                      ? pick({ en: 'Cash on Delivery', ar: 'الدفع عند الاستلام' })
                      : pick({ en: 'Online payment', ar: 'الدفع الإلكتروني' })}
                  </dd>
                </div>
                <div>
                  <dt>{pick({ en: 'Paid', ar: 'المدفوع' })}</dt>
                  <dd>
                    {order.amountPaid.toFixed(2)} {order.currency}
                  </dd>
                </div>
                <div>
                  <dt>{pick({ en: 'Outstanding balance', ar: 'الرصيد غير المدفوع' })}</dt>
                  <dd>
                    {order.outstandingBalance.toFixed(2)} {order.currency}
                  </dd>
                </div>
                <div>
                  <dt>{pick({ en: 'Due now', ar: 'المستحق الآن' })}</dt>
                  <dd>
                    {order.amountDueNow.toFixed(2)} {order.currency}
                  </dd>
                </div>
              </dl>
              {canRetryPayment && (
                <section className="payment-recovery-card" aria-labelledby="payment-recovery-title">
                  <h2 id="payment-recovery-title">
                    {pick({ en: 'Complete payment', ar: 'إكمال الدفع' })}
                  </h2>
                  <p>
                    {pick({
                      en: 'This starts a new secure payment session for the same trusted order. It does not create a duplicate order.',
                      ar: 'يفتح هذا جلسة دفع آمنة جديدة لنفس الطلب الموثوق ولا ينشئ طلبًا مكررًا.',
                    })}
                  </p>
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={paymentState.busy}
                    onClick={payNow}
                  >
                    {paymentState.busy
                      ? pick({ en: 'Opening…', ar: 'جارٍ الفتح…' })
                      : pick({ en: 'Pay Now / Retry Payment', ar: 'ادفع الآن / أعد محاولة الدفع' })}
                  </button>
                  {paymentState.message && (
                    <p
                      className={paymentState.error ? 'form-status error' : 'form-status'}
                      role={paymentState.error ? 'alert' : 'status'}
                    >
                      {paymentState.message}
                    </p>
                  )}
                </section>
              )}
              <h2>{pick({ en: 'Items', ar: 'العناصر' })}</h2>
              <ul className="order-detail-items">
                {order.items.map((item, index) => (
                  <li key={`${item.id || item.sku}-${index}`}>
                    <div>
                      <strong>{item.name}</strong>
                      {item.variant && (
                        <small>
                          {typeof item.variant === 'string'
                            ? item.variant
                            : JSON.stringify(item.variant)}
                        </small>
                      )}
                    </div>
                    <span>
                      {item.quantity} × {(item.displayUnitPrice ?? item.unitPrice).toFixed(2)}{' '}
                      {order.displayCurrency}
                    </span>
                    <strong>
                      {(item.displayLineTotal ?? item.lineTotal).toFixed(2)} {order.displayCurrency}
                    </strong>
                  </li>
                ))}
              </ul>
              <dl className="order-totals">
                <div>
                  <dt>{pick({ en: 'Subtotal', ar: 'المجموع الفرعي' })}</dt>
                  <dd>
                    {(order.displaySubtotal ?? order.subtotal).toFixed(2)} {order.displayCurrency}
                  </dd>
                </div>
                <div>
                  <dt>{pick({ en: 'Shipping', ar: 'الشحن' })}</dt>
                  <dd>
                    {(order.displayShippingTotal ?? order.shippingTotal).toFixed(2)}{' '}
                    {order.displayCurrency}
                  </dd>
                </div>
                <div>
                  <dt>{pick({ en: 'Total', ar: 'الإجمالي' })}</dt>
                  <dd>
                    {(order.displayTotal ?? order.total).toFixed(2)} {order.displayCurrency}
                  </dd>
                </div>
              </dl>
            </article>
          )}
          <Link className="link-btn" to="/order-tracking">
            {pick({ en: 'Back to Order Tracking', ar: 'العودة إلى تتبع الطلب' })}
          </Link>
        </div>
      </section>
    </>
  );
}

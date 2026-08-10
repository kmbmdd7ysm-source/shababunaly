import type { FormEvent, ReactElement, ChangeEvent } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { getMyOrders, lookupGuestOrder } from '../services/orders';
import Seo from '../components/common/Seo';
import '../styles/composition.css';
import '../styles/runs.css';
import OrderCard from '../components/account/OrderCard';
import TurnstileWidget from '../components/security/TurnstileWidget';

export default function OrderTrackingPage(): ReactElement {
  const { t, pick } = useLanguage();
  const ot = (t.orderTracking || {}) as Record<string, string>;
  const auth = useAuth();
  const navigate = useNavigate();
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [lookup, setLookup] = useState<{ state: string; order: Record<string, unknown> | null; error: string | null }>({ state: 'idle', order: null, error: null });
  const [ordersState, setOrdersState] = useState<{ state: string; orders: unknown[]; error: string | null }>({ state: 'idle', orders: [], error: null });
  const [turnstileToken, setTurnstileToken] = useState('');

  const load = useCallback(async () => {
    if (!auth.user) return;
    setOrdersState((current) => ({
      ...current,
      state: current.orders.length ? 'retrying' : 'loading',
    }));
    const result = await getMyOrders(auth.user.id);
    setOrdersState({
      state: String(result.state || 'ready'),
      orders: Array.isArray(result.orders) ? result.orders : [],
      error: result.error ? String(result.error) : null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional dependency scope
  }, [auth.user?.id]);
  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!orderNumber.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setLookup({ state: 'invalid', order: null, error: null });
      return;
    }
    setLookup({ state: 'loading', order: null, error: null });
    if (!turnstileToken) {
      setLookup({ state: 'captcha-required', order: null, error: null });
      return;
    }
    const result = await lookupGuestOrder(orderNumber, email, turnstileToken);
    setLookup({
      state: String(result.state || 'idle'),
      order: (result.order as Record<string, unknown> | null) || null,
      error: result.error ? String(result.error) : null,
    });
    const order = result.order as Record<string, unknown> | null | undefined;
    const accessToken = result.accessToken;
    if (order && accessToken) {
      const number = String(order.orderNumber || '');
      sessionStorage.setItem(`shababuna-order-access:${number}`, String(accessToken));
      navigate(`/order-tracking/${encodeURIComponent(number)}`);
    }
  };

  return (
    <>
      <Seo
        title={ot.title || ''}
        description={ot.sub || ''}
        path="/order-tracking"
        noindex
      />
      <section className="gw-world-headband" aria-labelledby="tracking-title">
        <div className="gw-cat-head-inner">
          <p className="gw-kicker">{ot.label}</p>
          <div className="gw-cat-head-row">
            <div>
              <h1 id="tracking-title" className="gw-cat-title">
                {ot.title}
              </h1>
              <p className="gw-world-lede">{ot.sub}</p>
            </div>
            {auth.user && ordersState.orders.length ? (
              <p className="gw-cat-count">
                <span className="gw-figure gw-isolate-ltr">{ordersState.orders.length}</span>
                <span className="gw-kicker">{pick({ en: 'orders', ar: 'طلب' })}</span>
              </p>
            ) : null}
          </div>
        </div>
      </section>
      {/* A LOOKUP DESK: a narrow measured column, because tracking is one
          focused task with one answer - not a browsing surface. */}
      <section className="gw-desk">
        <div className="gw-desk-inner">
          {auth.user && (
            <section aria-labelledby="my-orders-title">
              <div className="section-heading-row">
                <h2 id="my-orders-title">{pick({ en: 'My Orders', ar: 'طلباتي' })}</h2>
                {['error', 'partial'].includes(ordersState.state) && (
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      void load();
                    }}
                    disabled={ordersState.state === 'retrying'}
                  >
                    {ordersState.state === 'retrying'
                      ? pick({ en: 'Retrying…', ar: 'جارٍ إعادة المحاولة…' })
                      : pick({ en: 'Retry', ar: 'إعادة المحاولة' })}
                  </button>
                )}
              </div>
              {ordersState.state === 'loading' && (
                <p role="status">{pick({ en: 'Loading orders…', ar: 'جاري تحميل الطلبات…' })}</p>
              )}
              {ordersState.state === 'partial' && (
                <div className="notice notice--info" role="status">
                  {pick({
                    en: 'Cloud synchronization is temporarily unavailable. The local orders shown below may not include purchases from another device.',
                    ar: 'المزامنة السحابية غير متاحة مؤقتاً. قد لا تشمل الطلبات المحلية المعروضة أدناه المشتريات من جهاز آخر.',
                  })}
                </div>
              )}
              {ordersState.state === 'error' && (
                <div className="notice notice--info" role="alert">
                  <p>
                    {pick({
                      en: 'We could not load your orders. Please retry.',
                      ar: 'تعذر تحميل طلباتك. يرجى إعادة المحاولة.',
                    })}
                  </p>
                </div>
              )}
              {!['loading', 'error'].includes(ordersState.state) &&
                (ordersState.orders.length ? (
                  <div className="orders-list">
                    {ordersState.orders.map((order) => (
                      <OrderCard
                        key={String((order as Record<string, unknown>).id || '')}
                        order={order as never}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="notice notice--muted">
                    <p>{pick({ en: 'No orders yet.', ar: 'لا توجد طلبات حتى الآن.' })}</p>
                    <Link to="/shop">{pick({ en: 'Start shopping', ar: 'ابدأ التسوق' })}</Link>
                  </div>
                ))}
            </section>
          )}
          <section aria-labelledby="guest-lookup-title">
            <h2 id="guest-lookup-title">
              {pick({ en: 'Guest Order Lookup', ar: 'البحث عن طلب ضيف' })}
            </h2>
            <p>
              {pick({
                en: 'Use the order number and the same email used at checkout.',
                ar: 'استخدم رقم الطلب ونفس البريد المستخدم عند الدفع.',
              })}
            </p>
            <form
              className="track-form"
              onSubmit={(event) => {
                void submit(event);
              }}
              noValidate
            >
              <label className="field">
                <span>{ot.orderNumber}</span>
                <input
                  value={orderNumber}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setOrderNumber(event.target.value)
                  }
                  autoComplete="off"
                  required
                />
              </label>
              <label className="field">
                <span>{ot.email}</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setEmail(event.target.value)
                  }
                  autoComplete="email"
                  required
                />
              </label>
              <TurnstileWidget action="guest-order-lookup" onToken={setTurnstileToken} />
              <button
                type="submit"
                className="btn-primary block"
                disabled={lookup.state === 'loading'}
              >
                {lookup.state === 'loading'
                  ? pick({ en: 'Checking…', ar: 'جارٍ التحقق…' })
                  : ot.track}
              </button>
            </form>
            {lookup.state === 'captcha-required' && (
              <div className="notice notice--info" role="alert">
                {pick({
                  en: 'Complete the security check before looking up the order.',
                  ar: 'أكمل فحص الأمان قبل البحث عن الطلب.',
                })}
              </div>
            )}
            {lookup.state === 'invalid' && (
              <div className="notice notice--info" role="alert">
                {pick({
                  en: 'Enter both a valid order number and order email.',
                  ar: 'أدخل رقم طلب وبريد إلكتروني صحيحين.',
                })}
              </div>
            )}
            {lookup.state === 'not-found' && (
              <div className="notice notice--info" role="alert">
                {pick({
                  en: 'No matching order was found. Check both details or contact support.',
                  ar: 'لم يتم العثور على طلب مطابق. تحقق من البيانات أو تواصل مع الدعم.',
                })}
              </div>
            )}
            {lookup.state === 'error' && (
              <div className="notice notice--info" role="alert">
                {pick({
                  en: 'Order lookup is temporarily unavailable. Please retry later.',
                  ar: 'البحث عن الطلب غير متاح مؤقتاً. يرجى المحاولة لاحقاً.',
                })}
              </div>
            )}
          </section>
          <p className="notice notice--muted">
            {ot.note} <Link to="/contact?type=order">{ot.contact}</Link>
          </p>
        </div>
      </section>
    </>
  );
}

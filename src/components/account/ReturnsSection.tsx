import type { FormEvent, ReactElement } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { cancelReturnRequest, createReturnRequest, listMyReturns } from '../../services/returns';

const RETURN_WINDOW_DAYS = 14;
const ACTIVE_STATUSES = new Set([
  'requested',
  'under_review',
  'approved',
  'received',
  'refund_pending',
]);

function withinWindow(order: Record<string, unknown>): boolean {
  const delivered =
    order.deliveredAt || (order.orderStatus === 'delivered' ? order.updatedAt : null);
  if (!delivered) return false;
  const age = Date.now() - new Date(String(delivered)).getTime();
  return Number.isFinite(age) && age >= 0 && age <= RETURN_WINDOW_DAYS * 86400000;
}

function returnableItems(order: Record<string, unknown>): Array<Record<string, unknown>> {
  const items = Array.isArray(order.items) ? (order.items as Array<Record<string, unknown>>) : [];
  return items.filter(
    (item) =>
      Boolean(item.variantId) &&
      String(item.purchaseMode || 'retail').toLowerCase() === 'retail' &&
      !item.customizable,
  );
}

function statusLabel(status: unknown, pick: (v: { en: string; ar: string }) => string): string {
  const labels = {
    requested: { en: 'Requested', ar: 'تم تقديم الطلب' },
    under_review: { en: 'Under review', ar: 'قيد المراجعة' },
    approved: { en: 'Approved', ar: 'تمت الموافقة' },
    rejected: { en: 'Rejected', ar: 'مرفوض' },
    received: { en: 'Items received', ar: 'تم استلام المنتجات' },
    refund_pending: { en: 'Refund pending', ar: 'الاسترداد قيد التنفيذ' },
    refunded: { en: 'Refunded', ar: 'تم رد المبلغ' },
    closed: { en: 'Closed', ar: 'مغلق' },
    cancelled: { en: 'Cancelled', ar: 'ملغي' },
  };
  const key = String(status || '');
  return pick(
    (labels as Record<string, { en: string; ar: string }>)[key] || {
      en: key || 'Unknown',
      ar: key || 'غير معروف',
    },
  );
}

export default function ReturnsSection({
  orders = [],
}: {
  orders?: Array<Record<string, unknown>>;
}): ReactElement {
  const auth = useAuth();
  const { pick, lang } = useLanguage();
  const [returns, setReturns] = useState<Array<Record<string, unknown>>>([]);
  const [selectedOrder, setSelectedOrder] = useState('');
  const [selected, setSelected] = useState<Record<string, { checked: boolean; quantity: number }>>(
    {},
  );
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [state, setState] = useState({ loading: true, busy: '', message: '' });

  const eligibleOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.source === 'cloud' &&
          order.orderStatus === 'delivered' &&
          withinWindow(order) &&
          returnableItems(order).length > 0 &&
          !returns.some(
            (request) =>
              request.order_number === order.orderNumber &&
              ACTIVE_STATUSES.has(String(request.status || '')),
          ),
      ),
    [orders, returns],
  );

  const order = useMemo(
    () =>
      eligibleOrders.find((item) => String(item.orderNumber || '') === selectedOrder) ||
      eligibleOrders[0] ||
      null,
    [eligibleOrders, selectedOrder],
  );

  const load = useCallback(async () => {
    if (!auth.user?.id) return;
    setState((current) => ({ ...current, loading: true, message: '' }));
    try {
      const data = await listMyReturns(String(auth.user.id));
      setReturns((Array.isArray(data) ? data : []).map((row) => row as Record<string, unknown>));
      setState((current) => ({ ...current, loading: false }));
    } catch (error) {
      setState({
        loading: false,
        busy: '',
        message: `${pick({ en: 'Returns could not be loaded.', ar: 'تعذر تحميل طلبات الإرجاع.' })} ${(error instanceof Error ? error.message : '') || ''}`,
      });
    }
  }, [auth.user?.id, pick]);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (!order) return;
    setSelectedOrder(String(order.orderNumber || ''));
    setSelected((current) => {
      const next: Record<string, { checked: boolean; quantity: number }> = {};
      for (const item of returnableItems(order)) {
        const variantId = String(item.variantId || '');
        next[variantId] = current[variantId] || { checked: false, quantity: 1 };
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional dependency scope
  }, [order?.orderNumber]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!order) return;
    const items = returnableItems(order)
      .filter((item) => selected[String(item.variantId || '')]?.checked)
      .map((item) => {
        const variantId = String(item.variantId || '');
        return {
          variantId,
          sku: String(item.sku || ''),
          name: item.name,
          quantity: Math.min(
            Number(item.quantity) || 1,
            Math.max(1, Number(selected[variantId]?.quantity) || 1),
          ),
        };
      });
    if (!reason.trim() || !items.length) {
      setState((current) => ({
        ...current,
        message: pick({
          en: 'Choose at least one item and enter a reason.',
          ar: 'اختر منتجًا واحدًا على الأقل واكتب سبب الإرجاع.',
        }),
      }));
      return;
    }
    setState((current) => ({ ...current, busy: 'create', message: '' }));
    try {
      await createReturnRequest({
        orderNumber: String(order.orderNumber || ''),
        reason,
        details,
        items: items as never,
      });
      setReason('');
      setDetails('');
      setSelected({});
      setState({
        loading: false,
        busy: '',
        message: pick({
          en: 'Return request submitted. Shababuna has been notified by email.',
          ar: 'تم إرسال طلب الإرجاع ووصل إشعار إلى شبابنا عبر البريد.',
        }),
      });
      await load();
    } catch (error) {
      setState((current) => ({
        ...current,
        busy: '',
        message: `${pick({ en: 'Return request failed:', ar: 'تعذر إرسال طلب الإرجاع:' })} ${(error instanceof Error ? error.message : '') || error}`,
      }));
    }
  };

  const cancel = async (request: Record<string, unknown>) => {
    setState((current) => ({ ...current, busy: String(request.id || ''), message: '' }));
    try {
      await cancelReturnRequest({
        returnId: String(request.id || ''),
        note: pick({ en: 'Cancelled by customer.', ar: 'ألغاه العميل.' }),
      });
      await load();
    } catch (error) {
      setState((current) => ({
        ...current,
        busy: '',
        message: `${pick({ en: 'Could not cancel:', ar: 'تعذر الإلغاء:' })} ${(error instanceof Error ? error.message : '') || error}`,
      }));
    }
  };

  return (
    <section className="returns-section" aria-labelledby="account-returns-title">
      <div className="section-heading-row">
        <div>
          <p className="section-label">RETURNS</p>
          <h2 id="account-returns-title">
            {pick({ en: 'Returns & refunds', ar: 'الإرجاع واسترداد المبالغ' })}
          </h2>
        </div>
        <button
          type="button"
          className="btn-secondary compact"
          onClick={() => {
            void load();
          }}
          disabled={state.loading}
        >
          {pick({ en: 'Refresh', ar: 'تحديث' })}
        </button>
      </div>
      <p className="returns-policy-note">
        {pick({
          en: 'Eligible ready-made retail products can be requested within 14 days after delivery. Custom, printed and wholesale orders are final unless defective.',
          ar: 'يمكن طلب إرجاع المنتجات الجاهزة المباعة بالقطعة خلال 14 يومًا من التسليم. الطلبات المخصصة أو المطبوعة أو بالجملة نهائية إلا في حالة وجود عيب.',
        })}
      </p>
      {state.message && (
        <p className="form-status" role="status">
          {state.message}
        </p>
      )}

      {returns.length > 0 && (
        <div className="returns-history">
          {returns.map((request) => (
            <article key={String(request.id)} className="return-history-card">
              <div>
                <strong>{String(request.return_number || '')}</strong>
                <span className="status-badge status-neutral">
                  {statusLabel(request.status, pick)}
                </span>
              </div>
              <p>
                {String(request.order_number || '')} · {String(request.reason || '')}
              </p>
              <small>
                {new Intl.DateTimeFormat(lang === 'ar' ? 'ar-LY' : 'en-US', {
                  dateStyle: 'medium',
                }).format(new Date(String(request.created_at || Date.now())))}
              </small>
              {request.refund_amount != null ? (
                <strong>${Number(request.refund_amount).toFixed(2)} USD</strong>
              ) : null}
              {['requested', 'under_review'].includes(String(request.status || '')) ? (
                <button
                  type="button"
                  className="link-btn"
                  disabled={state.busy === String(request.id || '')}
                  onClick={() => {
                    void cancel(request);
                  }}
                >
                  {pick({ en: 'Cancel request', ar: 'إلغاء الطلب' })}
                </button>
              ) : null}
            </article>
          ))}
        </div>
      )}

      {state.loading ? (
        <p role="status">{pick({ en: 'Loading returns…', ar: 'جاري تحميل الإرجاع…' })}</p>
      ) : eligibleOrders.length ? (
        <form
          className="return-request-form"
          onSubmit={(event) => {
            void submit(event);
          }}
        >
          <h3>{pick({ en: 'Start a return', ar: 'ابدأ طلب إرجاع' })}</h3>
          <label>
            <span>{pick({ en: 'Delivered order', ar: 'الطلب الذي تم تسليمه' })}</span>
            <select
              value={String(order?.orderNumber || '')}
              onChange={(event) => setSelectedOrder(event.target.value)}
            >
              {eligibleOrders.map((item) => (
                <option key={String(item.orderNumber)} value={String(item.orderNumber || '')}>
                  {String(item.orderNumber || '')}
                </option>
              ))}
            </select>
          </label>
          <div className="return-item-list">
            {order
              ? returnableItems(order).map((item) => {
                  const variantId = String(item.variantId || '');
                  const value = selected[variantId] || { checked: false, quantity: 1 };
                  return (
                    <div className="return-item-row" key={variantId}>
                      <label>
                        <input
                          type="checkbox"
                          checked={value.checked}
                          onChange={(event) =>
                            setSelected((current) => ({
                              ...current,
                              [variantId]: { ...value, checked: event.target.checked },
                            }))
                          }
                        />
                        <span>
                          <strong>{String(item.name || '')}</strong>
                          <small>{String(item.sku || item.variantId || '')}</small>
                        </span>
                      </label>
                      <label>
                        <span>{pick({ en: 'Quantity', ar: 'الكمية' })}</span>
                        <input
                          type="number"
                          min={1}
                          max={Number(item.quantity) || 1}
                          value={value.quantity}
                          disabled={!value.checked}
                          onChange={(event) =>
                            setSelected((current) => ({
                              ...current,
                              [variantId]: {
                                ...value,
                                quantity: Number(event.target.value) || 1,
                              },
                            }))
                          }
                        />
                      </label>
                    </div>
                  );
                })
              : null}
          </div>
          <label>
            <span>{pick({ en: 'Reason', ar: 'السبب' })}</span>
            <input
              value={reason}
              maxLength={120}
              required
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          <label>
            <span>{pick({ en: 'Details', ar: 'التفاصيل' })}</span>
            <textarea
              rows={4}
              value={details}
              maxLength={3000}
              onChange={(event) => setDetails(event.target.value)}
            />
          </label>
          <button className="btn-primary" disabled={state.busy === 'create'}>
            {state.busy === 'create'
              ? pick({ en: 'Submitting…', ar: 'جاري الإرسال…' })
              : pick({ en: 'Submit Return Request', ar: 'إرسال طلب الإرجاع' })}
          </button>
        </form>
      ) : (
        <div className="notice notice--muted">
          {pick({
            en: 'No delivered retail order is currently eligible for return.',
            ar: 'لا يوجد حاليًا طلب تجزئة مسلّم مؤهل للإرجاع.',
          })}
        </div>
      )}
    </section>
  );
}

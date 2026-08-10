import type { ReactElement } from 'react';
import { useState } from 'react';
import { updateOrderWorkflow, recordManualPayment, recordRefund } from '../../services/operations';
import { ORDER_TRANSITIONS, money } from './commerceHelpers';
import type { OperationsRunFn } from '../../types/operations';

export function OrderOperationsCard({
  order,
  pick,
  saving,
  run,
}: {
  order: Record<string, unknown>;
  pick: (value: import('../../context/LanguageContext').LocaleValue) => string;
  saving?: string | boolean | undefined;
  run: OperationsRunFn;
}): ReactElement {
  const [nextStatus, setNextStatus] = useState(String(order.order_status || ''));
  const [payment, setPayment] = useState(String(order.amount_due_now || ''));
  const [method, setMethod] = useState('cash');
  const [reference, setReference] = useState('');
  const [refund, setRefund] = useState('');
  const [refundReference, setRefundReference] = useState('');
  const transitions = [
    String(order.order_status || ''),
    ...((ORDER_TRANSITIONS as Record<string, string[]>)[String(order.order_status || '')] || []),
  ];
  const workflowKey = `workflow-${order.id}`;
  const paymentKey = `payment-${order.id}`;
  const refundKey = `refund-${order.id}`;
  const refundable = Math.max(
    0,
    Number(order.amount_paid || 0) - Number(order.amount_refunded || 0),
  );
  return (
    <article className="operations-card order-operations-card">
      <div>
        <span>{String(order.order_number ?? '')}</span>
        <strong>{money(order.total)}</strong>
      </div>
      <p>{String(order.customer_email ?? '')}</p>
      <div className="operations-payment-summary">
        <small>
          {pick({ en: 'Paid', ar: 'مدفوع' })}: {money(order.amount_paid)}
        </small>
        <small>
          {pick({ en: 'Refunded', ar: 'مسترد' })}: {money(order.amount_refunded || 0)}
        </small>
        <small>
          {pick({ en: 'Due now', ar: 'مطلوب الآن' })}: {money(order.amount_due_now)}
        </small>
        <small>
          {pick({ en: 'Later', ar: 'لاحقًا' })}:{' '}
          {money(
            Math.max(
              0,
              Number(order.outstanding_balance ?? order.remaining_balance ?? 0) -
                Number(order.amount_due_now || 0),
            ),
          )}
        </small>
      </div>
      <label>
        <span>{pick({ en: 'Next valid status', ar: 'الحالة التالية المسموحة' })}</span>
        <select value={nextStatus} onChange={(event) => setNextStatus(event.target.value)}>
          {transitions.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
      </label>
      <button
        className="btn-secondary"
        disabled={saving === workflowKey || nextStatus === order.order_status}
        onClick={() =>
          run(
            workflowKey,
            () =>
              updateOrderWorkflow({
                orderId: String(order.id || ''),
                orderStatus: nextStatus,
                paymentStatus: null,
                fulfillmentStatus: null,
              }),
            pick({
              en: 'Order status saved and notification queued.',
              ar: 'تم حفظ حالة الطلب وإضافة الإشعار.',
            }),
          )
        }
      >
        {pick({ en: 'Update Status', ar: 'تحديث الحالة' })}
      </button>
      {Number(order.amount_due_now) > 0 && (
        <div className="manual-payment-panel">
          <strong>{pick({ en: 'Record confirmed payment', ar: 'تسجيل دفعة مؤكدة' })}</strong>
          <div className="operations-price-grid">
            <input
              type="number"
              min="0.01"
              max={Number(order.amount_due_now) || undefined}
              step="0.01"
              value={payment}
              onChange={(event) => setPayment(event.target.value)}
            />
            <select value={method} onChange={(event) => setMethod(event.target.value)}>
              <option value="cash">Cash</option>
              <option value="libyan_bank_card">Libyan Bank Card</option>
              <option value="bank_transfer">Bank Transfer</option>
            </select>
            <input
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder={pick({ en: 'Reference', ar: 'المرجع' })}
            />
          </div>
          <button
            className="btn-primary compact"
            disabled={saving === paymentKey || !payment}
            onClick={() =>
              run(
                paymentKey,
                () =>
                  recordManualPayment({
                    orderId: String(order.id || ''),
                    amountUsd: payment,
                    method,
                    reference,
                  }),
                pick({ en: 'Payment recorded securely.', ar: 'تم تسجيل الدفعة بأمان.' }),
              )
            }
          >
            {pick({ en: 'Confirm Payment', ar: 'تأكيد الدفع' })}
          </button>
        </div>
      )}
      {refundable > 0 && (
        <details className="refund-panel">
          <summary>{pick({ en: 'Issue a verified refund', ar: 'تسجيل استرداد موثق' })}</summary>
          <div className="operations-price-grid">
            <input
              type="number"
              min="0.01"
              max={refundable}
              step="0.01"
              value={refund}
              onChange={(event) => setRefund(event.target.value)}
              placeholder={money(refundable)}
            />
            <input
              value={refundReference}
              onChange={(event) => setRefundReference(event.target.value)}
              placeholder={pick({ en: 'Refund reference', ar: 'مرجع الاسترداد' })}
            />
          </div>
          <button
            className="btn-secondary compact"
            disabled={saving === refundKey || !refund || Number(refund) > refundable}
            onClick={() =>
              run(
                refundKey,
                () =>
                  recordRefund({
                    orderId: String(order.id || ''),
                    amountUsd: refund,
                    method: 'manual',
                    reference: refundReference,
                  }),
                pick({
                  en: 'Refund recorded and customer notification queued.',
                  ar: 'تم تسجيل الاسترداد وإضافة إشعار العميل.',
                }),
              )
            }
          >
            {pick({ en: 'Confirm Refund', ar: 'تأكيد الاسترداد' })}
          </button>
        </details>
      )}
    </article>
  );
}

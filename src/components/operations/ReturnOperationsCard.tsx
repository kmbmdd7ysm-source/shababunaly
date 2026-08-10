import type { ReactElement } from 'react';
import { useState } from 'react';
import { updateReturnRequest, recordRefund } from '../../services/operations';
import { RETURN_TRANSITIONS } from './commerceHelpers';
import type { OperationsRunFn } from '../../types/operations';

export function ReturnOperationsCard({
  request,
  orders,
  pick,
  saving,
  run,
}: {
  request: Record<string, unknown>;
  orders?: Array<Record<string, unknown>>;
  pick: (value: import('../../context/LanguageContext').LocaleValue) => string;
  saving?: string | boolean | undefined;
  run: OperationsRunFn;
}): ReactElement {
  const order = (orders || []).find(
    (item: Record<string, unknown>) => item.id === request.order_id,
  );
  const [status, setStatus] = useState(String(request.status || ''));
  const [resolution, setResolution] = useState(String(request.resolution || 'refund'));
  const [refundAmount, setRefundAmount] = useState(String(request.refund_amount || ''));
  const [note, setNote] = useState(String(request.staff_note || ''));
  const [restock, setRestock] = useState(false);
  const [reference, setReference] = useState('');
  const transitions = [
    String(request.status || ''),
    ...((RETURN_TRANSITIONS as Record<string, string[]>)[String(request.status || '')] || []),
  ];
  const updateKey = `return-${String(request.id ?? '')}`;
  const refundKey = `return-refund-${String(request.id ?? '')}`;
  const refundable = Math.max(
    0,
    Number(order?.amount_paid || 0) - Number(order?.amount_refunded || 0),
  );
  return (
    <article className="operations-card return-operations-card">
      <div>
        <span>{String(request.return_number ?? '')}</span>
        <strong>{String(request.status ?? '')}</strong>
      </div>
      <p>
        {String(request.order_number ?? '')} · {String(request.customer_email ?? '')}
      </p>
      <p>{String(request.reason ?? '')}</p>
      <ul>
        {(Array.isArray(request.requested_items)
          ? (request.requested_items as Array<Record<string, unknown>>)
          : []
        ).map((item, index) => (
          <li key={`${String(item.variantId || item.sku || index)}-${index}`}>
            {String(item.quantity ?? '')} × {String(item.name || item.sku || '')}
          </li>
        ))}
      </ul>
      <label>
        <span>{pick({ en: 'Next return status', ar: 'حالة الإرجاع التالية' })}</span>
        <select value={String(status)} onChange={(event) => setStatus(event.target.value)}>
          {transitions.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </label>
      <label>
        <span>{pick({ en: 'Resolution', ar: 'الحل' })}</span>
        <select
          value={String(resolution ?? '')}
          onChange={(event) => setResolution(event.target.value)}
        >
          <option value="refund">Refund</option>
          <option value="replacement">Replacement</option>
          <option value="store_credit">Store Credit</option>
          <option value="no_action">No Action</option>
        </select>
      </label>
      <textarea
        rows={3}
        value={String(note ?? '')}
        onChange={(event) => setNote(event.target.value)}
        placeholder={pick({ en: 'Staff note sent to customer', ar: 'ملاحظة الموظف للعميل' })}
      />
      {status === 'received' && (
        <label className="operations-check">
          <input
            type="checkbox"
            checked={restock}
            onChange={(event) => setRestock(event.target.checked)}
          />
          <span>
            {pick({
              en: 'Return approved inventory to tracked stock',
              ar: 'إعادة المنتجات المقبولة إلى المخزون المتتبع',
            })}
          </span>
        </label>
      )}
      <button
        className="btn-secondary"
        disabled={saving === updateKey || status === request.status}
        onClick={() =>
          run(
            updateKey,
            () =>
              updateReturnRequest({
                returnId: String(request.id || ''),
                status: String(status || ''),
                resolution: resolution == null ? null : String(resolution),
                refundAmount: refundAmount || null,
                staffNote: String(note || ''),
                restock: Boolean(restock),
              }),
            pick({
              en: 'Return updated and customer notified.',
              ar: 'تم تحديث الإرجاع وإشعار العميل.',
            }),
          )
        }
      >
        {pick({ en: 'Save Return', ar: 'حفظ الإرجاع' })}
      </button>
      {request.status === 'refund_pending' && order && (
        <div className="manual-payment-panel">
          <strong>{pick({ en: 'Complete refund', ar: 'إكمال رد المبلغ' })}</strong>
          <div className="operations-price-grid">
            <input
              type="number"
              min="0.01"
              max={refundable}
              step="0.01"
              value={String(refundAmount ?? '')}
              onChange={(event) => setRefundAmount(event.target.value)}
            />
            <input
              value={String(reference ?? '')}
              onChange={(event) => setReference(event.target.value)}
              placeholder={pick({ en: 'Refund reference', ar: 'مرجع الاسترداد' })}
            />
          </div>
          <button
            className="btn-primary compact"
            disabled={saving === refundKey || !refundAmount || Number(refundAmount) > refundable}
            onClick={() =>
              run(
                refundKey,
                () =>
                  recordRefund({
                    orderId: String(order.id || ''),
                    amountUsd: Number(refundAmount) || 0,
                    method: 'return_refund',
                    reference: String(reference || ''),
                    returnRequestId: String(request.id || ''),
                  }),
                pick({
                  en: 'Refund completed and customer notified.',
                  ar: 'تم رد المبلغ وإشعار العميل.',
                }),
              )
            }
          >
            {pick({ en: 'Confirm Refund', ar: 'تأكيد رد المبلغ' })}
          </button>
        </div>
      )}
    </article>
  );
}

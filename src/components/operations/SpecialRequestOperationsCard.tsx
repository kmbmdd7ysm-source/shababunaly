import type { ReactElement } from 'react';
import { useState } from 'react';
import { updateSpecialRequest } from '../../services/operations';
import type { OperationsRunFn } from '../../types/operations';

export function SpecialRequestOperationsCard({
  request,
  pick,
  saving,
  run,
}: {
  request: Record<string, unknown>;
  pick: (value: import('../../context/LanguageContext').LocaleValue) => string;
  saving?: string | boolean | undefined;
  run: OperationsRunFn;
}): ReactElement {
  const [values, setValues] = useState({
    status: String(request.status || 'under_review'),
    productCost: String(request.quoted_product_cost ?? ''),
    shippingCost: String(request.shipping_cost ?? ''),
    taxTotal: String(request.tax_total ?? '0'),
    discountTotal: String(request.discount_total ?? '0'),
    currency: String(request.currency || 'USD'),
    estimatedArrivalDays: String(request.estimated_arrival_days ?? ''),
    staffNotes: String(request.staff_notes || ''),
    paymentUrl: String(request.payment_url || ''),
    quoteExpiresAt: String(request.quote_expires_at || ''),
  });
  const key = `special-${String(request.id || '')}`;
  const total = Math.max(
    0,
    Number(values.productCost || 0) +
      Number(values.shippingCost || 0) +
      Number(values.taxTotal || 0) -
      Number(values.discountTotal || 0),
  );
  const set =
    (field: string) =>
    (
      event: import('react').ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) =>
      setValues((current) => ({ ...current, [field]: event.target.value }));
  return (
    <article className="operations-card special-request-operations-card">
      <div>
        <span>{String(request.request_number ?? '')}</span>
        <strong>{String(request.status ?? '')}</strong>
      </div>
      <p>
        {String(request.customer_name ?? '')} · {String(request.customer_email ?? '')}
      </p>
      <p>{String(request.description ?? '')}</p>
      {request.product_url ? (
        <a href={String(request.product_url ?? '')} target="_blank" rel="noopener noreferrer">
          {pick({ en: 'Open product reference', ar: 'فتح مرجع المنتج' })}
        </a>
      ) : null}
      <div className="operations-form-grid">
        <label>
          <span>{pick({ en: 'Status', ar: 'الحالة' })}</span>
          <select value={values.status} onChange={set('status')}>
            {[
              'submitted',
              'under_review',
              'more_information_required',
              'quoted',
              'awaiting_customer',
              'awaiting_payment',
              'ordered',
              'unavailable',
              'rejected',
              'closed',
            ].map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </label>
        <label>
          <span>{pick({ en: 'Currency', ar: 'العملة' })}</span>
          <select value={values.currency} onChange={set('currency')}>
            <option>USD</option>
            <option>LYD</option>
          </select>
        </label>
        <label>
          <span>{pick({ en: 'Product cost', ar: 'سعر المنتج' })}</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={values.productCost}
            onChange={set('productCost')}
          />
        </label>
        <label>
          <span>{pick({ en: 'Shipping', ar: 'الشحن' })}</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={values.shippingCost}
            onChange={set('shippingCost')}
          />
        </label>
        <label>
          <span>{pick({ en: 'Tax', ar: 'الضريبة' })}</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={values.taxTotal}
            onChange={set('taxTotal')}
          />
        </label>
        <label>
          <span>{pick({ en: 'Discount', ar: 'الخصم' })}</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={values.discountTotal}
            onChange={set('discountTotal')}
          />
        </label>
        <label>
          <span>{pick({ en: 'Arrival days', ar: 'مدة الوصول بالأيام' })}</span>
          <input
            type="number"
            min="1"
            max="365"
            value={values.estimatedArrivalDays}
            onChange={set('estimatedArrivalDays')}
          />
        </label>
        <label>
          <span>{pick({ en: 'Quote expires', ar: 'انتهاء العرض' })}</span>
          <input
            type="datetime-local"
            value={values.quoteExpiresAt}
            onChange={set('quoteExpiresAt')}
          />
        </label>
      </div>
      <p>
        <strong>
          {pick({ en: 'Calculated total', ar: 'الإجمالي المحسوب' })}: {total.toFixed(2)}{' '}
          {values.currency}
        </strong>
      </p>
      <label>
        <span>{pick({ en: 'Secure payment URL', ar: 'رابط الدفع الآمن' })}</span>
        <input
          type="url"
          value={values.paymentUrl}
          onChange={set('paymentUrl')}
          placeholder="https://"
        />
      </label>
      <label>
        <span>{pick({ en: 'Operations note', ar: 'ملاحظة العمليات' })}</span>
        <textarea rows={3} value={values.staffNotes} onChange={set('staffNotes')} />
      </label>
      <button
        className="btn-primary compact"
        disabled={saving === key}
        onClick={() => {
          void Promise.resolve(
            run(
              key,
              () => updateSpecialRequest({ requestId: String(request.id || ''), ...values }),
              pick({
                en: 'Special request updated and notification queued.',
                ar: 'تم تحديث الطلب الخاص وإضافة الإشعار.',
              }),
            ),
          );
        }}
      >
        {pick({ en: 'Save request', ar: 'حفظ الطلب' })}
      </button>
    </article>
  );
}

import type { ReactElement } from 'react';
import { useState } from 'react';
import { updateQuoteWorkflow, recordQuotePayment } from '../../services/operations';
import { QUOTE_TRANSITIONS, money } from './commerceHelpers';
import type { OperationsRunFn } from '../../types/operations';

export function QuoteCard({
  quote,
  pick,
  saving,
  run,
}: {
  quote: Record<string, unknown>;
  pick: (value: import('../../context/LanguageContext').LocaleValue) => string;
  saving?: string | boolean | undefined;
  run: OperationsRunFn;
}): ReactElement {
  const [values, setValues] = useState({
    subtotal: quote.subtotal ?? '',
    shipping: quote.shipping_total ?? '',
    tax: quote.tax_total ?? 0,
    discount: quote.discount_total ?? 0,
    status: quote.status,
  });
  const [payment, setPayment] = useState(String(quote.amount_due_now || ''));
  const [method, setMethod] = useState('bank_transfer');
  const [reference, setReference] = useState('');
  const total =
    values.subtotal === '' || values.shipping === ''
      ? null
      : Math.max(
          0,
          Number(values.subtotal) +
            Number(values.shipping) +
            Number(values.tax || 0) -
            Number(values.discount || 0),
        );
  const transitions = [
    quote.status,
    ...((QUOTE_TRANSITIONS as Record<string, string[]>)[String(quote.status || '')] || []),
  ];
  const key = `quote-${quote.id}`;
  const paymentKey = `quote-payment-${quote.id}`;
  return (
    <article className="operations-card">
      <div>
        <span>{String(quote.quote_number ?? '')}</span>
        <strong>{money(total)}</strong>
      </div>
      <div className="operations-payment-summary">
        <small>
          {pick({ en: 'Paid', ar: 'مدفوع' })}: {money(quote.amount_paid)}
        </small>
        <small>
          {pick({ en: 'Due now', ar: 'مطلوب الآن' })}: {money(quote.amount_due_now)}
        </small>
        <small>
          {pick({ en: 'Later', ar: 'لاحقًا' })}:{' '}
          {money(
            Math.max(
              0,
              Number(quote.outstanding_balance ?? quote.remaining_balance ?? 0) -
                Number(quote.amount_due_now || 0),
            ),
          )}
        </small>
      </div>
      <select
        value={String(values.status ?? '')}
        onChange={(event) => setValues({ ...values, status: event.target.value })}
      >
        {transitions.map((status) => (
          <option key={String(status)}>{String(status)}</option>
        ))}
      </select>
      <div className="operations-price-grid">
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Subtotal"
          value={String(values.subtotal ?? '')}
          onChange={(event) => setValues({ ...values, subtotal: event.target.value })}
        />
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Shipping"
          value={String(values.shipping ?? '')}
          onChange={(event) => setValues({ ...values, shipping: event.target.value })}
        />
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Tax"
          value={String(values.tax ?? '')}
          onChange={(event) => setValues({ ...values, tax: event.target.value })}
        />
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Discount"
          value={String(values.discount ?? '')}
          onChange={(event) => setValues({ ...values, discount: event.target.value })}
        />
        <output aria-label="Verified quote total">
          {total == null || !Number.isFinite(total) ? '—' : money(total)}
        </output>
      </div>
      <small>Subtotal + Shipping + Tax − Discount</small>
      <button
        className="btn-secondary"
        disabled={saving === key}
        onClick={() => {
          void run(
            key,
            () =>
              updateQuoteWorkflow({
                quoteId: String(quote.id || ''),
                status: String(values.status ?? ''),
                subtotal: values.subtotal as string | number,
                shippingTotal: values.shipping as string | number,
                taxTotal: values.tax as string | number,
                discountTotal: values.discount as string | number,
              }),
            pick({ en: 'Quote saved with verified total.', ar: 'تم حفظ العرض بإجمالي متحقق منه.' }),
          );
        }}
      >
        {pick({ en: 'Save Quote', ar: 'حفظ العرض' })}
      </button>
      {Number(quote.amount_due_now) > 0 && (
        <div className="manual-payment-panel">
          <strong>{pick({ en: 'Record exact quote payment', ar: 'تسجيل دفعة عرض السعر' })}</strong>
          <div className="operations-price-grid">
            <input
              type="number"
              min="0.01"
              max={Number(quote.amount_due_now) || undefined}
              step="0.01"
              value={String(payment ?? '')}
              onChange={(event) => setPayment(event.target.value)}
            />
            <select
              value={String(method ?? '')}
              onChange={(event) => setMethod(event.target.value)}
            >
              <option value="bank_transfer">Bank Transfer</option>
              <option value="libyan_bank_card">Libyan Bank Card</option>
              <option value="cash">Cash</option>
            </select>
            <input
              value={String(reference ?? '')}
              onChange={(event) => setReference(event.target.value)}
              placeholder={pick({ en: 'Reference', ar: 'المرجع' })}
            />
          </div>
          <button
            className="btn-primary compact"
            disabled={saving === paymentKey || Number(payment) !== Number(quote.amount_due_now)}
            onClick={() => {
              void run(
                paymentKey,
                () =>
                  recordQuotePayment({
                    quoteId: String(quote.id || ''),
                    amountUsd: payment,
                    method,
                    reference,
                  }),
                pick({ en: 'Quote payment recorded securely.', ar: 'تم تسجيل دفعة العرض بأمان.' }),
              );
            }}
          >
            {pick({ en: 'Confirm Payment', ar: 'تأكيد الدفع' })}
          </button>
        </div>
      )}
    </article>
  );
}

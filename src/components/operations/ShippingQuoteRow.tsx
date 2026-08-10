import type { ReactElement } from 'react';
import { useState } from 'react';
import { setShippingQuote } from '../../services/operations';
import type { OperationsRunFn } from '../../types/operations';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function ShippingQuoteRow({
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
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const key = `shipping-${String(order.id || '')}`;
  return (
    <tr>
      <td>
        <strong>{String(order.order_number ?? '')}</strong>
        <small>{String(order.customer_email ?? '')}</small>
      </td>
      <td>
        {String(
          (asRecord(order.shipping_summary).countryCode ||
            asRecord(order.shipping_summary).country) ??
            '—',
        )}
      </td>
      <td>{Array.isArray(order.items_snapshot) ? order.items_snapshot.length : '—'}</td>
      <td>
        <input
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          aria-label={pick({ en: 'Shipping price in USD', ar: 'سعر الشحن بالدولار' })}
        />
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={pick({ en: 'Optional note', ar: 'ملاحظة اختيارية' })}
        />
      </td>
      <td>
        <button
          className="btn-primary compact"
          disabled={saving === key || amount === ''}
          onClick={() => {
            void Promise.resolve(
              run(
                key,
                () =>
                  setShippingQuote({
                    orderId: String(order.id || ''),
                    amountUsd: amount,
                    note,
                  }),
                pick({
                  en: 'Shipping price saved and email notification queued.',
                  ar: 'تم حفظ سعر الشحن وإضافة إشعار البريد.',
                }),
              ),
            );
          }}
        >
          {pick({ en: 'Add & Notify', ar: 'إضافة وإشعار' })}
        </button>
      </td>
    </tr>
  );
}

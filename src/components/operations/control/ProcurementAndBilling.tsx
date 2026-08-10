import type { ReactElement } from 'react';
import { useState } from 'react';
import { upsertOperationalEntity } from '../../../services/operations';
import { FinancialInputs, OperationalRow, isoOrNull } from './shared';
import type { OperationsRunFn } from '../../../types/operations';

export default function ProcurementAndBilling({
  state,
  pick,
  saving,
  run,
}: {
  state: unknown;
  pick: (value: string | { en?: string; ar?: string }) => string;
  saving?: string | boolean | undefined;
  run: OperationsRunFn;
  [key: string]: unknown;
}): ReactElement {
  const s = (state || {}) as Record<string, unknown>;
  const rows = (key: string) =>
    Array.isArray(s[key]) ? (s[key] as Array<Record<string, unknown>>) : [];
  const [po, setPo] = useState({
    po_number: '',
    supplier_id: '',
    status: 'draft',
    currency: 'USD',
    subtotal: 0,
    shipping_total: 0,
    tax_total: 0,
    discount_total: 0,
    items: [],
  });
  const [invoice, setInvoice] = useState({
    invoice_number: '',
    order_id: '',
    quote_id: '',
    customer_email: '',
    status: 'draft',
    currency: 'USD',
    subtotal: 0,
    shipping_total: 0,
    tax_total: 0,
    discount_total: 0,
    amount_paid: 0,
    due_at: '',
  });
  const numeric = (row: Record<string, unknown>) => ({
    ...row,
    subtotal: Number(row.subtotal),
    shipping_total: Number(row.shipping_total),
    tax_total: Number(row.tax_total),
    discount_total: Number(row.discount_total),
  });
  return (
    <section className="operations-subsection">
      <h3>{pick({ en: 'Procurement & billing', ar: 'المشتريات والفوترة' })}</h3>
      <div className="operations-card-grid">
        <form
          className="operations-card"
          onSubmit={(event) => {
            event.preventDefault();
            run(
              'purchase-order',
              () =>
                upsertOperationalEntity('purchase_orders', {
                  ...numeric(po),
                  supplier_id: po.supplier_id || null,
                }),
              pick({ en: 'Purchase order saved.', ar: 'تم حفظ أمر الشراء.' }),
            );
          }}
        >
          <strong>{pick({ en: 'Purchase order', ar: 'أمر شراء' })}</strong>
          <input
            value={po.po_number}
            onChange={(event) => setPo({ ...po, po_number: event.target.value })}
            placeholder="PO-2026-0001"
            required
          />
          <select
            value={po.supplier_id}
            onChange={(event) => setPo({ ...po, supplier_id: event.target.value })}
            required
          >
            <option value="">—</option>
            {rows('suppliers').map((row: Record<string, unknown>) => (
              <option key={String(row.id)} value={String(row.id || '')}>
                {String(row.name || '')}
              </option>
            ))}
          </select>
          <select
            value={po.status}
            onChange={(event) => setPo({ ...po, status: event.target.value })}
          >
            {[
              'draft',
              'sent',
              'accepted',
              'in_production',
              'partially_received',
              'received',
              'cancelled',
            ].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <FinancialInputs
            row={po as unknown as Record<string, unknown>}
            setRow={(next) => setPo({ ...po, ...next } as typeof po)}
          />
          <button className="btn-primary compact" disabled={saving === 'purchase-order'}>
            {pick({ en: 'Save PO', ar: 'حفظ أمر الشراء' })}
          </button>
        </form>
        <form
          className="operations-card"
          onSubmit={(event) => {
            event.preventDefault();
            run(
              'invoice',
              () =>
                upsertOperationalEntity('invoices', {
                  ...numeric(invoice),
                  order_id: invoice.order_id || null,
                  quote_id: invoice.quote_id || null,
                  due_at: isoOrNull(invoice.due_at),
                }),
              pick({ en: 'Invoice saved.', ar: 'تم حفظ الفاتورة.' }),
            );
          }}
        >
          <strong>{pick({ en: 'Invoice', ar: 'فاتورة' })}</strong>
          <input
            value={invoice.invoice_number}
            onChange={(event) => setInvoice({ ...invoice, invoice_number: event.target.value })}
            placeholder="INV-2026-0001"
            required
          />
          <select
            value={invoice.order_id}
            onChange={(event) =>
              setInvoice({ ...invoice, order_id: event.target.value, quote_id: '' })
            }
          >
            <option value="">{pick({ en: 'Order (optional)', ar: 'طلب (اختياري)' })}</option>
            {rows('orders').map((row: Record<string, unknown>) => (
              <option key={String(row.id)} value={String(row.id || '')}>
                {String(row.order_number || '')}
              </option>
            ))}
          </select>
          <select
            value={invoice.quote_id}
            onChange={(event) =>
              setInvoice({ ...invoice, quote_id: event.target.value, order_id: '' })
            }
          >
            <option value="">{pick({ en: 'Quote (optional)', ar: 'عرض سعر (اختياري)' })}</option>
            {rows('quotes').map((row: Record<string, unknown>) => (
              <option key={String(row.id)} value={String(row.id || '')}>
                {String(row.quote_number || row.id || '')}
              </option>
            ))}
          </select>
          <input
            type="email"
            value={invoice.customer_email}
            onChange={(event) => setInvoice({ ...invoice, customer_email: event.target.value })}
            placeholder="customer@example.com"
          />
          <select
            value={invoice.status}
            onChange={(event) => setInvoice({ ...invoice, status: event.target.value })}
          >
            {['draft', 'issued', 'partially_paid', 'paid', 'void', 'refunded'].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <FinancialInputs
            row={invoice as unknown as Record<string, unknown>}
            setRow={(next) => setInvoice({ ...invoice, ...next } as typeof invoice)}
          />
          <input
            type="date"
            value={invoice.due_at}
            onChange={(event) => setInvoice({ ...invoice, due_at: event.target.value })}
          />
          <button className="btn-primary compact" disabled={saving === 'invoice'}>
            {pick({ en: 'Save invoice', ar: 'حفظ الفاتورة' })}
          </button>
        </form>
      </div>
      <details>
        <summary>
          {pick({ en: 'Recent invoices & purchase orders', ar: 'أحدث الفواتير وأوامر الشراء' })}
        </summary>
        <div className="workspace-list">
          {rows('invoices').map((row: Record<string, unknown>) => (
            <OperationalRow
              key={String(row.id)}
              table="invoices"
              row={row}
              label={`${row.invoice_number} · ${row.status} · ${Number(row.total || 0).toFixed(2)} ${row.currency}`}
              run={run}
              saving={saving}
              pick={pick}
            />
          ))}
          {rows('purchaseOrders').map((row: Record<string, unknown>) => (
            <OperationalRow
              key={String(row.id)}
              table="purchase_orders"
              row={row}
              label={`${row.po_number} · ${row.status} · ${Number(row.total || 0).toFixed(2)} ${row.currency}`}
              run={run}
              saving={saving}
              pick={pick}
            />
          ))}
        </div>
      </details>
    </section>
  );
}

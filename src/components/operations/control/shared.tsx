import type { ReactElement } from 'react';
import { deleteOperationalEntity } from '../../../services/operations';

export const SHIPMENT_STATUSES = Object.freeze([
  'pending',
  'label_created',
  'in_transit',
  'out_for_delivery',
  'delivered',
  'exception',
  'cancelled',
]);

export const safeJson = (text: string): Record<string, unknown> => {
  const value = JSON.parse(text) as unknown;
  if (!value || Array.isArray(value) || typeof value !== 'object')
    throw new Error('content_must_be_object');
  return value as Record<string, unknown>;
};

export const isoOrNull = (value: unknown): string | null =>
  value ? new Date(String(value)).toISOString() : null;

export function FinancialInputs({
  row,
  setRow,
}: {
  row: Record<string, unknown>;
  setRow: (next: Record<string, unknown>) => void | unknown;
}): ReactElement {
  return (
    <div className="operations-form-grid">
      {['subtotal', 'shipping_total', 'tax_total', 'discount_total'].map((field) => (
        <label key={field}>
          <span>{field.replace('_', ' ')}</span>
          <input
            type="number"
            min={0}
            step={0.01}
            value={String(row[field] ?? '')}
            onChange={(event) => setRow({ ...row, [field]: event.target.value })}
          />
        </label>
      ))}
    </div>
  );
}

export function OperationalRow({
  table,
  row,
  label,
  run,
  saving,
  pick,
}: {
  table: string;
  row: Record<string, unknown>;
  label: string;
  run: (...args: unknown[]) => unknown;
  saving?: string | boolean | undefined;
  pick: (value: string | { en?: string; ar?: string }) => string;
}): ReactElement {
  return (
    <article>
      <div>
        <strong>{label}</strong>
        <p>{String(row.created_at || row.updated_at || '').slice(0, 19)}</p>
      </div>
      <button
        type="button"
        className="btn-text danger"
        disabled={saving === `delete-${table}-${String(row.id || '')}`}
        onClick={() => {
          void run(
            `delete-${table}-${String(row.id || '')}`,
            () => deleteOperationalEntity(table, String(row.id || '')),
            pick({ en: 'Record deleted.', ar: 'تم حذف السجل.' }),
          );
        }}
      >
        {pick({ en: 'Delete', ar: 'حذف' })}
      </button>
    </article>
  );
}

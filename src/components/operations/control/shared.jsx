import { deleteOperationalEntity } from '../../../services/operations';

export const SHIPMENT_STATUSES = Object.freeze(['pending','label_created','in_transit','out_for_delivery','delivered','exception','cancelled']);
export const safeJson = (text) => { const value = JSON.parse(text); if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error('content_must_be_object'); return value; };
export const isoOrNull = (value) => value ? new Date(value).toISOString() : null;

export function FinancialInputs({ row, setRow }) {
  return <div className="operations-form-grid">{['subtotal','shipping_total','tax_total','discount_total'].map((field) => <label key={field}><span>{field.replace('_',' ')}</span><input type="number" min="0" step="0.01" value={row[field]} onChange={(event) => setRow({ ...row, [field]: event.target.value })} /></label>)}</div>;
}

export function OperationalRow({ table, row, label, run, saving, pick }) {
  return <article><div><strong>{label}</strong><p>{String(row.created_at || row.updated_at || '').slice(0,19)}</p></div><button type="button" className="btn-text danger" disabled={saving === `delete-${table}-${row.id}`} onClick={() => run(`delete-${table}-${row.id}`, () => deleteOperationalEntity(table, row.id), pick({ en: 'Record deleted.', ar: 'تم حذف السجل.' }))}>{pick({ en: 'Delete', ar: 'حذف' })}</button></article>;
}

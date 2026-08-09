import type { ReactElement } from 'react';
import { useState } from 'react';
import {
  applyInventoryImport,
  createInventoryCsv,
  parseInventoryCsv,
  previewInventoryImport,
  rollbackInventoryImport,
} from '../../services/operations';

export function InventoryCsvManager({
  state,
  pick,
  saving,
  run,
}: {
  state: unknown;
  pick: (value: import('../../context/LanguageContext').LocaleValue) => string;
  saving?: string | boolean | undefined;
  run: (...args: unknown[]) => unknown;
}): ReactElement {
  const s = (state || {}) as Record<string, unknown>;
  const inventoryImports = Array.isArray(s.inventoryImports)
    ? (s.inventoryImports as Array<Record<string, unknown>>)
    : [];
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<unknown[]>([]);
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null);
  const [message, setMessage] = useState('');
  const readFile = async (file?: File | null) => {
    setMessage('');
    setPreview(null);
    setRows([]);
    setFileName(file?.name || '');
    if (!file) return;
    try {
      const parsed = parseInventoryCsv(await file.text());
      setRows(Array.isArray(parsed) ? parsed : []);
      setMessage(
        pick({
          en: `${parsed.length} rows parsed. Preview before applying.`,
          ar: `تمت قراءة ${parsed.length} صف. راجع المعاينة قبل التطبيق.`,
        }),
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  };
  const previewBatch = async () => {
    const result = await previewInventoryImport({ sourceName: fileName, rows });
    setPreview((result || {}) as Record<string, unknown>);
    return result;
  };
  const applyBatch = async () => {
    if (!preview?.ok || !preview?.batchId) throw new Error('inventory_preview_required');
    return applyInventoryImport({ sourceName: fileName, rows, batchId: String(preview.batchId) });
  };
  const exportCsv = () => {
    const blob = new Blob(
      [createInventoryCsv(Array.isArray(s.warehouseInventory) ? s.warehouseInventory : [])],
      {
        type: 'text/csv;charset=utf-8',
      },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `shababuna-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="enterprise-panel-stack inventory-csv-manager">
      <div className="section-heading-row">
        <div>
          <h3>
            {pick({
              en: 'CSV inventory import, preview and rollback',
              ar: 'استيراد المخزون CSV مع المعاينة والتراجع',
            })}
          </h3>
          <p>
            {pick({
              en: 'Required columns: warehouse_code, sku, on_hand. Optional: reorder_point.',
              ar: 'الأعمدة المطلوبة: warehouse_code وsku وon_hand. اختياري: reorder_point.',
            })}
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary compact"
          onClick={exportCsv}
          disabled={!Array.isArray(s.warehouseInventory) || s.warehouseInventory.length === 0}
        >
          {pick({ en: 'Export Inventory CSV', ar: 'تصدير المخزون CSV' })}
        </button>
      </div>
      <div className="enterprise-action-card">
        <input
          type="file"
          accept="text/csv,.csv"
          onChange={(event) => {
            void readFile(event.target.files?.[0]);
          }}
        />
        <div className="quote-pay-actions">
          <button
            type="button"
            className="btn-secondary compact"
            disabled={!rows.length || saving === 'inventory-preview'}
            onClick={() => {
              void Promise.resolve(
                run(
                  'inventory-preview',
                  previewBatch,
                  pick({ en: 'Inventory preview generated.', ar: 'تم إنشاء معاينة المخزون.' }),
                ),
              );
            }}
          >
            {pick({ en: 'Validate & Preview', ar: 'تحقق ومعاينة' })}
          </button>
          <button
            type="button"
            className="btn-primary compact"
            disabled={!preview?.ok || saving === 'inventory-apply'}
            onClick={() => {
              void Promise.resolve(
                run(
                  'inventory-apply',
                  applyBatch,
                  pick({
                    en: 'Inventory batch applied atomically.',
                    ar: 'تم تطبيق دفعة المخزون كمعاملة واحدة.',
                  }),
                ),
              );
            }}
          >
            {pick({ en: 'Apply Import', ar: 'تطبيق الاستيراد' })}
          </button>
        </div>
        {message && (
          <p className="form-status" role="status">
            {message}
          </p>
        )}
        {preview && (
          <div className="workspace-list">
            {(Array.isArray(preview.errors) ? preview.errors : []).map(
              (row: unknown, index: number) => {
                const errorRow = (row || {}) as Record<string, unknown>;
                return (
                  <article key={`error-${String(errorRow.row ?? index)}`}>
                    <div>
                      <strong>
                        {pick({
                          en: `Row ${String(errorRow.row ?? '')}`,
                          ar: `الصف ${String(errorRow.row ?? '')}`,
                        })}
                      </strong>
                      <p>
                        {String(errorRow.sku ?? '')} · {String(errorRow.error ?? '')}
                      </p>
                    </div>
                  </article>
                );
              },
            )}
            {(Array.isArray(preview.preview) ? preview.preview : [])
              .slice(0, 50)
              .map((row: unknown, index: number) => {
                const previewRow = (row || {}) as Record<string, unknown>;
                return (
                  <article
                    key={`${String(previewRow.warehouseId ?? '')}-${String(previewRow.variantId ?? index)}`}
                  >
                    <div>
                      <strong>{String(previewRow.sku ?? '')}</strong>
                      <p>
                        {String(previewRow.warehouseCode ?? '')}:{' '}
                        {String(previewRow.beforeOnHand ?? '')} →{' '}
                        {String(previewRow.afterOnHand ?? '')}
                      </p>
                    </div>
                    <small>
                      {pick({ en: 'Reserved', ar: 'محجوز' })}: {String(previewRow.reserved ?? '')}
                    </small>
                  </article>
                );
              })}
          </div>
        )}
      </div>
      <details>
        <summary>
          {pick({ en: 'Recent inventory imports', ar: 'أحدث عمليات استيراد المخزون' })}
        </summary>
        <div className="workspace-list">
          {inventoryImports.map((batch: Record<string, unknown>) => (
            <article key={String(batch.id)}>
              <div>
                <span className="workspace-status-dot" data-status={String(batch.status || '')} />
                <div>
                  <h3>{String(batch.source_name || batch.id || '')}</h3>
                  <p>
                    {String(batch.status || '')} · {String(batch.row_count ?? '')} rows ·{' '}
                    {String(batch.error_count ?? '')} errors
                  </p>
                </div>
              </div>
              {batch.status === 'applied' ? (
                <button
                  type="button"
                  className="btn-secondary compact"
                  disabled={saving === `rollback-${String(batch.id || '')}`}
                  onClick={() => {
                    void Promise.resolve(
                      run(
                        `rollback-${String(batch.id || '')}`,
                        () => rollbackInventoryImport(String(batch.id || '')),
                        pick({
                          en: 'Inventory import rolled back.',
                          ar: 'تم التراجع عن استيراد المخزون.',
                        }),
                      ),
                    );
                  }}
                >
                  {pick({ en: 'Rollback', ar: 'تراجع' })}
                </button>
              ) : null}
            </article>
          ))}
        </div>
      </details>
    </div>
  );
}

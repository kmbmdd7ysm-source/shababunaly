import type { ReactElement } from 'react';
import { useState } from 'react';
import { updateCatalogVariant } from '../../services/operations';
import type { OperationsRunFn } from '../../types/operations';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function CatalogRow({
  row,
  pick,
  saving,
  run,
}: {
  row: Record<string, unknown>;
  pick: (value: import('../../context/LanguageContext').LocaleValue) => string;
  saving?: string | boolean | undefined;
  run: OperationsRunFn;
}): ReactElement {
  const variantData = asRecord(row.variant_data);
  const [values, setValues] = useState({
    price: String(row.unit_price ?? ''),
    wholesale: String(variantData.wholesalePrice ?? ''),
    stock: String(row.inventory_quantity ?? ''),
    ready: Boolean(variantData.readyToShip),
    active: Boolean(row.active),
  });
  const key = `catalog-${String(row.variant_id || '')}`;
  return (
    <tr>
      <td>
        <strong>{String(row.sku ?? '')}</strong>
        <small>
          {String(variantData.color || '')} {String(variantData.size || '')}
        </small>
      </td>
      <td>{String(row.product_name ?? '')}</td>
      <td>
        <input
          type="number"
          min="0"
          step="0.01"
          value={values.price}
          onChange={(event) => setValues({ ...values, price: event.target.value })}
        />
      </td>
      <td>
        <input
          type="number"
          min="0"
          step="0.01"
          value={values.wholesale}
          onChange={(event) => setValues({ ...values, wholesale: event.target.value })}
        />
      </td>
      <td>
        <input
          type="number"
          min="0"
          step="1"
          value={values.stock}
          onChange={(event) => setValues({ ...values, stock: event.target.value })}
        />
      </td>
      <td>
        <input
          type="checkbox"
          checked={values.ready}
          onChange={(event) => setValues({ ...values, ready: event.target.checked })}
          aria-label={pick({ en: 'Ready to ship', ar: 'تسليم فوري' })}
        />
      </td>
      <td>
        <input
          type="checkbox"
          checked={values.active}
          onChange={(event) => setValues({ ...values, active: event.target.checked })}
          aria-label={pick({ en: 'Active', ar: 'نشط' })}
        />
      </td>
      <td>
        <button
          className="btn-secondary compact"
          disabled={saving === key}
          onClick={() => {
            void run(
              key,
              () =>
                updateCatalogVariant({
                  variantId: String(row.variant_id || ''),
                  unitPrice: values.price,
                  wholesalePrice: values.wholesale,
                  inventoryQuantity: values.stock,
                  readyToShip: values.ready,
                  active: values.active,
                }),
              pick({ en: 'Catalog variant saved.', ar: 'تم حفظ خيار المنتج.' }),
            );
          }}
        >
          {pick({ en: 'Save', ar: 'حفظ' })}
        </button>
      </td>
    </tr>
  );
}

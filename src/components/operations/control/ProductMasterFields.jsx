import { useLanguage } from '../../../context/LanguageContext';
import { normalizeProductMaster, missingMasterFields } from '../../../domain/productMaster.ts';

/**
 * Operations input surface for real commercial fields.
 * Never invents values — empty fields stay pending_verification until staff enter them.
 */
export default function ProductMasterFields({ product, onChange }) {
  const { pick } = useLanguage();
  const master = normalizeProductMaster(product);
  const missing = missingMasterFields(master);
  const fields = [
    ['supplierSKU', 'Supplier SKU', 'رمز المورد'],
    ['barcode', 'Barcode', 'الباركود'],
    ['warehouse', 'Warehouse', 'المستودع'],
    ['leadTime', 'Lead time', 'مدة التوريد'],
    ['HSCode', 'HS code', 'رمز النظام المنسق'],
    ['countryOfOrigin', 'Country of origin', 'بلد المنشأ'],
    ['inventoryLocation', 'Inventory location', 'موقع المخزون'],
  ];

  return (
    <section className="operations-card" aria-labelledby="product-master-title">
      <h3 id="product-master-title">{pick({ en: 'Product master', ar: 'سجل المنتج التجاري' })}</h3>
      <p className="form-hint">
        {pick({
          en: `${missing.length} commercial field(s) pending verification. Do not publish invented costs, barcodes or stock.`,
          ar: `${missing.length} حقلًا تجاريًا بانتظار التحقق. لا تنشر تكاليف أو باركود أو مخزونًا مختلقًا.`,
        })}
      </p>
      <div className="operations-form-grid">
        {fields.map(([key, en, ar]) => (
          <label key={key}>
            <span>{pick({ en, ar })}</span>
            <input
              value={
                typeof master[key] === 'string' && master[key] !== 'pending_verification'
                  ? master[key]
                  : ''
              }
              placeholder={pick({ en: 'pending verification', ar: 'بانتظار التحقق' })}
              onChange={(event) => onChange?.({ ...product, [key]: event.target.value || null })}
            />
          </label>
        ))}
        <label>
          <span>{pick({ en: 'Cost', ar: 'التكلفة' })}</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={typeof master.cost === 'number' ? master.cost : ''}
            placeholder={pick({ en: 'pending verification', ar: 'بانتظار التحقق' })}
            onChange={(event) =>
              onChange?.({
                ...product,
                cost: event.target.value === '' ? null : Number(event.target.value),
              })
            }
          />
        </label>
      </div>
    </section>
  );
}

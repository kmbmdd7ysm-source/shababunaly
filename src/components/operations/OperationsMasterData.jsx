import ProductMasterFields from './control/ProductMasterFields';
import { useEffect, useMemo, useState } from 'react';
import { getLocalizedCountries } from '../../data/countries';
import {
  deleteOperationalEntity,
  recordStockMovement,
  setCountryShippingRate,
  updateSiteContent,
  upsertOperationalEntity,
} from '../../services/operations';

export function MasterDataManager({ data, pick, saving, run }) {
  const configs = [
    {
      table: 'catalog_brands',
      rows: data.brands,
      label: { en: 'Brand', ar: 'براند' },
      fields: [
        ['name', 'Name'],
        ['slug', 'Slug'],
      ],
    },
    {
      table: 'catalog_categories',
      rows: data.categories,
      label: { en: 'Category', ar: 'تصنيف' },
      fields: [
        ['name_en', 'English name'],
        ['name_ar', 'Arabic name'],
        ['slug', 'Slug'],
      ],
    },
    {
      table: 'warehouses',
      rows: data.warehouses,
      label: { en: 'Warehouse', ar: 'مستودع' },
      fields: [
        ['name', 'Name'],
        ['code', 'Code'],
        ['country_code', 'Country'],
        ['city', 'City'],
      ],
    },
    {
      table: 'suppliers',
      rows: data.suppliers,
      label: { en: 'Supplier', ar: 'مورد' },
      fields: [
        ['name', 'Name'],
        ['email', 'Email'],
        ['phone', 'Phone'],
        ['country_code', 'Country'],
      ],
    },
    {
      table: 'carriers',
      rows: data.carriers,
      label: { en: 'Carrier', ar: 'شركة شحن' },
      fields: [
        ['name', 'Name'],
        ['code', 'Code'],
        ['tracking_url_template', 'Tracking URL'],
      ],
    },
  ];
  return (
    <div className="operations-master-grid">
      {configs.map((config) => (
        <MasterEntityCard
          key={config.table}
          config={config}
          pick={pick}
          saving={saving}
          run={run}
        />
      ))}
    </div>
  );
}
function MasterEntityCard({ config, pick, saving, run }) {
  const initial = Object.fromEntries(config.fields.map(([key]) => [key, '']));
  const [values, setValues] = useState(initial);
  const [selected, setSelected] = useState('');
  const key = `master-${config.table}`;
  const save = () =>
    run(
      key,
      () =>
        upsertOperationalEntity(config.table, {
          ...(selected ? { id: selected } : {}),
          ...values,
          active: true,
        }),
      pick({ en: 'Master data saved.', ar: 'تم حفظ البيانات الرئيسية.' }),
    );
  return (
    <article className="operations-card">
      <div>
        <span>{pick(config.label)}</span>
        <strong>{config.rows?.length || 0}</strong>
      </div>
      <select
        value={selected}
        onChange={(event) => {
          const id = event.target.value;
          setSelected(id);
          const row = config.rows.find((item) => item.id === id);
          setValues(
            row
              ? Object.fromEntries(config.fields.map(([field]) => [field, row[field] || '']))
              : initial,
          );
        }}
      >
        <option value="">{pick({ en: 'Create new', ar: 'إنشاء جديد' })}</option>
        {(config.rows || []).map((row) => (
          <option key={row.id} value={row.id}>
            {row.name || row.name_en || row.code || row.slug}
          </option>
        ))}
      </select>
      {config.fields.map(([field, label]) => (
        <label key={field}>
          <span>{label}</span>
          <input
            value={values[field] || ''}
            onChange={(event) =>
              setValues((current) => ({ ...current, [field]: event.target.value }))
            }
          />
        </label>
      ))}
      <div className="quote-pay-actions">
        <button
          className="btn-primary compact"
          disabled={saving === key || !Object.values(values)[0]}
          onClick={save}
        >
          {pick({ en: 'Save', ar: 'حفظ' })}
        </button>
        {selected && (
          <button
            className="btn-secondary compact"
            disabled={saving === `${key}-delete`}
            onClick={() =>
              run(
                `${key}-delete`,
                () => deleteOperationalEntity(config.table, selected),
                pick({ en: 'Record deleted.', ar: 'تم حذف السجل.' }),
              )
            }
          >
            {pick({ en: 'Delete', ar: 'حذف' })}
          </button>
        )}
      </div>
    </article>
  );
}
export function StockMovementManager({ warehouses, catalog, pick, saving, run }) {
  const [warehouseId, setWarehouseId] = useState('');
  const [variantId, setVariantId] = useState('');
  const [movementType, setMovementType] = useState('receipt');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  return (
    <div className="operations-form-grid">
      <label>
        <span>{pick({ en: 'Warehouse', ar: 'المستودع' })}</span>
        <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
          <option value="">—</option>
          {warehouses.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name} · {row.code}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>SKU / Variant</span>
        <select value={variantId} onChange={(e) => setVariantId(e.target.value)}>
          <option value="">—</option>
          {catalog.slice(0, 1000).map((row) => (
            <option key={row.variant_id} value={row.variant_id}>
              {row.sku} · {row.product_name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>{pick({ en: 'Movement', ar: 'الحركة' })}</span>
        <select value={movementType} onChange={(e) => setMovementType(e.target.value)}>
          {['receipt', 'adjustment', 'damage', 'return', 'transfer_in', 'transfer_out'].map(
            (type) => (
              <option key={type}>{type}</option>
            ),
          )}
        </select>
      </label>
      <label>
        <span>{pick({ en: 'Quantity delta', ar: 'تغير الكمية' })}</span>
        <input
          type="number"
          step="1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
      </label>
      <label>
        <span>{pick({ en: 'Audit note', ar: 'ملاحظة التدقيق' })}</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <button
        className="btn-primary compact"
        disabled={saving === 'stock-movement' || !warehouseId || !variantId || !quantity}
        onClick={() =>
          run(
            'stock-movement',
            () =>
              recordStockMovement({
                warehouseId,
                variantId,
                movementType,
                quantityDelta: Number(quantity),
                note,
              }),
            pick({
              en: 'Stock movement recorded in the immutable ledger.',
              ar: 'تم تسجيل حركة المخزون في السجل غير القابل للتلاعب.',
            }),
          )
        }
      >
        {pick({ en: 'Record Movement', ar: 'تسجيل الحركة' })}
      </button>
    </div>
  );
}

export function ShippingRatesManager({ rows, lang, pick, saving, run }) {
  const options = useMemo(
    () => getLocalizedCountries(lang).filter((country) => country.code !== 'LY'),
    [lang],
  );
  const [countryCode, setCountryCode] = useState('US');
  const [rate, setRate] = useState('');
  const [note, setNote] = useState('');
  const [active, setActive] = useState(true);
  const selected = rows.find((row) => row.country_code === countryCode);
  useEffect(() => {
    setRate(selected?.rate_usd == null ? '' : String(selected.rate_usd));
    setNote(selected?.note || '');
    setActive(selected?.active ?? true);
  }, [countryCode, selected?.rate_usd, selected?.note, selected?.active]);
  const key = `country-rate-${countryCode}`;
  return (
    <div className="shipping-rate-manager">
      <div className="operations-form-grid">
        <label>
          <span>{pick({ en: 'Country', ar: 'الدولة' })}</span>
          <select value={countryCode} onChange={(event) => setCountryCode(event.target.value)}>
            {options.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name} · {country.code}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{pick({ en: 'Flat retail shipping (USD)', ar: 'شحن الطلب العادي بالدولار' })}</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={rate}
            onChange={(event) => setRate(event.target.value)}
          />
        </label>
        <label>
          <span>{pick({ en: 'Internal note', ar: 'ملاحظة داخلية' })}</span>
          <input value={note} onChange={(event) => setNote(event.target.value)} />
        </label>
        <label className="operations-check">
          <input
            type="checkbox"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
          />
          <span>{pick({ en: 'Use this rate at checkout', ar: 'استخدام السعر عند الدفع' })}</span>
        </label>
      </div>
      <button
        className="btn-primary compact"
        disabled={saving === key || (active && rate === '')}
        onClick={() =>
          run(
            key,
            () => setCountryShippingRate({ countryCode, rateUsd: rate, active, note }),
            pick({ en: 'Country shipping rate saved.', ar: 'تم حفظ سعر شحن الدولة.' }),
          )
        }
      >
        {pick({ en: 'Save Country Rate', ar: 'حفظ سعر الدولة' })}
      </button>
      <div className="configured-rate-list">
        {rows
          .filter((row) => row.active)
          .map((row) => (
            <span key={row.country_code}>
              <strong>{row.country_code}</strong> ${Number(row.rate_usd).toFixed(2)}
            </span>
          ))}
      </div>
    </div>
  );
}

export function HeroContentManager({ row, pick, saving, run }) {
  const value = row?.content_value || {};
  const [enabled, setEnabled] = useState(value.enabled !== false);
  const [desktopVideoUrl, setDesktopVideoUrl] = useState(value.desktopVideoUrl || '');
  const [mobileVideoUrl, setMobileVideoUrl] = useState(value.mobileVideoUrl || '');
  useEffect(() => {
    setEnabled(value.enabled !== false);
    setDesktopVideoUrl(value.desktopVideoUrl || '');
    setMobileVideoUrl(value.mobileVideoUrl || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional dependency scope
  }, [row?.updated_at]);
  const valid = (url) => !url || /^https:\/\//i.test(url);
  return (
    <div className="hero-content-manager">
      <p>
        {pick({
          en: 'Leave a URL empty to keep the approved poster. Video is deferred until interaction and never blocks first paint.',
          ar: 'اترك الرابط فارغًا للإبقاء على البوستر المعتمد. يتم تأجيل الفيديو حتى تفاعل المستخدم ولا يعطل ظهور الصفحة.',
        })}
      </p>
      <div className="operations-form-grid">
        <label>
          <span>{pick({ en: 'Desktop MP4 URL', ar: 'رابط فيديو الديسكتوب MP4' })}</span>
          <input
            value={desktopVideoUrl}
            onChange={(event) => setDesktopVideoUrl(event.target.value.trim())}
            placeholder="https://cdn.../hero-desktop.mp4"
          />
        </label>
        <label>
          <span>{pick({ en: 'Mobile MP4 URL', ar: 'رابط فيديو الموبايل MP4' })}</span>
          <input
            value={mobileVideoUrl}
            onChange={(event) => setMobileVideoUrl(event.target.value.trim())}
            placeholder="https://cdn.../hero-mobile.mp4"
          />
        </label>
        <label className="operations-check">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
          />
          <span>{pick({ en: 'Enable hero video', ar: 'تفعيل فيديو الهيرو' })}</span>
        </label>
      </div>
      {(!valid(desktopVideoUrl) || !valid(mobileVideoUrl)) && (
        <p className="form-error">
          {pick({
            en: 'Use secure HTTPS video URLs only.',
            ar: 'استخدم روابط فيديو آمنة HTTPS فقط.',
          })}
        </p>
      )}
      <button
        className="btn-primary compact"
        disabled={saving === 'site-home-hero' || !valid(desktopVideoUrl) || !valid(mobileVideoUrl)}
        onClick={() =>
          run(
            'site-home-hero',
            () =>
              updateSiteContent({
                contentKey: 'home_hero',
                contentValue: { enabled, desktopVideoUrl, mobileVideoUrl },
                publicRead: true,
              }),
            pick({ en: 'Hero media settings saved.', ar: 'تم حفظ إعدادات وسائط الهيرو.' }),
          )
        }
      >
        {pick({ en: 'Save Hero Media', ar: 'حفظ وسائط الهيرو' })}
      </button>
    </div>
  );
}

export { ProductMasterFields };

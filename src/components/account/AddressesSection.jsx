import { useEffect, useState } from 'react';
import {
  listAddresses,
  saveAddress,
  deleteAddress,
  setDefaultAddress,
  validateAddress,
} from '../../services/account/addressService';
import { errorText } from '../../utils/errors';
import CountrySelect from '../common/CountrySelect';
import { getAddressRequirements, getCountryName, normalizeCountryCode } from '../../data/countries';
const EMPTY = {
  label: 'Home',
  firstName: '',
  lastName: '',
  company: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  region: '',
  postalCode: '',
  country: 'LY',
  phone: '',
  isDefault: false,
};
const fromDb = (a) => ({
  label: a.label || 'Home',
  firstName: a.first_name || '',
  lastName: a.last_name || '',
  company: a.company || '',
  addressLine1: a.address_line_1 || '',
  addressLine2: a.address_line_2 || '',
  city: a.city || '',
  region: a.region || '',
  postalCode: a.postal_code || '',
  country: normalizeCountryCode(a.country || 'LY'),
  phone: a.phone || '',
  isDefault: Boolean(a.is_default),
});
export default function AddressesSection({ userId, pick, language }) {
  const [list, setList] = useState([]),
    [form, setForm] = useState(EMPTY),
    [editing, setEditing] = useState(null),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [errors, setErrors] = useState({}),
    [message, setMessage] = useState('');
  const load = async () => {
    setLoading(true);
    setMessage('');
    try {
      setList(await listAddresses(userId));
    } catch (e) {
      setMessage(errorText(e, language));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, [userId]);
  const submit = async (e) => {
    e.preventDefault();
    const v = validateAddress(form);
    setErrors(v.errors);
    if (!v.valid) return;
    setBusy(true);
    try {
      await saveAddress(userId, form, editing);
      setForm(EMPTY);
      setEditing(null);
      await load();
      setMessage(pick({ en: 'Address saved.', ar: 'تم حفظ العنوان.' }));
    } catch (e) {
      setMessage(errorText(e, language));
    } finally {
      setBusy(false);
    }
  };
  const edit = (a) => {
    setEditing(a.id);
    setForm(fromDb(a));
    setErrors({});
  };
  const remove = async (a) => {
    if (!confirm(pick({ en: 'Delete this address?', ar: 'حذف هذا العنوان؟' }))) return;
    setBusy(true);
    try {
      await deleteAddress(userId, a.id);
      await load();
    } catch (e) {
      setMessage(errorText(e, language));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="address-section" data-clarity-mask="true">
      <div className="account-section-heading">
        <div>
          <h2>{pick({ en: 'Saved addresses', ar: 'العناوين المحفوظة' })}</h2>
          <p>
            {pick({
              en: 'Manage delivery addresses. These details are never sent to analytics.',
              ar: 'أدر عناوين التوصيل. لا تُرسل هذه البيانات إلى التحليلات.',
            })}
          </p>
        </div>
      </div>
      {loading ? (
        <p role="status">{pick({ en: 'Loading addresses…', ar: 'جارٍ تحميل العناوين…' })}</p>
      ) : list.length === 0 ? (
        <div className="account-empty">
          <h3>{pick({ en: 'No saved addresses', ar: 'لا توجد عناوين محفوظة' })}</h3>
          <p>
            {pick({
              en: 'Add an address when you are ready. Guest checkout remains available.',
              ar: 'أضف عنوانًا عندما تكون جاهزًا. يظل الدفع كضيف متاحًا.',
            })}
          </p>
        </div>
      ) : (
        <div className="address-grid">
          {list.map((a) => (
            <article key={a.id} className="address-card">
              <div>
                <strong>
                  {a.label}
                  {a.is_default ? ` · ${pick({ en: 'Default', ar: 'افتراضي' })}` : ''}
                </strong>
                <p>
                  {a.first_name} {a.last_name}
                  <br />
                  {a.address_line_1}
                  {a.address_line_2 ? (
                    <>
                      <br />
                      {a.address_line_2}
                    </>
                  ) : null}
                  <br />
                  {a.city}, {a.region} {a.postal_code}
                  <br />
                  {getCountryName(a.country, language)}
                </p>
              </div>
              <div className="address-actions">
                <button type="button" onClick={() => edit(a)}>
                  {pick({ en: 'Edit', ar: 'تعديل' })}
                </button>
                {!a.is_default && (
                  <button
                    type="button"
                    onClick={async () => {
                      await setDefaultAddress(userId, a.id);
                      await load();
                    }}
                  >
                    {pick({ en: 'Set default', ar: 'تعيين افتراضي' })}
                  </button>
                )}
                <button type="button" onClick={() => remove(a)}>
                  {pick({ en: 'Delete', ar: 'حذف' })}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      <form className="account-form address-form" onSubmit={submit} noValidate>
        <h3>
          {editing
            ? pick({ en: 'Edit address', ar: 'تعديل العنوان' })
            : pick({ en: 'Add address', ar: 'إضافة عنوان' })}
        </h3>
        <div className="form-grid">
          <Field
            name="label"
            label={pick({ en: 'Label', ar: 'التسمية' })}
            value={form.label}
            set={setForm}
            form={form}
            auto="section-shipping address-level1"
          />
          <Field
            name="firstName"
            label={pick({ en: 'First name', ar: 'الاسم الأول' })}
            value={form.firstName}
            set={setForm}
            form={form}
            error={errors.firstName}
            auto="shipping given-name"
          />
          <Field
            name="lastName"
            label={pick({ en: 'Last name', ar: 'اسم العائلة' })}
            value={form.lastName}
            set={setForm}
            form={form}
            error={errors.lastName}
            auto="shipping family-name"
          />
          <Field
            name="company"
            label={pick({ en: 'Company (optional)', ar: 'الشركة (اختياري)' })}
            value={form.company}
            set={setForm}
            form={form}
            auto="shipping organization"
          />
          <Field
            name="addressLine1"
            label={pick({ en: 'Address line 1', ar: 'العنوان 1' })}
            value={form.addressLine1}
            set={setForm}
            form={form}
            error={errors.addressLine1}
            auto="shipping address-line1"
          />
          <Field
            name="addressLine2"
            label={pick({ en: 'Address line 2 (optional)', ar: 'العنوان 2 (اختياري)' })}
            value={form.addressLine2}
            set={setForm}
            form={form}
            auto="shipping address-line2"
          />
          <Field
            name="city"
            label={pick({ en: 'City', ar: 'المدينة' })}
            value={form.city}
            set={setForm}
            form={form}
            error={errors.city}
            auto="shipping address-level2"
          />
          <Field
            name="region"
            label={pick({ en: 'State / region', ar: 'الولاية / المنطقة' })}
            value={form.region}
            set={setForm}
            form={form}
            error={errors.region}
            auto="shipping address-level1"
          />
          <Field
            name="postalCode"
            label={pick({ en: 'Postal code', ar: 'الرمز البريدي' })}
            value={form.postalCode}
            set={setForm}
            form={form}
            error={errors.postalCode}
            auto="shipping postal-code"
            inputMode="text"
          />
          <label htmlFor="address-country">
            {pick({ en: 'Country', ar: 'الدولة' })}
            <CountrySelect
              id="address-country"
              value={form.country}
              onChange={(country) => {
                const requirements = getAddressRequirements(country);
                setForm((current) => ({
                  ...current,
                  country,
                  postalCode: requirements?.postalCodeRequired ? current.postalCode : '',
                }));
              }}
              required
              aria-describedby={errors.country ? 'address-country-error' : undefined}
            />
            {errors.country && (
              <span id="address-country-error" className="field-error" role="alert">
                {pick({ en: 'Select a valid country.', ar: 'اختر دولة صالحة.' })}
              </span>
            )}
          </label>
          <Field
            name="phone"
            label={pick({ en: 'Delivery phone (optional)', ar: 'هاتف التوصيل (اختياري)' })}
            value={form.phone}
            set={setForm}
            form={form}
            auto="shipping tel"
            inputMode="tel"
          />
        </div>
        <label className="check-row">
          <input
            type="checkbox"
            checked={form.isDefault}
            onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
          />
          {pick({ en: 'Make this my default address', ar: 'اجعل هذا عنواني الافتراضي' })}
        </label>
        <div className="form-actions">
          <button className="btn-primary" disabled={busy}>
            {busy
              ? pick({ en: 'Saving…', ar: 'جارٍ الحفظ…' })
              : pick({ en: 'Save address', ar: 'حفظ العنوان' })}
          </button>
          {editing && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setEditing(null);
                setForm(EMPTY);
              }}
            >
              {pick({ en: 'Cancel', ar: 'إلغاء' })}
            </button>
          )}
        </div>
      </form>
      {message && (
        <p role="status" aria-live="polite">
          {message}
        </p>
      )}
    </section>
  );
}
function Field({ name, label, value, set, form, error = '', auto = '', inputMode = undefined, maxLength = 180 }) {
  const id = `address-${name}`;
  return (
    <label htmlFor={id}>
      {label}
      <input
        id={id}
        name={name}
        value={value}
        onChange={(e) => set({ ...form, [name]: e.target.value })}
        autoComplete={auto}
        inputMode={inputMode}
        maxLength={maxLength || 180}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <span id={`${id}-error`} className="field-error" role="alert">
          {error === 'required' ? 'Required' : 'Invalid value'}
        </span>
      )}
    </label>
  );
}

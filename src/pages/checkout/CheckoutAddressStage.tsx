import type { ChangeEvent, ReactElement } from 'react';
import CountrySelect from '../../components/common/CountrySelect';

type PickFn = (value: { en: string; ar: string }) => string;

export default function CheckoutAddressStage({
  pick,
  form,
  errors,
  setField,
  fieldA11y,
  checkout,
  isLibya,
  savedAddresses,
  selectedAddressId,
  applySavedAddress,
  changeCountry,
}: {
  pick: PickFn;
  form: Record<string, string>;
  errors: Record<string, string>;
  setField: (key: string) => (event: ChangeEvent<HTMLInputElement>) => void;
  fieldA11y: (key: string) => Record<string, string | boolean | undefined>;
  checkout: Record<string, string>;
  isLibya: boolean;
  savedAddresses: Array<Record<string, unknown>>;
  selectedAddressId: string;
  applySavedAddress: (address: Record<string, unknown> | undefined) => void;
  changeCountry: (code: string) => void;
}): ReactElement {
  return (
<fieldset className="form-block">
                <legend>{pick({ en: 'Delivery address', ar: 'عنوان التوصيل' })}</legend>
                {savedAddresses.length > 0 && (
                  <label className="field">
                    <span>{pick({ en: 'Saved address', ar: 'عنوان محفوظ' })}</span>
                    <select
                      value={selectedAddressId}
                      onChange={(event) =>
                        applySavedAddress(
                          savedAddresses.find((row) => row.id === event.target.value),
                        )
                      }
                    >
                      <option value="">
                        {pick({ en: 'Choose an address', ar: 'اختر عنوانًا' })}
                      </option>
                      {savedAddresses.map((address) => (
                        <option
                          key={String(address.id || '')}
                          value={String(address.id || '')}
                        >
                          {String(address.label || 'Address')} —{' '}
                          {String(address.address_line_1 || address.line1 || '')},{' '}
                          {String(address.city || '')}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <div className="field-row">
                  <label className="field">
                    <span>{checkout.firstName}</span>
                    <input
                      value={form.firstName}
                      onChange={setField('firstName')}
                      autoComplete="given-name"
                      {...fieldA11y('firstName')}
                    />
                    {errors.firstName && (
                      <span id="checkout-firstName-error" className="form-error" role="status">
                        {errors.firstName}
                      </span>
                    )}
                  </label>
                  <label className="field">
                    <span>{checkout.lastName}</span>
                    <input
                      value={form.lastName}
                      onChange={setField('lastName')}
                      autoComplete="family-name"
                      {...fieldA11y('lastName')}
                    />
                    {errors.lastName && (
                      <span id="checkout-lastName-error" className="form-error" role="status">
                        {errors.lastName}
                      </span>
                    )}
                  </label>
                </div>
                <label className="field">
                  <span>{checkout.country}</span>
                  <CountrySelect
                    value={form.country || ''}
                    onChange={changeCountry}
                    required
                    aria-invalid={Boolean(errors.country)}
                    {...(errors.country
                      ? { 'aria-describedby': 'checkout-country-error' }
                      : {})}
                  />
                  {errors.country && (
                    <span id="checkout-country-error" className="form-error" role="status">
                      {errors.country}
                    </span>
                  )}
                </label>
                <label className="field">
                  <span>{checkout.address}</span>
                  <input
                    value={form.address}
                    onChange={setField('address')}
                    autoComplete="address-line1"
                    {...fieldA11y('address')}
                  />
                  {errors.address && (
                    <span id="checkout-address-error" className="form-error" role="status">
                      {errors.address}
                    </span>
                  )}
                </label>
                <label className="field">
                  <span>{checkout.apartment}</span>
                  <input
                    value={form.apartment}
                    onChange={setField('apartment')}
                    autoComplete="address-line2"
                  />
                </label>
                <div className="field-row">
                  <label className="field">
                    <span>{checkout.city}</span>
                    <input
                      value={form.city}
                      onChange={setField('city')}
                      autoComplete="address-level2"
                      {...fieldA11y('city')}
                    />
                    {errors.city && (
                      <span id="checkout-city-error" className="form-error" role="status">
                        {errors.city}
                      </span>
                    )}
                  </label>
                  {!isLibya && (
                    <label className="field">
                      <span>{checkout.state}</span>
                      <input
                        value={form.state}
                        onChange={setField('state')}
                        autoComplete="address-level1"
                        {...fieldA11y('state')}
                      />
                      {errors.state && (
                        <span id="checkout-state-error" className="form-error" role="status">
                          {errors.state}
                        </span>
                      )}
                    </label>
                  )}
                  {!isLibya && (
                    <label className="field">
                      <span>{checkout.postal}</span>
                      <input
                        value={form.postal}
                        onChange={setField('postal')}
                        autoComplete="postal-code"
                        {...fieldA11y('postal')}
                      />
                      {errors.postal && (
                        <span id="checkout-postal-error" className="form-error" role="status">
                          {errors.postal}
                        </span>
                      )}
                    </label>
                  )}
                </div>
                </fieldset>
  );
}

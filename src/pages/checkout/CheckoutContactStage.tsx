import type { ChangeEvent, ReactElement } from 'react';

type PickFn = (value: { en: string; ar: string }) => string;

type CheckoutForm = {
  email: string;
  phone: string;
  [key: string]: string;
};

export default function CheckoutContactStage({
  pick,
  form,
  errors,
  setField,
  fieldA11y,
}: {
  pick: PickFn;
  form: CheckoutForm;
  errors: Record<string, string>;
  setField: (key: string) => (event: ChangeEvent<HTMLInputElement>) => void;
  fieldA11y: (key: string) => Record<string, string | boolean | undefined>;
}): ReactElement {
  return (
    <fieldset className="form-block">
      <legend>{pick({ en: 'Contact', ar: 'التواصل' })}</legend>
      <label className="field">
        <span>Email</span>
        <input
          type="email"
          value={form.email}
          onChange={setField('email')}
          autoComplete="email"
          {...fieldA11y('email')}
        />
        {errors.email ? (
          <span id="checkout-email-error" className="form-error" role="status">
            {errors.email}
          </span>
        ) : null}
      </label>
      <label className="field">
        <span>{pick({ en: 'Phone / WhatsApp', ar: 'الهاتف / واتساب' })}</span>
        <input value={form.phone} onChange={setField('phone')} autoComplete="tel" />
      </label>
    </fieldset>
  );
}

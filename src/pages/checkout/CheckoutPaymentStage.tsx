import type { ReactElement } from 'react';

type PickFn = (value: { en: string; ar: string }) => string;

export default function CheckoutPaymentStage({
  pick,
  isLibya,
  paymentMethod,
  setPaymentMethod,
  cashPlan,
  setCashPlan,
  onlineCardConfigured,
  libyanCardConfigured,
  stagedOrder,
  shippingQuoteRequired,
}: {
  pick: PickFn;
  isLibya: boolean;
  paymentMethod: string;
  setPaymentMethod: (value: string) => void;
  cashPlan: string;
  setCashPlan: (value: string) => void;
  onlineCardConfigured: boolean;
  libyanCardConfigured: boolean;
  stagedOrder: boolean;
  shippingQuoteRequired: boolean;
}): ReactElement {
  return (
    <>
      <fieldset className="form-block payment-methods">
        <legend>{pick({ en: 'Payment method', ar: 'طريقة الدفع' })}</legend>
        {isLibya ? (
          <label className={`payment-choice ${paymentMethod === 'cash' ? 'active' : ''}`}>
            <input
              type="radio"
              name="payment"
              checked={paymentMethod === 'cash'}
              onChange={() => setPaymentMethod('cash')}
            />
            <span>
              <strong>{pick({ en: 'Cash in Libya', ar: 'دفع نقدي داخل ليبيا' })}</strong>
              <small>
                {pick({
                  en: 'Choose 50% to confirm or pay the full amount.',
                  ar: 'اختر دفع 50% للتأكيد أو دفع القيمة كاملة.',
                })}
              </small>
            </span>
          </label>
        ) : null}
        {isLibya && libyanCardConfigured ? (
          <label
            className={`payment-choice ${paymentMethod === 'libyan_bank_card' ? 'active' : ''}`}
          >
            <input
              type="radio"
              name="payment"
              checked={paymentMethod === 'libyan_bank_card'}
              onChange={() => setPaymentMethod('libyan_bank_card')}
            />
            <span>
              <strong>{pick({ en: 'Libyan Bank Card', ar: 'بطاقة مصرفية ليبية' })}</strong>
              <small>
                {pick({
                  en: 'Full payment for retail orders through the connected bank provider.',
                  ar: 'دفع كامل للطلبات العادية عبر مزود المصرف المرتبط.',
                })}
              </small>
            </span>
          </label>
        ) : null}
        {onlineCardConfigured ? (
          <label className={`payment-choice ${paymentMethod === 'online_card' ? 'active' : ''}`}>
            <input
              type="radio"
              name="payment"
              checked={paymentMethod === 'online_card'}
              onChange={() => setPaymentMethod('online_card')}
            />
            <span>
              <strong>{pick({ en: 'Card & Digital Payment', ar: 'بطاقة ودفع إلكتروني' })}</strong>
              <small>Visa · Mastercard · Apple Pay · Google Pay · Samsung Pay</small>
            </span>
          </label>
        ) : null}
      </fieldset>

      {paymentMethod === 'cash' && !stagedOrder && !shippingQuoteRequired ? (
        <fieldset className="form-block payment-plan">
          <legend>{pick({ en: 'Cash confirmation amount', ar: 'قيمة تأكيد الطلب النقدي' })}</legend>
          <div className="payment-plan-grid">
            <label className={cashPlan === 'half' ? 'active' : ''}>
              <input
                type="radio"
                name="cash-plan"
                checked={cashPlan === 'half'}
                onChange={() => setCashPlan('half')}
              />
              <strong>50%</strong>
              <span>{pick({ en: 'Pay half to confirm', ar: 'ادفع النصف لتأكيد الطلب' })}</span>
            </label>
            <label className={cashPlan === 'full' ? 'active' : ''}>
              <input
                type="radio"
                name="cash-plan"
                checked={cashPlan === 'full'}
                onChange={() => setCashPlan('full')}
              />
              <strong>100%</strong>
              <span>{pick({ en: 'Pay in full', ar: 'ادفع القيمة كاملة' })}</span>
            </label>
          </div>
        </fieldset>
      ) : null}
    </>
  );
}

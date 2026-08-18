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
  shippingQuoteRequired,
  allowCashPlanChoice,
  immediateCash,
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
  allowCashPlanChoice: boolean;
  immediateCash: boolean;
}): ReactElement {
  if (shippingQuoteRequired) {
    return (
      <div className="notice notice--info" role="status">
        <strong>{pick({ en: 'Payment comes after the shipping quote.', ar: 'الدفع بعد تأكيد سعر الشحن.' })}</strong>
        <p>{pick({
          en: 'Submit the order details now. Shababuna confirms the real shipping amount before any payment is collected.',
          ar: 'أرسل بيانات الطلب الآن. يؤكد شبابنا قيمة الشحن الفعلية قبل تحصيل أي مبلغ.',
        })}</p>
      </div>
    );
  }

  return (
    <>
      <fieldset className="form-block payment-methods">
        <legend>{pick({ en: 'Payment method', ar: 'طريقة الدفع' })}</legend>
        {isLibya ? (
          <label className={`payment-choice ${paymentMethod === 'cash' ? 'active' : ''}`}>
            <input type="radio" name="payment" checked={paymentMethod === 'cash'} onChange={() => setPaymentMethod('cash')} />
            <span>
              <strong>{pick({ en: 'Cash in Libya', ar: 'دفع نقدي داخل ليبيا' })}</strong>
              <small>
                {immediateCash
                  ? pick({ en: 'Immediate-delivery order — pay cash when the order is delivered.', ar: 'طلب تسليم فوري — ادفع نقدًا عند استلام الطلب.' })
                  : allowCashPlanChoice
                    ? pick({ en: 'Reservation order — choose 50% to confirm or 100% upfront.', ar: 'طلب بالحجز — اختر 50% للتأكيد أو دفع 100% مقدمًا.' })
                    : pick({ en: 'Cash payment inside Libya.', ar: 'دفع نقدي داخل ليبيا.' })}
              </small>
            </span>
          </label>
        ) : null}
        {isLibya && libyanCardConfigured ? (
          <label className={`payment-choice ${paymentMethod === 'libyan_bank_card' ? 'active' : ''}`}>
            <input type="radio" name="payment" checked={paymentMethod === 'libyan_bank_card'} onChange={() => setPaymentMethod('libyan_bank_card')} />
            <span>
              <strong>{pick({ en: 'Libyan Bank Card', ar: 'بطاقة مصرفية ليبية' })}</strong>
              <small>{pick({ en: 'Full payment through the connected Libyan bank provider.', ar: 'دفع كامل عبر مزود البطاقة المصرفية الليبية المرتبط.' })}</small>
            </span>
          </label>
        ) : null}
        {onlineCardConfigured ? (
          <label className={`payment-choice payment-choice--card ${paymentMethod === 'online_card' ? 'active' : ''}`}>
            <input type="radio" name="payment" checked={paymentMethod === 'online_card'} onChange={() => setPaymentMethod('online_card')} />
            <span>
              <strong>{pick({ en: 'Card & Digital Payment', ar: 'بطاقة ودفع إلكتروني' })}</strong>
              <small>Visa · Mastercard · Apple Pay · Google Pay</small>
            </span>
          </label>
        ) : null}
      </fieldset>

      {paymentMethod === 'cash' && allowCashPlanChoice ? (
        <fieldset className="form-block payment-plan">
          <legend>{pick({ en: 'Cash confirmation amount', ar: 'قيمة تأكيد الطلب النقدي' })}</legend>
          <div className="payment-plan-grid">
            <label className={cashPlan === 'half' ? 'active' : ''}>
              <input type="radio" name="cash-plan" checked={cashPlan === 'half'} onChange={() => setCashPlan('half')} />
              <strong>50%</strong>
              <span>{pick({ en: 'Pay half to confirm', ar: 'ادفع النصف لتأكيد الطلب' })}</span>
            </label>
            <label className={cashPlan === 'full' ? 'active' : ''}>
              <input type="radio" name="cash-plan" checked={cashPlan === 'full'} onChange={() => setCashPlan('full')} />
              <strong>100%</strong>
              <span>{pick({ en: 'Pay in full', ar: 'ادفع القيمة كاملة' })}</span>
            </label>
          </div>
        </fieldset>
      ) : null}
    </>
  );
}

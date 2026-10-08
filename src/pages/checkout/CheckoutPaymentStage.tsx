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
  allowManualPlanChoice,
  immediateDelivery,
  reservationOrder,
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
  allowManualPlanChoice: boolean;
  immediateDelivery: boolean;
  reservationOrder: boolean;
}): ReactElement {
  if (shippingQuoteRequired) {
    return (
      <div className="notice notice--info" role="status">
        <strong>{pick({ en: 'Payment comes after the shipping quote.', ar: 'الدفع بعد تأكيد سعر الشحن.' })}</strong>
        <p>{pick({
          en: 'Submit the order details now. Shababuna confirms the shipping amount before payment.',
          ar: 'أرسل بيانات الطلب الآن. يؤكد شبابنا قيمة الشحن قبل الدفع.',
        })}</p>
      </div>
    );
  }

  const manualPayment = paymentMethod === 'cash' || paymentMethod === 'bank_transfer';

  return (
    <>
      <fieldset className="form-block payment-methods">
        <legend>{pick({ en: 'Payment method', ar: 'طريقة الدفع' })}</legend>

        {isLibya ? (
          <label className={`payment-choice ${paymentMethod === 'cash' ? 'active' : ''}`}>
            <input
              type="radio"
              name="payment"
              value="cash"
              checked={paymentMethod === 'cash'}
              onChange={() => setPaymentMethod('cash')}
            />
            <span>
              <strong>{pick({ en: 'Cash', ar: 'كاش' })}</strong>
              <small>
                {immediateDelivery
                  ? pick({
                      en: 'Ready-to-ship order — full payment on delivery.',
                      ar: 'طلب تسليم فوري — دفع كامل عند الاستلام.',
                    })
                  : reservationOrder
                    ? pick({
                        en: 'Reservation order — pay 50% to confirm or 100% in full.',
                        ar: 'طلب بالحجز — ادفع 50% للتأكيد أو 100% بالكامل.',
                      })
                    : pick({ en: 'Cash payment inside Libya.', ar: 'دفع كاش داخل ليبيا.' })}
              </small>
            </span>
          </label>
        ) : null}

        {isLibya ? (
          <label className={`payment-choice ${paymentMethod === 'bank_transfer' ? 'active' : ''}`}>
            <input
              type="radio"
              name="payment"
              value="bank_transfer"
              checked={paymentMethod === 'bank_transfer'}
              onChange={() => setPaymentMethod('bank_transfer')}
            />
            <span>
              <strong>{pick({ en: 'Bank transfer', ar: 'حوالة مصرفية' })}</strong>
              <small>
                {immediateDelivery
                  ? pick({
                      en: 'Ready-to-ship order — transfer the full amount.',
                      ar: 'طلب تسليم فوري — حوالة بالقيمة كاملة.',
                    })
                  : reservationOrder
                    ? pick({
                        en: 'Reservation order — transfer 50% to confirm or 100% in full.',
                        ar: 'طلب بالحجز — حوالة 50% للتأكيد أو 100% بالكامل.',
                      })
                    : pick({
                        en: 'Manual bank transfer inside Libya.',
                        ar: 'حوالة مصرفية داخل ليبيا.',
                      })}
              </small>
            </span>
          </label>
        ) : null}

        {isLibya && libyanCardConfigured ? (
          <label className={`payment-choice ${paymentMethod === 'libyan_bank_card' ? 'active' : ''}`}>
            <input
              type="radio"
              name="payment"
              value="libyan_bank_card"
              checked={paymentMethod === 'libyan_bank_card'}
              onChange={() => setPaymentMethod('libyan_bank_card')}
            />
            <span>
              <strong>{pick({ en: 'Libyan Bank Card', ar: 'بطاقة مصرفية ليبية' })}</strong>
              <small>{pick({ en: 'Full payment through the connected bank provider.', ar: 'دفع كامل عبر مزود البطاقة المصرفية.' })}</small>
            </span>
          </label>
        ) : null}

        {onlineCardConfigured ? (
          <label className={`payment-choice payment-choice--card ${paymentMethod === 'online_card' ? 'active' : ''}`}>
            <input
              type="radio"
              name="payment"
              value="online_card"
              checked={paymentMethod === 'online_card'}
              onChange={() => setPaymentMethod('online_card')}
            />
            <span>
              <strong>{pick({ en: 'Card & Digital Payment', ar: 'بطاقة ودفع إلكتروني' })}</strong>
              <small>Visa · Mastercard · Apple Pay · Google Pay</small>
            </span>
          </label>
        ) : null}
      </fieldset>

      {manualPayment && allowManualPlanChoice ? (
        <fieldset className="form-block payment-plan">
          <legend>{pick({ en: 'Payment amount', ar: 'قيمة الدفع' })}</legend>
          <div className="payment-plan-grid">
            <label className={cashPlan === 'half' ? 'active' : ''}>
              <input
                type="radio"
                name="cash-plan"
                value="half"
                checked={cashPlan === 'half'}
                onChange={() => setCashPlan('half')}
              />
              <strong>50%</strong>
              <span>{pick({ en: 'Deposit to confirm', ar: 'دفعة لتأكيد الحجز' })}</span>
            </label>
            <label className={cashPlan === 'full' ? 'active' : ''}>
              <input
                type="radio"
                name="cash-plan"
                value="full"
                checked={cashPlan === 'full'}
                onChange={() => setCashPlan('full')}
              />
              <strong>100%</strong>
              <span>{pick({ en: 'Pay in full', ar: 'دفع القيمة كاملة' })}</span>
            </label>
          </div>
        </fieldset>
      ) : null}
    </>
  );
}

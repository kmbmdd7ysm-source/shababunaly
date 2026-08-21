import type { FormEvent, ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import Seo from '../components/common/Seo';
import TurnstileWidget from '../components/security/TurnstileWidget';
import { useCommerce } from '../context/CommerceContext';
import { useLanguage } from '../context/LanguageContext';
import { sendFormspree } from '../services/formspree';
import '../styles/gift-cards.css';
import '../styles/domain-forms.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function GiftCardsPage(): ReactElement {
  const { pick, lang } = useLanguage();
  const { currency } = useCommerce();
  const presets = useMemo(() => currency === 'LYD' ? [100, 200, 500, 1000] : [25, 50, 100, 200], [currency]);
  const [amount, setAmount] = useState(String(presets[1]));
  const [form, setForm] = useState({ recipientName: '', recipientEmail: '', senderName: '', senderEmail: '', message: '', deliveryDate: '' });
  const [token, setToken] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  useEffect(() => { setAmount(String(presets[1])); }, [presets]);
  const numericAmount = Number(amount);
  const validAmount = Number.isFinite(numericAmount) && numericAmount > 0 && numericAmount <= (currency === 'LYD' ? 5000 : 1000);
  const valid = Boolean(token) && validAmount && form.recipientName.trim().length >= 2 && EMAIL_RE.test(form.recipientEmail) && form.senderName.trim().length >= 2 && EMAIL_RE.test(form.senderEmail);

  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!valid || status === 'sending') return;
    setStatus('sending');
    try {
      await sendFormspree({
        formType: 'gift_card_request',
        customerName: form.senderName.trim(),
        customerEmail: form.senderEmail.trim(),
        recipientName: form.recipientName.trim(),
        recipientEmail: form.recipientEmail.trim(),
        amount: numericAmount,
        currency,
        deliveryDate: form.deliveryDate || 'As soon as confirmed',
        message: form.message.trim(),
        language: lang,
        turnstileToken: token,
        submittedAt: new Date().toISOString(),
      }, `Shababuna gift card · ${numericAmount} ${currency}`);
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  return (
    <>
      <Seo
        title={pick({ en: 'Gift Cards', ar: 'بطاقات الهدايا' })}
        description={pick({ en: 'Request a digital Shababuna gift card for a basketball player, teammate or friend.', ar: 'اطلب بطاقة هدية رقمية من شبابنا للاعب أو زميل أو صديق.' })}
        path="/gift-cards"
      />
      <main className="gc-page">
        <header className="gc-hero">
          <div className="gc-hero__art" aria-hidden="true"><span>SHABABUNA</span><b>GIFT CARD</b></div>
          <div className="gc-hero__copy">
            <p>{pick({ en: 'SHABABUNA GIFT CARDS', ar: 'بطاقات هدايا شبابنا' })}</p>
            <h1>{pick({ en: 'Give them the game.', ar: 'أهديهم اللعبة.' })}</h1>
            <span>{pick({ en: 'Choose the value and who it is for. We confirm payment, then deliver the digital gift card to the recipient.', ar: 'اختر القيمة ولمن الهدية. نؤكد الدفع ثم نرسل بطاقة الهدية الرقمية للمستلم.' })}</span>
          </div>
        </header>

        <section className="gc-builder" aria-labelledby="gc-builder-title">
          <div className="gc-builder__intro">
            <p>01 / {pick({ en: 'Value', ar: 'القيمة' })}</p>
            <h2 id="gc-builder-title">{pick({ en: 'Choose an amount.', ar: 'اختر قيمة الهدية.' })}</h2>
            <div className="gc-presets" role="group" aria-label={pick({ en: 'Gift card value', ar: 'قيمة بطاقة الهدية' })}>
              {presets.map((preset) => (
                <button key={preset} type="button" className={Number(amount) === preset ? 'is-active' : ''} onClick={() => setAmount(String(preset))}>
                  {preset} {currency}
                </button>
              ))}
            </div>
            <label className="gc-custom-amount">
              <span>{pick({ en: 'Custom amount', ar: 'قيمة مخصصة' })}</span>
              <div><input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^0-9.]/g, '').slice(0, 8))} /><b>{currency}</b></div>
              {!validAmount ? <small>{pick({ en: 'Enter a valid gift-card value.', ar: 'أدخل قيمة صالحة لبطاقة الهدية.' })}</small> : null}
            </label>
            <div className="gc-trust">
              <span>01</span><p>{pick({ en: 'Submit the gift-card request.', ar: 'أرسل طلب بطاقة الهدية.' })}</p>
              <span>02</span><p>{pick({ en: 'Shababuna confirms payment details with you.', ar: 'يؤكد فريق شبابنا تفاصيل الدفع معك.' })}</p>
              <span>03</span><p>{pick({ en: 'The digital card is delivered after payment is confirmed.', ar: 'تُرسل البطاقة الرقمية بعد تأكيد الدفع.' })}</p>
            </div>
          </div>

          <form className="gc-form" onSubmit={(event) => { void submit(event); }} noValidate>
            {status === 'success' ? (
              <div className="gc-success" role="status">
                <span>✓</span>
                <h2>{pick({ en: 'Gift-card request received.', ar: 'تم استلام طلب بطاقة الهدية.' })}</h2>
                <p>{pick({ en: 'We will contact you through the sender email to confirm payment and delivery before the card is issued.', ar: 'سنتواصل معك عبر بريد المرسل لتأكيد الدفع والتسليم قبل إصدار البطاقة.' })}</p>
              </div>
            ) : (
              <>
                <div className="gc-form__head"><p>02 / {pick({ en: 'Recipient', ar: 'المستلم' })}</p><h2>{pick({ en: 'Make it personal.', ar: 'خلّيها شخصية.' })}</h2></div>
                <div className="field-row">
                  <label className="field"><span className="field__label">{pick({ en: 'Recipient name', ar: 'اسم المستلم' })}</span><div className="field__control"><input required value={form.recipientName} onChange={(e) => update('recipientName', e.target.value)} /></div></label>
                  <label className="field"><span className="field__label">{pick({ en: 'Recipient email', ar: 'بريد المستلم' })}</span><div className="field__control field__control--latin"><input required type="email" value={form.recipientEmail} onChange={(e) => update('recipientEmail', e.target.value)} /></div></label>
                </div>
                <div className="field-row">
                  <label className="field"><span className="field__label">{pick({ en: 'Your name', ar: 'اسمك' })}</span><div className="field__control"><input required value={form.senderName} onChange={(e) => update('senderName', e.target.value)} /></div></label>
                  <label className="field"><span className="field__label">{pick({ en: 'Your email', ar: 'بريدك' })}</span><div className="field__control field__control--latin"><input required type="email" value={form.senderEmail} onChange={(e) => update('senderEmail', e.target.value)} /></div></label>
                </div>
                <label className="field"><span className="field__label">{pick({ en: 'Delivery date (optional)', ar: 'تاريخ الإرسال (اختياري)' })}</span><div className="field__control field__control--latin"><input type="date" min={new Date().toISOString().slice(0, 10)} value={form.deliveryDate} onChange={(e) => update('deliveryDate', e.target.value)} /></div></label>
                <label className="field"><span className="field__label">{pick({ en: 'Gift message (optional)', ar: 'رسالة الهدية (اختياري)' })}</span><div className="field__control field__control--textarea"><textarea rows={4} maxLength={320} value={form.message} onChange={(e) => update('message', e.target.value)} /></div></label>
                <TurnstileWidget onToken={setToken} language={lang} optionalWhenUnconfigured />
                {status === 'error' ? <p className="form-error" role="alert">{pick({ en: 'The request could not be sent. Check the details and try again.', ar: 'تعذر إرسال الطلب. راجع البيانات وحاول مرة أخرى.' })}</p> : null}
                <button type="submit" className="gc-submit" disabled={!valid || status === 'sending'}>{status === 'sending' ? pick({ en: 'Sending…', ar: 'جارٍ الإرسال…' }) : pick({ en: 'Request gift card', ar: 'اطلب بطاقة الهدية' })}</button>
                <p className="gc-form__note">{pick({ en: 'Submitting this form does not charge you or issue a live balance. The card is issued only after Shababuna confirms payment.', ar: 'إرسال النموذج لا يخصم أي مبلغ ولا يصدر رصيداً مباشراً. تصدر البطاقة فقط بعد تأكيد الدفع من شبابنا.' })}</p>
              </>
            )}
          </form>
        </section>
      </main>
    </>
  );
}

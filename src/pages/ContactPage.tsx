import type { ReactElement, FormEvent, ChangeEvent } from 'react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { SITE } from '../config';
import Seo from '../components/common/Seo';
import PublicPageHeader from '../components/content/PublicPageHeader';
import '../styles/domain-content.css';
import '../styles/composition.css';
import Breadcrumbs from '../components/common/Breadcrumbs';
import { sendFormspree } from '../services/formspree';
import TurnstileWidget from '../components/security/TurnstileWidget';
import '../styles/content.css';
import '../styles/domain-forms.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const types = [
  ['general', { en: 'General', ar: 'استفسار عام' }],
  ['order', { en: 'Order', ar: 'طلب' }],
  ['custom', { en: 'Custom Design', ar: 'تصميم خاص' }],
  ['wholesale', { en: 'Teams & Wholesale', ar: 'الأندية والجملة' }],
  ['equipment', { en: 'Equipment', ar: 'معدات' }],
  ['partnership', { en: 'Partnership', ar: 'شراكة' }],
];

export default function ContactPage(): ReactElement {
  const { pick, lang } = useLanguage();
  const [params] = useSearchParams();
  const [form, setForm] = useState({
    type: params.get('type') || 'general',
    name: '',
    email: '',
    phone: '',
    country: '',
    organization: '',
    orderNumber: '',
    message: '',
  });
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [turnstileToken, setTurnstileToken] = useState('');
  const set =
    (key: keyof typeof form) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((current) => ({ ...current, [key]: event.target.value }));
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = pick({ en: 'Required', ar: 'مطلوب' });
    if (!EMAIL_RE.test(form.email))
      next.email = pick({ en: 'Enter a valid email', ar: 'أدخل بريدًا صحيحًا' });
    if (!form.message.trim()) next.message = pick({ en: 'Required', ar: 'مطلوب' });
    if (!consent)
      next.consent = pick({ en: 'Please accept before sending', ar: 'يرجى الموافقة قبل الإرسال' });
    setErrors(next);
    if (Object.keys(next).length) return;
    setStatus('sending');
    try {
      await sendFormspree(
        { ...form, turnstileToken, language: lang, submittedAt: new Date().toISOString() },
        `Shababuna contact · ${form.type}`,
      );
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };
  return (
    <>
      <Seo
        title="Contact Shababuna"
        description="Contact Shababuna in Tripoli for orders, custom basketball products, teams, wholesale and equipment."
        path="/contact"
      />
      <PublicPageHeader
        eyebrow="Shababuna support"
        title={pick({ en: 'Talk to the right team.', ar: 'تواصل مع الفريق المناسب.' })}
        lede={pick({
          en: 'Retail orders, custom design, club supply, wholesale and basketball equipment.',
          ar: 'طلبات الأفراد والتصميم الخاص وتجهيز الأندية والجملة ومعدات كرة السلة.',
        })}
        trail={[{ label: pick({ en: 'Contact', ar: 'تواصل' }) }]}
        figure={{ value: types.length, label: pick({ en: 'routes', ar: 'مسارات' }) }}
      />
      <div className="container">
        <Breadcrumbs items={[{ label: pick({ en: 'Contact', ar: 'تواصل معنا' }) }]} />
      </div>
      <section className="gw-contact gw-contact-desk">
        <div className="gw-contact-inner">
          <div className="contact-form-wrap">
            {status === 'success' ? (
              <div className="notice notice--ok">
                <h2>{pick({ en: 'Message received.', ar: 'تم استلام رسالتك.' })}</h2>
                <p>
                  {pick({
                    en: 'Shababuna will reply through the contact details you provided.',
                    ar: 'سيرد فريق شبابنا عبر بيانات التواصل التي أرسلتها.',
                  })}
                </p>
              </div>
            ) : (
              <form className="contact-form" onSubmit={(e) => { void submit(e); }} noValidate>
                <label className="field" data-field="type">
                  <span className="field__label">{pick({ en: 'Inquiry type', ar: 'نوع الاستفسار' })}</span>
                  <div className="field__control field__control--select">
                    <select value={form.type} onChange={set('type')}>
                    {types.map(([key, label]) => (
                      <option key={String(key)} value={String(key)}>
                        {pick(label as { en: string; ar: string })}
                      </option>
                    ))}
                    </select>
                  </div>
                </label>
                <div className="field-row">
                  <label className="field" data-field="name">
                    <span className="field__label">{pick({ en: 'Full name', ar: 'الاسم الكامل' })}</span>
                    <div className="field__control">
                      <input value={form.name} onChange={set('name')} autoComplete="name" />
                    </div>
                    {errors.name && <span className="form-error">{errors.name}</span>}
                  </label>
                  <label className="field" data-field="email">
                    <span className="field__label">Email</span>
                    <div className="field__control field__control--latin">
                      <input
                      type="email"
                      value={form.email}
                      onChange={set('email')}
                      autoComplete="email"
                      />
                    </div>
                    {errors.email && <span className="form-error">{errors.email}</span>}
                  </label>
                </div>
                <div className="field-row">
                  <label className="field" data-field="phone">
                    <span className="field__label">{pick({ en: 'Phone / WhatsApp', ar: 'الهاتف / واتساب' })}</span>
                    <div className="field__control field__control--latin">
                      <input value={form.phone} onChange={set('phone')} autoComplete="tel" />
                    </div>
                  </label>
                  <label className="field" data-field="country">
                    <span className="field__label">{pick({ en: 'Country', ar: 'الدولة' })}</span>
                    <div className="field__control">
                      <input
                      value={form.country}
                      onChange={set('country')}
                      autoComplete="country-name"
                      />
                    </div>
                  </label>
                </div>
                <label className="field" data-field="organization">
                  <span className="field__label">{pick({ en: 'Organization', ar: 'المؤسسة' })}</span>
                  <div className="field__control">
                    <input value={form.organization} onChange={set('organization')} />
                  </div>
                </label>
                {form.type === 'order' && (
                  <label className="field" data-field="order-number">
                    <span className="field__label">{pick({ en: 'Order number', ar: 'رقم الطلب' })}</span>
                    <div className="field__control field__control--latin">
                      <input value={form.orderNumber} onChange={set('orderNumber')} />
                    </div>
                  </label>
                )}
                <label className="field" data-field="message">
                  <span className="field__label">{pick({ en: 'How can we help?', ar: 'كيف يمكننا مساعدتك؟' })}</span>
                  <div className="field__control field__control--textarea">
                    <textarea rows={7} value={form.message} onChange={set('message')} />
                  </div>
                  {errors.message && <span className="form-error">{errors.message}</span>}
                </label>
                <label className="field-check">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(event) => setConsent(event.target.checked)}
                  />
                  <span>
                    {pick({
                      en: 'I agree that Shababuna may use these details to respond to this request.',
                      ar: 'أوافق على استخدام شبابنا لهذه البيانات للرد على هذا الطلب.',
                    })}
                  </span>
                </label>
                {errors.consent && <span className="form-error">{errors.consent}</span>}
                <TurnstileWidget onToken={setTurnstileToken} language={lang} optionalWhenUnconfigured />
                {errors.captcha && <span className="form-error">{errors.captcha}</span>}
                {status === 'error' && (
                  <div className="notice notice--info">
                    {pick({
                      en: 'Sending failed. Try again or contact us on WhatsApp.',
                      ar: 'تعذر الإرسال. حاول مرة أخرى أو تواصل معنا عبر واتساب.',
                    })}
                  </div>
                )}
                <button className="btn-primary block" disabled={status === 'sending'}>
                  {status === 'sending'
                    ? pick({ en: 'Sending…', ar: 'جارٍ الإرسال…' })
                    : pick({ en: 'Send Message', ar: 'إرسال الرسالة' })}
                </button>
              </form>
            )}
          </div>
          <aside className="contact-info">
            <p className="section-label">DIRECT CONTACT</p>
            <h2>SHABABUNA</h2>
            <ul>
              <li>
                <span>{pick({ en: 'Email', ar: 'البريد' })}</span>
                <a href={SITE.emailLink}>{SITE.email}</a>
              </li>
              <li>
                <span>{pick({ en: 'Phone / WhatsApp', ar: 'الهاتف / واتساب' })}</span>
                <a href={`https://wa.me/${SITE.whatsapp}`} target="_blank" rel="noreferrer">
                  {SITE.phone}
                </a>
              </li>
              <li>
                <span>{pick({ en: 'Location', ar: 'الموقع' })}</span>
                <strong>{pick(SITE.address)}</strong>
              </li>
              <li>
                <span>Instagram</span>
                <a href={SITE.social.instagram} target="_blank" rel="noreferrer">
                  @shababuna.ly
                </a>
              </li>
              <li>
                <span>TikTok</span>
                <a href={SITE.social.tiktok} target="_blank" rel="noreferrer">
                  @shababuna.ly
                </a>
              </li>
            </ul>
          </aside>
        </div>
      </section>
    </>
  );
}

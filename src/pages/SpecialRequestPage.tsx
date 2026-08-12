import type { FormEvent, ReactElement } from 'react';
import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import Seo from '../components/common/Seo';
import PublicPageHeader from '../components/content/PublicPageHeader';
import '../styles/composition.css';
import '../styles/domain-forms.css';
import CountrySelect from '../components/common/CountrySelect';
import TurnstileWidget from '../components/security/TurnstileWidget';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { submitSpecialRequest } from '../services/specialRequests';

const initial = {
  customerName: '',
  email: '',
  phone: '',
  whatsapp: '',
  country: 'LY',
  productUrl: '',
  productName: '',
  description: '',
  preferredBrand: '',
  desiredQuantity: '1',
  size: '',
  color: '',
  targetBudget: '',
  requiredDate: '',
  preferredContactMethod: 'email',
  consent: false,
};

const messages = {
  product_reference_required: {
    en: 'Add a valid product URL or upload one product image.',
    ar: 'أضف رابط منتج صالحًا أو ارفع صورة واحدة للمنتج.',
  },
  invalid_file_size: {
    en: 'Each file must be no larger than 2 MB.',
    ar: 'يجب ألا يتجاوز حجم كل ملف 2 ميجابايت.',
  },
  files_too_large: {
    en: 'The combined file size must be no larger than 3 MB.',
    ar: 'يجب ألا يتجاوز الحجم الإجمالي للملفات 3 ميجابايت.',
  },
  unsupported_file_type: {
    en: 'Use JPG, PNG, WebP, PDF, CSV or XLSX files only.',
    ar: 'استخدم ملفات JPG أو PNG أو WebP أو PDF أو CSV أو XLSX فقط.',
  },
  captcha_failed: {
    en: 'Complete the security check and try again.',
    ar: 'أكمل التحقق الأمني ثم أعد المحاولة.',
  },
};

type SpecialRequestForm = {
  customerName: string;
  email: string;
  phone: string;
  whatsapp: string;
  country: string;
  productUrl: string;
  productName: string;
  description: string;
  preferredBrand: string;
  desiredQuantity: string;
  size: string;
  color: string;
  targetBudget: string;
  requiredDate: string;
  preferredContactMethod: string;
  consent: boolean;
};

export default function SpecialRequestPage(): ReactElement {
  const { pick, lang } = useLanguage();
  const auth = useAuth();
  const metadata = (auth.user?.user_metadata || {}) as Record<string, unknown>;
  const [form, setForm] = useState<SpecialRequestForm>(() => ({
    ...initial,
    email: String(auth.user?.email || ''),
    customerName: String(metadata.fullName || ''),
  }));
  const [productImage, setProductImage] = useState<File | null>(null);
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');
  const set = <K extends keyof SpecialRequestForm>(key: K, value: SpecialRequestForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));
  const onToken = useCallback((value: string) => setToken(value), []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const productUrl = form.productUrl.trim();
      const productName = form.productName.trim();
      if (productUrl && !/^https?:\/\/[^\s]+$/i.test(productUrl))
        throw new Error('product_reference_required');
      if (!productUrl && !productImage && !productName) throw new Error('product_reference_required');
      const note = form.description.trim();
      const description =
        note ||
        [productName && `Product: ${productName}`, productUrl && `URL: ${productUrl}`]
          .filter(Boolean)
          .join('\n') ||
        'Special product request';
      const request = (await submitSpecialRequest({
        payload: {
          ...form,
          productUrl,
          preferredBrand: productName || form.preferredBrand,
          description,
          desiredQuantity: Number(form.desiredQuantity) || 1,
          targetBudget: form.targetBudget === '' ? null : Number(form.targetBudget),
          locale: lang,
        },
        productImage,
        additionalFiles: [],
        turnstileToken: token,
        accessToken: String(auth.session?.access_token || ''),
      })) as Record<string, unknown>;
      setResult(request);
      setForm((current) => ({
        ...initial,
        email: current.email,
        customerName: current.customerName,
        country: current.country,
      }));
      setProductImage(null);
      setToken('');
    } catch (failure) {
      const code = failure instanceof Error ? failure.message : '';
      const messageMap = messages as Record<string, { en: string; ar: string }>;
      setError(
        pick(
          messageMap[code] || {
            en: 'The request could not be submitted safely. Review the fields and try again.',
            ar: 'تعذر إرسال الطلب بأمان. راجع البيانات وحاول مرة أخرى.',
          },
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Seo
        title={pick({ en: 'Special Request', ar: 'طلب خاص' })}
        description={pick({
          en: 'Ask Shababuna to source a basketball product that is not currently listed.',
          ar: 'اطلب من شبابنا توفير منتج كرة سلة غير موجود حاليًا في المتجر.',
        })}
        path="/special-request"
      />
      <PublicPageHeader
        eyebrow={pick({ en: 'Special request', ar: 'طلب خاص' })}
        title={pick({ en: 'Can’t find it? Send it.', ar: 'لم تجده؟ أرسل طلبك.' })}
        lede={pick({
          en: 'Share a product link or image. Our operations team will review availability, price, shipping and arrival time before you pay.',
          ar: 'شارك رابط المنتج أو صورته. يراجع فريق العمليات التوفر والسعر والشحن ومدة الوصول قبل أي دفع.',
        })}
        trail={[{ label: pick({ en: 'Special Request', ar: 'طلب خاص' }) }]}
      />
      <section className="gw-request">
        <div className="gw-request-inner">
          <aside className="special-request-info gw-request-rail">
            <p className="gw-spec">{pick({ en: 'How it works', ar: 'كيف يعمل' })}</p>
            <h2 className="gw-request-rail-title">
              {pick({
                en: 'A verified quote, not a blind checkout',
                ar: 'عرض موثق، وليس دفعًا عشوائيًا',
              })}
            </h2>
            <ol className="gw-request-steps">
              <li>
                <span className="gw-request-step-num" aria-hidden="true">
                  01
                </span>
                {pick({
                  en: 'Send one product link or image.',
                  ar: 'أرسل رابط منتج واحدًا أو صورة.',
                })}
              </li>
              <li>
                <span className="gw-request-step-num" aria-hidden="true">
                  02
                </span>
                {pick({
                  en: 'We verify the exact item and supplier.',
                  ar: 'نتحقق من المنتج والمورد.',
                })}
              </li>
              <li>
                <span className="gw-request-step-num" aria-hidden="true">
                  03
                </span>
                {pick({
                  en: 'You receive price, shipping and timing.',
                  ar: 'يصلك السعر والشحن والمدة.',
                })}
              </li>
              <li>
                <span className="gw-request-step-num" aria-hidden="true">
                  04
                </span>
                {pick({
                  en: 'Accept or reject from your account.',
                  ar: 'اقبل العرض أو ارفضه من حسابك.',
                })}
              </li>
            </ol>
            <p>
              {pick({
                en: 'Uploaded files are stored privately in quarantine until they pass file review.',
                ar: 'تُحفظ الملفات المرفوعة بشكل خاص في منطقة عزل حتى اجتياز فحص الملفات.',
              })}
            </p>
            {auth.user ? (
              <Link className="btn-secondary" to="/account?section=special-requests">
                {pick({ en: 'View my requests', ar: 'عرض طلباتي' })}
              </Link>
            ) : (
              <Link className="btn-secondary" to="/account?returnTo=/special-request">
                {pick({ en: 'Sign in to track requests', ar: 'سجل الدخول لتتبع الطلبات' })}
              </Link>
            )}
          </aside>
          <form
            className="special-request-form"
            onSubmit={(event) => {
              void submit(event);
            }}
            noValidate
          >
            <div className="field-row">
              <label className="field">
                <span>{pick({ en: 'Customer name', ar: 'اسم العميل' })}</span>
                <input
                  required
                  minLength={2}
                  autoComplete="name"
                  value={form.customerName}
                  onChange={(e) => set('customerName', e.target.value)}
                />
              </label>
              <label className="field">
                <span>Email</span>
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                />
              </label>
            </div>
            <label className="field">
              <span>{pick({ en: 'Phone', ar: 'الهاتف' })}</span>
              <input
                autoComplete="tel"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
              />
            </label>
            <label className="field">
              <span>{pick({ en: 'Country', ar: 'الدولة' })}</span>
              <CountrySelect value={form.country} onChange={(value) => set('country', value)} />
            </label>
            <label className="field">
              <span>{pick({ en: 'Product name', ar: 'اسم المنتج' })}</span>
              <input
                value={form.productName}
                onChange={(e) => set('productName', e.target.value)}
                placeholder={pick({
                  en: 'What are you looking for?',
                  ar: 'عمّ تبحث؟',
                })}
              />
            </label>
            <fieldset className="special-reference">
              <legend>
                {pick({
                  en: 'Link or image — at least one helps us find it',
                  ar: 'رابط أو صورة — واحد على الأقل يساعدنا',
                })}
              </legend>
              <label className="field">
                <span>{pick({ en: 'Product link', ar: 'رابط المنتج' })}</span>
                <input
                  type="url"
                  inputMode="url"
                  placeholder="https://"
                  value={form.productUrl}
                  onChange={(e) => set('productUrl', e.target.value)}
                />
              </label>
              <label className="custom-upload">
                <span>{pick({ en: 'Product image', ar: 'صورة المنتج' })}</span>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  onChange={(e) => setProductImage(e.target.files?.[0] || null)}
                />
                <small>
                  {productImage?.name ||
                    pick({
                      en: 'JPG, PNG or WebP · max 2 MB',
                      ar: 'JPG أو PNG أو WebP · بحد أقصى 2 ميجابايت',
                    })}
                </small>
              </label>
            </fieldset>
            <label className="field">
              <span>{pick({ en: 'Short note (optional)', ar: 'ملاحظة قصيرة (اختياري)' })}</span>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
              />
            </label>
            <label className="checkbox-line">
              <input
                type="checkbox"
                checked={form.consent}
                onChange={(e) => set('consent', e.target.checked)}
                required
              />
              <span>
                {pick({
                  en: 'I consent to Shababuna using these details to review and respond to this request.',
                  ar: 'أوافق على استخدام شبابنا لهذه البيانات لمراجعة الطلب والرد عليه.',
                })}
              </span>
            </label>
            <TurnstileWidget onToken={onToken} language={lang} optionalWhenUnconfigured />
            <button className="btn-primary block" disabled={busy || !form.consent}>
              {busy
                ? pick({ en: 'Submitting securely…', ar: 'جاري الإرسال بأمان…' })
                : pick({ en: 'Submit Special Request', ar: 'إرسال الطلب الخاص' })}
            </button>
            {error && (
              <p className="form-status form-status--error" role="alert">
                {error}
              </p>
            )}
            {result && (
              <div className="special-request-success" role="status">
                <strong>{pick({ en: 'Request received', ar: 'تم استلام الطلب' })}</strong>
                <span>{String(result.requestNumber || '')}</span>
                <p>
                  {result.persisted === false
                    ? pick({
                        en: 'Your request reached our team by email. If you attached a file that could not be stored safely, we will contact you to collect it securely. No payment is due.',
                        ar: 'وصل طلبك إلى فريقنا عبر البريد الإلكتروني. إذا تعذر حفظ ملف مرفق بأمان فسنتواصل معك لاستلامه بطريقة آمنة. لا توجد دفعة مستحقة.',
                      })
                    : pick({
                        en: 'Your order has not been placed and no payment is due. We will review the request first.',
                        ar: 'لم يتم إنشاء طلب شراء ولا توجد دفعة مستحقة. سنراجع الطلب أولًا.',
                      })}
                </p>
                {auth.user && result.persisted !== false && (
                  <Link to="/account?section=special-requests">
                    {pick({ en: 'Track in account', ar: 'تتبعه داخل الحساب' })}
                  </Link>
                )}
              </div>
            )}
          </form>
        </div>
      </section>
    </>
  );
}

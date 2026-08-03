import { useState } from 'react';
import { Link } from 'react-router-dom';
import Seo from '../components/common/Seo';
import PageHero from '../components/common/PageHero';
import CountrySelect from '../components/common/CountrySelect';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { sendFormspreeWithFiles } from '../services/formspree';
import { ensureOrganization } from '../services/b2b';
import { submitPublicQuote } from '../services/publicQuotes';
import TurnstileWidget from '../components/security/TurnstileWidget';

const packages = [
  {
    key: 'game',
    title: { en: 'Game Package', ar: 'باقة المباريات' },
    copy: {
      en: 'Home and away game sets with names, numbers and club identity.',
      ar: 'أطقم لعب أساسية واحتياطية بالأسماء والأرقام وهوية النادي.',
    },
  },
  {
    key: 'training',
    title: { en: 'Training Package', ar: 'باقة التدريب' },
    copy: {
      en: 'Practice jerseys, shorts, shooting shirts and staff training wear.',
      ar: 'سيريات وشورتات تمرين وقمصان إحماء وملابس الطاقم.',
    },
  },
  {
    key: 'season',
    title: { en: 'Full Season Package', ar: 'باقة الموسم الكامل' },
    copy: {
      en: 'Gamewear, training, travel, bags, accessories and equipment in one project.',
      ar: 'ملابس لعب وتدريب وسفر وحقائب وإكسسوارات ومعدات ضمن مشروع واحد.',
    },
  },
  {
    key: 'equipment',
    title: { en: 'Equipment Package', ar: 'باقة المعدات' },
    copy: {
      en: 'Basketballs, hoops, backboards, shot clocks and court equipment.',
      ar: 'كرات وسلات وبوردات وساعات 24 ثانية وتجهيزات ملاعب.',
    },
  },
];

const productGroups = [
  { value: 'custom-teamwear', en: 'Custom teamwear', ar: 'ملابس فريق مخصصة' },
  { value: 'wholesale-clothing', en: 'Wholesale clothing', ar: 'ملابس جملة' },
  { value: 'footwear', en: 'Footwear', ar: 'أحذية' },
  { value: 'basketballs', en: 'Basketballs', ar: 'كرات سلة' },
  { value: 'accessories', en: 'Accessories', ar: 'إكسسوارات' },
  { value: 'equipment', en: 'Hoops & equipment', ar: 'سلات ومعدات' },
  { value: 'full-supply', en: 'Full organization supply', ar: 'تجهيز مؤسسة كامل' },
];

export default function TeamsWholesalePage() {
  const { pick, lang } = useLanguage();
  const auth = useAuth();
  const [form, setForm] = useState({
    name: '',
    email: auth.user?.email || '',
    phone: '',
    organization: auth.user?.user_metadata?.organization_name || '',
    type: auth.user?.user_metadata?.organization_type || 'club',
    country: 'LY',
    packageKey: 'season',
    productGroup: 'full-supply',
    quantity: '',
    deadline: '',
    needs: '',
  });
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [submission, setSubmission] = useState({
    quote: null,
    payload: null,
    emailPending: false,
    fingerprint: '',
  });

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setStatus('');
    if (!turnstileToken) {
      setStatus(pick({ en: 'Complete the security check.', ar: 'أكمل فحص الأمان.' }));
      setBusy(false);
      return;
    }
    const payload = {
      formType: 'teams_wholesale_quote',
      customerName: form.name,
      customerEmail: form.email,
      phone: form.phone,
      organization: form.organization,
      accountType: form.type,
      country: form.country,
      package: form.packageKey,
      productGroup: form.productGroup,
      quantity: form.quantity,
      deadline: form.deadline,
      requirements: form.needs,
      paymentTerms: '50% before production / 50% on arrival',
      estimatedTimeline: '30–60 days',
      language: lang,
      turnstileToken,
    };
    const fingerprint = JSON.stringify({ ...payload, turnstileToken: '' });
    let quote = submission.fingerprint === fingerprint ? submission.quote : null;
    let savedPayload = quote ? submission.payload : payload;
    try {
      if (!quote) {
        const organization =
          auth.user?.user_metadata?.account_type === 'organization'
            ? await ensureOrganization({
                userId: auth.user.id,
                name: form.organization,
                type: form.type,
                countryCode: form.country,
              })
            : null;
        const result = await submitPublicQuote({
          payload,
          organizationId: organization?.id || null,
          turnstileToken,
          idempotencyKey: globalThis.crypto?.randomUUID?.(),
        });
        quote = result.quote;
        savedPayload = { ...payload, quoteId: quote.id, quoteNumber: quote.quote_number };
        setSubmission({ quote, payload: savedPayload, emailPending: true, fingerprint });
      }
    } catch {
      setStatus(
        pick({
          en: 'The request could not be saved securely. No quote was created. Check the form and try again.',
          ar: 'تعذر حفظ الطلب بأمان. لم يتم إنشاء عرض سعر. تحقق من البيانات وحاول مرة أخرى.',
        }),
      );
      setBusy(false);
      return;
    }
    try {
      await sendFormspreeWithFiles(
        savedPayload,
        files,
        `Shababuna teams & wholesale — ${form.organization || form.name}`,
      );
      setSubmission({ quote, payload: savedPayload, emailPending: false });
      setStatus(
        pick({
          en: `Request ${quote.quote_number || ''} was saved and delivered for review.`,
          ar: `تم حفظ الطلب ${quote.quote_number || ''} وإرساله للمراجعة.`,
        }),
      );
    } catch {
      setSubmission({ quote, payload: savedPayload, emailPending: true, fingerprint });
      setStatus(
        pick({
          en: `Request ${quote.quote_number || ''} is saved securely. Email delivery is queued for retry; do not submit another request.`,
          ar: `تم حفظ الطلب ${quote.quote_number || ''} بأمان. تم وضع إشعار البريد في قائمة إعادة المحاولة؛ لا ترسل طلبًا جديدًا.`,
        }),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Seo
        title="Teams & Wholesale"
        description="Custom teamwear, club supply, equipment and wholesale ordering from Shababuna."
        path="/teams-wholesale"
      />
      <PageHero
        label="B2B · CLUBS · ACADEMIES"
        title={pick({ en: 'Teams & Wholesale', ar: 'الأندية والجملة' })}
        description={pick({
          en: 'Custom production, club supply, wholesale pricing, design approval, staged payment and project tracking in one system.',
          ar: 'التصنيع المخصص وتجهيز الأندية وأسعار الجملة واعتماد التصميم والدفع المرحلي وتتبع المشروع في نظام واحد.',
        })}
      />

      <section className="section">
        <div className="container">
          <div className="service-intro">
            <div>
              <p className="section-label">CUSTOM IS BUILT IN</p>
              <h2 className="section-title">
                {pick({ en: 'Every team order can be customized', ar: 'كل طلب فريق يمكن تخصيصه' })}
              </h2>
              <p className="lead">
                {pick({
                  en: 'Custom products are made in production quantities: apparel from 10 pieces, custom basketballs from 6 and hoop systems from one unit.',
                  ar: 'المنتجات المخصصة تُصنع بكميات إنتاج: الملابس من 10 قطع، والكرات المخصصة من 6، ومنظومات السلات من وحدة واحدة.',
                })}
              </p>
            </div>
            <div className="service-intro-actions">
              <Link to="/customize" className="btn-primary">
                {pick({ en: 'Open Design Studio', ar: 'افتح استوديو التصميم' })}
              </Link>
              {auth.user && (
                <Link to="/account?section=workspace" className="btn-secondary">
                  {pick({ en: 'Organization Workspace', ar: 'منصة المؤسسة' })}
                </Link>
              )}
              <Link to="/special-request" className="inline-link">
                {pick({ en: 'Need an unlisted product?', ar: 'تحتاج منتجًا غير موجود؟' })}
              </Link>
            </div>
          </div>
          <div className="package-grid">
            {packages.map((item, index) => (
              <article key={item.key}>
                <span>0{index + 1}</span>
                <h3>{pick(item.title)}</h3>
                <p>{pick(item.copy)}</p>
                <button
                  type="button"
                  className="inline-link"
                  onClick={() => {
                    setForm((current) => ({ ...current, packageKey: item.key }));
                    document.getElementById('quote')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  {pick({ en: 'Select package', ar: 'اختر الباقة' })} →
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--dark">
        <div className="container process-grid">
          {[
            [
              { en: 'Build', ar: 'جهّز' },
              {
                en: 'Choose products, quantities, sizes and customization.',
                ar: 'اختر المنتجات والكميات والمقاسات والتخصيص.',
              },
            ],
            [
              { en: 'Quote', ar: 'عرض السعر' },
              {
                en: 'Shababuna confirms product, production and shipping costs.',
                ar: 'تؤكد شبابنا تكلفة المنتج والإنتاج والشحن.',
              },
            ],
            [
              { en: 'Approve', ar: 'الاعتماد' },
              {
                en: 'Approve the final design proof and pay 50%.',
                ar: 'اعتمد بروفة التصميم النهائية وادفع 50%.',
              },
            ],
            [
              { en: 'Produce', ar: 'التصنيع' },
              {
                en: 'Production, quality control and shipment tracking.',
                ar: 'التصنيع ومراقبة الجودة وتتبع الشحنة.',
              },
            ],
            [
              { en: 'Complete', ar: 'الإكمال' },
              {
                en: 'Pay the remaining 50% when the goods arrive.',
                ar: 'ادفع 50% المتبقية عند وصول البضاعة.',
              },
            ],
          ].map(([title, copy], index) => (
            <article key={title.en}>
              <span>0{index + 1}</span>
              <h3>{pick(title)}</h3>
              <p>{pick(copy)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="container account-capabilities">
          <div>
            <p className="section-label">ORGANIZATION ACCOUNT</p>
            <h2 className="section-title">
              {pick({ en: 'Built for repeat orders', ar: 'مصمم للطلبات المتكررة' })}
            </h2>
          </div>
          <div className="capability-grid">
            {[
              {
                en: 'Saved designs and approved proofs',
                ar: 'التصاميم المحفوظة والبروفات المعتمدة',
              },
              {
                en: 'Team rosters, sizes, names and numbers',
                ar: 'قوائم الفريق والمقاسات والأسماء والأرقام',
              },
              {
                en: 'Quotes, invoices, deposits and balances',
                ar: 'عروض الأسعار والفواتير والعربون والمتبقي',
              },
              { en: 'Production and shipment timeline', ar: 'مراحل التصنيع والشحن' },
              {
                en: 'Fast reorder from previous seasons',
                ar: 'إعادة طلب سريعة من المواسم السابقة',
              },
              { en: 'Wholesale and organization pricing', ar: 'أسعار المؤسسات والجملة' },
            ].map((text, index) => (
              <div key={text.en}>
                <span>0{index + 1}</span>
                <p>{pick(text)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="quote" className="section section--muted">
        <div className="container quote-layout">
          <div>
            <p className="section-label">REQUEST A QUOTE</p>
            <h2 className="section-title">
              {pick({ en: 'One clear brief', ar: 'طلب واضح واحد' })}
            </h2>
            <p className="lead">
              {pick({
                en: 'Worldwide shipping is ready. International orders remain pending until the exact shipping price for the destination is added and approved.',
                ar: 'الشحن العالمي جاهز. تبقى الطلبات الدولية قيد الانتظار حتى تتم إضافة واعتماد سعر الشحن الدقيق للوجهة.',
              })}
            </p>
            <div className="quote-rule-card">
              <strong>50% / 50%</strong>
              <span>
                {pick({
                  en: 'Before production / when goods arrive',
                  ar: 'قبل التصنيع / عند وصول البضاعة',
                })}
              </span>
              <small>30–60 {pick({ en: 'days estimated', ar: 'يومًا تقديريًا' })}</small>
            </div>
          </div>
          <form className="quote-form" onSubmit={submit}>
            <div className="field-row">
              <label className="field">
                <span>{pick({ en: 'Name', ar: 'الاسم' })}</span>
                <input
                  required
                  autoComplete="name"
                  value={form.name}
                  onChange={(event) => {
                    setSubmission({
                      quote: null,
                      payload: null,
                      emailPending: false,
                      fingerprint: '',
                    });
                    setForm({ ...form, name: event.target.value });
                  }}
                />
              </label>
              <label className="field">
                <span>{pick({ en: 'Organization', ar: 'المؤسسة' })}</span>
                <input
                  required
                  autoComplete="organization"
                  value={form.organization}
                  onChange={(event) => setForm({ ...form, organization: event.target.value })}
                />
              </label>
            </div>
            <div className="field-row">
              <label className="field">
                <span>Email</span>
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                />
              </label>
              <label className="field">
                <span>{pick({ en: 'Phone / WhatsApp', ar: 'الهاتف / واتساب' })}</span>
                <input
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
                />
              </label>
            </div>
            <div className="field-row">
              <label className="field">
                <span>{pick({ en: 'Organization type', ar: 'نوع المؤسسة' })}</span>
                <select
                  value={form.type}
                  onChange={(event) => setForm({ ...form, type: event.target.value })}
                >
                  <option value="club">Club</option>
                  <option value="academy">Academy</option>
                  <option value="federation">Federation</option>
                  <option value="school_university">School / University</option>
                  <option value="wholesale">Wholesale</option>
                  <option value="distributor">Distributor</option>
                </select>
              </label>
              <label className="field">
                <span>{pick({ en: 'Country', ar: 'الدولة' })}</span>
                <CountrySelect
                  value={form.country}
                  onChange={(country) => setForm({ ...form, country })}
                />
              </label>
            </div>
            <div className="field-row">
              <label className="field">
                <span>{pick({ en: 'Package', ar: 'الباقة' })}</span>
                <select
                  value={form.packageKey}
                  onChange={(event) => setForm({ ...form, packageKey: event.target.value })}
                >
                  {packages.map((item) => (
                    <option key={item.key} value={item.key}>
                      {pick(item.title)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{pick({ en: 'Product group', ar: 'مجموعة المنتجات' })}</span>
                <select
                  value={form.productGroup}
                  onChange={(event) => setForm({ ...form, productGroup: event.target.value })}
                >
                  {productGroups.map((item) => (
                    <option key={item.value} value={item.value}>
                      {pick({ en: item.en, ar: item.ar })}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="field-row">
              <label className="field">
                <span>{pick({ en: 'Estimated quantity', ar: 'الكمية التقديرية' })}</span>
                <input
                  inputMode="numeric"
                  value={form.quantity}
                  onChange={(event) =>
                    setForm({ ...form, quantity: event.target.value.replace(/[^0-9-]/g, '') })
                  }
                />
              </label>
              <label className="field">
                <span>{pick({ en: 'Needed by', ar: 'الموعد المطلوب' })}</span>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={(event) => setForm({ ...form, deadline: event.target.value })}
                />
              </label>
            </div>
            <label className="field">
              <span>{pick({ en: 'Products and requirements', ar: 'المنتجات والمتطلبات' })}</span>
              <textarea
                required
                rows="6"
                value={form.needs}
                onChange={(event) => setForm({ ...form, needs: event.target.value })}
              />
            </label>
            <label className="custom-upload">
              <span>
                {pick({
                  en: 'Upload logo, roster or reference files',
                  ar: 'ارفع الشعار أو قائمة اللاعبين أو الملفات المرجعية',
                })}
              </span>
              <input
                type="file"
                multiple
                accept="image/*,.pdf,.csv,.xlsx"
                onChange={(event) => setFiles([...event.target.files].slice(0, 5))}
              />
              <small>
                {files.map((file) => file.name).join(' · ') ||
                  pick({ en: 'Optional · up to five files', ar: 'اختياري · حتى خمسة ملفات' })}
              </small>
            </label>
            <TurnstileWidget onToken={setTurnstileToken} language={lang} />
            <button className="btn-primary block" disabled={busy}>
              {busy
                ? pick({ en: 'Sending…', ar: 'جاري الإرسال…' })
                : pick({ en: 'Send Request', ar: 'إرسال الطلب' })}
            </button>
            {status && (
              <p className="form-status" role="status">
                {status}
              </p>
            )}
            {submission.emailPending && submission.quote && (
              <button
                type="button"
                className="btn-secondary block"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await sendFormspreeWithFiles(
                      submission.payload,
                      files,
                      `Shababuna teams & wholesale — ${form.organization || form.name}`,
                    );
                    setSubmission((current) => ({ ...current, emailPending: false }));
                    setStatus(
                      pick({
                        en: `Email delivery confirmed for ${submission.quote.quote_number}.`,
                        ar: `تم تأكيد إرسال البريد للطلب ${submission.quote.quote_number}.`,
                      }),
                    );
                  } catch {
                    setStatus(
                      pick({
                        en: `Request ${submission.quote.quote_number} remains saved. Email will be retried automatically.`,
                        ar: `الطلب ${submission.quote.quote_number} ما زال محفوظًا. ستتم إعادة محاولة البريد تلقائيًا.`,
                      }),
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {pick({ en: 'Retry email notification', ar: 'إعادة محاولة إشعار البريد' })}
              </button>
            )}
            {submission.quote && !submission.emailPending && (
              <button
                type="button"
                className="btn-secondary block"
                disabled={busy}
                onClick={() => {
                  setSubmission({
                    quote: null,
                    payload: null,
                    emailPending: false,
                    fingerprint: '',
                  });
                  setFiles([]);
                  setTurnstileToken('');
                  setStatus('');
                }}
              >
                {pick({ en: 'Start another request', ar: 'بدء طلب جديد' })}
              </button>
            )}
          </form>
        </div>
      </section>
    </>
  );
}

import '../styles/domain-teams.css';
import '../styles/domain-customize.css';
import type { FormEvent, ReactElement } from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Seo from '../components/common/Seo';
import Breadcrumbs from '../components/common/Breadcrumbs';
import '../styles/composition.css';
import '../styles/spine.css';
import '../styles/domain-misc.css';
import '../styles/domain-forms.css';
import CountrySelect from '../components/common/CountrySelect';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { sendFormspreeWithFiles } from '../services/formspree';
import { ensureOrganization } from '../services/b2b';
import { submitPublicQuote } from '../services/publicQuotes';
import TurnstileWidget from '../components/security/TurnstileWidget';

/* The five stages the backend already supports. The index and the page body
   read from this one list so they can never drift apart. */
const LIFECYCLE = [
  { id: 'build', title: { en: 'Build', ar: 'جهّز' } },
  { id: 'quote', title: { en: 'Quote', ar: 'عرض السعر' } },
  { id: 'approve', title: { en: 'Approve', ar: 'الاعتماد' } },
  { id: 'produce', title: { en: 'Produce', ar: 'التصنيع' } },
  { id: 'complete', title: { en: 'Complete', ar: 'الإكمال' } },
];

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

type TeamsForm = {
  name: string;
  email: string;
  phone: string;
  organization: string;
  type: string;
  country: string;
  packageKey: string;
  productGroup: string;
  quantity: string;
  deadline: string;
  needs: string;
};

export default function TeamsWholesalePage(): ReactElement {
  const { pick, lang } = useLanguage();
  const auth = useAuth();
  const meta = ((auth.user as { user_metadata?: Record<string, unknown> } | null)?.user_metadata ||
    {}) as Record<string, unknown>;
  const [form, setForm] = useState<TeamsForm>({
    name: '',
    email: String(auth.user?.email || ''),
    phone: '',
    organization: String(meta.organization_name || ''),
    type: String(meta.organization_type || 'club'),
    country: 'LY',
    packageKey: 'season',
    productGroup: 'full-supply',
    quantity: '',
    deadline: '',
    needs: '',
  });
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [submission, setSubmission] = useState<{
    quote: Record<string, unknown> | null;
    payload: Record<string, unknown> | null;
    emailPending: boolean;
    fingerprint: string;
  }>({
    quote: null,
    payload: null,
    emailPending: false,
    fingerprint: '',
  });

  const submit = async (event: FormEvent<HTMLFormElement>) => {
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
          meta.account_type === 'organization' && auth.user?.id
            ? ((await ensureOrganization({
                userId: String(auth.user.id),
                name: form.organization,
                type: form.type,
                countryCode: form.country,
              })) as Record<string, unknown> | null)
            : null;
        const result = (await submitPublicQuote({
          payload,
          organizationId: organization?.id ? String(organization.id) : null,
          turnstileToken,
          idempotencyKey: globalThis.crypto?.randomUUID?.(),
        })) as { quote?: Record<string, unknown> };
        quote = (result.quote || {}) as Record<string, unknown>;
        savedPayload = {
          ...payload,
          quoteId: quote.id,
          quoteNumber: quote.quote_number,
        };
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
        (savedPayload || {}) as Record<string, unknown>,
        files,
        `Shababuna teams & wholesale — ${form.organization || form.name}`,
      );
      setSubmission({ quote, payload: savedPayload, emailPending: false, fingerprint });
      setStatus(
        pick({
          en: `Request ${String(quote?.quote_number || '')} was saved and delivered for review.`,
          ar: `تم حفظ الطلب ${String(quote?.quote_number || '')} وإرساله للمراجعة.`,
        }),
      );
    } catch {
      setSubmission({ quote, payload: savedPayload, emailPending: true, fingerprint });
      setStatus(
        pick({
          en: `Request ${String(quote?.quote_number || '')} is saved securely. Email delivery is queued for retry; do not submit another request.`,
          ar: `تم حفظ الطلب ${String(quote?.quote_number || '')} بأمان. تم وضع إشعار البريد في قائمة إعادة المحاولة؛ لا ترسل طلبًا جديدًا.`,
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
      <div className="gw-teams-sales">
        <header className="gw-teams-hero" aria-labelledby="teams-hero-title">
          <picture className="gw-teams-hero-media" aria-hidden="true">
            <source
              type="image/webp"
              srcSet="/media/atmosphere/arena-wide-1024.webp 1024w, /media/atmosphere/arena-wide-1600.webp 1600w"
              sizes="100vw"
            />
            <img
              src="/media/atmosphere/arena-wide-1600.webp"
              alt=""
              width="1600"
              height="900"
              fetchPriority="high"
              decoding="async"
            />
          </picture>
          <div className="gw-teams-hero-inner">
            <Breadcrumbs
              items={[{ label: pick({ en: 'Teams & Wholesale', ar: 'الأندية والجملة' }) }]}
            />
            <p className="gw-kicker">
              {pick({ en: 'Clubs · Academies · Wholesale', ar: 'أندية · أكاديميات · جملة' })}
            </p>
            <h1 id="teams-hero-title" className="gw-teams-hero-title">
              {pick({ en: 'Outfitting teams', ar: 'تجهيز الفرق' })}
            </h1>
            <p className="gw-teams-hero-lede">
              {pick({
                en: 'One system for your team — design, roster, quote and delivery.',
                ar: 'نظام واحد لفريقك — تصميم وقائمة لاعبين وعرض سعر وتسليم.',
              })}
            </p>
            <div className="gw-teams-hero-actions">
              <Link to="/customize" className="gw-btn gw-btn--primary">
                {pick({ en: 'Open Design Studio', ar: 'افتح استوديو التصميم' })}
              </Link>
              <a href="#quote" className="gw-btn gw-btn--secondary">
                {pick({ en: 'Request a quote', ar: 'اطلب عرض سعر' })}
              </a>
              {auth.user && (
                <Link to="/account?section=workspace" className="gw-btn gw-btn--ghost">
                  {pick({ en: 'Workspace', ar: 'مساحة العمل' })}
                </Link>
              )}
            </div>
          </div>
        </header>

        <nav className="gw-teams-journey" aria-label={pick({ en: 'Process', ar: 'العملية' })}>
          <ol>
            {LIFECYCLE.map((stage, position) => (
              <li key={`${stage.id}-${position}`}>
                <a href={`#stage-${stage.id}`}>
                  <span className="gw-teams-journey-n" aria-hidden="true">
                    {String(position + 1).padStart(2, '0')}
                  </span>
                  {pick(stage.title)}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="gw-teams-body">

          <section id="stage-build" className="gw-stage-block" aria-labelledby="stage-build-t">
            <p className="gw-stage-mark">{pick({ en: 'Build', ar: 'جهّز' })}</p>
            <div className="container">
              <div className="gw-teams-intro">
                <div>
                  <p className="gw-kicker">
                    {pick({ en: 'Custom is built in', ar: 'التخصيص جزء من النظام' })}
                  </p>
                  <h2 id="stage-build-t" className="gw-teams-title">
                    {pick({
                      en: 'Every team order can be customized',
                      ar: 'كل طلب فريق يمكن تخصيصه',
                    })}
                  </h2>
                  <p className="gw-teams-lede">
                    {pick({
                      en: 'Uniforms from 10 pieces. Custom basketballs from 6.',
                      ar: 'الأطقم من 10 قطع. الكرات المخصصة من 6.',
                    })}
                  </p>
                </div>
                <div className="gw-teams-actions">
                  <Link to="/customize" className="gw-btn gw-btn--primary">
                    {pick({ en: 'Open Design Studio', ar: 'افتح استوديو التصميم' })}
                  </Link>
                  {auth.user && (
                    <Link to="/account?section=workspace" className="gw-btn gw-btn--ghost">
                      {pick({ en: 'Organization Workspace', ar: 'منصة المؤسسة' })}
                    </Link>
                  )}
                  <Link to="/special-request" className="gw-btn gw-btn--ghost">
                    {pick({ en: 'Need an unlisted product?', ar: 'تحتاج منتجًا غير موجود؟' })}
                  </Link>
                </div>
              </div>
              <ul className="gw-package-rail">
                {packages.map((item) => (
                  <li key={item.key}>
                    <button
                      type="button"
                      className={`gw-package-card${form.packageKey === item.key ? ' is-active' : ''}`}
                      onClick={() => {
                        setForm((current) => ({ ...current, packageKey: item.key }));
                        document.getElementById('quote')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      <h3>{pick(item.title)}</h3>
                      <span>{pick({ en: 'Select package', ar: 'اختر الباقة' })}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section
            id="stage-quote"
            className="gw-stage-block gw-stage-block--dark"
            aria-label={pick({ en: 'Quote and approval', ar: 'عرض السعر والاعتماد' })}
          >
            <p className="gw-stage-mark">{pick({ en: 'Quote', ar: 'عرض السعر' })}</p>
            <div className="gw-lifecycle">
              <div className="gw-lifecycle-inner">
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
                ].map((entry, index) => {
                  const [title, copy] = entry as [
                    { en: string; ar: string },
                    { en: string; ar: string },
                  ];
                  return (
                    <article key={title.en}>
                      <span>0{index + 1}</span>
                      <h3>{pick(title)}</h3>
                      <p>{pick(copy)}</p>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>

          <section id="stage-approve" className="gw-stage-block" aria-labelledby="stage-approve-t">
            <p className="gw-stage-mark">{pick({ en: 'Approve', ar: 'الاعتماد' })}</p>
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

          <section id="stage-produce" className="gw-stage-block gw-stage-block--muted">
            <div id="stage-complete" tabIndex={-1} />
            <p className="gw-stage-mark">
              {' '}
              {pick({ en: 'Produce & complete', ar: 'التصنيع والإكمال' })}
            </p>
            <div id="quote">
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
                <form
                  className="quote-form"
                  onSubmit={(event) => {
                    void submit(event);
                  }}
                >
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
                    <span>
                      {pick({ en: 'Products and requirements', ar: 'المنتجات والمتطلبات' })}
                    </span>
                    <textarea
                      required
                      rows={6}
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
                      onChange={(event) =>
                        setFiles(
                          event.target.files ? Array.from(event.target.files).slice(0, 5) : [],
                        )
                      }
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
                      onClick={() => {
                        void (async () => {
                          setBusy(true);
                          const quoteNumber = String(submission.quote?.quote_number || '');
                          try {
                            await sendFormspreeWithFiles(
                              (submission.payload || {}) as Record<string, unknown>,
                              files,
                              `Shababuna teams & wholesale — ${form.organization || form.name}`,
                            );
                            setSubmission((current) => ({ ...current, emailPending: false }));
                            setStatus(
                              pick({
                                en: `Email delivery confirmed for ${quoteNumber}.`,
                                ar: `تم تأكيد إرسال البريد للطلب ${quoteNumber}.`,
                              }),
                            );
                          } catch {
                            setStatus(
                              pick({
                                en: `Request ${quoteNumber} remains saved. Email will be retried automatically.`,
                                ar: `الطلب ${quoteNumber} ما زال محفوظًا. ستتم إعادة محاولة البريد تلقائيًا.`,
                              }),
                            );
                          } finally {
                            setBusy(false);
                          }
                        })();
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
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

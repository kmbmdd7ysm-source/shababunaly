import type { FormEvent, ReactElement } from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Seo from '../components/common/Seo';
import CountrySelect from '../components/common/CountrySelect';
import TurnstileWidget from '../components/security/TurnstileWidget';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { submitPublicQuote } from '../services/publicQuotes';
import '../styles/domain-forms.css';
import '../styles/teams-stories.css';

const SERVICES = [
  { key: 'custom-teamwear', title: { en: 'Uniforms', ar: 'أطقم اللعب' }, copy: { en: 'Custom game jerseys, shorts and full sets.', ar: 'سيريات وشورتات وأطقم لعب مخصصة.' }, image: '/images/catalog/apparel.svg' },
  { key: 'training', title: { en: 'Training', ar: 'التدريب' }, copy: { en: 'Practice gear, shooting shirts and staff wear.', ar: 'ملابس تمرين وقمصان إحماء وملابس الطاقم.' }, image: '/images/catalog/apparel.svg' },
  { key: 'teamwear', title: { en: 'Teamwear', ar: 'ملابس الفريق' }, copy: { en: 'Hoodies, tracksuits, travel and off-court pieces.', ar: 'هوديز وبدلات سفر وملابس خارج الملعب.' }, image: '/images/catalog/apparel.svg' },
  { key: 'equipment', title: { en: 'Equipment', ar: 'المعدات' }, copy: { en: 'Basketballs, hoops and court equipment.', ar: 'كرات وسلات وتجهيزات الملعب.' }, image: '/images/catalog/equipment.svg' },
];

export default function TeamsWholesalePage(): ReactElement {
  const { pick, lang } = useLanguage();
  const auth = useAuth();
  const meta = ((auth.user as { user_metadata?: Record<string, unknown> } | null)?.user_metadata || {}) as Record<string, unknown>;
  const [service, setService] = useState('custom-teamwear');
  const [form, setForm] = useState({
    name: '', email: String(auth.user?.email || ''), phone: '', organization: String(meta.organization_name || ''), type: String(meta.organization_type || 'club'), country: 'LY', quantity: '10', deadline: '', needs: '',
  });
  const [turnstileToken, setTurnstileToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('');
    if (!turnstileToken) { setStatus(pick({ en: 'Complete the security check.', ar: 'أكمل فحص الأمان.' })); return; }
    setBusy(true);
    try {
      const result = await submitPublicQuote({
        payload: {
          formType: 'teams_wholesale_quote', customerName: form.name, customerEmail: form.email, phone: form.phone,
          organization: form.organization, accountType: form.type, country: form.country, package: service,
          productGroup: service, quantity: Number(form.quantity || 1), deadline: form.deadline, requirements: form.needs,
          paymentTerms: '50% before production / 50% on arrival', estimatedTimeline: '30–60 days', language: lang,
        },
        turnstileToken,
        idempotencyKey: globalThis.crypto?.randomUUID?.(),
      }) as { quote?: Record<string, unknown> };
      setStatus(pick({ en: `Request ${String(result.quote?.quote_number || '')} received. Our team will contact you with the next step.`, ar: `تم استلام الطلب ${String(result.quote?.quote_number || '')}. سيتواصل معك فريقنا بالخطوة التالية.` }));
    } catch {
      setStatus(pick({ en: 'The request could not be submitted. Check the details and try again.', ar: 'تعذر إرسال الطلب. تحقق من البيانات وحاول مرة أخرى.' }));
    } finally { setBusy(false); }
  };

  return (
    <>
      <Seo title="Teams & Wholesale" description="Custom uniforms, teamwear, equipment and wholesale supply from Shababuna." path="/teams-wholesale" />
      <main className="tw-page">
        <header className="tw-hero">
          <div className="tw-hero-copy"><p>SHABABUNA TEAM</p><h1>{pick({ en: 'Build your program.', ar: 'جهّز فريقك.' })}</h1><span>{pick({ en: 'Uniforms, training, teamwear and equipment — handled through one Shababuna team.', ar: 'أطقم لعب وتدريب وملابس فريق ومعدات — كلها عبر فريق شبابنا.' })}</span><a href="#team-quote" className="btn-primary">{pick({ en: 'Start a team request', ar: 'ابدأ طلب فريق' })}</a></div>
          <div className="tw-hero-visual"><img src="/media/atmosphere/arena-wide-1600.webp" alt="" /></div>
        </header>

        <section className="tw-services" aria-labelledby="tw-services-title">
          <div className="tw-section-head"><p>{pick({ en: 'WHAT DO YOU NEED?', ar: 'ماذا تحتاج؟' })}</p><h2 id="tw-services-title">{pick({ en: 'Start with the category.', ar: 'ابدأ بالفئة.' })}</h2></div>
          <div className="tw-service-grid">
            {SERVICES.map((item) => <button key={item.key} type="button" className={`tw-service-card${service === item.key ? ' is-active' : ''}`} onClick={() => setService(item.key)}><div className="tw-service-card-media"><img src={item.image} alt="" /></div><div className="tw-service-card-copy"><strong>{pick(item.title)}</strong><span>{pick(item.copy)}</span></div></button>)}
          </div>
        </section>

        <section className="tw-process">
          {[
            ['01', { en: 'Choose', ar: 'اختر' }, { en: 'Tell us what your program needs.', ar: 'حدد احتياجات فريقك.' }],
            ['02', { en: 'Design / Source', ar: 'تصميم / توريد' }, { en: 'We prepare the right product route.', ar: 'نجهز لك مسار المنتج المناسب.' }],
            ['03', { en: 'Approve', ar: 'اعتماد' }, { en: 'You approve the quote and final details.', ar: 'تعتمد عرض السعر والتفاصيل النهائية.' }],
            ['04', { en: 'Deliver', ar: 'تسليم' }, { en: 'We produce or supply and deliver.', ar: 'نصنّع أو نورد ثم نسلّم.' }],
          ].map(([n,t,c]) => <div key={String(n)}><span>{String(n)}</span><strong>{pick(t as {en:string;ar:string})}</strong><p>{pick(c as {en:string;ar:string})}</p></div>)}
        </section>

        <section id="team-quote" className="tw-quote team-quote-grid">
          <div className="tw-quote-copy"><p>{pick({ en: 'TEAM REQUEST', ar: 'طلب فريق' })}</p><h2>{pick({ en: 'Tell us the essentials.', ar: 'اعطينا الأساسيات.' })}</h2><span>{pick({ en: 'No technical questionnaire. We only collect what is needed to contact you and prepare the right next step.', ar: 'بدون استبيان تقني معقد. نطلب فقط البيانات اللازمة للتواصل وتجهيز الخطوة التالية.' })}</span><ul><li>{pick({ en: 'Custom: estimated 30–60 days after approval.', ar: 'المخصص: تقدير 30–60 يومًا بعد الاعتماد.' })}</li><li>{pick({ en: 'Standard custom terms: 50% before production / 50% on arrival.', ar: 'شروط التخصيص القياسية: 50% قبل الإنتاج / 50% عند الوصول.' })}</li></ul><Link to="/customize" className="text-link">{pick({ en: 'Want to build a visual concept first?', ar: 'تبي تبني فكرة بصرية أولاً؟' })}</Link></div>
          <form onSubmit={(e) => { void submit(e); }}>
            <div className="field-row"><label className="field"><span>{pick({ en: 'Full name', ar: 'الاسم الكامل' })}</span><input required value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} autoComplete="name" /></label><label className="field"><span>{pick({ en: 'Team / Organization', ar: 'الفريق / المؤسسة' })}</span><input required value={form.organization} onChange={(e)=>setForm({...form,organization:e.target.value})} autoComplete="organization" /></label></div>
            <div className="field-row"><label className="field"><span>Email</span><input required type="email" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})} autoComplete="email" /></label><label className="field"><span>{pick({ en: 'Phone / WhatsApp', ar: 'الهاتف / واتساب' })}</span><input value={form.phone} onChange={(e)=>setForm({...form,phone:e.target.value})} autoComplete="tel" /></label></div>
            <div className="field-row"><label className="field"><span>{pick({ en: 'Organization type', ar: 'نوع المؤسسة' })}</span><select value={form.type} onChange={(e)=>setForm({...form,type:e.target.value})}><option value="club">Club</option><option value="academy">Academy</option><option value="federation">Federation</option><option value="school_university">School / University</option><option value="wholesale">Wholesale</option></select></label><label className="field"><span>{pick({ en: 'Country', ar: 'الدولة' })}</span><CountrySelect value={form.country} onChange={(country)=>setForm({...form,country})} /></label></div>
            <div className="field-row"><label className="field"><span>{pick({ en: 'Estimated quantity', ar: 'الكمية التقديرية' })}</span><input required inputMode="numeric" value={form.quantity} onChange={(e)=>setForm({...form,quantity:e.target.value.replace(/\D/g,'')})} /></label><label className="field"><span>{pick({ en: 'Needed by', ar: 'الموعد المطلوب' })}</span><input type="date" value={form.deadline} onChange={(e)=>setForm({...form,deadline:e.target.value})} /></label></div>
            <label className="field"><span>{pick({ en: 'What do you need?', ar: 'شنو تحتاج؟' })}</span><textarea required rows={5} value={form.needs} onChange={(e)=>setForm({...form,needs:e.target.value})} placeholder={pick({ en: 'Example: 24 home/away uniforms, sizes ready, logo available.', ar: 'مثال: 24 طقم أساسي واحتياطي، المقاسات جاهزة، والشعار موجود.' })} /></label>
            <TurnstileWidget onToken={setTurnstileToken} language={lang} optionalWhenUnconfigured />
            <button className="btn-primary block" disabled={busy}>{busy ? pick({ en: 'Sending…', ar: 'جارٍ الإرسال…' }) : pick({ en: 'Send team request', ar: 'إرسال طلب الفريق' })}</button>
            {status ? <p className="form-status" role="status">{status}</p> : null}
          </form>
        </section>
      </main>
    </>
  );
}

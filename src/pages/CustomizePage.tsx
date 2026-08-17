import type { ChangeEvent, FormEvent, ReactElement } from 'react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Seo from '../components/common/Seo';
import EditorialMedia from '../components/common/EditorialMedia';
import TurnstileWidget from '../components/security/TurnstileWidget';
import CustomProductShowcase from '../components/custom/CustomProductShowcase';
import { useLanguage } from '../context/LanguageContext';
import { submitPublicQuote } from '../services/publicQuotes';
import { CUSTOM_PRODUCT_TYPES } from '../data/customization';
import { LOCAL_HERO_MEDIA } from '../data/localHeroMedia';
import { CUSTOM_COLOR_OPTIONS } from '../components/custom/customColors';
import '../styles/custom-experience.css';
import '../styles/domain-forms.css';

const FEATURED = [...CUSTOM_PRODUCT_TYPES];
const fallbackArt: Record<string, string> = {
  'game-set': '/media/official-brand/sections/custom-game-set.webp',
  'game-jersey': '/media/official-brand/sections/custom-game-jersey.webp',
  'game-shorts': '/media/official-brand/sections/custom-game-shorts.webp',
  'practice-set': '/media/official-brand/sections/custom-practice-set.webp',
  'shooting-shirt': '/media/official-brand/sections/custom-shooting-shirt.webp',
  hoodie: '/media/official-brand/sections/custom-hoodie.webp',
  'team-pants': '/media/official-brand/sections/custom-team-pants.webp',
  tracksuit: '/media/official-brand/sections/custom-tracksuit.webp',
  'team-bag': '/media/official-brand/sections/custom-team-bag.webp',
  sleeve: '/media/official-brand/sections/custom-sleeve.webp',
  basketball: '/media/official-brand/sections/custom-basketball.webp',
  'hoop-padding': '/media/official-brand/sections/custom-hoop-padding.webp',
};

export default function CustomizePage(): ReactElement {
  const { pick, lang } = useLanguage();
  const [productType, setProductType] = useState('game-jersey');
  const [bodyColor, setBodyColor] = useState('#0b0b0b');
  const [trimColor, setTrimColor] = useState('#ffffff');
  const [teamName, setTeamName] = useState('SHABABUNA');
  const [playerName, setPlayerName] = useState('');
  const [playerNumber, setPlayerNumber] = useState('00');
  const [logoPreview, setLogoPreview] = useState('');
  const [logoName, setLogoName] = useState('');
  const [contact, setContact] = useState({ name: '', email: '', phone: '', organization: '', country: 'LY', quantity: '10', notes: '' });
  const [turnstileToken, setTurnstileToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const selected = useMemo(() => FEATURED.find((item) => item.key === productType) || FEATURED[0]!, [productType]);

  const logoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) {
      setStatus(pick({ en: 'Use a PNG, JPG or WEBP logo under 2 MB.', ar: 'استخدم شعار PNG أو JPG أو WEBP أقل من 2 ميغابايت.' }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(String(reader.result || ''));
    reader.readAsDataURL(file);
    setLogoName(file.name);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('');
    setBusy(true);
    try {
      const result = await submitPublicQuote({
        payload: {
          formType: 'custom_design_quote',
          customerName: contact.name,
          customerEmail: contact.email,
          phone: contact.phone,
          organization: contact.organization || contact.name,
          country: contact.country,
          package: 'custom-concept',
          productGroup: productType,
          quantity: Number(contact.quantity || selected.minimum),
          requirements: [
            `Product: ${pick(selected.label)}`,
            `Body color: ${bodyColor}`,
            `Trim color: ${trimColor}`,
            `Team name: ${teamName}`,
            `Player name: ${playerName || '—'}`,
            `Player number: ${playerNumber || '—'}`,
            `Logo file: ${logoName || 'none'}`,
            contact.notes ? `Notes: ${contact.notes}` : '',
          ].filter(Boolean).join('\n'),
          design: { productType, bodyColor, trimColor, teamName, playerName, playerNumber, logoFileName: logoName },
          language: lang,
        },
        turnstileToken,
        idempotencyKey: globalThis.crypto?.randomUUID?.(),
      }) as { quote?: Record<string, unknown>; notification?: string };
      setStatus(pick({
        en: `Design request ${String(result.quote?.quote_number || '')} received. Our team will contact you to finalize it.`,
        ar: `تم استلام طلب التصميم ${String(result.quote?.quote_number || '')}. سيتواصل معك فريقنا لإكماله.`,
      }));
    } catch {
      setStatus(pick({ en: 'We could not submit the request. Check the details and try again.', ar: 'تعذر إرسال الطلب. تحقق من البيانات وحاول مرة أخرى.' }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Seo title="Custom Basketball Uniforms" description="Create a Shababuna custom basketball concept, then send it to our team for a production quote." path="/customize" />
      <main className="cx-page">
        <header className="cx-hero cx-hero--editorial">
          <div className="cx-hero-media" aria-hidden="true">
            <EditorialMedia
              desktopMedia={LOCAL_HERO_MEDIA.custom.desktopPoster}
              mobileMedia={LOCAL_HERO_MEDIA.custom.mobilePoster}
              desktopVideo={LOCAL_HERO_MEDIA.custom.desktopVideo}
              mobileVideo={LOCAL_HERO_MEDIA.custom.mobileVideo}
              poster={LOCAL_HERO_MEDIA.custom.desktopPoster}
              loading="eager"
            />
            <span className="cx-hero-media__shade" />
          </div>
          <div className="cx-hero-copy">
            <p>{pick({ en: 'SHABABUNA CUSTOM', ar: 'تخصيص شبابنا' })}</p>
            <h1>{pick({ en: 'Make it yours.', ar: 'خليه لفريقك.' })}</h1>
            <span>{pick({ en: 'Choose the product. Set the identity. We handle the production details with you.', ar: 'اختر المنتج وحدد الهوية، ونحن نكمل معك تفاصيل الإنتاج.' })}</span>
          </div>
        </header>

        <section className="cx-products" aria-label={pick({ en: 'Choose product', ar: 'اختر المنتج' })}>
          {FEATURED.map((item) => (
            <button key={item.key} type="button" className={`cx-product-card${productType === item.key ? ' is-active' : ''}`} onClick={() => setProductType(item.key)}>
              <div className="cx-product-media">
                <img src={fallbackArt[item.key]} alt="" />
              </div>
              <strong>{pick(item.label)}</strong>
              <small>{pick({ en: `Minimum ${item.minimum}`, ar: `الحد الأدنى ${item.minimum}` })}</small>
            </button>
          ))}
        </section>

        <section className="cx-configurator" aria-labelledby="cx-design-title">
          <div className="cx-stage-wrap">
            <CustomProductShowcase productType={productType} bodyColor={bodyColor} trimColor={trimColor} teamName={teamName} playerName={playerName} playerNumber={playerNumber} logoPreview={logoPreview} label={pick(selected.label)} />
          </div>

          <div className="cx-controls">
            <p className="cx-step">01 / {pick({ en: 'Identity', ar: 'الهوية' })}</p>
            <h2 id="cx-design-title">{pick(selected.label)}</h2>
            <div className="cx-control-block">
              <label>{pick({ en: 'Fabric / body color', ar: 'لون القماش / الجسم' })}</label>
              <div className="cx-swatches">
                {CUSTOM_COLOR_OPTIONS.map((option) => <button key={`body-${option.key}`} type="button" className={bodyColor === option.value ? 'is-active' : ''} aria-label={`${pick({en:'Body',ar:'الجسم'})} ${option.key}`} aria-pressed={bodyColor === option.value} onClick={() => setBodyColor(option.value)}><span className="cx-swatch" data-color={option.key} /></button>)}
              </div>
            </div>
            <div className="cx-control-block">
              <label>{pick({ en: 'Trim / edge color', ar: 'لون الحواف والخطوط' })}</label>
              <div className="cx-swatches">
                {CUSTOM_COLOR_OPTIONS.map((option) => <button key={`trim-${option.key}`} type="button" className={trimColor === option.value ? 'is-active' : ''} aria-label={`${pick({en:'Trim',ar:'الحواف'})} ${option.key}`} aria-pressed={trimColor === option.value} onClick={() => setTrimColor(option.value)}><span className="cx-swatch" data-color={option.key} /></button>)}
              </div>
            </div>
            <label className="cx-field"><span>{pick({ en: 'Team name', ar: 'اسم الفريق' })}</span><input value={teamName} maxLength={18} onChange={(e) => setTeamName(e.target.value.toUpperCase())} /></label>
            <label className="cx-upload"><span>{pick({ en: 'Team logo', ar: 'شعار الفريق' })}</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={logoChange} /><small>{logoName || pick({ en: 'PNG / JPG / WEBP · optional', ar: 'PNG / JPG / WEBP · اختياري' })}</small></label>
            {(productType === 'game-jersey' || productType === 'game-set') ? <div className="cx-two"><label className="cx-field"><span>{pick({ en: 'Player name', ar: 'اسم اللاعب' })}</span><input value={playerName} maxLength={14} onChange={(e) => setPlayerName(e.target.value.toUpperCase())} /></label><label className="cx-field"><span>{pick({ en: 'Number', ar: 'الرقم' })}</span><input inputMode="numeric" value={playerNumber} maxLength={2} onChange={(e) => setPlayerNumber(e.target.value.replace(/\D/g, '').slice(0,2))} /></label></div> : null}
            <p className="cx-explain">{pick({ en: 'This is a fast concept preview, not a production proof. Your Shababuna specialist confirms placement, sizing, fabrics and final artwork with you after submission.', ar: 'هذه معاينة سريعة للفكرة وليست بروفة إنتاج نهائية. يتواصل معك مختص شبابنا لتأكيد الأماكن والمقاسات والخامة والتصميم النهائي.' })}</p>
          </div>
        </section>

        <section className="cx-request">
          <div><p className="cx-step">02 / {pick({ en: 'Send concept', ar: 'إرسال الفكرة' })}</p><h2>{pick({ en: 'We finish it with you.', ar: 'نكملها معك.' })}</h2><p>{pick({ en: 'Send the concept and your contact details. We review it, confirm the real production setup and return with the quote.', ar: 'أرسل الفكرة وبيانات التواصل. نراجعها ونؤكد إعداد الإنتاج الحقيقي ثم نرجع لك بعرض السعر.' })}</p><Link to="/customize/advanced" className="cx-advanced-link">{pick({ en: 'Need the advanced production studio?', ar: 'تحتاج استوديو الإنتاج المتقدم؟' })}</Link></div>
          <form onSubmit={(e) => { void submit(e); }} className="cx-request-form">
            <div className="cx-request-grid">
              <label className="field"><span>{pick({ en: 'Full name', ar: 'الاسم الكامل' })}</span><input required value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} autoComplete="name" /></label>
              <label className="field"><span>Email</span><input required type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} autoComplete="email" /></label>
              <label className="field"><span>{pick({ en: 'Phone / WhatsApp', ar: 'الهاتف / واتساب' })}</span><input value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} autoComplete="tel" /></label>
              <label className="field"><span>{pick({ en: 'Team / Organization', ar: 'الفريق / المؤسسة' })}</span><input required value={contact.organization} onChange={(e) => setContact({ ...contact, organization: e.target.value })} /></label>
              <label className="field"><span>{pick({ en: 'Country', ar: 'الدولة' })}</span><input required maxLength={2} value={contact.country} onChange={(e) => setContact({ ...contact, country: e.target.value.toUpperCase() })} /></label>
              <label className="field"><span>{pick({ en: 'Estimated quantity', ar: 'الكمية التقديرية' })}</span><input required inputMode="numeric" value={contact.quantity} onChange={(e) => setContact({ ...contact, quantity: e.target.value.replace(/\D/g, '') })} /></label>
            </div>
            <label className="field"><span>{pick({ en: 'Anything else?', ar: 'أي تفاصيل إضافية؟' })}</span><textarea rows={4} value={contact.notes} onChange={(e) => setContact({ ...contact, notes: e.target.value })} /></label>
            <TurnstileWidget onToken={setTurnstileToken} language={lang} optionalWhenUnconfigured />
            <button className="btn-primary block" disabled={busy}>{busy ? pick({ en: 'Sending…', ar: 'جارٍ الإرسال…' }) : pick({ en: 'Send design request', ar: 'إرسال طلب التصميم' })}</button>
            {status ? <p className="form-status" role="status">{status}</p> : null}
          </form>
        </section>
      </main>
    </>
  );
}

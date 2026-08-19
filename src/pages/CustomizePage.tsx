import type { ChangeEvent, FormEvent, ReactElement } from 'react';
import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Seo from '../components/common/Seo';
import EditorialMedia from '../components/common/EditorialMedia';
import TurnstileWidget from '../components/security/TurnstileWidget';
import CustomProductShowcase from '../components/custom/CustomProductShowcase';
import { useLanguage } from '../context/LanguageContext';
import { submitPublicQuote } from '../services/publicQuotes';
import { uploadCustomDesignAsset, validateCustomLogo } from '../services/customDesignAssets';
import { CUSTOM_PRODUCT_TYPES } from '../data/customization';
import { LOCAL_HERO_MEDIA } from '../data/localHeroMedia';
import { EDITORIAL as E } from '../data/editorialAssets.ts';
import { CUSTOM_COLOR_OPTIONS } from '../components/custom/customColors';
import '../styles/custom-experience.css';
import '../styles/domain-forms.css';

const FEATURED = [...CUSTOM_PRODUCT_TYPES];
const fallbackArt: Record<string, string> = {
  'game-set': E.shanghaiPlayers,
  'game-jersey': E.curryHeroBall,
  'game-shorts': E.curryPatternRear,
  'practice-set': E.curryDrive,
  'shooting-shirt': E.curryBallPortrait,
  hoodie: E.curryWhiteHoodClose,
  'team-pants': E.lameloSpaceStanding,
  tracksuit: E.lameloSpaceSeated,
  'team-bag': E.lameloChairA,
  sleeve: E.curryBallPortrait,
  basketball: E.curryPortraitBall,
  'hoop-padding': E.curryLayupWide,
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
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const requestKeyRef = useRef(globalThis.crypto?.randomUUID?.() || `00000000-0000-4000-8000-${Math.random().toString(16).slice(2, 14).padEnd(12, '0').slice(0, 12)}`);
  const [contact, setContact] = useState({ name: '', email: '', phone: '', organization: '', country: 'LY', quantity: '10', notes: '' });
  const [turnstileToken, setTurnstileToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const selected = useMemo(() => FEATURED.find((item) => item.key === productType) || FEATURED[0]!, [productType]);

  const logoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (!file) {
      setLogoFile(null);
      setLogoName('');
      setLogoPreview('');
      return;
    }
    try {
      validateCustomLogo(file);
    } catch {
      setLogoFile(null);
      setLogoName('');
      setLogoPreview('');
      event.currentTarget.value = '';
      setStatus(pick({ en: 'Use a real PNG, JPG or WEBP logo under 2 MB.', ar: 'استخدم شعار PNG أو JPG أو WEBP حقيقي أقل من 2 ميغابايت.' }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(String(reader.result || ''));
    reader.readAsDataURL(file);
    setLogoFile(file);
    setLogoName(file.name);
    setStatus('');
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('');
    setBusy(true);
    try {
      const idempotencyKey = requestKeyRef.current;
      let logoAsset: { id: string; scanStatus: string; name: string } | null = null;
      if (logoFile) {
        setStatus(pick({ en: 'Securely uploading and quarantining your logo…', ar: 'جارٍ رفع الشعار بأمان إلى منطقة الفحص…' }));
        logoAsset = await uploadCustomDesignAsset({ file: logoFile, idempotencyKey, turnstileToken });
      }
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
            logoAsset?.id ? `Logo asset: ${logoAsset.id} (${logoAsset.scanStatus})` : '',
            contact.notes ? `Notes: ${contact.notes}` : '',
          ].filter(Boolean).join('\n'),
          logoAssetId: logoAsset?.id || null,
          design: { productType, bodyColor, trimColor, teamName, playerName, playerNumber, logoFileName: logoName, logoAssetId: logoAsset?.id || null, logoScanStatus: logoAsset?.scanStatus || null },
          language: lang,
        },
        turnstileToken,
        idempotencyKey,
      }) as { quote?: Record<string, unknown>; notification?: string; persisted?: boolean };
      const reference = String(result.quote?.quote_number || '');
      setStatus(result.persisted === false
        ? pick({
            en: `Design request ${reference} was delivered by email, but it is not yet saved in the account system. Our team will follow up; do not submit a duplicate.`,
            ar: `تم توصيل طلب التصميم ${reference} بالبريد، لكنه لم يُحفظ بعد في نظام الحسابات. سيتابع معك فريقنا؛ لا ترسل طلبًا مكررًا.`,
          })
        : pick({
            en: `Design request ${reference} received and saved. Our team will contact you to finalize it.`,
            ar: `تم استلام وحفظ طلب التصميم ${reference}. سيتواصل معك فريقنا لإكماله.`,
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
              desktopVideo={LOCAL_HERO_MEDIA.custom.desktopVideo}
              mobileVideo={LOCAL_HERO_MEDIA.custom.mobileVideo}
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
            <label className="cx-upload"><span>{pick({ en: 'Team logo', ar: 'شعار الفريق' })}</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={logoChange} /><small>{logoName || pick({ en: 'PNG / JPG / WEBP · optional · securely scanned before staff access', ar: 'PNG / JPG / WEBP · اختياري · يُفحص أمنيًا قبل وصول الفريق إليه' })}</small></label>
            {(productType === 'game-jersey' || productType === 'game-set') ? <div className="cx-two"><label className="cx-field"><span>{pick({ en: 'Player name', ar: 'اسم اللاعب' })}</span><input value={playerName} maxLength={14} onChange={(e) => setPlayerName(e.target.value.toUpperCase())} /></label><label className="cx-field"><span>{pick({ en: 'Number', ar: 'الرقم' })}</span><input inputMode="numeric" value={playerNumber} maxLength={2} onChange={(e) => setPlayerNumber(e.target.value.replace(/\D/g, '').slice(0,2))} /></label></div> : null}
            <p className="cx-explain">{pick({ en: 'This is a fast concept preview, not a production proof. Your Shababuna specialist confirms placement, sizing, fabrics and final artwork with you after submission.', ar: 'هذه معاينة سريعة للفكرة وليست بروفة إنتاج نهائية. يتواصل معك مختص شبابنا لتأكيد الأماكن والمقاسات والخامة والتصميم النهائي.' })}</p>
          </div>
        </section>

        <section className="cx-request">
          <div><p className="cx-step">02 / {pick({ en: 'Send concept', ar: 'إرسال الفكرة' })}</p><h2>{pick({ en: 'We finish it with you.', ar: 'نكملها معك.' })}</h2><p>{pick({ en: 'Send the concept and your contact details. We review it, confirm the real production setup and return with the quote.', ar: 'أرسل الفكرة وبيانات التواصل. نراجعها ونؤكد إعداد الإنتاج الحقيقي ثم نرجع لك بعرض السعر.' })}</p><Link to="/customize/advanced" className="cx-advanced-link">{pick({ en: 'Need the advanced production studio?', ar: 'تحتاج استوديو الإنتاج المتقدم؟' })}</Link></div>
          <form onSubmit={(e) => { void submit(e); }} className="cx-request-form">
            <div className="cx-request-grid">
              <label className="field" data-field="name"><span className="field__label">{pick({ en: 'Full name', ar: 'الاسم الكامل' })}</span><div className="field__control"><input required value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} autoComplete="name" /></div></label>
              <label className="field" data-field="email"><span className="field__label">Email</span><div className="field__control field__control--latin"><input required type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} autoComplete="email" /></div></label>
              <label className="field" data-field="phone"><span className="field__label">{pick({ en: 'Phone / WhatsApp', ar: 'الهاتف / واتساب' })}</span><div className="field__control field__control--latin"><input value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} autoComplete="tel" /></div></label>
              <label className="field" data-field="organization"><span className="field__label">{pick({ en: 'Team / Organization', ar: 'الفريق / المؤسسة' })}</span><div className="field__control"><input required value={contact.organization} onChange={(e) => setContact({ ...contact, organization: e.target.value })} /></div></label>
              <label className="field" data-field="country"><span className="field__label">{pick({ en: 'Country', ar: 'الدولة' })}</span><div className="field__control field__control--latin"><input required maxLength={2} value={contact.country} onChange={(e) => setContact({ ...contact, country: e.target.value.toUpperCase() })} /></div></label>
              <label className="field" data-field="quantity"><span className="field__label">{pick({ en: 'Estimated quantity', ar: 'الكمية التقديرية' })}</span><div className="field__control field__control--latin"><input required inputMode="numeric" value={contact.quantity} onChange={(e) => setContact({ ...contact, quantity: e.target.value.replace(/\D/g, '') })} /></div></label>
            </div>
            <label className="field" data-field="message"><span className="field__label">{pick({ en: 'Anything else?', ar: 'أي تفاصيل إضافية؟' })}</span><div className="field__control field__control--textarea"><textarea rows={4} value={contact.notes} onChange={(e) => setContact({ ...contact, notes: e.target.value })} /></div></label>
            <TurnstileWidget onToken={setTurnstileToken} language={lang} optionalWhenUnconfigured />
            <button className="btn-primary block" disabled={busy}>{busy ? pick({ en: 'Sending…', ar: 'جارٍ الإرسال…' }) : pick({ en: 'Send design request', ar: 'إرسال طلب التصميم' })}</button>
            {status ? <p className="form-status" role="status">{status}</p> : null}
          </form>
        </section>
      </main>
    </>
  );
}

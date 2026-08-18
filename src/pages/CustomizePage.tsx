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
  'game-set': 'https://underarmour.scene7.com/is/image/Underarmour/PS6015648-481_F?bgc=f0f0f0&hei=1000&op_usm=1.75%2C0.3%2C2%2C0&qlt=85&rp=standard-0pad%7Cpdp&wid=800',
  'game-jersey': 'https://underarmour.scene7.com/is/image/Underarmour/PS6014671-001_HF?bgc=f0f0f0&hei=1000&op_usm=1.75%2C0.3%2C2%2C0&qlt=85&rp=standard-0pad%7Cpdp&wid=800',
  'game-shorts': 'https://assets.adidas.com/images/w_500%2Cf_auto%2Cq_auto/49fb4ad3ab90450aa0b1a806fecd3038_9366/ADIDAS_BASKETBALL_WOVEN_SHORTS_Blue_KB7526_21_model.jpg',
  'practice-set': 'https://preview.thenewsmarket.com/Previews/ADID/StillAssets/640x480/691341_v3.jpg',
  'shooting-shirt': 'https://underarmour.scene7.com/is/image/Underarmour/V5-1361522-001_FC?bgc=F0F0F0&hei=1000&qlt=85&resmode=sharp2&wid=800',
  hoodie: 'https://static.nike.com/a/images/t_web_pdp_535_v2/f_auto%2Cu_9ddf04c7-2a9a-4d76-add1-d15af8f0263d%2Cc_scale%2Cfl_relative%2Cw_1.0%2Ch_1.0%2Cfl_layer_apply/7abfa976-e388-47c9-98e7-5a9674283025/M%2BNK%2BTF%2BSI%2BBRSH%2BPO%2BHD.png',
  'team-pants': 'https://static.nike.com/a/images/t_web_pdp_535_v2/f_auto%2Cu_9ddf04c7-2a9a-4d76-add1-d15af8f0263d%2Cc_scale%2Cfl_relative%2Cw_1.0%2Ch_1.0%2Cfl_layer_apply/0ed51568-d206-48eb-9269-da458f1fb596/M%2BNK%2BTF%2BSI%2BBRSH%2BOPHEM%2BPANT%2BSKU.png',
  tracksuit: 'https://assets.adidas.com/images/w_500%2Cf_auto%2Cq_auto/91da3015525041989f8eacff1c2e9888_9366/adidas_Basketball_Woven_Track_Jacket_Blue_KB7531_20_01_model.jpg',
  'team-bag': 'https://static.nike.com/a/images/t_web_pdp_535_v2/f_auto%2Cu_9ddf04c7-2a9a-4d76-add1-d15af8f0263d%2Cc_scale%2Cfl_relative%2Cw_1.0%2Ch_1.0%2Cfl_layer_apply/08d0700a-d0fc-4645-a3ff-d14ea52b3905/NK%2BVARSITY%2BELITE%2BBKPK.png',
  sleeve: 'https://static.nike.com/a/images/t_web_pdp_535_v2/f_auto%2Cu_9ddf04c7-2a9a-4d76-add1-d15af8f0263d%2Cc_scale%2Cfl_relative%2Cw_1.0%2Ch_1.0%2Cfl_layer_apply/96bc8662-7933-4af7-9dfa-736537b4ee1f/NIKE%2BDRI-FIT%2BSLEEVE%2BJ%2BMORANT.png',
  basketball: 'https://static.nike.com/a/images/t_web_pdp_535_v2/f_auto%2Cu_9ddf04c7-2a9a-4d76-add1-d15af8f0263d%2Cc_scale%2Cfl_relative%2Cw_1.0%2Ch_1.0%2Cfl_layer_apply/0b3db21c-204c-4b52-91c8-6a04a40aaea8/NK%2BELT%2BALL%2BCOURT%2B8P%2B2.0.png',
  'hoop-padding': 'https://i.ytimg.com/vi/UCWkNZ5Y8-E/maxresdefault.jpg',
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

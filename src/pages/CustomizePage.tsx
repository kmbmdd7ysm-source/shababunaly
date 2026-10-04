import type { ChangeEvent, FormEvent, ReactElement } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import Seo from '../components/common/Seo';
import EditorialMedia from '../components/common/EditorialMedia';
import CountrySelect from '../components/common/CountrySelect';
import TurnstileWidget from '../components/security/TurnstileWidget';
import CustomProductShowcase from '../components/custom/CustomProductShowcase';
import Icon from '../components/icons/Icon';
import { useLanguage } from '../context/LanguageContext';
import { submitPublicQuote } from '../services/publicQuotes';
import { uploadCustomDesignAsset, validateCustomLogo } from '../services/customDesignAssets';
import { CUSTOM_PRODUCT_TYPES } from '../data/customization';
import { BAL_MEDIA } from '../data/balMedia';
import { SHABABUNA_MEDIA } from '../data/shababunaMedia';
import { CUSTOM_COLOR_OPTIONS, customColorKey } from '../components/custom/customColors';
import '../styles/custom-experience.css';
import '../styles/domain-forms.css';

const FEATURED = [...CUSTOM_PRODUCT_TYPES];
const fallbackArt: Record<string, string> = {
  'game-set': SHABABUNA_MEDIA.images.teamLineup,
  'game-jersey': SHABABUNA_MEDIA.images.red17Apparel,
  'game-shorts': BAL_MEDIA.images.riversTeam,
  'practice-set': BAL_MEDIA.images.giantsDrive,
  'shooting-shirt': SHABABUNA_MEDIA.images.sadiCustom,
  hoodie: BAL_MEDIA.images.futureProsGroup,
  'team-pants': BAL_MEDIA.images.futureProsSafari,
  tracksuit: BAL_MEDIA.images.futureProsSession,
  'team-bag': BAL_MEDIA.images.pumaMerch,
  sleeve: BAL_MEDIA.images.lualFabian,
  basketball: BAL_MEDIA.images.riversVsAlAhly,
  'hoop-padding': BAL_MEDIA.images.kigaliArena,
};

const NO_SIZE_BREAKDOWN = new Set(['basketball', 'hoop-padding', 'team-bag', 'sleeve']);

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
  const [contact, setContact] = useState({ name: '', email: '', phone: '', organization: '', country: 'LY', quantity: '10', sizeBreakdown: '', notes: '' });
  const [turnstileToken, setTurnstileToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const selected = useMemo(() => FEATURED.find((item) => item.key === productType) || FEATURED[0]!, [productType]);
  const showSizeBreakdown = !NO_SIZE_BREAKDOWN.has(productType);
  const bodyColorName = customColorKey(bodyColor);
  const trimColorName = customColorKey(trimColor);

  useEffect(() => {
    setContact((current) => {
      const currentQty = Number(current.quantity || 0);
      return currentQty >= selected.minimum ? current : { ...current, quantity: String(selected.minimum) };
    });
  }, [selected.minimum]);

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
        setStatus(pick({ en: 'Securely uploading and scanning your logo…', ar: 'جارٍ رفع الشعار وفحصه بأمان…' }));
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
          package: 'custom-production-request',
          productGroup: productType,
          quantity: Number(contact.quantity || selected.minimum),
          requirements: [
            `Product: ${pick(selected.label)}`,
            `Body color: ${bodyColorName} (${bodyColor})`,
            `Trim color: ${trimColorName} (${trimColor})`,
            `Team name: ${teamName || '—'}`,
            `Player name: ${playerName || '—'}`,
            `Player number: ${playerNumber || '—'}`,
            showSizeBreakdown ? `Size breakdown: ${contact.sizeBreakdown || 'To confirm with customer'}` : '',
            `Quantity: ${contact.quantity || selected.minimum}`,
            `Logo file: ${logoName || 'none'}`,
            logoAsset?.id ? `Logo asset: ${logoAsset.id} (${logoAsset.scanStatus})` : '',
            contact.notes ? `Notes: ${contact.notes}` : '',
          ].filter(Boolean).join('\n'),
          logoAssetId: logoAsset?.id || null,
          design: {
            productType,
            productLabel: pick(selected.label),
            bodyColor,
            bodyColorName,
            trimColor,
            trimColorName,
            teamName,
            playerName,
            playerNumber,
            quantity: Number(contact.quantity || selected.minimum),
            sizeBreakdown: showSizeBreakdown ? contact.sizeBreakdown : '',
            logoFileName: logoName,
            logoAssetId: logoAsset?.id || null,
            logoScanStatus: logoAsset?.scanStatus || null,
            notes: contact.notes,
          },
          language: lang,
        },
        turnstileToken,
        idempotencyKey,
      }) as { quote?: Record<string, unknown>; notification?: string; persisted?: boolean };
      const reference = String(result.quote?.quote_number || '');
      setStatus(result.persisted === false
        ? pick({
            en: `Request ${reference} was delivered by email with your full customization, but it is not yet saved in the account system. Our team will follow up; do not submit a duplicate.`,
            ar: `تم توصيل الطلب ${reference} بالبريد مع كامل تفاصيل التخصيص، لكنه لم يُحفظ بعد في نظام الحسابات. سيتابع معك فريقنا؛ لا ترسل طلبًا مكررًا.`,
          })
        : pick({
            en: `Request ${reference} received with your full customization. Our team will contact you to finalize production.`,
            ar: `تم استلام الطلب ${reference} مع كامل تفاصيل التخصيص. سيتواصل معك فريقنا لإكمال الإنتاج.`,
          }));
    } catch {
      setStatus(pick({ en: 'We could not submit the request. Check the details and try again.', ar: 'تعذر إرسال الطلب. تحقق من البيانات وحاول مرة أخرى.' }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Seo title="Custom Basketball Uniforms" description="Create a Shababuna custom basketball concept, then send the complete configuration to our team for a production quote." path="/customize" />
      <main className="cx-page">
        <header className="cx-hero cx-hero--editorial">
          <div className="cx-hero-media" aria-hidden="true">
            <EditorialMedia
              desktopMedia={SHABABUNA_MEDIA.images.sadiCustom}
              mobileMedia={SHABABUNA_MEDIA.images.sadiCustom}
              desktopVideo={SHABABUNA_MEDIA.videos.sadiShot}
              mobileVideo={SHABABUNA_MEDIA.videos.sadiShot}
              loading="eager"
            />
            <span className="cx-hero-media__shade" />
          </div>
          <div className="cx-hero-copy">
            <p>{pick({ en: 'SHABABUNA CUSTOM', ar: 'تخصيص شبابنا' })}</p>
            <h1>{pick({ en: 'Make it yours.', ar: 'خليه لفريقك.' })}</h1>
            <span>{pick({ en: 'Choose the product. Set the identity. Send one complete request and we finish production with you.', ar: 'اختر المنتج وحدد الهوية، ثم أرسل طلبًا واحدًا متكاملاً ونحن نكمل معك الإنتاج.' })}</span>
          </div>
        </header>

        <section className="cx-products" aria-label={pick({ en: 'Choose product', ar: 'اختر المنتج' })}>
          {FEATURED.map((item) => (
            <button key={item.key} type="button" className={`cx-product-card${productType === item.key ? ' is-active' : ''}`} onClick={() => setProductType(item.key)}>
              <div className="cx-product-media"><img src={fallbackArt[item.key]} alt="" /></div>
              <strong>{pick(item.label)}</strong>
              <small>{pick({ en: `Minimum ${item.minimum}`, ar: `الحد الأدنى ${item.minimum}` })}</small>
            </button>
          ))}
        </section>

        <form className="cx-custom-flow" onSubmit={(event) => { void submit(event); }} noValidate={false}>
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
              <label className="cx-upload">
                <span>{pick({ en: 'Team logo', ar: 'شعار الفريق' })}</span>
                <div className="cx-upload-control">
                  <Icon name="upload" size={22} />
                  <div><strong>{logoName || pick({ en: 'Upload team logo', ar: 'ارفع شعار الفريق' })}</strong><small>{pick({ en: 'PNG / JPG / WEBP · optional · securely scanned', ar: 'PNG / JPG / WEBP · اختياري · يُفحص بأمان' })}</small></div>
                  <b>{pick({ en: 'Browse', ar: 'اختيار' })}</b>
                  <input className="cx-upload-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={logoChange} />
                </div>
              </label>
              {(productType === 'game-jersey' || productType === 'game-set') ? <div className="cx-two"><label className="cx-field"><span>{pick({ en: 'Player name', ar: 'اسم اللاعب' })}</span><input value={playerName} maxLength={14} onChange={(e) => setPlayerName(e.target.value.toUpperCase())} /></label><label className="cx-field"><span>{pick({ en: 'Number', ar: 'الرقم' })}</span><input inputMode="numeric" value={playerNumber} maxLength={2} onChange={(e) => setPlayerNumber(e.target.value.replace(/\D/g, '').slice(0,2))} /></label></div> : null}
              <p className="cx-explain">{pick({ en: 'Your selections below are part of the same request. Nothing is submitted separately: product, colors, identity, logo, quantities and contact details travel together.', ar: 'كل اختياراتك هنا جزء من نفس الطلب. لا يتم إرسال أي جزء منفصل: المنتج والألوان والهوية والشعار والكميات وبيانات التواصل تصل معًا.' })}</p>
            </div>
          </section>

          <section className="cx-request">
            <div><p className="cx-step">02 / {pick({ en: 'Review & send', ar: 'المراجعة والإرسال' })}</p><h2>{pick({ en: 'We finish it with you.', ar: 'نكملها معك.' })}</h2><p>{pick({ en: 'Review the configuration you just built, add the final order details and send one complete production request.', ar: 'راجع التخصيص الذي أنشأته، أضف تفاصيل الطلب النهائية، ثم أرسل طلب إنتاج واحدًا متكاملاً.' })}</p></div>
            <div className="cx-request-form">
              <div className="cx-request-summary" aria-label={pick({ en: 'Customization summary', ar: 'ملخص التخصيص' })}>
                <div><small>{pick({ en: 'Product', ar: 'المنتج' })}</small><strong>{pick(selected.label)}</strong></div>
                <div><small>{pick({ en: 'Colors', ar: 'الألوان' })}</small><strong className="cx-summary-colors"><i data-color={bodyColorName} /><span>{bodyColorName}</span><i data-color={trimColorName} /><span>{trimColorName}</span></strong></div>
                <div><small>{pick({ en: 'Identity', ar: 'الهوية' })}</small><strong>{teamName || '—'}{playerName ? ` · ${playerName}` : ''}{playerNumber ? ` · #${playerNumber}` : ''}</strong></div>
                <div><small>{pick({ en: 'Logo', ar: 'الشعار' })}</small><strong>{logoName || pick({ en: 'No logo uploaded', ar: 'لم يتم رفع شعار' })}</strong></div>
              </div>
              <div className="cx-request-grid">
                <label className="field" data-field="name"><span className="field__label">{pick({ en: 'Full name', ar: 'الاسم الكامل' })}</span><div className="field__control"><input required value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} autoComplete="name" /></div></label>
                <label className="field" data-field="email"><span className="field__label">Email</span><div className="field__control field__control--latin"><input required type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} autoComplete="email" /></div></label>
                <label className="field" data-field="phone"><span className="field__label">{pick({ en: 'Phone / WhatsApp', ar: 'الهاتف / واتساب' })}</span><div className="field__control field__control--latin"><input value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} autoComplete="tel" /></div></label>
                <label className="field" data-field="organization"><span className="field__label">{pick({ en: 'Team / Organization', ar: 'الفريق / المؤسسة' })}</span><div className="field__control"><input required value={contact.organization} onChange={(e) => setContact({ ...contact, organization: e.target.value })} /></div></label>
                <label className="field" data-field="country"><span className="field__label">{pick({ en: 'Country', ar: 'الدولة' })}</span><div className="field__control"><CountrySelect required value={contact.country} onChange={(country) => setContact({ ...contact, country })} /></div></label>
                <label className="field" data-field="quantity"><span className="field__label">{pick({ en: 'Estimated quantity', ar: 'الكمية التقديرية' })}</span><div className="field__control field__control--latin"><input required type="number" min={selected.minimum} inputMode="numeric" value={contact.quantity} onChange={(e) => setContact({ ...contact, quantity: e.target.value.replace(/\D/g, '') })} /></div></label>
                {showSizeBreakdown ? <label className="field cx-size-breakdown" data-field="size"><span className="field__label">{pick({ en: 'Size breakdown (optional)', ar: 'توزيع المقاسات (اختياري)' })}</span><div className="field__control"><input value={contact.sizeBreakdown} onChange={(e) => setContact({ ...contact, sizeBreakdown: e.target.value })} placeholder={pick({ en: 'Example: S×2, M×5, L×3', ar: 'مثال: S×2، M×5، L×3' })} /></div></label> : null}
              </div>
              <label className="field" data-field="message"><span className="field__label">{pick({ en: 'Anything else?', ar: 'أي تفاصيل إضافية؟' })}</span><div className="field__control field__control--textarea"><textarea rows={4} value={contact.notes} onChange={(e) => setContact({ ...contact, notes: e.target.value })} /></div></label>
              <TurnstileWidget onToken={setTurnstileToken} language={lang} optionalWhenUnconfigured />
              <button type="submit" className="btn-primary block" disabled={busy}>{busy ? pick({ en: 'Sending complete request…', ar: 'جارٍ إرسال الطلب الكامل…' }) : pick({ en: 'Send complete request', ar: 'إرسال الطلب الكامل' })}</button>
              {status ? <p className="form-status" role="status">{status}</p> : null}
            </div>
          </section>
        </form>
      </main>
    </>
  );
}

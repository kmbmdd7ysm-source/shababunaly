import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Seo from '../components/common/Seo';
import RouteMasthead from '../components/composition/RouteMasthead';
import '../styles/composition.css';
import StudioStage from '../components/custom/StudioStage';
import ProductionDesignEditor from '../components/custom/ProductionDesignEditor';
import CountrySelect from '../components/common/CountrySelect';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { sendFormspreeWithFiles } from '../services/formspree';
import {
  ensureOrganization,
  listSavedDesigns,
  saveCustomDesign,
  saveRoster,
} from '../services/b2b';
import { submitPublicQuote } from '../services/publicQuotes';
import {
  CUSTOM_FONTS,
  CUSTOM_NECKLINES,
  CUSTOM_PATTERNS,
  CUSTOM_PRODUCT_TYPES,
  CUSTOM_SIZES,
  DEFAULT_CUSTOM_DESIGN,
  getCustomProductType,
  normalizeRoster,
  rosterToCsv,
} from '../data/customization';
import { useCatalog } from '../context/CatalogContext';
import TurnstileWidget from '../components/security/TurnstileWidget';
import {
  autosaveDesignStudio,
  createDefaultStudio,
  createSecureDesignShare,
  normalizeStudio,
} from '../services/designStudio';
import { downloadBlob, downloadDesignDocuments } from '../utils/simplePdf';
import { parseRosterFile, ROSTER_FILE_ACCEPT } from '../utils/rosterSpreadsheet';
import { buildProductionPackage } from '../utils/designExports';
import { runProductionPreflight } from '../services/productionPreflight';

const STEPS = [
  { key: 'product', en: 'Product', ar: 'المنتج' },
  { key: 'design', en: 'Design', ar: 'التصميم' },
  { key: 'roster', en: 'Roster', ar: 'قائمة الفريق' },
  { key: 'review', en: 'Review', ar: 'المراجعة' },
];

function productTypeFromCatalog(slug, getProduct) {
  const product = slug && typeof getProduct === 'function' ? getProduct(slug) : null;
  if (!product) return null;
  const text = `${product.productType || ''} ${product.subcategory || ''}`.toLowerCase();
  if (text.includes('basketball')) return 'basketball';
  if (text.includes('short')) return 'game-shorts';
  if (text.includes('pants') || text.includes('pant')) return 'team-pants';
  if (text.includes('hoodie')) return 'hoodie';
  if (text.includes('track')) return 'tracksuit';
  if (text.includes('bag')) return 'team-bag';
  if (text.includes('sleeve')) return 'sleeve';
  if (text.includes('shoot')) return 'shooting-shirt';
  if (text.includes('practice')) return 'practice-set';
  if (text.includes('jersey')) return 'game-jersey';
  if (text.includes('padding')) return 'hoop-padding';
  return 'game-set';
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('file_read_failed'));
    reader.readAsDataURL(file);
  });
}

function readImageDimensions(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () =>
      resolve({ pixelWidth: image.naturalWidth, pixelHeight: image.naturalHeight });
    image.onerror = () => reject(new Error('invalid_image_dimensions'));
    image.src = dataUrl;
  });
}

async function sha256File(file) {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function downloadText(filename, text, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function emptyPlayer(index) {
  return {
    id: `player-${Date.now()}-${index}`,
    name: '',
    jerseyName: '',
    number: '',
    jerseySize: '',
    shortsSize: '',
    errors: [],
  };
}

export default function CustomizePage() {
  const { getProduct } = useCatalog();
  const { pick, lang } = useLanguage();
  const auth = useAuth();
  const [params] = useSearchParams();
  const requestedDesignId = params.get('design');
  const initialType =
    productTypeFromCatalog(params.get('product'), getProduct) || DEFAULT_CUSTOM_DESIGN.productType;
  const initialProduct = getCustomProductType(initialType);
  const [step, setStep] = useState('product');
  const [design, setDesign] = useState({
    ...DEFAULT_CUSTOM_DESIGN,
    productType: initialType,
    quantity: initialProduct.minimum,
  });
  const [roster, setRoster] = useState([]);
  const [files, setFiles] = useState([]);
  const [contact, setContact] = useState({
    name: '',
    email: auth.user?.email || '',
    phone: '',
    organization: '',
    country: 'LY',
    deadline: '',
    notes: '',
  });
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [savedId, setSavedId] = useState(null);
  const [workflowStatus, setWorkflowStatus] = useState('draft');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [pendingSubmission, setPendingSubmission] = useState(null);
  const [autosaveState, setAutosaveState] = useState('idle');
  const [shareUrl, setShareUrl] = useState('');

  const selected = useMemo(() => getCustomProductType(design.productType), [design.productType]);
  const normalizedRoster = useMemo(() => normalizeRoster(roster), [roster]);
  const rosterErrors = normalizedRoster.reduce((sum, row) => sum + row.errors.length, 0);
  const quantityShortfall = Math.max(0, selected.minimum - Number(design.quantity || 0));
  const lockedDesign = ['proof_ready', 'approved'].includes(workflowStatus);
  const productionPreflight = useMemo(
    () => runProductionPreflight({ design, studio: design.studio, roster: normalizedRoster }),
    [design, normalizedRoster],
  );
  const organizationMetadata =
    auth.user?.user_metadata?.account_type === 'organization'
      ? {
          name: auth.user.user_metadata.organization_name || contact.organization,
          type: auth.user.user_metadata.organization_type || 'club',
        }
      : null;
  const resolveOrganization = async () =>
    organizationMetadata
      ? ensureOrganization({
          userId: auth.user?.id,
          name: organizationMetadata.name || contact.organization,
          type: organizationMetadata.type,
          countryCode: contact.country,
        })
      : null;

  useEffect(() => {
    if (auth.user?.email)
      setContact((current) => ({ ...current, email: current.email || auth.user.email }));
  }, [auth.user?.id]);

  useEffect(() => {
    if (!requestedDesignId) return undefined;
    let active = true;
    listSavedDesigns(auth.user?.id || 'guest')
      .then((rows) => {
        if (!active) return;
        const saved = rows.find((item) => item.id === requestedDesignId);
        if (!saved) {
          setStatus(
            pick({ en: 'Saved design was not found.', ar: 'لم يتم العثور على التصميم المحفوظ.' }),
          );
          return;
        }
        setSavedId(saved.id);
        setWorkflowStatus(saved.status || 'draft');
        const loaded = {
          ...DEFAULT_CUSTOM_DESIGN,
          ...(saved.design_data || {}),
          id: saved.id,
          version: saved.version || 1,
        };
        setDesign({ ...loaded, studio: normalizeStudio(loaded.studio, loaded) });
        setStep('design');
        setStatus(pick({ en: 'Saved design loaded.', ar: 'تم فتح التصميم المحفوظ.' }));
      })
      .catch(() =>
        setStatus(
          pick({ en: 'Saved design could not be loaded.', ar: 'تعذر فتح التصميم المحفوظ.' }),
        ),
      );
    return () => {
      active = false;
    };
  }, [requestedDesignId, auth.user?.id, pick]);

  const setDesignValue = (key, value) => setDesign((current) => ({ ...current, [key]: value }));
  const setStudio = (studio) =>
    setDesign((current) => ({ ...current, studio: normalizeStudio(studio, current) }));
  useEffect(() => {
    if (!auth.user?.id || !savedId || lockedDesign || !design.studio) return undefined;
    setAutosaveState('waiting');
    const timer = setTimeout(() => {
      setAutosaveState('saving');
      autosaveDesignStudio(savedId, design, design.studio)
        .then(() => setAutosaveState('saved'))
        .catch(() => setAutosaveState('error'));
    }, 1400);
    return () => clearTimeout(timer);
  }, [auth.user?.id, savedId, lockedDesign, design.studio]);

  const selectProduct = (key) => {
    const item = getCustomProductType(key);
    setDesign((current) => ({
      ...current,
      productType: key,
      quantity: Math.max(Number(current.quantity || 0), item.minimum),
    }));
    setStep('design');
    setStatus('');
  };

  const addRosterRow = () => setRoster((current) => [...current, emptyPlayer(current.length)]);
  const updateRosterRow = (id, key, value) =>
    setRoster((current) => current.map((row) => (row.id === id ? { ...row, [key]: value } : row)));
  const removeRosterRow = (id) => setRoster((current) => current.filter((row) => row.id !== id));

  const importRoster = async (file) => {
    if (!file) return;
    try {
      const rows = await parseRosterFile(file);
      setRoster(rows);
      setStatus(
        rows.length
          ? pick({
              en: `${rows.length} players imported. Review highlighted fields before submitting.`,
              ar: `تم استيراد ${rows.length} لاعبًا. راجع الحقول المميزة قبل الإرسال.`,
            })
          : pick({
              en: 'No roster rows were found in the file.',
              ar: 'لم يتم العثور على بيانات لاعبين داخل الملف.',
            }),
      );
    } catch (error) {
      const code = String(error?.message || '');
      setStatus(
        pick({
          en: code.includes('too_large')
            ? 'Roster file must be under 8 MB.'
            : 'Choose a valid CSV or XLSX roster file.',
          ar: code.includes('too_large')
            ? 'يجب ألا يتجاوز ملف القائمة 8 ميجابايت.'
            : 'اختر ملف قائمة صحيحًا بصيغة CSV أو XLSX.',
        }),
      );
    }
  };

  const uploadLogo = async (file) => {
    if (!file) return;
    const allowedLogoTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);
    if (!allowedLogoTypes.has(file.type) || file.size > 2 * 1024 * 1024) {
      setStatus(
        pick({
          en: 'Choose a PNG, JPG or WebP logo under 2 MB. SVG files are not accepted for security.',
          ar: 'اختر شعار PNG أو JPG أو WebP أقل من 2 ميجابايت. لا نقبل SVG لأسباب أمنية.',
        }),
      );
      return;
    }
    const logoPreview = await readFileAsDataUrl(file);
    const dimensions = await readImageDimensions(logoPreview);
    const logoMetadata = {
      sourceFileName: file.name,
      sourceMimeType: file.type,
      sourceBytes: file.size,
      sourceSha256: await sha256File(file),
      ...dimensions,
      vectorSourceValidated: false,
      fontLicenseStatus: 'not_applicable',
    };
    setDesign((current) => {
      const next = { ...current, logoName: file.name, logoPreview, logoMetadata };
      return {
        ...next,
        studio: normalizeStudio(current.studio || createDefaultStudio(next), next),
      };
    });
    setFiles((current) => [file, ...current.filter((item) => item.name !== file.name)].slice(0, 5));
    setStatus('');
  };

  const saveDraft = async () => {
    if (!auth.user?.id) {
      setStatus(
        pick({
          en: 'Sign in to save designs securely across devices.',
          ar: 'سجّل الدخول لحفظ التصميم بأمان ومزامنته بين الأجهزة.',
        }),
      );
      return;
    }
    setBusy(true);
    setStatus('');
    try {
      const organization = await resolveOrganization();
      const saved = await saveCustomDesign({
        userId: auth.user.id,
        organizationId: organization?.id || null,
        design: { ...design, id: lockedDesign ? undefined : savedId },
        name: `${design.teamName || 'Team'} — ${pick(selected.label)}${lockedDesign ? ' Working Copy' : ''}`,
        status: 'draft',
      });
      setSavedId(saved.id);
      setWorkflowStatus(saved.status || 'draft');
      if (selected.supportsRoster && normalizedRoster.length) {
        await saveRoster({
          userId: auth.user.id,
          organizationId: organization?.id || null,
          name: `${design.teamName || 'Team'} roster`,
          rows: normalizedRoster,
        });
      }
      setStatus(
        pick({
          en: 'Design saved securely to your account.',
          ar: 'تم حفظ التصميم بأمان في حسابك.',
        }),
      );
    } catch {
      setStatus(
        pick({
          en: 'The design could not be saved. Try again.',
          ar: 'تعذر حفظ التصميم. حاول مرة أخرى.',
        }),
      );
    } finally {
      setBusy(false);
    }
  };

  const deliverQuoteEmail = async ({ quote, quotePayload, attachments }) => {
    try {
      await sendFormspreeWithFiles(
        { ...quotePayload, quoteId: quote.id, quoteNumber: quote.quote_number },
        attachments,
        `Shababuna custom design request — ${contact.organization}`,
      );
      setPendingSubmission(null);
      return true;
    } catch {
      setPendingSubmission({ quote, quotePayload, attachments });
      return false;
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setStatus('');
    if (quantityShortfall) {
      setStep('product');
      setStatus(
        pick({
          en: `Minimum order is ${selected.minimum}.`,
          ar: `الحد الأدنى للطلب هو ${selected.minimum}.`,
        }),
      );
      return;
    }
    if (!contact.name.trim() || !contact.email.includes('@') || !contact.organization.trim()) {
      setStep('review');
      setStatus(
        pick({
          en: 'Enter your name, organization and a valid email.',
          ar: 'أدخل الاسم والمؤسسة وبريدًا إلكترونيًا صحيحًا.',
        }),
      );
      return;
    }
    if (selected.supportsRoster && normalizedRoster.length && rosterErrors) {
      setStep('roster');
      setStatus(
        pick({
          en: 'Fix the roster errors before submitting.',
          ar: 'صحّح أخطاء قائمة الفريق قبل الإرسال.',
        }),
      );
      return;
    }
    if (!productionPreflight.readyForQuote) {
      setStep('design');
      setStatus(
        pick({
          en: `Production preflight found ${productionPreflight.blockers.length} blocking issue(s). Resolve them before requesting a quote.`,
          ar: `كشف فحص الإنتاج ${productionPreflight.blockers.length} مشكلة مانعة. أصلحها قبل طلب عرض السعر.`,
        }),
      );
      return;
    }
    if (!turnstileToken) {
      setStatus(
        pick({
          en: 'Complete the security check before submitting.',
          ar: 'أكمل فحص الأمان قبل الإرسال.',
        }),
      );
      return;
    }
    setBusy(true);
    let persistedDesignId = savedId || null;
    let rosterRecord = null;
    try {
      const organization = await resolveOrganization();
      if (auth.user?.id) {
        const saved = await saveCustomDesign({
          userId: auth.user.id,
          organizationId: organization?.id || null,
          design: { ...design, id: lockedDesign ? undefined : savedId },
          name: `${design.teamName || contact.organization} — ${pick(selected.label)}${lockedDesign ? ' Revision' : ''}`,
          status: 'quote_requested',
        });
        persistedDesignId = saved.id;
        setSavedId(saved.id);
        setWorkflowStatus(saved.status || 'quote_requested');
        if (selected.supportsRoster && normalizedRoster.length) {
          rosterRecord = await saveRoster({
            userId: auth.user.id,
            organizationId: organization?.id || null,
            name: `${design.teamName || contact.organization} roster`,
            rows: normalizedRoster,
          });
        }
      }

      const quotePayload = {
        formType: 'custom_design_quote',
        designId: persistedDesignId,
        rosterId: rosterRecord?.id || null,
        customerName: contact.name,
        customerEmail: contact.email,
        phone: contact.phone,
        whatsapp: contact.phone,
        organization: contact.organization,
        accountType: 'team',
        country: contact.country,
        deadline: contact.deadline,
        product: selected.label.en,
        productGroup: selected.key,
        quantity: Number(design.quantity),
        design: { ...design, logoPreview: undefined },
        roster: normalizedRoster,
        notes: `${contact.notes || ''}
${design.notes || ''}`.trim(),
        requirements:
          `${contact.notes || ''}
${design.notes || ''}`.trim() || `${selected.label.en} customization`,
        paymentTerms: '50% deposit / 50% on arrival',
        estimatedTimeline: '30–60 days',
        language: lang,
        productionPreflight,
      };
      const result = await submitPublicQuote({
        payload: quotePayload,
        organizationId: organization?.id || null,
        turnstileToken,
        idempotencyKey: globalThis.crypto?.randomUUID?.(),
      });
      const rosterFile = normalizedRoster.length
        ? new File([rosterToCsv(normalizedRoster)], 'shababuna-team-roster.csv', {
            type: 'text/csv',
          })
        : null;
      const attachments = [...files, ...(rosterFile ? [rosterFile] : [])].slice(0, 5);
      const delivered = await deliverQuoteEmail({ quote: result.quote, quotePayload, attachments });
      setStatus(
        delivered
          ? pick({
              en: `Request ${result.quote.quote_number} was saved and delivered for review.`,
              ar: `تم حفظ الطلب ${result.quote.quote_number} وإرساله للمراجعة.`,
            })
          : pick({
              en: `Request ${result.quote.quote_number} is saved securely. Email delivery is queued for retry; do not create another request.`,
              ar: `تم حفظ الطلب ${result.quote.quote_number} بأمان. تم وضع البريد في قائمة إعادة المحاولة؛ لا تنشئ طلبًا جديدًا.`,
            }),
      );
      setStep('review');
    } catch {
      setStatus(
        persistedDesignId
          ? pick({
              en: 'The design is saved, but no quote was created. Retry the review request without duplicating the design.',
              ar: 'تم حفظ التصميم، لكن لم يتم إنشاء عرض السعر. أعد محاولة طلب المراجعة دون تكرار التصميم.',
            })
          : pick({
              en: 'The request could not be saved securely. No production quote was created.',
              ar: 'تعذر حفظ الطلب بأمان. لم يتم إنشاء عرض سعر للإنتاج.',
            }),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Seo
        title="Customize"
        description="Professional online basketball uniform and team-product design studio by Shababuna."
        path="/customize"
      />
      <RouteMasthead
        eyebrow="Shababuna design studio"
        title={pick({ en: 'Customize Everything', ar: 'صمّم كل شيء' })}
        lede={pick({
          en: 'Build the concept online, upload your identity, add the roster and send one production-ready quote request.',
          ar: 'جهّز الفكرة داخل الموقع، وارفع الهوية، وأضف قائمة الفريق، ثم أرسل طلب عرض سعر جاهزًا لمراجعة الإنتاج.',
        })}
        trail={[{ label: pick({ en: 'Customize', ar: 'التصميم المخصص' }) }]}
        figure={{
          value: CUSTOM_PRODUCT_TYPES.length,
          label: pick({ en: 'product types', ar: 'أنواع منتجات' }),
        }}
      />

      {/* The studio workspace: the design stage and its controls, framed as a
          working surface rather than a marketing section. */}
      <section className="gw-studio-route">
        <div className="gw-studio-route-inner">
          {lockedDesign && (
            <div className="notice notice--info studio-lock-notice" role="status">
              <strong>
                {workflowStatus === 'approved'
                  ? pick({ en: 'Approved design — locked', ar: 'تصميم معتمد — مقفل' })
                  : pick({
                      en: 'Proof awaiting response — original locked',
                      ar: 'البروفة بانتظار الرد — الأصل مقفل',
                    })}
              </strong>
              <p>
                {pick({
                  en: 'You may explore changes here, but saving or submitting creates a new working revision and never alters the approved/proof version.',
                  ar: 'يمكنك تجربة التعديلات هنا، لكن الحفظ أو الإرسال ينشئ نسخة عمل جديدة ولا يغيّر النسخة المعتمدة أو البروفة الأصلية.',
                })}
              </p>
            </div>
          )}
          <nav
            className="studio-steps"
            aria-label={pick({ en: 'Design steps', ar: 'خطوات التصميم' })}
          >
            {STEPS.map((item, index) => (
              <button
                key={item.key}
                type="button"
                className={step === item.key ? 'active' : ''}
                onClick={() => setStep(item.key)}
              >
                <span>{String(index + 1).padStart(2, '0')}</span>
                {pick({ en: item.en, ar: item.ar })}
              </button>
            ))}
          </nav>

          <div className="studio-shell">
            <div className="studio-workspace">
              {step === 'product' && (
                <section aria-labelledby="custom-product-title">
                  <p className="section-label">01 — PRODUCT</p>
                  <h2 id="custom-product-title" className="section-title">
                    {pick({
                      en: 'Choose what Shababuna will produce',
                      ar: 'اختر ما ستصنعه شبابنا',
                    })}
                  </h2>
                  <div className="custom-product-grid">
                    {CUSTOM_PRODUCT_TYPES.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        className={design.productType === item.key ? 'active' : ''}
                        onClick={() => selectProduct(item.key)}
                      >
                        <span>{item.category.replace('-', ' ')}</span>
                        <strong>{pick(item.label)}</strong>
                        <small>
                          {pick({
                            en: `Minimum ${item.minimum}`,
                            ar: `الحد الأدنى ${item.minimum}`,
                          })}
                        </small>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {step === 'design' && (
                <section aria-labelledby="custom-design-title">
                  <p className="section-label">02 — DESIGN</p>
                  <div className="studio-section-heading">
                    <div>
                      <h2 id="custom-design-title" className="section-title">
                        {pick({ en: 'Build the visual direction', ar: 'ابنِ الاتجاه البصري' })}
                      </h2>
                      <p>
                        {pick({
                          en: 'Use the production editor to position artwork across front, back and side views. Shababuna still sends a final manufacturing proof for approval.',
                          ar: 'استخدم محرر الإنتاج لتحديد مواقع العناصر في الأمام والخلف والجانب. ترسل شبابنا بروفة تصنيع نهائية للاعتماد قبل الإنتاج.',
                        })}
                      </p>
                    </div>
                    <button
                      className="btn-secondary"
                      type="button"
                      onClick={saveDraft}
                      disabled={busy}
                    >
                      {pick({ en: 'Save Design', ar: 'حفظ التصميم' })}
                    </button>
                  </div>
                  <div className="design-control-grid">
                    <label>
                      <span>{pick({ en: 'Product', ar: 'المنتج' })}</span>
                      <select
                        value={design.productType}
                        onChange={(event) => selectProduct(event.target.value)}
                      >
                        {CUSTOM_PRODUCT_TYPES.map((item) => (
                          <option key={item.key} value={item.key}>
                            {pick(item.label)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>{pick({ en: 'Order quantity', ar: 'كمية الطلب' })}</span>
                      <input
                        type="number"
                        min={selected.minimum}
                        value={design.quantity}
                        onChange={(event) =>
                          setDesignValue('quantity', Math.max(0, Number(event.target.value)))
                        }
                      />
                      <small>
                        {pick({
                          en: `Minimum ${selected.minimum}`,
                          ar: `الحد الأدنى ${selected.minimum}`,
                        })}
                      </small>
                    </label>
                    <label>
                      <span>{pick({ en: 'Version', ar: 'النسخة' })}</span>
                      <select
                        value={design.variant}
                        onChange={(event) => setDesignValue('variant', event.target.value)}
                      >
                        <option value="home">Home</option>
                        <option value="away">Away</option>
                        <option value="third">Third</option>
                      </select>
                    </label>
                    <label>
                      <span>{pick({ en: 'Pattern', ar: 'النمط' })}</span>
                      <select
                        value={design.pattern}
                        onChange={(event) => setDesignValue('pattern', event.target.value)}
                      >
                        {CUSTOM_PATTERNS.map((item) => (
                          <option key={item.key} value={item.key}>
                            {pick(item.label)}
                          </option>
                        ))}
                      </select>
                    </label>
                    {['uniform', 'jersey', 'shirt'].includes(selected.preview) && (
                      <label>
                        <span>{pick({ en: 'Neckline', ar: 'قصة الرقبة' })}</span>
                        <select
                          value={design.neckline}
                          onChange={(event) => setDesignValue('neckline', event.target.value)}
                        >
                          {CUSTOM_NECKLINES.map((item) => (
                            <option key={item.key} value={item.key}>
                              {pick(item.label)}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <label>
                      <span>{pick({ en: 'Number font', ar: 'خط الأرقام' })}</span>
                      <select
                        value={design.font}
                        onChange={(event) => setDesignValue('font', event.target.value)}
                      >
                        {CUSTOM_FONTS.map((item) => (
                          <option key={item.key} value={item.key}>
                            {pick(item.label)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="design-colour-grid">
                    <label>
                      <span>{pick({ en: 'Primary', ar: 'الأساسي' })}</span>
                      <input
                        type="color"
                        value={design.primary}
                        onChange={(event) => setDesignValue('primary', event.target.value)}
                      />
                    </label>
                    <label>
                      <span>{pick({ en: 'Secondary', ar: 'الثانوي' })}</span>
                      <input
                        type="color"
                        value={design.secondary}
                        onChange={(event) => setDesignValue('secondary', event.target.value)}
                      />
                    </label>
                    <label>
                      <span>{pick({ en: 'Accent', ar: 'الإضافي' })}</span>
                      <input
                        type="color"
                        value={design.accent}
                        onChange={(event) => setDesignValue('accent', event.target.value)}
                      />
                    </label>
                  </div>
                  <div className="design-copy-grid">
                    <label>
                      <span>{pick({ en: 'Team name', ar: 'اسم الفريق' })}</span>
                      <input
                        value={design.teamName}
                        onChange={(event) =>
                          setDesignValue('teamName', event.target.value.toUpperCase().slice(0, 18))
                        }
                      />
                    </label>
                    <label>
                      <span>{pick({ en: 'Player name', ar: 'اسم اللاعب' })}</span>
                      <input
                        value={design.playerName}
                        onChange={(event) =>
                          setDesignValue(
                            'playerName',
                            event.target.value.toUpperCase().slice(0, 14),
                          )
                        }
                      />
                    </label>
                    <label>
                      <span>{pick({ en: 'Number', ar: 'الرقم' })}</span>
                      <input
                        inputMode="numeric"
                        value={design.number}
                        onChange={(event) =>
                          setDesignValue(
                            'number',
                            event.target.value.replace(/\D/g, '').slice(0, 2),
                          )
                        }
                      />
                    </label>
                    <label>
                      <span>{pick({ en: 'Sponsor', ar: 'الراعي' })}</span>
                      <input
                        value={design.sponsorName}
                        onChange={(event) =>
                          setDesignValue(
                            'sponsorName',
                            event.target.value.toUpperCase().slice(0, 22),
                          )
                        }
                      />
                    </label>
                  </div>
                  <div className="design-upload-grid">
                    <label className="custom-upload">
                      <span>{pick({ en: 'Upload team logo', ar: 'ارفع شعار الفريق' })}</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                        onChange={(event) => uploadLogo(event.target.files?.[0])}
                      />
                      <small>
                        {design.logoName ||
                          pick({
                            en: 'PNG, JPG or WebP · max 2 MB',
                            ar: 'PNG أو JPG أو WebP · بحد أقصى 2 ميجابايت',
                          })}
                      </small>
                    </label>
                    <label className="field">
                      <span>{pick({ en: 'Production notes', ar: 'ملاحظات الإنتاج' })}</span>
                      <textarea
                        rows="4"
                        value={design.notes}
                        onChange={(event) =>
                          setDesignValue('notes', event.target.value.slice(0, 1200))
                        }
                      />
                    </label>
                  </div>
                  <ProductionDesignEditor
                    design={design}
                    value={design.studio || createDefaultStudio(design)}
                    onChange={setStudio}
                    readOnly={lockedDesign}
                  />
                  <div className="production-document-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        const docs = downloadDesignDocuments({
                          design,
                          studio: design.studio || createDefaultStudio(design),
                          productLabel: pick(selected.label),
                          roster: normalizedRoster,
                          reference: savedId || 'DRAFT',
                        });
                        downloadBlob(
                          docs.proof,
                          `shababuna-design-proof-${savedId || 'draft'}.pdf`,
                        );
                      }}
                    >
                      {pick({ en: 'Download Proof PDF', ar: 'تحميل بروفة PDF' })}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        const docs = downloadDesignDocuments({
                          design,
                          studio: design.studio || createDefaultStudio(design),
                          productLabel: pick(selected.label),
                          roster: normalizedRoster,
                          reference: savedId || 'DRAFT',
                        });
                        downloadBlob(docs.tech, `shababuna-tech-pack-${savedId || 'draft'}.pdf`);
                      }}
                    >
                      {pick({ en: 'Download Tech Pack', ar: 'تحميل ملف التصنيع' })}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() =>
                        downloadBlob(
                          buildProductionPackage({
                            design,
                            studio: design.studio || createDefaultStudio(design),
                            productLabel: pick(selected.label),
                            roster: normalizedRoster,
                            reference: savedId || 'DRAFT',
                          }),
                          `shababuna-production-${savedId || 'draft'}.zip`,
                        )
                      }
                    >
                      {pick({ en: 'Production Artwork ZIP', ar: 'حزمة ملفات الإنتاج ZIP' })}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={!savedId || !auth.user?.id}
                      onClick={async () => {
                        try {
                          const url = await createSecureDesignShare(savedId, 'comment', 168);
                          setShareUrl(url);
                          await navigator.clipboard?.writeText(url);
                          setStatus(
                            pick({
                              en: 'Secure design link copied. It expires in seven days.',
                              ar: 'تم نسخ رابط التصميم الآمن. تنتهي صلاحيته خلال سبعة أيام.',
                            }),
                          );
                        } catch {
                          setStatus(
                            pick({
                              en: 'Save the design and sign in before creating a secure link.',
                              ar: 'احفظ التصميم وسجّل الدخول قبل إنشاء رابط آمن.',
                            }),
                          );
                        }
                      }}
                    >
                      {pick({ en: 'Secure Share Link', ar: 'رابط مشاركة آمن' })}
                    </button>
                    <span className={`autosave-state autosave-state--${autosaveState}`}>
                      {autosaveState === 'saving'
                        ? pick({ en: 'Autosaving…', ar: 'حفظ تلقائي…' })
                        : autosaveState === 'saved'
                          ? pick({ en: 'Saved to cloud', ar: 'محفوظ سحابيًا' })
                          : autosaveState === 'error'
                            ? pick({ en: 'Autosave unavailable', ar: 'تعذر الحفظ التلقائي' })
                            : ''}
                    </span>
                  </div>
                  {shareUrl && (
                    <input
                      className="secure-share-output"
                      readOnly
                      value={shareUrl}
                      aria-label={pick({
                        en: 'Secure design share link',
                        ar: 'رابط مشاركة التصميم الآمن',
                      })}
                    />
                  )}
                  <div className="studio-next">
                    <button
                      className="btn-primary"
                      type="button"
                      onClick={() => setStep(selected.supportsRoster ? 'roster' : 'review')}
                    >
                      {pick({
                        en: selected.supportsRoster ? 'Add Team Roster' : 'Review Request',
                        ar: selected.supportsRoster ? 'أضف قائمة الفريق' : 'راجع الطلب',
                      })}
                    </button>
                  </div>
                </section>
              )}

              {step === 'roster' && (
                <section aria-labelledby="custom-roster-title">
                  <p className="section-label">03 — ROSTER</p>
                  <div className="studio-section-heading">
                    <div>
                      <h2 id="custom-roster-title" className="section-title">
                        {pick({ en: 'Names, numbers and sizes', ar: 'الأسماء والأرقام والمقاسات' })}
                      </h2>
                      <p>
                        {pick({
                          en: 'Duplicate numbers and incomplete rows are flagged automatically.',
                          ar: 'يتم اكتشاف الأرقام المكررة والصفوف الناقصة تلقائيًا.',
                        })}
                      </p>
                    </div>
                    <div className="roster-actions">
                      <label className="btn-secondary file-button">
                        {pick({ en: 'Import CSV/XLSX', ar: 'استيراد CSV/XLSX' })}
                        <input
                          type="file"
                          accept={ROSTER_FILE_ACCEPT}
                          onChange={(event) => importRoster(event.target.files?.[0])}
                        />
                      </label>
                      <button
                        className="btn-secondary"
                        type="button"
                        onClick={() =>
                          downloadText('shababuna-roster-template.csv', rosterToCsv([]))
                        }
                      >
                        {pick({ en: 'Template', ar: 'النموذج' })}
                      </button>
                    </div>
                  </div>
                  <div className="roster-table-wrap">
                    <table className="roster-table">
                      <thead>
                        <tr>
                          <th>{pick({ en: 'Player', ar: 'اللاعب' })}</th>
                          <th>{pick({ en: 'Print Name', ar: 'اسم الطباعة' })}</th>
                          <th>#</th>
                          <th>{pick({ en: 'Jersey', ar: 'السيريا' })}</th>
                          <th>{pick({ en: 'Shorts', ar: 'الشورت' })}</th>
                          <th>
                            <span className="sr-only">Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(roster.length ? normalizedRoster : [emptyPlayer(0)]).map((row, index) => {
                          const source = roster.find((item) => item.id === row.id) || row;
                          const invalid = row.errors?.length > 0;
                          return (
                            <tr key={source.id} className={invalid ? 'invalid' : ''}>
                              <td>
                                <input
                                  aria-label={`${pick({ en: 'Player name', ar: 'اسم اللاعب' })} ${index + 1}`}
                                  value={source.name}
                                  onChange={(event) => {
                                    if (!roster.length)
                                      setRoster([{ ...source, name: event.target.value }]);
                                    else updateRosterRow(source.id, 'name', event.target.value);
                                  }}
                                />
                              </td>
                              <td>
                                <input
                                  value={source.jerseyName}
                                  onChange={(event) =>
                                    updateRosterRow(
                                      source.id,
                                      'jerseyName',
                                      event.target.value.toUpperCase().slice(0, 18),
                                    )
                                  }
                                />
                              </td>
                              <td>
                                <input
                                  inputMode="numeric"
                                  value={source.number}
                                  onChange={(event) =>
                                    updateRosterRow(
                                      source.id,
                                      'number',
                                      event.target.value.replace(/\D/g, '').slice(0, 2),
                                    )
                                  }
                                />
                              </td>
                              <td>
                                <select
                                  value={source.jerseySize}
                                  onChange={(event) =>
                                    updateRosterRow(source.id, 'jerseySize', event.target.value)
                                  }
                                >
                                  <option value="">—</option>
                                  {CUSTOM_SIZES.map((size) => (
                                    <option key={size}>{size}</option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                <select
                                  value={source.shortsSize}
                                  onChange={(event) =>
                                    updateRosterRow(source.id, 'shortsSize', event.target.value)
                                  }
                                >
                                  <option value="">—</option>
                                  {CUSTOM_SIZES.map((size) => (
                                    <option key={size}>{size}</option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="roster-remove"
                                  onClick={() => removeRosterRow(source.id)}
                                  aria-label={pick({ en: 'Remove player', ar: 'إزالة اللاعب' })}
                                >
                                  ×
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="roster-summary">
                    <button type="button" className="btn-secondary" onClick={addRosterRow}>
                      + {pick({ en: 'Add Player', ar: 'إضافة لاعب' })}
                    </button>
                    <span>
                      {normalizedRoster.length} {pick({ en: 'players', ar: 'لاعب' })} ·{' '}
                      {rosterErrors
                        ? `${rosterErrors} ${pick({ en: 'issues', ar: 'ملاحظات' })}`
                        : pick({ en: 'Validated', ar: 'تم التحقق' })}
                    </span>
                  </div>
                  <div className="studio-next">
                    <button
                      className="btn-primary"
                      type="button"
                      onClick={() => setStep('review')}
                      disabled={Boolean(rosterErrors)}
                    >
                      {pick({ en: 'Review Request', ar: 'راجع الطلب' })}
                    </button>
                  </div>
                </section>
              )}

              {step === 'review' && (
                <section aria-labelledby="custom-review-title">
                  <p className="section-label">04 — REVIEW</p>
                  <h2 id="custom-review-title" className="section-title">
                    {pick({ en: 'Production review request', ar: 'طلب مراجعة الإنتاج' })}
                  </h2>
                  <div className="review-facts">
                    <article>
                      <span>{pick({ en: 'Product', ar: 'المنتج' })}</span>
                      <strong>{pick(selected.label)}</strong>
                    </article>
                    <article>
                      <span>{pick({ en: 'Quantity', ar: 'الكمية' })}</span>
                      <strong>{design.quantity}</strong>
                    </article>
                    <article>
                      <span>{pick({ en: 'Timeline', ar: 'المدة' })}</span>
                      <strong>30–60 {pick({ en: 'days', ar: 'يومًا' })}</strong>
                    </article>
                    <article>
                      <span>{pick({ en: 'Payment', ar: 'الدفع' })}</span>
                      <strong>50% / 50%</strong>
                    </article>
                  </div>
                  <div
                    className={`notice ${productionPreflight.readyForQuote ? 'notice--success' : 'notice--error'}`}
                    role="status"
                  >
                    <strong>
                      {productionPreflight.readyForQuote
                        ? pick({
                            en: 'Digital production preflight passed',
                            ar: 'نجح فحص الإنتاج الرقمي',
                          })
                        : pick({ en: 'Production preflight blocked', ar: 'فحص الإنتاج متوقف' })}
                    </strong>
                    <p>
                      {pick({
                        en: `${productionPreflight.blockers.length} blockers · ${productionPreflight.warnings.length} review notes. Factory proof approval remains mandatory before manufacturing.`,
                        ar: `${productionPreflight.blockers.length} مشاكل مانعة · ${productionPreflight.warnings.length} ملاحظات مراجعة. يبقى اعتماد بروفة المصنع إلزاميًا قبل التصنيع.`,
                      })}
                    </p>
                    {productionPreflight.blockers.length > 0 && (
                      <ul>
                        {productionPreflight.blockers.map((item) => (
                          <li key={`${item.code}-${item.detail}`}>
                            {item.code}: {item.detail}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <form className="quote-form studio-review-form" onSubmit={submit}>
                    <div className="field-row">
                      <label className="field">
                        <span>{pick({ en: 'Name', ar: 'الاسم' })}</span>
                        <input
                          required
                          autoComplete="name"
                          value={contact.name}
                          onChange={(event) => setContact({ ...contact, name: event.target.value })}
                        />
                      </label>
                      <label className="field">
                        <span>{pick({ en: 'Organization', ar: 'النادي أو المؤسسة' })}</span>
                        <input
                          required
                          autoComplete="organization"
                          value={contact.organization}
                          onChange={(event) =>
                            setContact({ ...contact, organization: event.target.value })
                          }
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
                          value={contact.email}
                          onChange={(event) =>
                            setContact({ ...contact, email: event.target.value })
                          }
                        />
                      </label>
                      <label className="field">
                        <span>{pick({ en: 'Phone / WhatsApp', ar: 'الهاتف / واتساب' })}</span>
                        <input
                          autoComplete="tel"
                          value={contact.phone}
                          onChange={(event) =>
                            setContact({ ...contact, phone: event.target.value })
                          }
                        />
                      </label>
                    </div>
                    <div className="field-row">
                      <label className="field">
                        <span>{pick({ en: 'Country', ar: 'الدولة' })}</span>
                        <CountrySelect
                          value={contact.country}
                          onChange={(country) => setContact({ ...contact, country })}
                        />
                      </label>
                      <label className="field">
                        <span>{pick({ en: 'Needed by', ar: 'الموعد المطلوب' })}</span>
                        <input
                          type="date"
                          value={contact.deadline}
                          onChange={(event) =>
                            setContact({ ...contact, deadline: event.target.value })
                          }
                        />
                      </label>
                    </div>
                    <label className="custom-upload">
                      <span>
                        {pick({
                          en: 'Additional logos, references or ready design files',
                          ar: 'شعارات أو مراجع أو ملفات تصميم إضافية',
                        })}
                      </span>
                      <input
                        type="file"
                        multiple
                        accept=".jpg,.jpeg,.png,.webp,.pdf,.csv,.xlsx,image/jpeg,image/png,image/webp,application/pdf,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        onChange={(event) =>
                          setFiles((current) =>
                            [...current, ...Array.from(event.target.files || [])]
                              .filter(
                                (file) =>
                                  [
                                    'image/jpeg',
                                    'image/png',
                                    'image/webp',
                                    'application/pdf',
                                    'text/csv',
                                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                                  ].includes(file.type) && file.size <= 2 * 1024 * 1024,
                              )
                              .slice(0, 5),
                          )
                        }
                      />
                      <small>
                        {files.length
                          ? files.map((file) => file.name).join(' · ')
                          : pick({ en: 'Up to five files', ar: 'حتى خمسة ملفات' })}
                      </small>
                    </label>
                    <label className="field">
                      <span>{pick({ en: 'Final notes', ar: 'الملاحظات النهائية' })}</span>
                      <textarea
                        rows="5"
                        value={contact.notes}
                        onChange={(event) => setContact({ ...contact, notes: event.target.value })}
                      />
                    </label>
                    <div className="review-consent">
                      <strong>{pick({ en: 'Before production', ar: 'قبل التصنيع' })}</strong>
                      <p>
                        {pick({
                          en: 'Shababuna confirms price, shipping and timeline, then sends a final proof. Production begins only after proof approval and the 50% deposit.',
                          ar: 'تؤكد شبابنا السعر والشحن والمدة ثم ترسل البروفة النهائية. يبدأ التصنيع فقط بعد اعتماد البروفة ودفع 50%.',
                        })}
                      </p>
                    </div>
                    <TurnstileWidget onToken={setTurnstileToken} language={lang} />
                    <button
                      className="btn-primary block"
                      disabled={busy || !productionPreflight.readyForQuote}
                    >
                      {busy
                        ? pick({ en: 'Sending…', ar: 'جاري الإرسال…' })
                        : pick({ en: 'Send Production Review', ar: 'إرسال لمراجعة الإنتاج' })}
                    </button>
                  </form>
                </section>
              )}
              {status && (
                <p className="form-status studio-status" role="status">
                  {status}
                </p>
              )}
              {pendingSubmission && (
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    const current = pendingSubmission;
                    const delivered = await deliverQuoteEmail(current);
                    setStatus(
                      delivered
                        ? pick({
                            en: `Email delivery confirmed for ${current.quote.quote_number}.`,
                            ar: `تم تأكيد إرسال البريد للطلب ${current.quote.quote_number}.`,
                          })
                        : pick({
                            en: `Request ${current.quote.quote_number} remains saved. Email will be retried automatically.`,
                            ar: `الطلب ${current.quote.quote_number} ما زال محفوظًا. ستتم إعادة محاولة البريد تلقائيًا.`,
                          }),
                    );
                    setBusy(false);
                  }}
                >
                  {pick({ en: 'Retry email notification', ar: 'إعادة محاولة إشعار البريد' })}
                </button>
              )}
            </div>

            <aside className="studio-preview-column">
              <StudioStage design={design} preflight={productionPreflight} />
              <div className="studio-contract-card">
                <div>
                  <span>{pick({ en: 'Minimum', ar: 'الحد الأدنى' })}</span>
                  <strong>{selected.minimum}</strong>
                </div>
                <div>
                  <span>{pick({ en: 'Your quantity', ar: 'كميتك' })}</span>
                  <strong className={quantityShortfall ? 'invalid-text' : ''}>
                    {design.quantity}
                  </strong>
                </div>
                <div>
                  <span>{pick({ en: 'Production', ar: 'التصنيع' })}</span>
                  <strong>30–60 {pick({ en: 'days', ar: 'يومًا' })}</strong>
                </div>
                <div>
                  <span>{pick({ en: 'Terms', ar: 'الشروط' })}</span>
                  <strong>50% / 50%</strong>
                </div>
              </div>
              {selected.madeInUSA && (
                <p className="made-in-usa-note">
                  {pick({
                    en: 'Shababuna custom apparel · Made in the USA',
                    ar: 'ملابس شبابنا المخصصة · صُنعت في الولايات المتحدة',
                  })}
                </p>
              )}
              <Link to="/teams-wholesale" className="inline-link">
                {pick({ en: 'Teams & Wholesale workspace', ar: 'منصة الأندية والجملة' })} →
              </Link>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}

import { Link } from 'react-router-dom';
import Seo from '../components/common/Seo';
import Chapter from '../components/experience/Chapter';
import SpecBlock from '../components/experience/SpecBlock';
import Stamp from '../components/experience/Stamp';
import { useDeviceCapability } from '../hooks/useDeviceCapability';
import { useLanguage } from '../context/LanguageContext';
import { SITE } from '../config';
import { shippingConfig } from '../config/shipping';
import { categories } from '../data/categories';
import { CUSTOM_PRODUCT_TYPES } from '../data/customization';
// The shared GROUNDWORK layers are global from Phase 2 onward (main.jsx).
// Only this prototype's own composition ships in the lazy route chunk.
import '../styles/lab-home.css';

/*
 * GROUNDWORK «خَطّ الأرض» — isolated homepage prototype.
 *
 * This route exists to review one creative direction in a real browser. It is
 * additive and reversible: it does not replace `/`, it is `noindex`, it is
 * disallowed in robots.txt, and it is absent from the pre-render route list.
 *
 * Every figure on this page is read from the repository — `config/shipping.js`,
 * `data/categories.js`, `data/customization.js` and `config.js`. Nothing is
 * invented: no product, price, stock level, athlete, partnership, claim or
 * delivery promise appears here that the codebase does not already assert.
 */

const libya = shippingConfig.libya;

const DEPARTMENTS = categories.filter((category) => category.slug !== 'ready-to-ship');

const ZONE_LABELS = {
  clothing: { en: 'The key', ar: 'منطقة الرمية' },
  footwear: { en: 'The baseline', ar: 'خط القاعدة' },
  accessories: { en: 'The corner', ar: 'الزاوية' },
  basketballs: { en: 'The centre circle', ar: 'دائرة المنتصف' },
  equipment: { en: 'The arc', ar: 'القوس' },
};

const minimumFor = (key) => CUSTOM_PRODUCT_TYPES.find((type) => type.key === key).minimum;

/**
 * A numeric range inside prose.
 *
 * Without isolation the Unicode bidi algorithm reorders `24–72` to `72–24`
 * inside an Arabic paragraph, because the en dash is a neutral character
 * between two LTR digit runs. That turns a delivery promise into a different
 * delivery promise, so every range is isolated — the same discipline
 * `services/money.js` already applies to currency.
 */
function Range({ from, to, unit }) {
  return (
    <>
      <span className="gw-isolate-ltr">
        {from}–{to}
      </span>{' '}
      {unit}
    </>
  );
}

/** A minimum-order figure inside prose, isolated for the same reason as `Range`. */
function Minimum({ count, unit }) {
  return (
    <>
      <span className="gw-isolate-ltr">{count}</span> {unit}
    </>
  );
}

function CourtPlan() {
  return (
    <div className="gw-court" aria-hidden="true">
      <svg
        className="gw-court-svg"
        viewBox="0 0 1500 1400"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        vectorEffect="non-scaling-stroke"
      >
        {/* Half court drawn to FIBA dimensions in centimetres: 15.00 m wide,
            key 4.90 x 5.80 m, three-point radius 6.75 m, circles 3.60 m. */}
        <rect x="1.5" y="1.5" width="1497" height="1397" />
        <rect x="505" y="0" width="490" height="580" />
        <circle cx="750" cy="580" r="180" />
        <circle cx="750" cy="157.5" r="22" />
        <path d="M 630 90 H 870" />
        <path d="M 90 0 V 299" />
        <path d="M 1410 0 V 299" />
        <path d="M 90 299 A 675 675 0 0 0 1410 299" />
        <path d="M 625 157.5 A 125 125 0 0 0 875 157.5" />
        <circle cx="750" cy="1400" r="180" />
      </svg>
    </div>
  );
}

export default function LabHomePage() {
  const { pick } = useLanguage();
  const capability = useDeviceCapability();

  const deliverySpec = [
    {
      label: pick({ en: 'Ready to Ship · Libya', ar: 'تسليم فوري · ليبيا' }),
      value: (
        <Range
          from={libya.readyDelivery.minHours}
          to={libya.readyDelivery.maxHours}
          unit={pick({ en: 'hours', ar: 'ساعة' })}
        />
      ),
    },
    {
      label: pick({ en: 'Standard · Libya', ar: 'عادي · ليبيا' }),
      value: (
        <Range
          from={libya.standardDelivery.minDays}
          to={libya.standardDelivery.maxDays}
          unit={pick({ en: 'days', ar: 'يومًا' })}
        />
      ),
    },
    {
      label: pick({ en: 'Custom & wholesale', ar: 'مخصص وجملة' }),
      value: (
        <Range
          from={shippingConfig.custom.minDays}
          to={shippingConfig.custom.maxDays}
          unit={pick({ en: 'days', ar: 'يومًا' })}
        />
      ),
    },
    {
      label: pick({ en: 'Libya delivery fee', ar: 'رسوم التوصيل داخل ليبيا' }),
      value: <span className="gw-isolate-ltr">{libya.deliveryFee.amount} LYD</span>,
    },
    {
      label: pick({ en: 'Free delivery from', ar: 'توصيل مجاني ابتداءً من' }),
      value: <span className="gw-isolate-ltr">{libya.freeThreshold.amount} LYD</span>,
    },
  ];

  const teamSpec = [
    {
      label: pick({ en: 'Before production', ar: 'قبل التصنيع' }),
      value: <span className="gw-figure">50%</span>,
    },
    {
      label: pick({ en: 'When goods arrive', ar: 'عند وصول البضاعة' }),
      value: <span className="gw-figure">50%</span>,
    },
    {
      label: pick({ en: 'Production estimate', ar: 'المدة التقديرية للتصنيع' }),
      value: (
        <span className="gw-figure gw-isolate-ltr">
          {shippingConfig.custom.minDays}–{shippingConfig.custom.maxDays}
        </span>
      ),
    },
    {
      label: pick({ en: 'Shipping', ar: 'الشحن' }),
      value: pick({ en: 'Worldwide, quoted per destination', ar: 'عالمي، بسعر لكل وجهة' }),
    },
  ];

  const customSpec = [
    {
      label: pick({ en: 'Custom apparel', ar: 'الملابس المخصصة' }),
      value: <Minimum count={minimumFor('game-set')} unit={pick({ en: 'pieces', ar: 'قطع' })} />,
    },
    {
      label: pick({ en: 'Custom basketballs', ar: 'الكرات المخصصة' }),
      value: <Minimum count={minimumFor('basketball')} unit={pick({ en: 'balls', ar: 'كرات' })} />,
    },
    {
      label: pick({ en: 'Hoop padding', ar: 'تغليف السلة' }),
      value: <Minimum count={minimumFor('hoop-padding')} unit={pick({ en: 'unit', ar: 'وحدة' })} />,
    },
    {
      label: pick({ en: 'Product types', ar: 'أنواع المنتجات' }),
      value: <span className="gw-figure gw-isolate-ltr">{CUSTOM_PRODUCT_TYPES.length}</span>,
    },
  ];

  return (
    <div className="lab-scope" data-prototype="groundwork" data-capability-observed={capability}>
      <Seo
        title={pick({ en: 'GROUNDWORK prototype', ar: 'نموذج خَطّ الأرض' })}
        description="Isolated design-direction prototype. Not a public page."
        path="/lab/home"
        noindex
      />

      {/* 00 · THRESHOLD — the entire loading experience is one drawn line. */}
      <hr className="gw-threshold-rule" />

      {/* 01 · THE LINE */}
      <section className="gw-section gw-hero" aria-labelledby="gw-hero-title">
        <CourtPlan />
        <div className="gw-container gw-hero-inner">
          <div className="gw-stack gw-stack--loose">
            <p className="gw-spec">
              {pick({ en: 'Shababuna · Basketball supply', ar: 'شبابنا · تجهيز كرة السلة' })}
            </p>
            <h1 id="gw-hero-title" className="gw-hero-title">
              <span className="gw-hero-line">BUILT</span>
              <span className="gw-hero-line gw-hero-line--outline">DIFFERENT.</span>
            </h1>
            <p className="gw-lead">
              {pick({
                en: 'Basketball retail, custom manufacturing, club supply and wholesale — built in one global platform.',
                ar: 'متجر كرة سلة وتصنيع مخصص وتجهيز أندية وجملة — ضمن منصة عالمية واحدة.',
              })}
            </p>
            <div className="gw-cluster">
              <Link className="gw-btn gw-btn--primary" to="/shop">
                {pick({ en: 'Shop', ar: 'تسوّق' })}
              </Link>
              <Link className="gw-btn gw-btn--secondary" to="/customize">
                {pick({ en: 'Customize', ar: 'صمّم' })}
              </Link>
              <Link className="gw-btn gw-btn--ghost" to="/teams-wholesale">
                {pick({ en: 'Teams & Wholesale', ar: 'الأندية والجملة' })}
              </Link>
            </div>
            <p className="gw-leader gw-leader--start gw-spec">
              <span>{pick(SITE.address)}</span>
            </p>
          </div>
        </div>
      </section>

      {/* 02 · THE MEASURE — first dark chapter, bounded by a drawn rule. */}
      <section
        className="gw-chapter gw-chapter--strip"
        aria-label={pick({ en: 'What Shababuna does', ar: 'ما تقوم به شبابنا' })}
      >
        <div className="gw-container gw-measure-strip">
          <p className="gw-title">
            {pick({ en: 'Basketball, without compromise.', ar: 'كرة السلة، بدون تنازلات.' })}
          </p>
          <ul className="gw-measure-terms">
            {['Retail', 'Custom', 'Teams', 'Wholesale'].map((term) => (
              <li key={term} className="gw-spec">
                {term}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 03 · THE PLAN — departments laid out as zones of the court. */}
      <section className="gw-section" aria-labelledby="gw-plan-title">
        <div className="gw-container gw-stack gw-stack--loose">
          <div className="gw-stack gw-stack--tight">
            <p className="gw-spec">{pick({ en: 'Shop', ar: 'المتجر' })}</p>
            <h2 id="gw-plan-title" className="gw-display">
              {pick({ en: 'Everything basketball needs', ar: 'كل ما تحتاجه كرة السلة' })}
            </h2>
          </div>
          <div className="gw-plates gw-department-plates gw-stagger">
            {DEPARTMENTS.map((department) => (
              <Link
                key={department.slug}
                to={`/shop/${department.slug}`}
                className="gw-plate gw-registered gw-scaled gw-extends gw-department"
              >
                <span className="gw-spec">{pick(ZONE_LABELS[department.slug])}</span>
                <img
                  className="gw-media gw-media--square"
                  src={department.image}
                  alt=""
                  width="480"
                  height="480"
                  loading="lazy"
                  decoding="async"
                />
                <span className="gw-title gw-department-name">{pick(department.name)}</span>
                <span className="gw-spec gw-department-count">
                  {pick({
                    en: `${department.subcategories.length} categories`,
                    ar: `${department.subcategories.length} فئة`,
                  })}
                </span>
                <span className="gw-rule-extend" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 04 · IN STOCK — the Libya delivery specification, stated honestly. */}
      <section className="gw-section gw-section--inset" aria-labelledby="gw-stock-title">
        <div className="gw-container gw-split gw-measure">
          <div className="gw-stack gw-stack--loose">
            <Stamp tone="verified">
              {pick({ en: 'Verified stock only', ar: 'مخزون موثّق فقط' })}
            </Stamp>
            <h2 id="gw-stock-title" className="gw-display">
              {pick({ en: 'Ready to Ship', ar: 'تسليم فوري' })}
            </h2>
            <p className="gw-body">
              {pick({
                en: 'The green mark is applied only to inventory physically verified inside Libya. Until a product is verified it is sold on the standard delivery profile, never on the ready one.',
                ar: 'تُمنح العلامة الخضراء فقط للمخزون الموجود فعليًا داخل ليبيا. وحتى يتم توثيق المنتج يُباع وفق مدة التوصيل العادية، لا الفورية.',
              })}
            </p>
            <Link className="gw-btn gw-btn--secondary" to="/shop">
              {pick({ en: 'Browse the shop', ar: 'تصفّح المتجر' })}
            </Link>
          </div>
          <div className="gw-plate gw-registered">
            <SpecBlock
              caption={pick({ en: 'Delivery specification', ar: 'مواصفات التوصيل' })}
              captionVisible
              rows={deliverySpec}
            />
          </div>
        </div>
      </section>

      {/* 05 · THE WORKSHOP — Customize, drawn as a tech pack. */}
      <section className="gw-section" aria-labelledby="gw-workshop-title">
        <div className="gw-container gw-split">
          <div className="gw-plate gw-plate--field gw-registered gw-workshop-plate">
            <p className="gw-spec">{pick({ en: 'Production drawing', ar: 'رسم الإنتاج' })}</p>
            <img
              className="gw-media gw-media--square gw-workshop-art"
              src="/images/catalog/jersey.svg"
              alt={pick({ en: 'Shababuna custom jersey drawing', ar: 'رسم سيريا شبابنا المخصصة' })}
              width="480"
              height="480"
              loading="lazy"
              decoding="async"
            />
            <p className="gw-leader gw-spec">
              <span>{pick({ en: 'Front · Back · Side', ar: 'أمام · خلف · جانب' })}</span>
            </p>
          </div>
          <div className="gw-stack gw-stack--loose">
            <p className="gw-spec">{pick({ en: 'Customize', ar: 'التصميم المخصص' })}</p>
            <h2 id="gw-workshop-title" className="gw-display">
              {pick({ en: 'Design everything.', ar: 'صمّم كل شيء.' })}
            </h2>
            <p className="gw-body">
              {pick({
                en: 'Game uniforms, practice wear, hoodies, pants, bags, sleeves, basketballs and branded equipment — specified, proofed and produced.',
                ar: 'أطقم لعب وتمرين وهوديز وسراويل وحقائب وسليفس وكرات ومعدات بشعارك — بمواصفات وبروفة وتصنيع.',
              })}
            </p>
            <SpecBlock
              caption={pick({ en: 'Minimum order', ar: 'الحد الأدنى للطلب' })}
              rows={customSpec}
            />
            <Link className="gw-btn gw-btn--primary" to="/customize">
              {pick({ en: 'Open Design Studio', ar: 'افتح استوديو التصميم' })}
            </Link>
          </div>
        </div>
      </section>

      {/* 06 · THE ROSTER — second dark chapter. */}
      <Chapter
        label={pick({ en: 'Teams & Wholesale', ar: 'الأندية والجملة' })}
        title={pick({ en: 'One order. The whole organization.', ar: 'طلب واحد. المؤسسة كاملة.' })}
      >
        <p className="gw-body">
          {pick({
            en: 'Uniforms, staff wear, travel, bags, basketballs and equipment — with design approval, staged payment and production tracking.',
            ar: 'أطقم وملابس طاقم وسفر وحقائب وكرات ومعدات — مع اعتماد التصميم والدفع المرحلي وتتبع التصنيع.',
          })}
        </p>
        <SpecBlock
          caption={pick({ en: 'Commercial terms', ar: 'الشروط التجارية' })}
          captionVisible
          rows={teamSpec}
        />
        <Link className="gw-btn gw-btn--primary" to="/teams-wholesale">
          {pick({ en: 'Build a team order', ar: 'جهّز طلب فريق' })}
        </Link>
      </Chapter>

      {/* 07 · THE SIGN-OFF */}
      <section className="gw-section gw-section--tight" aria-labelledby="gw-signoff-title">
        <div className="gw-container gw-stack gw-stack--tight">
          <div className="gw-tick-rule" />
          <h2 id="gw-signoff-title" className="gw-spec">
            {pick({ en: 'Prototype · not a public page', ar: 'نموذج · ليست صفحة عامة' })}
          </h2>
          <p className="gw-body">
            {pick({
              en: 'GROUNDWORK design-direction prototype. The live homepage is unchanged. Every figure shown here is read from the repository, and no product, price, stock level or delivery promise has been invented.',
              ar: 'نموذج اتجاه تصميم «خَطّ الأرض». الصفحة الرئيسية الحالية لم تتغيّر. كل رقم معروض هنا مأخوذ من الكود، ولم يتم اختلاق أي منتج أو سعر أو مخزون أو وعد تسليم.',
            })}
          </p>
          <p className="gw-spec">
            {SITE.shortName} · {SITE.slogan.en}
          </p>
        </div>
      </section>
    </div>
  );
}

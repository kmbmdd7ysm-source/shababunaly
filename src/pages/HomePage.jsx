import { Link } from 'react-router-dom';
import Seo from '../components/common/Seo';
import CinematicHero from '../components/experience/CinematicHero';
import Chapter from '../components/experience/Chapter';
import SpecBlock from '../components/experience/SpecBlock';
import Stamp from '../components/experience/Stamp';
import ProductCard from '../components/shop/ProductCard';
import { useLanguage } from '../context/LanguageContext';
import { useCommerce } from '../context/CommerceContext';
import { SITE } from '../config';
import { shippingConfig } from '../config/shipping';
import { useCatalog } from '../context/CatalogContext';
import { CUSTOM_PRODUCT_TYPES } from '../data/customization';
import '../styles/home.css';

/*
 * GROUNDWORK «خَطّ الأرض» — the production homepage.
 *
 * Every figure on this page is read from the repository: `config/shipping.js`,
 * `data/customization.js`, `config.js` and the live catalogue. No product,
 * price, stock level, athlete, partnership, claim or delivery promise is
 * invented here.
 *
 * Every commercial destination from the previous homepage is preserved:
 * /shop, the five departments, /shop/ready-to-ship, /customize,
 * /teams-wholesale, /shop/footwear, /shop?brand=Shababuna and /lha-store.
 */

const libya = shippingConfig.libya;

const DEPARTMENTS = [
  {
    to: '/shop/clothing',
    image: '/images/catalog/apparel.svg',
    zone: { en: 'The key', ar: 'منطقة الرمية' },
    title: { en: 'Clothing', ar: 'الملابس' },
    copy: {
      en: 'Gamewear, training, lifestyle and performance.',
      ar: 'ملابس اللعب والتمرين واللايف ستايل والأداء.',
    },
  },
  {
    to: '/shop/footwear',
    image: '/images/catalog/shoe.svg',
    zone: { en: 'The baseline', ar: 'خط القاعدة' },
    title: { en: 'Footwear', ar: 'الأحذية' },
    copy: {
      en: 'In-court and off-court basketball footwear.',
      ar: 'أحذية كرة السلة داخل الملعب وخارجه.',
    },
  },
  {
    to: '/shop/accessories',
    image: '/images/catalog/accessories.svg',
    zone: { en: 'The corner', ar: 'الزاوية' },
    title: { en: 'Accessories', ar: 'الإكسسوارات' },
    copy: {
      en: 'Bags, sleeves, supports and training essentials.',
      ar: 'حقائب وسليفس ودعامات وأساسيات التدريب.',
    },
  },
  {
    to: '/shop/basketballs',
    image: '/images/catalog/ball.svg',
    zone: { en: 'The centre circle', ar: 'دائرة المنتصف' },
    title: { en: 'Basketballs', ar: 'كرات السلة' },
    copy: {
      en: 'Retail by the piece and wholesale from six.',
      ar: 'بالقطعة وبالجملة ابتداءً من ست كرات.',
    },
  },
  {
    to: '/shop/equipment',
    image: '/images/catalog/equipment.svg',
    zone: { en: 'The arc', ar: 'القوس' },
    title: { en: 'Equipment', ar: 'المعدات' },
    copy: {
      en: 'Hoops, backboards, shot clocks and court supply.',
      ar: 'سلات وبوردات وساعات 24 ثانية وتجهيز ملاعب.',
    },
  },
];

const minimumFor = (key) => CUSTOM_PRODUCT_TYPES.find((type) => type.key === key).minimum;

/** A numeric range, bidi-isolated so `24–72` can never render as `72–24` in Arabic. */
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

/** A minimum-order figure, isolated for the same reason. */
function Minimum({ count, unit }) {
  return (
    <>
      <span className="gw-isolate-ltr">{count}</span> {unit}
    </>
  );
}

function SectionHead({ label, title, id, to, linkLabel }) {
  return (
    <div className="gw-section-head">
      <div className="gw-stack gw-stack--tight">
        <p className="gw-spec">{label}</p>
        <h2 id={id} className="gw-display">
          {title}
        </h2>
      </div>
      <Link className="gw-btn gw-btn--ghost gw-extends" to={to}>
        {linkLabel}
        <span className="gw-rule-extend" aria-hidden="true" />
      </Link>
    </div>
  );
}

export default function HomePage() {
  const { pick } = useLanguage();
  const { countryCode } = useCommerce();
  const { products, readyToShipProducts, featuredProducts } = useCatalog();
  const isLibya = countryCode === 'LY';
  const ready = readyToShipProducts().slice(0, 4);
  const featured = featuredProducts().slice(0, 4);
  const shoes = products.filter((product) => product.category === 'footwear').slice(0, 4);

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
      label: pick({ en: 'Libya delivery fee', ar: 'رسوم التوصيل داخل ليبيا' }),
      value: <span className="gw-isolate-ltr">{libya.deliveryFee.amount} LYD</span>,
    },
    {
      label: pick({ en: 'Free delivery from', ar: 'توصيل مجاني ابتداءً من' }),
      value: <span className="gw-isolate-ltr">{libya.freeThreshold.amount} LYD</span>,
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

  const teamSpec = [
    {
      label: pick({ en: 'Before production', ar: 'قبل التصنيع' }),
      value: <span className="gw-figure gw-isolate-ltr">50%</span>,
    },
    {
      label: pick({ en: 'When goods arrive', ar: 'عند وصول البضاعة' }),
      value: <span className="gw-figure gw-isolate-ltr">50%</span>,
    },
    {
      label: pick({ en: 'Production estimate', ar: 'المدة التقديرية للتصنيع' }),
      value: (
        <Range
          from={shippingConfig.custom.minDays}
          to={shippingConfig.custom.maxDays}
          unit={pick({ en: 'days', ar: 'يومًا' })}
        />
      ),
    },
    {
      label: pick({ en: 'Shipping', ar: 'الشحن' }),
      value: pick({ en: 'Worldwide, quoted per destination', ar: 'شحن عالمي، بسعر لكل وجهة' }),
    },
  ];

  return (
    <>
      <Seo
        title={`${SITE.name} — ${SITE.slogan.en}`}
        description="Premium basketball retail, custom manufacturing, team supply and wholesale from Libya to the world."
        path="/"
      />

      <CinematicHero />

      {/* THE MEASURE — first dark chapter, bounded by a drawn rule. */}
      <section
        className="gw-chapter gw-chapter--strip"
        aria-label={pick({ en: 'What Shababuna does', ar: 'ما تقوم به شبابنا' })}
      >
        <div className="gw-container gw-measure-strip">
          <p className="gw-title gw-measure-claim">
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

      {/* THE PLAN — five departments as five zones of the court. */}
      <section id="gw-departments" className="gw-section" aria-labelledby="gw-plan-title">
        <div className="gw-container gw-stack gw-stack--loose">
          <SectionHead
            id="gw-plan-title"
            label={pick({ en: 'Shop', ar: 'المتجر' })}
            title={pick({ en: 'Everything basketball needs', ar: 'كل ما تحتاجه كرة السلة' })}
            to="/shop"
            linkLabel={pick({ en: 'Shop all', ar: 'تسوّق الكل' })}
          />
          <div className="gw-plates gw-department-plates gw-stagger">
            {DEPARTMENTS.map((department) => (
              <Link
                key={department.to}
                to={department.to}
                className="gw-plate gw-registered gw-scaled gw-extends gw-department"
              >
                <span className="gw-spec">{pick(department.zone)}</span>
                <img
                  className="gw-media gw-media--square"
                  src={department.image}
                  alt=""
                  width="480"
                  height="480"
                  loading="lazy"
                  decoding="async"
                />
                <span className="gw-title gw-department-name">{pick(department.title)}</span>
                <span className="gw-body gw-department-copy">{pick(department.copy)}</span>
                <span className="gw-rule-extend" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* IN STOCK — Libya only, exactly as before. */}
      {isLibya && ready.length > 0 && (
        <section className="gw-section gw-section--inset" aria-labelledby="gw-ready-title">
          <div className="gw-container gw-stack gw-stack--loose">
            <SectionHead
              id="gw-ready-title"
              label={pick({ en: 'Libya only', ar: 'داخل ليبيا' })}
              title={pick({ en: 'Ready to Ship', ar: 'تسليم فوري' })}
              to="/shop/ready-to-ship"
              linkLabel={pick({ en: 'View all', ar: 'عرض الكل' })}
            />
            <Stamp tone="verified">
              {pick({ en: 'Verified stock in Libya', ar: 'مخزون موثّق داخل ليبيا' })}
            </Stamp>
            <div className="gw-ready-grid">
              <div className="product-grid product-grid--airy">
                {ready.map((product, index) => (
                  <ProductCard key={product.id} product={product} eager={index < 2} />
                ))}
              </div>
              <div className="gw-plate gw-registered">
                <SpecBlock
                  caption={pick({ en: 'Delivery specification', ar: 'مواصفات التوصيل' })}
                  captionVisible
                  rows={deliverySpec}
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* THE WORKSHOP — Customize, drawn as a tech pack. */}
      <section className="gw-section" aria-labelledby="gw-workshop-title">
        <div className="gw-container gw-split">
          <div className="gw-plate gw-plate--field gw-registered gw-workshop-plate">
            <p className="gw-spec">{pick({ en: 'Production drawing', ar: 'رسم الإنتاج' })}</p>
            <img
              className="gw-media gw-media--square gw-workshop-art"
              src="/images/catalog/jersey.svg"
              alt={pick({
                en: 'Shababuna custom jersey production drawing',
                ar: 'رسم إنتاج سيريا شبابنا المخصصة',
              })}
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

      {/* THE ROSTER — second dark chapter. */}
      <Chapter
        label={pick({ en: 'Teams & Wholesale', ar: 'الأندية والجملة' })}
        title={pick({
          en: 'One order. The whole organization.',
          ar: 'طلب واحد. المؤسسة كاملة.',
        })}
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

      {/* FOOTWEAR — in-court above the sideline, off-court below. */}
      {shoes.length > 0 && (
        <section className="gw-section" aria-labelledby="gw-footwear-title">
          <div className="gw-container gw-stack gw-stack--loose">
            <SectionHead
              id="gw-footwear-title"
              label={pick({ en: 'Footwear', ar: 'الأحذية' })}
              title={pick({ en: 'In-court. Off-court.', ar: 'داخل الملعب. خارجه.' })}
              to="/shop/footwear"
              linkLabel={pick({ en: 'Shop footwear', ar: 'تسوّق الأحذية' })}
            />
            <div className="product-grid product-grid--airy">
              {shoes.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* SHABABUNA-BUILT — the manufacturer's own line, on maple ground. */}
      {featured.length > 0 && (
        <section className="gw-section gw-section--maple" aria-labelledby="gw-built-title">
          <div className="gw-container gw-stack gw-stack--loose">
            <SectionHead
              id="gw-built-title"
              label="Shababuna"
              title={pick({ en: 'Built Different products', ar: 'منتجات BUILT DIFFERENT' })}
              to="/shop?brand=Shababuna"
              linkLabel={pick({ en: 'Shop Shababuna', ar: 'تسوّق شبابنا' })}
            />
            <div className="product-grid product-grid--airy">
              {featured.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* LHA — a licensed partner section, framed by a drawn rule. */}
      <section className="gw-chapter gw-lha-band" aria-labelledby="gw-lha-title">
        <div className="gw-container gw-lha-inner">
          <img
            className="gw-lha-mark"
            src="/brand/lha-wordmark-white.svg"
            alt="Libya Hoops Academy"
            width="320"
            height="96"
            loading="lazy"
            decoding="async"
          />
          <div className="gw-stack gw-stack--tight">
            <p className="gw-spec">{pick({ en: 'Official LHA store', ar: 'متجر LHA الرسمي' })}</p>
            <h2 id="gw-lha-title" className="gw-title">
              {pick({
                en: 'All LHA clothing and accessories.',
                ar: 'جميع ملابس وإكسسوارات LHA.',
              })}
            </h2>
            <p className="gw-body">
              {pick({
                en: 'Same products and prices, inside the Shababuna account, cart and delivery system.',
                ar: 'نفس المنتجات والأسعار داخل حساب وسلة ونظام توصيل شبابنا.',
              })}
            </p>
          </div>
          <Link className="gw-btn gw-btn--primary" to="/lha-store">
            {pick({ en: 'Enter LHA Store', ar: 'ادخل متجر LHA' })}
          </Link>
        </div>
      </section>
    </>
  );
}

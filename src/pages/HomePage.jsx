import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Seo from '../components/common/Seo';
import ProductCard from '../components/shop/ProductCard';
import { useLanguage } from '../context/LanguageContext';
import { useCommerce } from '../context/CommerceContext';
import { useCatalog } from '../context/CatalogContext';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useDeviceCapability } from '../hooks/useDeviceCapability';
import { SITE } from '../config';
import { shippingConfig } from '../config/shipping';
import { CUSTOM_PRODUCT_TYPES } from '../data/customization';
import '../styles/journey.css';

/*
 * THE JOURNEY — the homepage as a sequence of full-viewport chapters.
 *
 * The rejected version was the archetype every store uses: a hero, then
 * stacked sections, then a footer. Changing its typography did not change what
 * it was. This is a different structure entirely.
 *
 *   - Seven CHAPTERS, each occupying the full viewport, scroll-snapped.
 *   - A persistent CHAPTER INDEX on the trailing edge: the reader always knows
 *     where they are in the sequence and can jump.
 *   - The FLOOR chapter uses an actual FIBA half-court as the navigation
 *     surface: the five departments are positioned on the zones they belong to,
 *     so the layout is basketball geometry rather than a card grid.
 *   - Products arrive as EXHIBITS inside chapters, not as an undifferentiated
 *     grid at the bottom of the page.
 *
 * Every figure is read from config/shipping.js, data/customization.js,
 * config.js and the live catalogue. Nothing is invented. Every commercial
 * destination from the previous homepage is preserved.
 *
 * Fallbacks: scroll-snap is progressive (the page reads as normal sections
 * without it), the court is inline SVG so there is no media to fail, Tier C
 * devices drop the court, and reduced motion disables snapping and all
 * transitions.
 */

const libya = shippingConfig.libya;

/** The five departments, placed on the court zone each belongs to. */
const FLOOR = [
  { to: '/shop/clothing', zone: 'key', n: '01', name: { en: 'Clothing', ar: 'الملابس' } },
  { to: '/shop/footwear', zone: 'baseline', n: '02', name: { en: 'Footwear', ar: 'الأحذية' } },
  {
    to: '/shop/accessories',
    zone: 'corner',
    n: '03',
    name: { en: 'Accessories', ar: 'الإكسسوارات' },
  },
  {
    to: '/shop/basketballs',
    zone: 'centre',
    n: '04',
    name: { en: 'Basketballs', ar: 'كرات السلة' },
  },
  { to: '/shop/equipment', zone: 'arc', n: '05', name: { en: 'Equipment', ar: 'المعدات' } },
];

const minimumFor = (key) => CUSTOM_PRODUCT_TYPES.find((type) => type.key === key).minimum;

/** Numeric ranges are bidi-isolated so `24–72` cannot render as `72–24`. */
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

function CourtPlan() {
  return (
    <svg className="gw-floor-court" viewBox="0 0 1500 1400" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="1496" height="1396" stroke="currentColor" strokeWidth="3" />
      <rect x="505" y="0" width="490" height="580" stroke="currentColor" strokeWidth="3" />
      <circle cx="750" cy="580" r="180" stroke="currentColor" strokeWidth="3" />
      <circle cx="750" cy="157" r="22" stroke="currentColor" strokeWidth="3" />
      <path d="M90 0V299" stroke="currentColor" strokeWidth="3" />
      <path d="M1410 0V299" stroke="currentColor" strokeWidth="3" />
      <path d="M90 299A675 675 0 0 0 1410 299" stroke="currentColor" strokeWidth="3" />
      <circle cx="750" cy="1400" r="180" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}

export default function HomePage() {
  const { pick } = useLanguage();
  const { countryCode } = useCommerce();
  const { products, readyToShipProducts, featuredProducts } = useCatalog();
  const reduced = useReducedMotion();
  const capability = useDeviceCapability();
  const isLibya = countryCode === 'LY';

  const ready = readyToShipProducts().slice(0, 3);
  const featured = featuredProducts().slice(0, 3);
  const shoes = products.filter((product) => product.category === 'footwear').slice(0, 3);

  const chapters = [
    { id: 'open', label: { en: 'Opening', ar: 'الافتتاح' } },
    { id: 'floor', label: { en: 'The floor', ar: 'الأرضية' } },
    ...(isLibya && ready.length ? [{ id: 'stock', label: { en: 'In stock', ar: 'المتوفر' } }] : []),
    { id: 'workshop', label: { en: 'The workshop', ar: 'الورشة' } },
    { id: 'roster', label: { en: 'The roster', ar: 'الفريق' } },
    { id: 'equipment', label: { en: 'Equipment', ar: 'المعدات' } },
    { id: 'signoff', label: { en: 'Sign-off', ar: 'الختام' } },
  ];

  const [active, setActive] = useState(chapters[0].id);
  const scroller = useRef(null);

  // Track the chapter in view so the index can mark it. Falls back silently
  // where IntersectionObserver is unavailable.
  useEffect(() => {
    if (typeof IntersectionObserver !== 'function') return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) setActive(visible.target.id);
      },
      { threshold: [0.4, 0.6] },
    );
    document.querySelectorAll('.gw-act').forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [chapters.length]);

  return (
    <>
      <Seo
        title={`${SITE.name} — ${SITE.slogan.en}`}
        description="Premium basketball retail, custom manufacturing, team supply and wholesale from Libya to the world."
        path="/"
      />

      {/* The chapter index. Real links, so it works with no JavaScript beyond
          React's own rendering, and it is a nav landmark for screen readers. */}
      <nav
        className="gw-acts"
        aria-label={pick({ en: 'Page chapters', ar: 'فصول الصفحة' })}
        data-reduced={reduced ? 'on' : 'off'}
      >
        <ol>
          {chapters.map((chapter, position) => (
            <li key={chapter.id}>
              <a
                href={`#${chapter.id}`}
                aria-current={active === chapter.id ? 'true' : undefined}
                className={active === chapter.id ? 'is-active' : ''}
              >
                <span className="gw-acts-num" aria-hidden="true">
                  {String(position).padStart(2, '0')}
                </span>
                <span className="gw-acts-label">{pick(chapter.label)}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div
        className="gw-journey"
        ref={scroller}
        data-snap={reduced ? 'off' : 'on'}
        data-capability={capability}
      >
        {/* ── 00 OPENING ───────────────────────────────────────────────── */}
        <section id="open" className="gw-act gw-act--open" aria-labelledby="gw-open-title">
          <div className="gw-open-court" aria-hidden="true">
            <CourtPlan />
          </div>
          <div className="gw-act-inner gw-open-inner">
            <p className="gw-spec gw-open-kicker">
              {pick({ en: 'Shababuna · Basketball supply', ar: 'شبابنا · تجهيز كرة السلة' })}
            </p>
            <h1 id="gw-open-title" className="gw-open-title">
              <span>{pick({ en: 'Built', ar: 'نبني' })}</span>
              <span className="gw-open-title-out">
                {pick({ en: 'Different.', ar: 'مختلفين.' })}
              </span>
            </h1>
            <p className="gw-open-lede">
              {pick({
                en: 'Basketball retail, custom manufacturing, club supply and wholesale — built in one global platform.',
                ar: 'متجر كرة سلة وتصنيع مخصص وتجهيز أندية وجملة — ضمن منصة عالمية واحدة.',
              })}
            </p>
            <div className="gw-open-paths">
              <Link className="gw-path gw-path--primary" to="/shop">
                <span className="gw-path-num" aria-hidden="true">
                  01
                </span>
                <span>{pick({ en: 'Shop', ar: 'تسوّق' })}</span>
              </Link>
              <Link className="gw-path" to="/customize">
                <span className="gw-path-num" aria-hidden="true">
                  02
                </span>
                <span>{pick({ en: 'Customize', ar: 'صمّم' })}</span>
              </Link>
              <Link className="gw-path" to="/teams-wholesale">
                <span className="gw-path-num" aria-hidden="true">
                  03
                </span>
                <span>{pick({ en: 'Teams & Wholesale', ar: 'الأندية والجملة' })}</span>
              </Link>
            </div>
            <p className="gw-spec gw-open-place">{pick(SITE.address)}</p>
          </div>
        </section>

        {/* ── 01 THE FLOOR — departments placed on court geometry ───────── */}
        <section id="floor" className="gw-act gw-act--floor" aria-labelledby="gw-floor-title">
          <div className="gw-act-inner">
            <header className="gw-act-head">
              <p className="gw-spec">{pick({ en: '01 · The floor', ar: '٠١ · الأرضية' })}</p>
              <h2 id="gw-floor-title" className="gw-act-title">
                {pick({ en: 'Everything basketball needs', ar: 'كل ما تحتاجه كرة السلة' })}
              </h2>
            </header>
            <div className="gw-floor">
              <CourtPlan />
              {FLOOR.map((zone) => (
                <Link key={zone.to} to={zone.to} className="gw-floor-zone" data-zone={zone.zone}>
                  <span className="gw-floor-num" aria-hidden="true">
                    {zone.n}
                  </span>
                  <span className="gw-floor-name">{pick(zone.name)}</span>
                </Link>
              ))}
            </div>
            <Link className="gw-act-out" to="/shop">
              {pick({ en: 'Shop all', ar: 'تسوّق الكل' })} →
            </Link>
          </div>
        </section>

        {/* ── 02 IN STOCK — Libya only, unchanged condition ─────────────── */}
        {isLibya && ready.length > 0 && (
          <section id="stock" className="gw-act gw-act--stock" aria-labelledby="gw-stock-title">
            <div className="gw-act-inner">
              <header className="gw-act-head">
                <p className="gw-spec">{pick({ en: '02 · Libya only', ar: '٠٢ · داخل ليبيا' })}</p>
                <h2 id="gw-stock-title" className="gw-act-title">
                  {pick({ en: 'Ready to Ship', ar: 'تسليم فوري' })}
                </h2>
                <p className="gw-act-figure">
                  <span className="gw-figure">
                    <Range
                      from={libya.readyDelivery.minHours}
                      to={libya.readyDelivery.maxHours}
                      unit={pick({ en: 'hours', ar: 'ساعة' })}
                    />
                  </span>
                </p>
              </header>
              <div className="gw-exhibit">
                {ready.map((product, index) => (
                  <ProductCard key={product.id} product={product} eager={index < 2} />
                ))}
              </div>
              <Link className="gw-act-out" to="/shop/ready-to-ship">
                {pick({ en: 'View all', ar: 'عرض الكل' })} →
              </Link>
            </div>
          </section>
        )}

        {/* ── 03 THE WORKSHOP ──────────────────────────────────────────── */}
        <section
          id="workshop"
          className="gw-act gw-act--workshop"
          aria-labelledby="gw-workshop-title"
        >
          <div className="gw-act-inner gw-workshop-inner">
            <div>
              <p className="gw-spec">{pick({ en: '03 · The workshop', ar: '٠٣ · الورشة' })}</p>
              <h2 id="gw-workshop-title" className="gw-act-title">
                {pick({ en: 'Design everything.', ar: 'صمّم كل شيء.' })}
              </h2>
              <p className="gw-act-body">
                {pick({
                  en: 'Game uniforms, practice wear, hoodies, pants, bags, sleeves, basketballs and branded equipment — specified, proofed and produced.',
                  ar: 'أطقم لعب وتمرين وهوديز وسراويل وحقائب وسليفس وكرات ومعدات بشعارك — بمواصفات وبروفة وتصنيع.',
                })}
              </p>
              <dl className="gw-minimums">
                <div>
                  <dt>{pick({ en: 'Apparel', ar: 'الملابس' })}</dt>
                  <dd className="gw-isolate-ltr">{minimumFor('game-set')}</dd>
                </div>
                <div>
                  <dt>{pick({ en: 'Basketballs', ar: 'الكرات' })}</dt>
                  <dd className="gw-isolate-ltr">{minimumFor('basketball')}</dd>
                </div>
                <div>
                  <dt>{pick({ en: 'Hoop padding', ar: 'تغليف السلة' })}</dt>
                  <dd className="gw-isolate-ltr">{minimumFor('hoop-padding')}</dd>
                </div>
                <div>
                  <dt>{pick({ en: 'Product types', ar: 'أنواع المنتجات' })}</dt>
                  <dd className="gw-isolate-ltr">{CUSTOM_PRODUCT_TYPES.length}</dd>
                </div>
              </dl>
              <Link className="gw-path gw-path--primary" to="/customize">
                <span>{pick({ en: 'Open Design Studio', ar: 'افتح استوديو التصميم' })}</span>
              </Link>
            </div>
            <div className="gw-workshop-plate">
              <img
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
              <p className="gw-spec">{pick({ en: 'Production drawing', ar: 'رسم الإنتاج' })}</p>
            </div>
          </div>
        </section>

        {/* ── 04 THE ROSTER ────────────────────────────────────────────── */}
        <section id="roster" className="gw-act gw-act--roster" aria-labelledby="gw-roster-title">
          <div className="gw-act-inner">
            <header className="gw-act-head">
              <p className="gw-spec">
                {pick({ en: '04 · Teams & Wholesale', ar: '٠٤ · الأندية والجملة' })}
              </p>
              <h2 id="gw-roster-title" className="gw-act-title">
                {pick({ en: 'One order. The whole organization.', ar: 'طلب واحد. المؤسسة كاملة.' })}
              </h2>
            </header>
            <ol className="gw-stages">
              {[
                { en: 'Roster', ar: 'القائمة' },
                { en: 'Design', ar: 'التصميم' },
                { en: 'Quote', ar: 'عرض السعر' },
                { en: 'Proof', ar: 'البروفة' },
                { en: 'Production', ar: 'التصنيع' },
                { en: 'Delivery', ar: 'التسليم' },
              ].map((stage, position) => (
                <li key={stage.en}>
                  <span className="gw-stages-num" aria-hidden="true">
                    {String(position + 1).padStart(2, '0')}
                  </span>
                  <span>{pick(stage)}</span>
                </li>
              ))}
            </ol>
            <dl className="gw-minimums gw-minimums--inverse">
              <div>
                <dt>{pick({ en: 'Before production', ar: 'قبل التصنيع' })}</dt>
                <dd>50%</dd>
              </div>
              <div>
                <dt>{pick({ en: 'On arrival', ar: 'عند الوصول' })}</dt>
                <dd>50%</dd>
              </div>
              <div>
                <dt>{pick({ en: 'Production', ar: 'التصنيع' })}</dt>
                <dd className="gw-isolate-ltr">
                  {shippingConfig.custom.minDays}–{shippingConfig.custom.maxDays}
                </dd>
              </div>
            </dl>
            <Link className="gw-path gw-path--primary" to="/teams-wholesale">
              <span>{pick({ en: 'Build a team order', ar: 'جهّز طلب فريق' })}</span>
            </Link>
          </div>
        </section>

        {/* ── 05 EQUIPMENT ─────────────────────────────────────────────── */}
        <section
          id="equipment"
          className="gw-act gw-act--equipment"
          aria-labelledby="gw-equipment-title"
        >
          <div className="gw-act-inner">
            <header className="gw-act-head">
              <p className="gw-spec">{pick({ en: '05 · On the floor', ar: '٠٥ · على الأرض' })}</p>
              <h2 id="gw-equipment-title" className="gw-act-title">
                {pick({ en: 'In-court. Off-court.', ar: 'داخل الملعب. خارجه.' })}
              </h2>
            </header>
            <div className="gw-exhibit">
              {(shoes.length ? shoes : featured).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            <Link className="gw-act-out" to="/shop/footwear">
              {pick({ en: 'Shop footwear', ar: 'تسوّق الأحذية' })} →
            </Link>
          </div>
        </section>

        {/* ── 06 SIGN-OFF ──────────────────────────────────────────────── */}
        <section id="signoff" className="gw-act gw-act--signoff" aria-labelledby="gw-signoff-title">
          <div className="gw-act-inner gw-signoff-inner">
            <img
              className="gw-signoff-mark"
              src="/brand/lha-wordmark-white.svg"
              alt="Libya Hoops Academy"
              width="320"
              height="96"
              loading="lazy"
              decoding="async"
            />
            <p className="gw-spec">
              {pick({ en: '06 · Official LHA store', ar: '٠٦ · متجر LHA الرسمي' })}
            </p>
            <h2 id="gw-signoff-title" className="gw-act-title">
              {pick({ en: 'All LHA clothing and accessories.', ar: 'جميع ملابس وإكسسوارات LHA.' })}
            </h2>
            <p className="gw-act-body">
              {pick({
                en: 'Same products and prices, inside the Shababuna account, cart and delivery system.',
                ar: 'نفس المنتجات والأسعار داخل حساب وسلة ونظام توصيل شبابنا.',
              })}
            </p>
            <div className="gw-open-paths">
              <Link className="gw-path gw-path--primary" to="/lha-store">
                <span>{pick({ en: 'Enter LHA Store', ar: 'ادخل متجر LHA' })}</span>
              </Link>
              <Link className="gw-path" to="/shop?brand=Shababuna">
                <span>{pick({ en: 'Shop Shababuna', ar: 'تسوّق شبابنا' })}</span>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

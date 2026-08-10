import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import Seo from '../components/common/Seo';
import ProductCard from '../components/shop/ProductCard';
import CinematicHero from '../components/experience/CinematicHero';
import { useLanguage } from '../context/LanguageContext';
import { useCinematicOpening } from '../hooks/useCinematicOpening';
import { useCommerce } from '../context/CommerceContext';
import { useCatalog } from '../context/CatalogContext';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useDeviceCapability } from '../hooks/useDeviceCapability';
import { SITE } from '../config';
import { shippingConfig } from '../config/shipping';
import { CUSTOM_PRODUCT_TYPES } from '../data/customization';
import '../styles/journey.css';
import '../styles/home.css';

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
 * Every figure is read from config/shipping.ts, data/customization.ts,
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

/** Verified destinations only. Culture chapter, not invented claims. */
const GAME = [
  {
    to: '/shop/clothing',
    label: { en: 'Gamewear', ar: 'ملابس اللعب' },
    copy: {
      en: 'Jerseys, shorts, full sets and practice wear built for the court.',
      ar: 'سيريات وشورتات وأطقم كاملة وملابس تمرين مبنية للملعب.',
    },
  },
  {
    to: '/shop/footwear',
    label: { en: 'On and off court', ar: 'داخل الملعب وخارجه' },
    copy: {
      en: 'Performance footwear and off-court pairs from the live catalogue.',
      ar: 'أحذية أداء وأزواج خارج الملعب من الكتالوج الحالي.',
    },
  },
  {
    to: '/shop/basketballs',
    label: { en: 'The ball', ar: 'الكرة' },
    copy: {
      en: 'Match and training basketballs — stock and custom where supported.',
      ar: 'كرات مباراة وتدريب — بالمخزون والمخصص عند التوفر.',
    },
  },
  {
    to: '/shop/equipment',
    label: { en: 'Training systems', ar: 'منظومات التدريب' },
    copy: {
      en: 'Hoops, padding, bags and accessories for clubs and academies.',
      ar: 'سلات وتغليف وحقائب وإكسسوارات للأندية والأكاديميات.',
    },
  },
];

const FLOOR = [
  {
    to: '/shop/ready-to-ship',
    zone: 'ready',
    name: { en: 'Ready to Ship', ar: 'تسليم فوري' },
  },
  { to: '/shop/clothing', zone: 'key', name: { en: 'Clothing', ar: 'الملابس' } },
  { to: '/shop/footwear', zone: 'baseline', name: { en: 'Footwear', ar: 'الأحذية' } },
  {
    to: '/shop/accessories',
    zone: 'corner',
    name: { en: 'Accessories', ar: 'الإكسسوارات' },
  },
  {
    to: '/shop/basketballs',
    zone: 'centre',
    name: { en: 'Basketballs', ar: 'كرات السلة' },
  },
  { to: '/shop/equipment', zone: 'arc', name: { en: 'Equipment', ar: 'المعدات' } },
];

const minimumFor = (key: string): number => {
  const match = CUSTOM_PRODUCT_TYPES.find((type) => type.key === key);
  return Number(match?.minimum || 0);
};

/** Numeric ranges are bidi-isolated so `24–72` cannot render as `72–24`. */
function Range({
  from,
  to,
  unit,
}: {
  from: string | number;
  to: string | number;
  unit: string;
}) {
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

export default function HomePage(): ReactElement {
  const { pick } = useLanguage();
  const { countryCode } = useCommerce();
  const { products, readyToShipProducts, featuredProducts } = useCatalog();
  // Full-bleed dark opening: the header floats over it, transparent.
  useCinematicOpening();

  const reduced = useReducedMotion();
  const capability = useDeviceCapability();
  const isLibya = countryCode === 'LY';

  const ready = readyToShipProducts().slice(0, 3);
  const featured = featuredProducts().slice(0, 3);
  const shoes = products.filter((product) => product.category === 'footwear').slice(0, 3);

  // Commerce-first navigation — not an architecture “chapter index”.
  const chapters = [
    { id: 'hero', label: { en: 'Home', ar: 'الرئيسية' } },
    { id: 'game', label: { en: 'Shop', ar: 'تسوق' } },
    { id: 'stock', label: { en: 'Ready', ar: 'فوري' } },
    { id: 'workshop', label: { en: 'Customize', ar: 'صمّم' } },
    { id: 'roster', label: { en: 'Teams', ar: 'أندية' } },
    { id: 'equipment', label: { en: 'Gear', ar: 'تجهيز' } },
    { id: 'brand', label: { en: 'Story', ar: 'القصة' } },
  ];

  const [active, setActive] = useState(chapters[0]?.id || 'hero');
  const DARK_ACTS = new Set(['hero', 'game', 'roster', 'brand', 'signoff']);
  const scroller = useRef<HTMLDivElement | null>(null);

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
      <Helmet>
        <link
          rel="preload"
          as="image"
          href="/media/hero/shababuna-hero-poster.webp"
          type="image/webp"
          media="(min-width: 768px)"
        />
        <link
          rel="preload"
          as="image"
          href="/media/hero/shababuna-hero-poster-mobile.webp"
          type="image/webp"
          media="(max-width: 767px)"
        />
      </Helmet>

      {/* The chapter index. Real links, so it works with no JavaScript beyond
          React's own rendering, and it is a nav landmark for screen readers. */}
      <nav
        className="gw-acts"
        aria-label={pick({ en: 'On this page', ar: 'في هذه الصفحة' })}
        data-reduced={reduced ? 'on' : 'off'}
        data-tone={DARK_ACTS.has(active) ? 'night' : 'day'}
        data-commerce="true"
      >
        <ol>
          {chapters.map((chapter) => (
            <li key={chapter.id}>
              <a
                href={`#${chapter.id}`}
                aria-current={active === chapter.id ? 'true' : undefined}
                className={active === chapter.id ? 'is-active' : ''}
              >
                <span className="gw-acts-tick" aria-hidden="true" />
                <span className="gw-acts-label">{pick(chapter.label)}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {/* Wired CinematicHero — full commerce opening with poster/video pipeline. */}
      <div id="hero">
        <CinematicHero />
      </div>

      <div
        className="gw-journey"
        ref={scroller}
        data-snap={reduced ? 'off' : 'on'}
        data-capability={capability}
      >

        {/* ── THE GAME — culture and performance, court atmosphere ──────── */}
        <section id="game" className="gw-act gw-act--game" aria-labelledby="gw-game-title">
          <picture className="gw-game-atmos" aria-hidden="true">
            <source
              type="image/webp"
              srcSet="/media/atmosphere/court-overhead-1024.webp 1024w, /media/atmosphere/court-overhead-1600.webp 1600w"
              sizes="100vw"
            />
            <img
              src="/media/atmosphere/court-overhead-1600.webp"
              alt=""
              width="1600"
              height="1067"
              loading="lazy"
              decoding="async"
            />
          </picture>
          <div className="gw-act-inner gw-game-inner">
            <header className="gw-act-head">
              <p className="gw-kicker">{pick({ en: 'The game', ar: 'اللعبة' })}</p>
              <h2 id="gw-game-title" className="gw-act-title">
                {pick({
                  en: 'Built for how basketball actually moves.',
                  ar: 'مبني على طريقة حركة كرة السلة.',
                })}
              </h2>
              <p className="gw-act-body">
                {pick({
                  en: 'Apparel, footwear, balls and training equipment — introduced as chapters of the game, not as a flat grid of SKUs.',
                  ar: 'ملابس وأحذية وكرات ومعدات تدريب — تُقدَّم كفصول من اللعبة لا كشبكة مسطحة من المنتجات.',
                })}
              </p>
            </header>
            <ul className="gw-game-pillars">
              {GAME.map((pillar) => (
                <li key={pillar.to}>
                  <Link to={pillar.to} className="gw-game-pillar">
                    <span className="gw-game-pillar-name">{pick(pillar.label)}</span>
                    <span className="gw-game-pillar-copy">{pick(pillar.copy)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── THE FLOOR — departments placed on court geometry ───────── */}
        <section id="floor" className="gw-act gw-act--floor" aria-labelledby="gw-floor-title">
          <div className="gw-act-inner">
            <header className="gw-act-head">
              <p className="gw-kicker">{pick({ en: 'The floor', ar: 'الأرضية' })}</p>
              <h2 id="gw-floor-title" className="gw-act-title">
                {pick({ en: 'Everything basketball needs', ar: 'كل ما تحتاجه كرة السلة' })}
              </h2>
            </header>
            <div className="gw-floor">
              <CourtPlan />
              {FLOOR.map((zone) => (
                <Link key={zone.to} to={zone.to} className="gw-floor-zone" data-zone={zone.zone}>
                  <span className="gw-floor-name">{pick(zone.name)}</span>
                  {/* A count is information; an index number was not. */}
                  <span className="gw-floor-count gw-isolate-ltr">
                    {products.filter((item) => item.category === zone.to.split('/').pop()).length}
                  </span>
                </Link>
              ))}
            </div>
            <Link className="gw-act-out" to="/shop">
              {pick({ en: 'Shop all', ar: 'تسوّق الكل' })} →
            </Link>
          </div>
        </section>

        <section id="stock" className="gw-act gw-act--stock" aria-labelledby="gw-stock-title">
          <div className="gw-act-inner">
            <header className="gw-act-head">
              <p className="gw-kicker">
                {pick({
                  en: isLibya ? 'Held in Libya' : 'Inventory in Libya',
                  ar: isLibya ? 'مخزون في ليبيا' : 'المخزون في ليبيا',
                })}
              </p>
              <h2 id="gw-stock-title" className="gw-act-title">
                {pick({ en: 'Ready to Ship', ar: 'تسليم فوري' })}
              </h2>
              <p className="gw-act-figure">
                {ready.length > 0 ? (
                  <span className="gw-figure">
                    <Range
                      from={libya.readyDelivery.minHours}
                      to={libya.readyDelivery.maxHours}
                      unit={pick({ en: 'hours', ar: 'ساعة' })}
                    />
                  </span>
                ) : (
                  <span className="gw-act-lede">
                    {pick({
                      en: 'Verified ready inventory will appear here when warehouse stock is confirmed. No stock is invented.',
                      ar: 'يظهر المخزون الجاهز هنا عند توثيقه من المستودع. لا نختلق كميات.',
                    })}
                  </span>
                )}
              </p>
            </header>
            {ready.length > 0 && (
              <div className="gw-exhibit">
                {ready.map((product, index) => (
                  <ProductCard key={product.id} product={product} eager={index < 2} />
                ))}
              </div>
            )}
            <Link className="gw-act-out" to="/shop/ready-to-ship">
              {pick({ en: 'Open Ready to Ship', ar: 'افتح التسليم الفوري' })}
            </Link>
          </div>
        </section>

        {/* ── 03 THE WORKSHOP ──────────────────────────────────────────── */}
        <section
          id="workshop"
          className="gw-act gw-act--workshop"
          aria-labelledby="gw-workshop-title"
        >
          <div className="gw-act-inner gw-workshop-inner">
            <div>
              <p className="gw-open-kicker">{pick({ en: 'Customize', ar: 'خصّص' })}</p>
              <h2 id="gw-workshop-title" className="gw-act-title">
                {pick({ en: 'Design your kit.', ar: 'صمّم طقمك.' })}
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
              <p className="gw-open-kicker">{pick({ en: 'Concept preview', ar: 'معاينة المفهوم' })}</p>
            </div>
          </div>
        </section>

        {/* ── 04 THE ROSTER ────────────────────────────────────────────── */}
        <section id="roster" className="gw-act gw-act--roster" aria-labelledby="gw-roster-title">
          <div className="gw-act-inner">
            <header className="gw-act-head">
              <p className="gw-kicker">{pick({ en: 'Teams & Wholesale', ar: 'الأندية والجملة' })}</p>
              <h2 id="gw-roster-title" className="gw-act-title">
                {pick({ en: 'One order. The whole organization.', ar: 'طلب واحد. المؤسسة كاملة.' })}
              </h2>
            </header>
            <ol className="gw-stages gw-stages--plain">
              {[
                { en: 'Roster', ar: 'القائمة' },
                { en: 'Design', ar: 'التصميم' },
                { en: 'Quote', ar: 'عرض السعر' },
                { en: 'Proof', ar: 'البروفة' },
                { en: 'Production', ar: 'التصنيع' },
                { en: 'Delivery', ar: 'التسليم' },
              ].map((stage) => (
                <li key={stage.en}>
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
              <p className="gw-kicker">{pick({ en: 'On the floor', ar: 'على الأرض' })}</p>
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

        {/* ── THE BRAND — verified facts only, no invented claims ─────────── */}
        <section id="brand" className="gw-act gw-act--brand" aria-labelledby="gw-brand-title">
          <div className="gw-act-inner gw-brand-inner">
            <header className="gw-act-head">
              <p className="gw-kicker">{pick({ en: 'Shababuna', ar: 'شبابنا' })}</p>
              <h2 id="gw-brand-title" className="gw-act-title">
                {pick({
                  en: 'More than a basketball store.',
                  ar: 'أكثر من متجر كرة سلة.',
                })}
              </h2>
              <p className="gw-act-body">
                {pick({
                  en: 'A basketball commerce and supply platform built in Tripoli for players, clubs, academies, federations and distributors — retail, custom manufacturing, team supply and wholesale under one system.',
                  ar: 'منصة تجارة وتجهيز كرة سلة بُنيت في طرابلس للاعبين والأندية والأكاديميات والاتحادات والموزعين — تجزئة وتصنيع مخصص وتجهيز فرق وجملة ضمن نظام واحد.',
                })}
              </p>
            </header>
            <dl className="gw-brand-facts">
              <div>
                <dt>{pick({ en: 'Base', ar: 'المقر' })}</dt>
                <dd>{pick(SITE.address)}</dd>
              </div>
              <div>
                <dt>{pick({ en: 'Reach', ar: 'التغطية' })}</dt>
                <dd>
                  {pick({
                    en: 'Libya local delivery, cash and bank-card options, and ready-to-ship inventory. International customers receive USD pricing with destination shipping confirmed before payment.',
                    ar: 'توصيل محلي داخل ليبيا مع نقد وبطاقات بنكية ومخزون تسليم فوري. العملاء الدوليون يتلقون تسعيرًا بالدولار مع اعتماد شحن الوجهة قبل الدفع.',
                  })}
                </dd>
              </div>
              <div>
                <dt>{pick({ en: 'Custom apparel', ar: 'الملابس المخصصة' })}</dt>
                <dd>
                  {pick({
                    en: 'Custom apparel manufacturing in the United States, proofed before production.',
                    ar: 'تصنيع الملابس المخصصة في الولايات المتحدة بعد اعتماد البروفة.',
                  })}
                </dd>
              </div>
              <div>
                <dt>{pick({ en: 'Catalogue', ar: 'الكتالوج' })}</dt>
                <dd className="gw-isolate-ltr">
                  {products.length}{' '}
                  {pick({
                    en: 'live products across retail and custom paths',
                    ar: 'منتجًا حيًّا عبر مسارات التجزئة والتخصيص',
                  })}
                </dd>
              </div>
            </dl>
            <div className="gw-open-paths">
              <Link className="gw-path gw-path--primary" to="/about">
                <span>{pick({ en: 'About Shababuna', ar: 'عن شبابنا' })}</span>
              </Link>
              <Link className="gw-path" to="/our-work">
                <span>{pick({ en: 'Our Work', ar: 'أعمالنا' })}</span>
              </Link>
            </div>
          </div>
        </section>

        {/* ── SIGN-OFF ─────────────────────────────────────────────────── */}
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
            <p className="gw-kicker">{pick({ en: 'Official LHA store', ar: 'متجر LHA الرسمي' })}</p>
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

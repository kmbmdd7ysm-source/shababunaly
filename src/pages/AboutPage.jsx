import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import Seo from '../components/common/Seo';
import RouteMasthead from '../components/composition/RouteMasthead';
import '../styles/composition.css';

/*
 * About, rebuilt as a MANIFESTO in numbered movements.
 *
 * WAS: PageHero, a breadcrumb strip, then three `.section` blocks stacked at
 * equal weight - a manifesto, a pillar grid and a split with a media slot.
 * Nothing signalled which mattered or how they related.
 *
 * NOW: a masthead carrying the pillar count as a figure, then the claim set as
 * a single full-measure statement, the four pillars as NUMBERED plates on
 * hairline rules, and the reach section as a dark chapter with the reserved
 * brand-film slot honestly labelled as reserved rather than dressed as content.
 *
 * Every sentence is the original copy. Nothing was invented.
 */
const pillars = [
  {
    n: '01',
    title: { en: 'Basketball Specialist', ar: 'متخصصون في كرة السلة' },
    text: {
      en: 'Retail, custom manufacturing, club supply and equipment under one focused platform.',
      ar: 'متجر وتصنيع مخصص وتجهيز أندية ومعدات داخل منصة واحدة متخصصة.',
    },
  },
  {
    n: '02',
    title: { en: 'Built for Organizations', ar: 'مصمم للمؤسسات' },
    text: {
      en: 'Club accounts, team rosters, quotes, design approvals, staged payments and repeat orders.',
      ar: 'حسابات للأندية وقوائم فرق وعروض أسعار واعتماد تصاميم ودفع مرحلي وإعادة طلب.',
    },
  },
  {
    n: '03',
    title: { en: 'Global Reach', ar: 'وصول عالمي' },
    text: {
      en: 'Based in Tripoli and prepared to ship worldwide, with destination pricing confirmed before payment.',
      ar: 'مقرنا طرابلس ومجهزون للشحن عالميًا، مع اعتماد سعر كل وجهة قبل الدفع.',
    },
  },
  {
    n: '04',
    title: { en: 'No Compromise', ar: 'بدون تنازلات' },
    text: {
      en: 'A black-and-white identity, clear product systems and no unnecessary noise.',
      ar: 'هوية أسود وأبيض ونظام منتجات واضح بدون إضافات تضعف التجربة.',
    },
  },
];

export default function AboutPage() {
  const { pick } = useLanguage();
  return (
    <>
      <Seo
        title="About Shababuna"
        description="Shababuna is a basketball retail, custom manufacturing, teams and wholesale platform based in Tripoli, Libya."
        path="/about"
      />
      <RouteMasthead
        eyebrow="Shababuna · Built Different"
        title={pick({ en: 'More than a basketball store.', ar: 'أكثر من متجر كرة سلة.' })}
        lede={pick({
          en: 'A complete basketball commerce and supply platform built in Libya for players, clubs, academies, federations and distributors.',
          ar: 'منصة متكاملة لتجارة وتجهيز كرة السلة، بُنيت في ليبيا للاعبين والأندية والأكاديميات والاتحادات والموزعين.',
        })}
        trail={[{ label: pick({ en: 'About', ar: 'عن شبابنا' }) }]}
        figure={{ value: pillars.length, label: pick({ en: 'principles', ar: 'مبادئ' }) }}
      />

      <section className="gw-manifesto">
        <div className="gw-manifesto-inner">
          <p className="gw-spec">BUILT DIFFERENT.</p>
          <p className="gw-manifesto-claim">
            {pick({
              en: 'We make basketball easier to buy, design and supply.',
              ar: 'نجعل شراء كرة السلة وتصميمها وتجهيزها أسهل.',
            })}
          </p>
          <p className="gw-manifesto-body">
            {pick({
              en: 'Shababuna combines individual retail, ready-to-ship inventory in Libya, custom apparel manufacturing in the United States, team and wholesale ordering, and specialist basketball equipment. Every route is designed around how the customer actually buys.',
              ar: 'تجمع شبابنا بين البيع بالقطعة والمخزون الجاهز داخل ليبيا وتصنيع الملابس المخصصة في الولايات المتحدة وطلبات الأندية والجملة ومعدات كرة السلة المتخصصة. كل مسار مصمم حسب طريقة شراء العميل فعليًا.',
            })}
          </p>
        </div>
      </section>

      <section className="gw-principles" aria-label={pick({ en: 'Principles', ar: 'المبادئ' })}>
        <div className="gw-principles-inner">
          {pillars.map((item) => (
            <article key={item.n} className="gw-principle">
              <span className="gw-principle-index" aria-hidden="true">
                {item.n}
              </span>
              <h2 className="gw-principle-title">{pick(item.title)}</h2>
              <p className="gw-principle-body">{pick(item.text)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="gw-reach">
        <div className="gw-reach-inner">
          <div className="gw-reach-copy">
            <p className="gw-spec">FROM TRIPOLI TO THE WORLD</p>
            <h2 className="gw-reach-title">
              {pick({
                en: 'Local understanding. Global standard.',
                ar: 'نفهم السوق محليًا. ونبني بمعيار عالمي.',
              })}
            </h2>
            <p className="gw-reach-body">
              {pick({
                en: 'Libya receives local delivery rules, cash and Libyan bank-card options, and ready-to-ship inventory. International customers receive USD pricing and destination-specific shipping approval.',
                ar: 'تحصل ليبيا على قواعد توصيل محلية ودفع نقدي وبطاقة مصرفية ليبية ومخزون جاهز. ويحصل العملاء الدوليون على أسعار بالدولار واعتماد شحن خاص بكل وجهة.',
              })}
            </p>
            <div className="gw-cluster">
              <Link to="/shop" className="gw-btn gw-btn--primary">
                {pick({ en: 'Shop', ar: 'تسوّق' })}
              </Link>
              <Link to="/teams-wholesale" className="gw-btn gw-btn--secondary">
                {pick({ en: 'Teams & Wholesale', ar: 'الأندية والجملة' })}
              </Link>
            </div>
          </div>
          {/* Honestly labelled as reserved. No brand film exists yet, and this
              slot must not be dressed up as if one does. */}
          <div className="gw-reach-slot" role="note">
            <span className="gw-spec">
              {pick({ en: 'Brand film · reserved', ar: 'فيلم العلامة · محجوز' })}
            </span>
            <p>
              {pick({
                en: 'Reserved for the Shababuna story film. No final footage exists yet.',
                ar: 'محجوز لفيلم قصة شبابنا. لا توجد لقطات نهائية بعد.',
              })}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

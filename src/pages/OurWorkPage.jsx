import { Link } from 'react-router-dom';
import Seo from '../components/common/Seo';
import RouteMasthead from '../components/composition/RouteMasthead';
import '../styles/composition.css';
import SmartImage from '../components/common/SmartImage';
import { useLanguage } from '../context/LanguageContext';

const capabilities = Object.freeze([
  {
    image: '/images/catalog/apparel.svg',
    title: { en: 'Custom Teamwear', ar: 'ملابس الفرق المخصصة' },
    copy: {
      en: 'Game sets, reversible practice wear, warm-ups and staff apparel prepared around the club identity.',
      ar: 'أطقم لعب وتمرين دبل فيس وملابس إحماء وطاقم تُجهز حسب هوية النادي.',
    },
  },
  {
    image: '/images/catalog/bag.svg',
    title: { en: 'Full Club Supply', ar: 'تجهيز النادي بالكامل' },
    copy: {
      en: 'Bags, socks, travel apparel and accessories organized as one coordinated team order.',
      ar: 'حقائب وجوارب وملابس سفر وإكسسوارات ضمن طلب فريق واحد ومنظم.',
    },
  },
  {
    image: '/images/catalog/ball.svg',
    title: { en: 'Basketballs & Training', ar: 'الكرات ومعدات التدريب' },
    copy: {
      en: 'Retail, wholesale and custom-branded basketballs with supporting training equipment.',
      ar: 'كرات بالقطعة والجملة وبهوية مخصصة مع مستلزمات التدريب.',
    },
  },
  {
    image: '/images/catalog/hoop.svg',
    title: { en: 'Court Equipment', ar: 'معدات الملاعب' },
    copy: {
      en: 'Hoops, backboards, rims, shot clocks and facility equipment supplied through a technical quotation.',
      ar: 'سلات وبوردات وريمات وساعات 24 ثانية ومعدات منشآت عبر عرض سعر فني.',
    },
  },
]);

export default function OurWorkPage() {
  const { pick } = useLanguage();
  return (
    <>
      <Seo
        title="Our Work"
        description="Shababuna custom manufacturing, club supply and basketball equipment capabilities."
        path="/our-work"
      />
      <RouteMasthead
        eyebrow="Built for basketball"
        title={pick({ en: 'Our Work', ar: 'أعمالنا' })}
        lede={pick({
          en: 'From the first design to final delivery, Shababuna coordinates basketball products as one complete order.',
          ar: 'من أول تصميم إلى التسليم النهائي، تنظم شبابنا منتجات كرة السلة ضمن طلب متكامل.',
        })}
        trail={[{ label: pick({ en: 'Our Work', ar: 'أعمالنا' }) }]}
        figure={{ value: capabilities.length, label: pick({ en: 'capabilities', ar: 'قدرات' }) }}
      />

      {/* Capabilities as numbered plates rather than four identical cards. */}
      <section className="gw-principles gw-work-board" aria-labelledby="our-work-capabilities">
        <picture className="gw-work-atmos" aria-hidden="true">
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
        <div className="gw-principles-inner gw-principles-inner--wide">
          <div className="gw-principles-head">
            <p className="gw-spec">{pick({ en: 'Capabilities', ar: 'القدرات' })}</p>
            <h2 id="our-work-capabilities" className="gw-principles-title">
              {pick({ en: 'What we build and supply', ar: 'ما نقوم بتصنيعه وتوفيره' })}
            </h2>
          </div>
          <div className="gw-capability-grid">
            {capabilities.map((item, position) => (
              <article className="gw-capability" key={item.title.en}>
                <span className="gw-principle-index" aria-hidden="true">
                  {String(position + 1).padStart(2, '0')}
                </span>
                <SmartImage src={item.image} alt="" width={900} height={900} />
                <h3 className="gw-principle-title">{pick(item.title)}</h3>
                <p className="gw-principle-body">{pick(item.copy)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* The project flow as a numbered sequence, with the disclosure rule about
          client names and photography stated plainly rather than buried. */}
      <section className="gw-reach">
        <div className="gw-reach-inner">
          <div className="gw-reach-copy">
            <p className="gw-spec">PROJECT FLOW</p>
            <h2 className="gw-reach-title">
              {pick({
                en: 'Brief. Design. Approval. Production. Delivery.',
                ar: 'طلب. تصميم. اعتماد. تصنيع. تسليم.',
              })}
            </h2>
            <p className="gw-reach-body">
              {pick({
                en: 'Client names and final project photography are published only after approval. You can start a custom or wholesale request now and follow every stage from your account.',
                ar: 'لا يتم نشر أسماء العملاء وصور المشاريع النهائية إلا بعد الموافقة. يمكنك بدء طلب مخصص أو طلب جملة الآن ومتابعة جميع مراحله من حسابك.',
              })}
            </p>
            <div className="gw-cluster">
              <Link className="gw-btn gw-btn--primary" to="/customize">
                {pick({ en: 'Start a custom design', ar: 'ابدأ تصميمًا مخصصًا' })}
              </Link>
              <Link className="gw-btn gw-btn--secondary" to="/teams-wholesale#quote">
                {pick({ en: 'Request a team quote', ar: 'اطلب عرض سعر لفريق' })}
              </Link>
            </div>
          </div>
          <div className="gw-reach-slot" role="note">
            <span className="gw-spec">
              {pick({ en: 'Project showcase · reserved', ar: 'عرض المشاريع · محجوز' })}
            </span>
            <p>
              {pick({
                en: 'Reserved for approved client work. No project photography has been cleared for publication yet.',
                ar: 'محجوز لأعمال العملاء المعتمدة. لم يتم اعتماد أي صور مشاريع للنشر بعد.',
              })}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

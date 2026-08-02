import { Link } from 'react-router-dom';
import Seo from '../components/common/Seo';
import PageHero from '../components/common/PageHero';
import SmartImage from '../components/common/SmartImage';
import { useLanguage } from '../context/LanguageContext';

const capabilities = Object.freeze([
  {
    image: '/images/catalog/apparel.svg',
    title: { en: 'Custom Teamwear', ar: 'ملابس الفرق المخصصة' },
    copy: { en: 'Game sets, reversible practice wear, warm-ups and staff apparel prepared around the club identity.', ar: 'أطقم لعب وتمرين دبل فيس وملابس إحماء وطاقم تُجهز حسب هوية النادي.' },
  },
  {
    image: '/images/catalog/bag.svg',
    title: { en: 'Full Club Supply', ar: 'تجهيز النادي بالكامل' },
    copy: { en: 'Bags, socks, travel apparel and accessories organized as one coordinated team order.', ar: 'حقائب وجوارب وملابس سفر وإكسسوارات ضمن طلب فريق واحد ومنظم.' },
  },
  {
    image: '/images/catalog/ball.svg',
    title: { en: 'Basketballs & Training', ar: 'الكرات ومعدات التدريب' },
    copy: { en: 'Retail, wholesale and custom-branded basketballs with supporting training equipment.', ar: 'كرات بالقطعة والجملة وبهوية مخصصة مع مستلزمات التدريب.' },
  },
  {
    image: '/images/catalog/hoop.svg',
    title: { en: 'Court Equipment', ar: 'معدات الملاعب' },
    copy: { en: 'Hoops, backboards, rims, shot clocks and facility equipment supplied through a technical quotation.', ar: 'سلات وبوردات وريمات وساعات 24 ثانية ومعدات منشآت عبر عرض سعر فني.' },
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
      <PageHero
        label="BUILT FOR BASKETBALL"
        title={pick({ en: 'Our Work', ar: 'أعمالنا' })}
        description={pick({
          en: 'From the first design to final delivery, Shababuna coordinates basketball products as one complete order.',
          ar: 'من أول تصميم إلى التسليم النهائي، تنظم شبابنا منتجات كرة السلة ضمن طلب متكامل.',
        })}
      />
      <section className="section" aria-labelledby="our-work-capabilities">
        <div className="container">
          <div className="section-heading-row">
            <div>
              <p className="section-label">CAPABILITIES</p>
              <h2 id="our-work-capabilities">{pick({ en: 'What we build and supply', ar: 'ما نقوم بتصنيعه وتوفيره' })}</h2>
            </div>
          </div>
          <div className="department-grid">
            {capabilities.map((item) => (
              <article className="department-card" key={item.title.en}>
                <SmartImage src={item.image} alt="" width={900} height={900} />
                <div>
                  <h3>{pick(item.title)}</h3>
                  <p>{pick(item.copy)}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="section section--muted">
        <div className="container narrow">
          <p className="section-label">PROJECT FLOW</p>
          <h2>{pick({ en: 'Brief. Design. Approval. Production. Delivery.', ar: 'طلب. تصميم. اعتماد. تصنيع. تسليم.' })}</h2>
          <p>{pick({ en: 'Client names and final project photography are published only after approval. You can start a custom or wholesale request now and follow every stage from your account.', ar: 'لا يتم نشر أسماء العملاء وصور المشاريع النهائية إلا بعد الموافقة. يمكنك بدء طلب مخصص أو طلب جملة الآن ومتابعة جميع مراحله من حسابك.' })}</p>
          <div className="hero-actions">
            <Link className="btn-primary" to="/customize">{pick({ en: 'Start a custom design', ar: 'ابدأ تصميمًا مخصصًا' })}</Link>
            <Link className="btn-secondary" to="/teams-wholesale#quote">{pick({ en: 'Request a team quote', ar: 'اطلب عرض سعر لفريق' })}</Link>
          </div>
        </div>
      </section>
    </>
  );
}

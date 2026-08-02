import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import Seo from '../components/common/Seo';
import PageHero from '../components/common/PageHero';
import Breadcrumbs from '../components/common/Breadcrumbs';

const pillars = [
  { n:'01', title:{en:'Basketball Specialist',ar:'متخصصون في كرة السلة'}, text:{en:'Retail, custom manufacturing, club supply and equipment under one focused platform.',ar:'متجر وتصنيع مخصص وتجهيز أندية ومعدات داخل منصة واحدة متخصصة.'} },
  { n:'02', title:{en:'Built for Organizations',ar:'مصمم للمؤسسات'}, text:{en:'Club accounts, team rosters, quotes, design approvals, staged payments and repeat orders.',ar:'حسابات للأندية وقوائم فرق وعروض أسعار واعتماد تصاميم ودفع مرحلي وإعادة طلب.'} },
  { n:'03', title:{en:'Global Reach',ar:'وصول عالمي'}, text:{en:'Based in Tripoli and prepared to ship worldwide, with destination pricing confirmed before payment.',ar:'مقرنا طرابلس ومجهزون للشحن عالميًا، مع اعتماد سعر كل وجهة قبل الدفع.'} },
  { n:'04', title:{en:'No Compromise',ar:'بدون تنازلات'}, text:{en:'A black-and-white identity, clear product systems and no unnecessary noise.',ar:'هوية أسود وأبيض ونظام منتجات واضح بدون إضافات تضعف التجربة.'} },
];

export default function AboutPage() {
  const { pick } = useLanguage();
  return <>
    <Seo title="About Shababuna" description="Shababuna is a basketball retail, custom manufacturing, teams and wholesale platform based in Tripoli, Libya." path="/about" />
    <PageHero label="SHABABUNA · BUILT DIFFERENT" title={pick({en:'More than a basketball store.',ar:'أكثر من متجر كرة سلة.'})} description={pick({en:'A complete basketball commerce and supply platform built in Libya for players, clubs, academies, federations and distributors.',ar:'منصة متكاملة لتجارة وتجهيز كرة السلة، بُنيت في ليبيا للاعبين والأندية والأكاديميات والاتحادات والموزعين.'})} />
    <div className="container"><Breadcrumbs items={[{ label: pick({en:'About',ar:'عن شبابنا'}) }]} /></div>
    <section className="section"><div className="container about-manifesto"><p className="section-label">BUILT DIFFERENT.</p><h2>{pick({en:'We make basketball easier to buy, design and supply.',ar:'نجعل شراء كرة السلة وتصميمها وتجهيزها أسهل.'})}</h2><p>{pick({en:'Shababuna combines individual retail, ready-to-ship inventory in Libya, custom apparel manufacturing in the United States, team and wholesale ordering, and specialist basketball equipment. Every route is designed around how the customer actually buys.',ar:'تجمع شبابنا بين البيع بالقطعة والمخزون الجاهز داخل ليبيا وتصنيع الملابس المخصصة في الولايات المتحدة وطلبات الأندية والجملة ومعدات كرة السلة المتخصصة. كل مسار مصمم حسب طريقة شراء العميل فعليًا.'})}</p></div></section>
    <section className="section section--muted"><div className="container capability-grid about-pillars">{pillars.map((item)=><article key={item.n}><span>{item.n}</span><h3>{pick(item.title)}</h3><p>{pick(item.text)}</p></article>)}</div></section>
    <section className="section"><div className="container cinematic-split-grid"><div className="media-reserve"><span>BRAND FILM SLOT</span><small>{pick({en:'Reserved for the Shababuna story film',ar:'محجوز لفيلم قصة شبابنا'})}</small></div><div className="cinematic-copy"><p className="section-label">FROM TRIPOLI TO THE WORLD</p><h2 className="display-title">{pick({en:'Local understanding. Global standard.',ar:'نفهم السوق محليًا. ونبني بمعيار عالمي.'})}</h2><p className="lead">{pick({en:'Libya receives local delivery rules, cash and Libyan bank-card options, and ready-to-ship inventory. International customers receive USD pricing and destination-specific shipping approval.',ar:'تحصل ليبيا على قواعد توصيل محلية ودفع نقدي وبطاقة مصرفية ليبية ومخزون جاهز. ويحصل العملاء الدوليون على أسعار بالدولار واعتماد شحن خاص بكل وجهة.'})}</p><div className="hero-actions"><Link to="/shop" className="btn-primary">{pick({en:'Shop',ar:'تسوّق'})}</Link><Link to="/teams-wholesale" className="btn-secondary">{pick({en:'Teams & Wholesale',ar:'الأندية والجملة'})}</Link></div></div></div></section>
  </>;
}

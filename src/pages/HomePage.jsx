import { Link } from 'react-router-dom';
import Seo from '../components/common/Seo';
import CinematicHero from '../components/experience/CinematicHero';
import ProductCard from '../components/shop/ProductCard';
import SectionHeading from '../components/common/SectionHeading';
import { useLanguage } from '../context/LanguageContext';
import { useCommerce } from '../context/CommerceContext';
import { SITE } from '../config';
import { useCatalog } from '../context/CatalogContext';

const departments = [
  { to:'/shop/clothing', image:'/images/catalog/apparel.svg', title:{en:'Clothing',ar:'الملابس'}, copy:{en:'Gamewear, training, lifestyle and performance.',ar:'ملابس اللعب والتمرين واللايف ستايل والأداء.'} },
  { to:'/shop/footwear', image:'/images/catalog/shoe.svg', title:{en:'Footwear',ar:'الأحذية'}, copy:{en:'In-court and off-court basketball footwear.',ar:'أحذية كرة السلة داخل الملعب وخارجه.'} },
  { to:'/shop/accessories', image:'/images/catalog/accessories.svg', title:{en:'Accessories',ar:'الإكسسوارات'}, copy:{en:'Bags, sleeves, supports and training essentials.',ar:'حقائب وسليفس ودعامات وأساسيات التدريب.'} },
  { to:'/shop/basketballs', image:'/images/catalog/ball.svg', title:{en:'Basketballs',ar:'كرات السلة'}, copy:{en:'Retail by the piece and wholesale from six.',ar:'بالقطعة وبالجملة ابتداءً من ست كرات.'} },
  { to:'/shop/equipment', image:'/images/catalog/equipment.svg', title:{en:'Equipment',ar:'المعدات'}, copy:{en:'Hoops, backboards, shot clocks and court supply.',ar:'سلات وبوردات وساعات 24 ثانية وتجهيز ملاعب.'} },
];

export default function HomePage(){
  const { pick }=useLanguage();
  const { countryCode } = useCommerce();
  const { products, readyToShipProducts, featuredProducts } = useCatalog();
  const isLibya = countryCode === 'LY';
  const ready=readyToShipProducts().slice(0,4);
  const featured=featuredProducts().slice(0,4);
  const shoes=products.filter((p)=>p.category==='footwear').slice(0,4);
  return <>
    <Seo title={`${SITE.name} — ${SITE.slogan.en}`} description="Premium basketball retail, custom manufacturing, team supply and wholesale from Libya to the world." path="/" />
    <CinematicHero />
    <section className="brand-proof"><div className="container brand-proof-grid"><p>{pick({en:'Basketball, without compromise.',ar:'كرة السلة، بدون تنازلات.'})}</p><span>RETAIL · CUSTOM · TEAMS · WHOLESALE</span></div></section>

    <section id="departments" className="section home-departments"><div className="container"><SectionHeading label={pick({en:'SHOP',ar:'المتجر'})} title={pick({en:'Everything basketball needs',ar:'كل ما تحتاجه كرة السلة'})} link="/shop" linkLabel={pick({en:'Shop all',ar:'تسوّق الكل'})}/><div className="department-grid">{departments.map((item)=><Link key={item.to} to={item.to} className="department-card"><img src={item.image} alt=""/><div><h3>{pick(item.title)}</h3><p>{pick(item.copy)}</p><span>{pick({en:'Explore',ar:'استكشف'})} →</span></div></Link>)}</div></div></section>

    {isLibya && ready.length > 0 && <section className="section section--muted"><div className="container"><SectionHeading label={pick({en:'LIBYA ONLY',ar:'داخل ليبيا'})} title={pick({en:'Ready to Ship',ar:'تسليم فوري'})} link="/shop/ready-to-ship" linkLabel={pick({en:'View all',ar:'عرض الكل'})}/><p className="section-intro">{pick({en:'In-stock products delivered inside Libya in 24–72 hours. Look for the green mark.',ar:'منتجات متوفرة في المخزون وتُسلّم داخل ليبيا خلال 24–72 ساعة. ابحث عن العلامة الخضراء.'})}</p><div className="product-grid product-grid--airy">{ready.map((product,index)=><ProductCard key={product.id} product={product} eager={index<2}/>)}</div></div></section>}

    <section className="section cinematic-split"><div className="container cinematic-split-grid"><div className="media-reserve media-reserve--custom" aria-label={pick({en:'Shababuna custom manufacturing film area',ar:'مساحة فيلم التصنيع المخصص لشبابنا'})}><img src="/brand/shababuna-full-en-white.png" alt="" loading="lazy" decoding="async"/><span>BUILT DIFFERENT</span></div><div className="cinematic-copy"><p className="section-label">CUSTOMIZE</p><h2 className="display-title">{pick({en:'Design everything.',ar:'صمّم كل شيء.'})}</h2><p className="lead">{pick({en:'Game uniforms, practice wear, hoodies, pants, bags, sleeves, basketballs and branded equipment. Apparel starts from 10 pieces; custom basketballs from 6.',ar:'أطقم لعب وتمرين وهوديز وسراويل وحقائب وسليفس وكرات ومعدات بشعارك. تبدأ الملابس من 10 قطع والكرات المخصصة من 6.'})}</p><Link to="/customize" className="btn-primary">{pick({en:'Open Design Studio',ar:'افتح استوديو التصميم'})}</Link></div></div></section>

    <section className="section section--dark"><div className="container team-home-grid"><div><p className="section-label">TEAMS & WHOLESALE</p><h2 className="display-title">{pick({en:'One order. The whole organization.',ar:'طلب واحد. المؤسسة كاملة.'})}</h2><p>{pick({en:'Uniforms, staff wear, travel, bags, basketballs and equipment — with design approval, staged payment and production tracking.',ar:'أطقم وملابس طاقم وسفر وحقائب وكرات ومعدات — مع اعتماد التصميم والدفع المرحلي وتتبع التصنيع.'})}</p><Link to="/teams-wholesale" className="btn-primary">{pick({en:'Build a team order',ar:'جهّز طلب فريق'})}</Link></div><div className="team-home-facts"><article><strong>50%</strong><span>{pick({en:'before production',ar:'قبل التصنيع'})}</span></article><article><strong>50%</strong><span>{pick({en:'when goods arrive',ar:'عند وصول البضاعة'})}</span></article><article><strong>30–60</strong><span>{pick({en:'day estimate',ar:'يومًا تقديريًا'})}</span></article><article><strong>WORLDWIDE</strong><span>{pick({en:'shipping ready',ar:'شحن عالمي'})}</span></article></div></div></section>

    {shoes.length > 0 && <section className="section"><div className="container"><SectionHeading label="FOOTWEAR" title={pick({en:'In-court. Off-court.',ar:'داخل الملعب. خارجه.'})} link="/shop/footwear" linkLabel={pick({en:'Shop footwear',ar:'تسوّق الأحذية'})}/><div className="product-grid product-grid--airy">{shoes.map((product)=><ProductCard key={product.id} product={product}/>)}</div></div></section>}

    {featured.length>0&&<section className="section section--muted"><div className="container"><SectionHeading label="SHABABUNA" title={pick({en:'Built Different products',ar:'منتجات BUILT DIFFERENT'})} link="/shop?brand=Shababuna" linkLabel={pick({en:'Shop Shababuna',ar:'تسوّق شبابنا'})}/><div className="product-grid product-grid--airy">{featured.map((product)=><ProductCard key={product.id} product={product}/>)}</div></div></section>}

    <section className="section lha-home-band"><div className="container lha-home-inner"><img src="/brand/lha-wordmark-white.svg" alt="Libya Hoops Academy"/><div><p className="section-label">OFFICIAL LHA STORE</p><h2>{pick({en:'All LHA clothing and accessories.',ar:'جميع ملابس وإكسسوارات LHA.'})}</h2><p>{pick({en:'Same products and prices, inside the Shababuna account, cart and delivery system.',ar:'نفس المنتجات والأسعار داخل حساب وسلة ونظام توصيل شبابنا.'})}</p></div><Link to="/lha-store" className="btn-primary">{pick({en:'Enter LHA Store',ar:'ادخل متجر LHA'})}</Link></div></section>


  </>;
}

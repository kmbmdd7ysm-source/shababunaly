import { Link } from 'react-router-dom';
import Seo from '../components/common/Seo';
import ProductCard from '../components/shop/ProductCard';
import { useCatalog } from '../context/CatalogContext';
import { useLanguage } from '../context/LanguageContext';

export default function LhaStorePage(){
  const { lhaStoreProducts } = useCatalog();const{pick}=useLanguage();const items=lhaStoreProducts();return <>
  <Seo title="LHA Official Store" description="All Libya Hoops Academy clothing and accessories inside Shababuna." path="/lha-store" />
  <section className="lha-store-hero"><div className="container"><img src="/brand/lha-wordmark-white.svg" alt="Libya Hoops Academy"/><p>OFFICIAL STORE · POWERED BY SHABABUNA</p><h1>{pick({en:'LHA Clothing & Accessories',ar:'ملابس وإكسسوارات LHA'})}</h1><span>{pick({en:'The complete LHA product catalogue, with the same prices, account, cart and delivery system.',ar:'كتالوج منتجات LHA بالكامل بنفس الأسعار والحساب والسلة ونظام التوصيل.'})}</span></div></section>
  <section className="section"><div className="container"><div className="store-toolbar"><div><p className="section-label">LHA OFFICIAL STORE</p><h2 className="section-title">{pick({en:'Shop the full collection',ar:'تسوّق المجموعة كاملة'})}</h2></div><Link to="/shop" className="btn-secondary">{pick({en:'Back to Shababuna Shop',ar:'العودة لمتجر شبابنا'})}</Link></div><div className="product-grid product-grid--airy">{items.map((product,index)=><ProductCard key={product.id} product={product} eager={index<4}/>)}</div></div></section>
</>}

import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
export default function OfflinePage(){
  const {pick,lang}=useLanguage();
  return <section className="offline-page"><img src={lang==='ar'?'/brand/shababuna-wordmark-ar-white.png':'/brand/shababuna-wordmark-white.png'} alt="Shababuna"/><p className="section-label">BUILT DIFFERENT.</p><h1>{pick({en:'You are offline',ar:'أنت غير متصل بالإنترنت'})}</h1><p>{pick({en:'Saved public pages may still be available. Reconnect to shop, sign in, pay or track live order updates.',ar:'قد تبقى بعض الصفحات العامة المحفوظة متاحة. أعد الاتصال للتسوق أو تسجيل الدخول أو الدفع أو متابعة تحديثات الطلب.'})}</p><Link className="btn-primary" to="/">{pick({en:'Return Home',ar:'العودة للرئيسية'})}</Link></section>;
}

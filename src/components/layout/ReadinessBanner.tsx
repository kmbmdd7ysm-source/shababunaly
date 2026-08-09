import { useLanguage } from '../../context/LanguageContext';
import { useReadiness } from '../../context/ReadinessContext';
import '../../styles/sysbanner.css';

/**
 * System readiness row — document flow only. Owned by GlobalChrome.
 * Dismiss remains readable text with a 44px hit target and no chrome.
 */
export default function ReadinessBanner() {
  const { pick } = useLanguage();
  const { open, dismiss } = useReadiness();

  return (
    <div className="gw-sysbanner" data-open={open ? 'yes' : 'no'} role="status">
      <div className="gw-sysbanner-inner">
        <p className="gw-sysbanner-copy">
          {pick({
            en: 'The store is available. Some account, payment or message services are temporarily unavailable until their secure connection is restored.',
            ar: 'المتجر متاح. قد تكون بعض خدمات الحساب أو الدفع أو الرسائل غير متاحة مؤقتًا إلى أن يعود الاتصال الآمن بها.',
          })}
        </p>
        <button type="button" className="gw-sysbanner-dismiss" onClick={dismiss}>
          {pick({ en: 'Dismiss', ar: 'إغلاق' })}
        </button>
      </div>
    </div>
  );
}

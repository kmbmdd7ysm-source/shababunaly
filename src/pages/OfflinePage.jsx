import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import '../styles/composition.css';

/*
 * The offline shell, rebuilt as a TERMINAL state.
 *
 * WAS: a wordmark image, a label, a heading, a paragraph and a button, stacked
 * in a bespoke `.offline-page` block.
 *
 * NOW: the shared terminal composition the 404 uses, so the two hard-stop
 * states of the site are structurally the same thing. The wordmark is gone: the
 * masthead above already carries the brand, and repeating it here only pushed
 * the actual message down.
 */
export default function OfflinePage() {
  const { pick } = useLanguage();
  return (
    <section className="gw-terminal">
      <div className="gw-terminal-inner">
        <span className="gw-terminal-code" aria-hidden="true">
          &mdash;
        </span>
        <span className="gw-terminal-rule" aria-hidden="true" />
        <h1 className="gw-terminal-title">
          {pick({ en: 'You are offline', ar: 'أنت غير متصل بالإنترنت' })}
        </h1>
        <p className="gw-terminal-copy">
          {pick({
            en: 'Saved public pages may still be available. Reconnect to shop, sign in, pay or track live order updates.',
            ar: 'قد تبقى بعض الصفحات العامة المحفوظة متاحة. أعد الاتصال للتسوق أو تسجيل الدخول أو الدفع أو متابعة تحديثات الطلب.',
          })}
        </p>
        <div className="gw-terminal-actions">
          <Link className="gw-btn gw-btn--primary" to="/">
            {pick({ en: 'Return Home', ar: 'العودة للرئيسية' })}
          </Link>
        </div>
      </div>
    </section>
  );
}

import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import Seo from '../components/common/Seo';
import Icon from '../components/icons/Icon';
import '../styles/composition.css';

export default function CheckoutStatusPage({ status = 'success' }) {
  const { t } = useLanguage();
  const { clearCart } = useCart();
  const [params] = useSearchParams();
  const ref = params.get('ref') || params.get('session_id') || '';

  useEffect(() => {
    // Only clear the cart once a real provider redirect confirms success.
    if (status === 'success') clearCart();
  }, [status]);

  const success = status === 'success';

  return (
    <>
      <Seo
        title={success ? t.checkoutStatus.successTitle : t.checkoutStatus.cancelledTitle}
        description=""
        path={`/checkout/${success ? 'success' : 'cancelled'}`}
        noindex
      />
      {/* The provider return, rebuilt as a TERMINAL receipt: the outcome mark
          at scale, a measured rule, the reference bidi-isolated, and the routes
          onward as one cluster rather than two stacked full-width buttons. */}
      <section className="gw-terminal" data-outcome={success ? 'ok' : 'warn'}>
        <div className="gw-terminal-inner">
          <span className={`gw-terminal-mark${success ? ' is-ok' : ' is-warn'}`} aria-hidden="true">
            <Icon name={success ? 'check' : 'alert'} size={34} strokeWidth={2.2} />
          </span>
          <span className="gw-terminal-rule" aria-hidden="true" />
          <h1 className="gw-terminal-title">
            {success ? t.checkoutStatus.successTitle : t.checkoutStatus.cancelledTitle}
          </h1>
          <p className="gw-terminal-copy">
            {success ? t.checkoutStatus.successText : t.checkoutStatus.cancelledText}
          </p>
          {success && ref && (
            <p className="gw-terminal-ref">
              {t.checkoutStatus.orderRef}: <strong className="gw-isolate-ltr">{ref}</strong>
            </p>
          )}
          <div className="gw-terminal-actions">
            <Link to="/shop" className="gw-btn gw-btn--primary">
              {t.checkoutStatus.backShop}
            </Link>
            {!success && (
              <Link to="/cart" className="gw-btn gw-btn--secondary">
                {t.checkoutStatus.viewBag}
              </Link>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

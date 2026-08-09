import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import Seo from '../components/common/Seo.tsx';
import Icon from '../components/icons/Icon';
import '../styles/composition.css';

export default function CheckoutStatusPage({ status = 'success' }) {
  const { t } = useLanguage();
  const checkoutStatus = (t.checkoutStatus || {}) as Record<string, string>;
  const { clearCart } = useCart();
  const [params] = useSearchParams();
  const ref = params.get('ref') || params.get('session_id') || '';

  useEffect(() => {
    // Only clear the cart once a real provider redirect confirms success.
    if (status === 'success') clearCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional dependency scope
  }, [status]);

  const success = status === 'success';

  return (
    <>
      <Seo
        title={(success ? checkoutStatus.successTitle : checkoutStatus.cancelledTitle) || ''}
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
            {success ? checkoutStatus.successTitle : checkoutStatus.cancelledTitle}
          </h1>
          <p className="gw-terminal-copy">
            {success ? checkoutStatus.successText : checkoutStatus.cancelledText}
          </p>
          {success && ref && (
            <p className="gw-terminal-ref">
              {checkoutStatus.orderRef}: <strong className="gw-isolate-ltr">{ref}</strong>
            </p>
          )}
          <div className="gw-terminal-actions">
            <Link to="/shop" className="gw-btn gw-btn--primary">
              {checkoutStatus.backShop}
            </Link>
            {!success && (
              <Link to="/cart" className="gw-btn gw-btn--secondary">
                {checkoutStatus.viewBag}
              </Link>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

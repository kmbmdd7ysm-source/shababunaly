import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import Seo from '../components/common/Seo';
import Icon from '../components/icons/Icon';

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
      <section className="section status-page">
        <div className="container status-inner">
          <div className={`status-mark ${success ? 'ok' : 'warn'}`} aria-hidden="true">
            <Icon name={success ? 'check' : 'alert'} size={34} strokeWidth={2.2} />
          </div>
          <h1 className="display-title">
            {success ? t.checkoutStatus.successTitle : t.checkoutStatus.cancelledTitle}
          </h1>
          <p>{success ? t.checkoutStatus.successText : t.checkoutStatus.cancelledText}</p>
          {success && ref && (
            <p className="order-ref">
              {t.checkoutStatus.orderRef}: <strong>{ref}</strong>
            </p>
          )}
          <div className="hero-actions">
            <Link to="/shop" className="btn-primary block">
              {t.checkoutStatus.backShop}
            </Link>
            {!success && (
              <Link to="/cart" className="btn-secondary block">
                {t.checkoutStatus.viewBag}
              </Link>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

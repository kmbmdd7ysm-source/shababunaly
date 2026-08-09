import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useCart } from '../../context/CartContext';
import { useCommerce } from '../../context/CommerceContext';
import { getLibyaFreeShippingProgress, SHIPPING_MESSAGES } from '../../config/shipping';
import SmartImage from '../common/SmartImage';
import QuantitySelector from '../common/QuantitySelector';
import Icon from '../icons/Icon';
import { lockDocumentScroll } from '../../utils/scrollLock';

export default function CartDrawer() {
  const { t, pick, lang } = useLanguage();
  const { format, usdToLydRate } = useCommerce();
  const {
    items,
    drawerOpen,
    closeDrawer,
    updateQuantity,
    removeItem,
    subtotal,
    count,
    hasPhysical,
  } = useCart();
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const prev = document.activeElement;
    ref.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') closeDrawer();
    };
    document.addEventListener('keydown', onKey);
    const unlock = lockDocumentScroll();
    return () => {
      document.removeEventListener('keydown', onKey);
      unlock();
      if (prev instanceof HTMLElement) prev.focus();
    };
  }, [drawerOpen, closeDrawer]);

  const freeShipping = getLibyaFreeShippingProgress(subtotal, usdToLydRate);
  const typeLabel = (type) =>
    type === 'training' ? t.cart.digital : type === 'event' ? t.cart.event : '';

  return (
    <>
      <div
        className={`drawer-overlay${drawerOpen ? ' open' : ''}`}
        onClick={closeDrawer}
        onKeyDown={(event) => {
          if (event.key === 'Escape' || event.key === 'Enter') closeDrawer();
        }}
        role="button"
        tabIndex={drawerOpen ? 0 : -1}
        aria-label={t.common.close}
        aria-hidden={!drawerOpen}
      />
      <aside
        ref={ref}
        tabIndex={-1}
        className={`cart-drawer${drawerOpen ? ' open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={t.a11y.cartDialog}
        aria-hidden={!drawerOpen}
      >
        <div className="cart-drawer-head">
          <h2>
            {t.cart.title} {count > 0 && <span className="cart-drawer-count">({count})</span>}
          </h2>
          <button className="icon-btn" onClick={closeDrawer} aria-label={t.a11y.closeCart}>
            <Icon name="close" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="cart-drawer-empty">
            <span aria-hidden="true">🏀</span>
            <p>{t.cart.empty}</p>
            <span className="muted">{t.cart.emptyHint}</span>
            <button className="btn-primary" onClick={closeDrawer}>
              {t.cart.startShopping}
            </button>
          </div>
        ) : (
          <>
            {hasPhysical ? (
              <div className="freeship-bar">
                <p>
                  {freeShipping.remainingUsd > 0 ? (
                    <>
                      {format(freeShipping.remainingUsd, lang)} {SHIPPING_MESSAGES.progress[lang]}
                    </>
                  ) : (
                    SHIPPING_MESSAGES.unlocked[lang]
                  )}
                </p>
                <progress
                  className="freeship-progress"
                  max="100"
                  value={freeShipping.progressPercent}
                  aria-label={pick({
                    en: 'Free delivery progress',
                    ar: 'التقدم نحو التوصيل المجاني',
                  })}
                />
              </div>
            ) : (
              <div className="freeship-bar">
                <p>
                  {items.some((item) => item.type === 'training') &&
                  items.some((item) => item.type === 'event')
                    ? lang === 'ar'
                      ? 'توصيل التدريب رقمياً وتأكيد تسجيل الفعالية — دون شحن مادي'
                      : 'Digital training delivery and event registration confirmation — no physical shipping'
                    : items.some((item) => item.type === 'event')
                      ? lang === 'ar'
                        ? 'تأكيد تسجيل الفعالية — دون شحن مادي'
                        : 'Event registration confirmation — no physical shipping'
                      : lang === 'ar'
                        ? 'توصيل رقمي — دون شحن مادي'
                        : 'Digital delivery — no physical shipping'}
                </p>
              </div>
            )}
            <ul className="cart-drawer-items">
              {items.map((item) => (
                <li key={item.key} className="cart-line">
                  <Link to={item.href || '#'} className="cart-line-media" onClick={closeDrawer}>
                    <SmartImage src={item.image} alt={pick(item.name)} />
                  </Link>
                  <div className="cart-line-info">
                    <Link to={item.href || '#'} className="cart-line-name" onClick={closeDrawer}>
                      {pick(item.name)}
                    </Link>
                    {typeLabel(item.type) && (
                      <span className="cart-line-type">{typeLabel(item.type)}</span>
                    )}
                    {item.size && item.size !== 'OS' && (
                      <span className="cart-line-variant">
                        {t.common.size}: {item.size}
                      </span>
                    )}
                    {item.color && (
                      <span className="cart-line-variant">
                        {t.common.color}: {item.color}
                      </span>
                    )}
                    <div className="cart-line-controls">
                      {item.type === 'product' ? (
                        <QuantitySelector
                          value={item.quantity}
                          onChange={(q) => updateQuantity(item.key, q)}
                          max={item.maxStock || 99}
                          compact
                        />
                      ) : (
                        <span className="cart-line-qty1">×1</span>
                      )}
                      <button className="cart-line-remove" onClick={() => removeItem(item.key)}>
                        {t.cart.remove}
                      </button>
                    </div>
                  </div>
                  <span className="cart-line-price" dir="ltr">
                    {format(item.price * item.quantity, lang)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="cart-drawer-foot">
              <div className="cart-subtotal-row">
                <span>{t.cart.subtotal}</span>
                <strong dir="ltr">{format(subtotal, lang)}</strong>
              </div>
              <p className="cart-shipping-note">{t.cart.shippingCalc}</p>
              <button
                type="button"
                className="btn-primary block"
                onClick={() => {
                  closeDrawer();
                  navigate('/checkout');
                }}
              >
                {t.cart.checkout}
              </button>
              <Link to="/cart" className="btn-secondary block" onClick={closeDrawer}>
                {t.cart.viewBag}
              </Link>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

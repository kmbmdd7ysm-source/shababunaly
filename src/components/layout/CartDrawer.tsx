import type { ReactElement } from 'react';
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
import '../../styles/domain-overlays.css';

export default function CartDrawer(): ReactElement | null {
  const { t, pick, lang } = useLanguage();
  const cartCopy = (t.cart || {}) as Record<string, string>;
  const a11y = (t.a11y || {}) as Record<string, string>;
  const common = (t.common || {}) as Record<string, string>;
  const { format, usdToLydRate, countryCode } = useCommerce();
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
  const ref = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const prev = document.activeElement;
    ref.current?.focus();
    const onKey = (e: globalThis.KeyboardEvent) => {
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
  const showLibyaFreeShip = hasPhysical && String(countryCode || '').toUpperCase() === 'LY';
  const typeLabel = (type: unknown): string =>
    type === 'training' ? cartCopy.digital || '' : type === 'event' ? cartCopy.event || '' : '';

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
        aria-label={common.close}
        aria-hidden={!drawerOpen}
      />
      <aside
        ref={ref}
        tabIndex={-1}
        className={`cart-drawer${drawerOpen ? ' open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={a11y.cartDialog}
        aria-hidden={!drawerOpen}
      >
        <div className="cart-drawer-head">
          <h2>
            {cartCopy.title} {count > 0 && <span className="cart-drawer-count">({count})</span>}
          </h2>
          <button className="icon-btn" onClick={closeDrawer} aria-label={a11y.closeCart}>
            <Icon name="close" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="cart-drawer-empty">
            <div className="gw-empty-orb" aria-hidden="true">
              <svg viewBox="0 0 120 120" width="72" height="72" fill="none">
                <circle cx="60" cy="60" r="52" stroke="currentColor" strokeWidth="2.5" />
                <path
                  d="M60 8c18 16 28 34 28 52s-10 36-28 52"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M60 8c-18 16-28 34-28 52s10 36 28 52"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path d="M12 48c30 8 66 8 96 0" stroke="currentColor" strokeWidth="2" />
                <path d="M12 72c30-8 66-8 96 0" stroke="currentColor" strokeWidth="2" />
              </svg>
            </div>
            <p>{cartCopy.empty}</p>
            <span className="muted">{cartCopy.emptyHint}</span>
            <div className="gw-empty-actions">
              <button type="button" className="btn-primary" onClick={closeDrawer}>
                {cartCopy.startShopping}
              </button>
              <Link to="/shop/ready-to-ship" className="btn-secondary" onClick={closeDrawer}>
                {pick({ en: 'Ready to Ship', ar: 'تسليم فوري' })}
              </Link>
            </div>
          </div>
        ) : (
          <>
            {showLibyaFreeShip ? (
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
            ) : !hasPhysical ? (
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
            ) : null}
            <ul className="cart-drawer-items">
              {items.map((item) => (
                <li key={item.key} className="cart-line">
                  <Link to={item.href || '#'} className="cart-line-media" onClick={closeDrawer}>
                    <SmartImage
                      src={String(item.image || '')}
                      alt={pick(item.name as { en?: string; ar?: string })}
                    />
                  </Link>
                  <div className="cart-line-info">
                    <Link to={item.href || '#'} className="cart-line-name" onClick={closeDrawer}>
                      {pick(item.name as { en?: string; ar?: string })}
                    </Link>
                    {typeLabel(item.type) && (
                      <span className="cart-line-type">{typeLabel(item.type)}</span>
                    )}
                    {item.size && item.size !== 'OS' ? (
                      <span className="cart-line-variant">
                        {common.size}: {String(item.size)}
                      </span>
                    ) : null}
                    {item.color ? (
                      <span className="cart-line-variant">
                        {common.color}: {String(item.color)}
                      </span>
                    ) : null}
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
                        {cartCopy.remove}
                      </button>
                    </div>
                  </div>
                  <span className="cart-line-price" dir="ltr">
                    {format(Number(item.price || 0) * Number(item.quantity || 0), lang)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="cart-drawer-foot">
              <div className="cart-subtotal-row">
                <span>{cartCopy.subtotal}</span>
                <strong dir="ltr">{format(subtotal, lang)}</strong>
              </div>
              <p className="cart-shipping-note">{cartCopy.shippingCalc}</p>
              <button
                type="button"
                className="btn-primary block"
                onClick={() => {
                  closeDrawer();
                  navigate('/checkout');
                }}
              >
                {cartCopy.checkout}
              </button>
              <Link to="/cart" className="btn-secondary block" onClick={closeDrawer}>
                {cartCopy.viewBag}
              </Link>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

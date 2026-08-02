import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { useCommerce } from '../context/CommerceContext';
import { getLibyaFreeShippingProgress, SHIPPING_MESSAGES } from '../config/shipping';
import Seo from '../components/common/Seo';
import PageHero from '../components/common/PageHero';
import SmartImage from '../components/common/SmartImage';
import QuantitySelector from '../components/common/QuantitySelector';
import EmptyState from '../components/common/EmptyState';
import { useCatalog } from '../context/CatalogContext';
import Icon from '../components/icons/Icon';

export default function CartPage() {
  const { getProduct } = useCatalog();
  const { t, pick, lang } = useLanguage();
  const { format, usdToLydRate } = useCommerce();
  const { items, updateQuantity, removeItem, subtotal, hasPhysical } = useCart();

  const freeShipping = getLibyaFreeShippingProgress(subtotal, usdToLydRate);
  const showFreeShip = hasPhysical;

  return (
    <>
      <Seo title={t.cart.title} description={t.cart.title} path="/cart" noindex />
      <PageHero label={t.nav.cart} title={t.cart.title} />

      <section className="section">
        <div className="container">
          {items.length === 0 ? (
            <EmptyState
              message={t.cart.empty}
              hint={t.cart.emptyHint}
              action={{ label: t.cart.startShopping, to: '/shop' }}
            />
          ) : (
            <div className="cart-grid">
              <div className="cart-lines">
                {showFreeShip && (
                  <div className="freeship-note">
                    {freeShipping.remainingUsd > 0 ? (
                      <>
                        {format(freeShipping.remainingUsd, lang)} {SHIPPING_MESSAGES.progress[lang]}
                      </>
                    ) : (
                      <>{SHIPPING_MESSAGES.unlocked[lang]}</>
                    )}
                    <progress className="freeship-progress" max="100" value={freeShipping.progressPercent} aria-label={pick({ en: 'Free delivery progress', ar: 'التقدم نحو التوصيل المجاني' })} />
                  </div>
                )}

                <ul className="cart-list">
                  {items.map((item) => {
                    const product = item.type === 'product' ? getProduct(item.slug) : null;
                    return (
                      <li key={item.key} className="cart-line">
                        <Link to={item.href || '#'} className="cart-line-media">
                          <SmartImage src={item.image} alt={pick(item.name)} />
                        </Link>
                        <div className="cart-line-body">
                          <Link to={item.href || '#'} className="cart-line-name">
                            {pick(item.name)}
                          </Link>
                          <p className="cart-line-meta">
                            {item.type === 'product' && item.color && product && (
                              <span>
                                {pick(product.colors.find((c) => c.key === item.color)?.name) ||
                                  item.color}
                              </span>
                            )}
                            {item.type === 'product' && item.size && item.size !== 'OS' && (
                              <span> · {item.size}</span>
                            )}
                            {item.type === 'training' && <span>{t.cart.digital}</span>}
                            {item.type === 'event' && <span>{t.cart.event}</span>}
                          </p>
                          <div className="cart-line-controls">
                            {item.type === 'product' ? (
                              <QuantitySelector
                                value={item.quantity}
                                onChange={(q) => updateQuantity(item.key, q)}
                                min={1}
                                max={item.maxStock || 99}
                                compact
                              />
                            ) : (
                              <span className="cart-qty-fixed">{t.cart.qty}: 1</span>
                            )}
                            <button
                              type="button"
                              className="link-btn danger"
                              onClick={() => removeItem(item.key)}
                            >
                              {t.cart.remove}
                            </button>
                          </div>
                        </div>
                        <div className="cart-line-price">
                          {format(item.price * item.quantity, lang)}
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <Link to="/shop" className="link-btn cart-continue">
                  <Icon name="back" size={18} /> {t.cart.continue}
                </Link>
              </div>

              <aside className="cart-summary">
                <h2 className="summary-title">{t.cart.title}</h2>
                <div className="summary-row">
                  <span>{t.cart.subtotal}</span>
                  <span>{format(subtotal, lang)}</span>
                </div>
                <div className="summary-row muted">
                  <span>{t.cart.shipping}</span>
                  <span>
                    {hasPhysical
                      ? t.cart.shippingCalc
                      : items.some((item) => item.type === 'event') &&
                          !items.some((item) => item.type === 'training')
                        ? lang === 'ar'
                          ? 'لا يوجد شحن مادي — مجاني'
                          : 'No physical shipping — Free'
                        : (lang === 'ar' ? 'توصيل رقمي — مجاني' : 'Digital delivery — Free')}
                  </span>
                </div>
                <div className="summary-row total">
                  <span>{t.cart.total}</span>
                  <span>{format(subtotal, lang)}</span>
                </div>
                <Link to="/checkout" className="btn-primary block">
                  {t.cart.checkout}
                </Link>
                <p className="summary-note">{t.checkout.secureNote}</p>
              </aside>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

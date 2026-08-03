import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { useCommerce } from '../context/CommerceContext';
import { getLibyaFreeShippingProgress, SHIPPING_MESSAGES } from '../config/shipping';
import Seo from '../components/common/Seo';
import SmartImage from '../components/common/SmartImage';
import QuantitySelector from '../components/common/QuantitySelector';
import EmptyState from '../components/common/EmptyState';
import '../styles/ledger.css';
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

      {/* A LEDGER, not a page with a hero. The bag is a running account: a
          measured masthead carrying the item count as a figure, then the lines,
          then the reckoning. */}
      <section className="gw-ledger" aria-labelledby="gw-cart-title">
        <div className="gw-ledger-inner">
          <div className="gw-ledger-head">
            <p className="gw-spec">{t.nav.cart}</p>
            <div className="gw-ledger-head-row">
              <h1 id="gw-cart-title" className="gw-ledger-title">
                {t.cart.title}
              </h1>
              <p className="gw-ledger-count">
                <span className="gw-figure gw-isolate-ltr">{items.length}</span>
                <span className="gw-spec">
                  {items.length === 1
                    ? pick({ en: 'line', ar: 'سطر' })
                    : pick({ en: 'lines', ar: 'أسطر' })}
                </span>
              </p>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="gw-ledger-empty">
              <EmptyState
                message={t.cart.empty}
                hint={t.cart.emptyHint}
                action={{ label: t.cart.startShopping, to: '/shop' }}
              />
            </div>
          ) : (
            <div className="gw-ledger-body">
              <div className="gw-ledger-lines">
                {showFreeShip && (
                  <div className="gw-threshold">
                    <p className="gw-threshold-text">
                      {freeShipping.remainingUsd > 0 ? (
                        <>
                          {format(freeShipping.remainingUsd, lang)}{' '}
                          {SHIPPING_MESSAGES.progress[lang]}
                        </>
                      ) : (
                        <>{SHIPPING_MESSAGES.unlocked[lang]}</>
                      )}
                    </p>
                    <progress
                      className="gw-threshold-bar"
                      max="100"
                      value={freeShipping.progressPercent}
                      aria-label={pick({
                        en: 'Free delivery progress',
                        ar: 'التقدم نحو التوصيل المجاني',
                      })}
                    />
                  </div>
                )}

                <ul className="gw-lines">
                  {items.map((item, index) => {
                    const product = item.type === 'product' ? getProduct(item.slug) : null;
                    return (
                      <li key={item.key} className="gw-line">
                        <span className="gw-line-index" aria-hidden="true">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <Link to={item.href || '#'} className="gw-line-media">
                          <SmartImage src={item.image} alt={pick(item.name)} />
                        </Link>
                        <div className="gw-line-body">
                          <Link to={item.href || '#'} className="gw-line-name">
                            {pick(item.name)}
                          </Link>
                          <p className="gw-line-meta">
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
                          <div className="gw-line-controls">
                            {item.type === 'product' ? (
                              <QuantitySelector
                                value={item.quantity}
                                onChange={(q) => updateQuantity(item.key, q)}
                                min={1}
                                max={item.maxStock || 99}
                                compact
                              />
                            ) : (
                              <span className="gw-line-fixed">{t.cart.qty}: 1</span>
                            )}
                            <button
                              type="button"
                              className="gw-line-remove"
                              onClick={() => removeItem(item.key)}
                            >
                              {t.cart.remove}
                            </button>
                          </div>
                        </div>
                        <div className="gw-line-price">
                          {format(item.price * item.quantity, lang)}
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <Link to="/shop" className="gw-ledger-back">
                  <Icon name="back" size={18} /> {t.cart.continue}
                </Link>
              </div>

              {/* THE RECKONING — a specification block, with the total set
                  apart by a heavier rule rather than by colour. */}
              <aside className="gw-reckoning" aria-labelledby="gw-reckoning-title">
                <h2 id="gw-reckoning-title" className="gw-spec gw-reckoning-title">
                  {t.cart.title}
                </h2>
                <dl className="gw-reckoning-rows">
                  <div>
                    <dt>{t.cart.subtotal}</dt>
                    <dd>{format(subtotal, lang)}</dd>
                  </div>
                  <div>
                    <dt>{t.cart.shipping}</dt>
                    <dd className="gw-reckoning-muted">
                      {hasPhysical
                        ? t.cart.shippingCalc
                        : items.some((item) => item.type === 'event') &&
                            !items.some((item) => item.type === 'training')
                          ? lang === 'ar'
                            ? 'لا يوجد شحن مادي — مجاني'
                            : 'No physical shipping — Free'
                          : lang === 'ar'
                            ? 'توصيل رقمي — مجاني'
                            : 'Digital delivery — Free'}
                    </dd>
                  </div>
                </dl>
                <p className="gw-reckoning-total">
                  <span>{t.cart.total}</span>
                  <span>{format(subtotal, lang)}</span>
                </p>
                <Link to="/checkout" className="gw-btn gw-btn--primary gw-reckoning-commit">
                  {t.cart.checkout}
                </Link>
                <p className="gw-reckoning-note">{t.checkout.secureNote}</p>
              </aside>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { useCommerce } from '../context/CommerceContext';
import { getLibyaFreeShippingProgress, SHIPPING_MESSAGES } from '../config/shipping';
import Seo from '../components/common/Seo';
import SmartImage from '../components/common/SmartImage';
import QuantitySelector from '../components/common/QuantitySelector';
import '../styles/domain-commerce.css';
import '../styles/ledger.css';
import { useCatalog } from '../context/CatalogContext';
import { categories } from '../data/categories';
import Icon from '../components/icons/Icon';
import '../styles/transact.css';
import '../styles/domain-misc.css';

export default function CartPage(): ReactElement {
  const { getProduct, products } = useCatalog();
  const { t, pick, lang } = useLanguage();
  const cartCopy = (t.cart || {}) as Record<string, string>;
  const nav = (t.nav || {}) as Record<string, string>;
  const checkoutCopy = (t.checkout || {}) as Record<string, string>;
  const { format, usdToLydRate, countryCode } = useCommerce();
  const { items, updateQuantity, removeItem, subtotal, hasPhysical } = useCart();

  // Ready-to-ship is a Libya-only department; the empty-bag gates honour the
  // same rule the catalogue does.

  const freeShipping = getLibyaFreeShippingProgress(subtotal, usdToLydRate);
  // Libya free-delivery progress is only meaningful for Libya destinations —
  // international carts calculate shipping at checkout and must not show the
  // Libya unlock banner.
  const showFreeShip = hasPhysical && String(countryCode || '').toUpperCase() === 'LY';

  return (
    <>
      <Seo title={cartCopy.title || ''} description={cartCopy.title || ''} path="/cart" noindex />

      {/* A LEDGER, not a page with a hero. The bag is a running account: a
          measured masthead carrying the item count as a figure, then the lines,
          then the reckoning. */}
      <section className="gw-ledger" aria-labelledby="gw-cart-title">
        <div className="gw-ledger-inner">
          <div className="gw-ledger-head">
            <p className="gw-kicker">{nav.cart}</p>
            <div className="gw-ledger-head-row">
              <h1 id="gw-cart-title" className="gw-ledger-title">
                {cartCopy.title}
              </h1>
              <p className="gw-ledger-count">
                <span className="gw-figure gw-isolate-ltr">{items.length}</span>
                <span className="gw-kicker">
                  {items.length === 1
                    ? pick({ en: 'line', ar: 'سطر' })
                    : pick({ en: 'lines', ar: 'أسطر' })}
                </span>
              </p>
            </div>
          </div>

          {items.length === 0 ? (
            /* An empty bag was a small dashed box adrift in a tall white field
               with the footer crowding in — a dead end at the exact moment the
               visitor is most likely to leave. It is now a departure board:
               the statement, then every department as a numbered way back into
               the catalogue with its live count. Same copy, same primary
               action, but the screen does something. */
            <div className="gw-ledger-empty">
              <div className="gw-ledger-empty-say">
                <div className="gw-empty-orb" aria-hidden="true">
                  <svg viewBox="0 0 120 120" width="120" height="120" fill="none">
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

                <p className="gw-ledger-empty-line">{cartCopy.empty}</p>
                <p className="gw-ledger-empty-hint">{cartCopy.emptyHint}</p>
                <div className="gw-empty-actions">
                  <Link to="/shop" className="gw-btn gw-btn--primary">
                    {cartCopy.startShopping}
                  </Link>
                  <Link to="/shop/ready-to-ship" className="gw-btn gw-btn--ghost">
                    {pick({ en: 'Ready to Ship', ar: 'تسليم فوري' })}
                  </Link>
                </div>
              </div>
              <ul className="gw-ledger-gates">
                {categories.map((entry) => (
                  <li key={entry.slug}>
                    <Link to={`/shop/${entry.slug}`}>
                      <span className="gw-ledger-gate-name">{pick(entry.name)}</span>
                      <span className="gw-ledger-gate-count gw-isolate-ltr">
                        {products.filter((item) => item.category === entry.slug).length}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
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
                    const product = item.type === 'product' && item.slug ? getProduct(String(item.slug)) : null;
                    return (
                      <li key={item.key} className="gw-line">
                        <span className="gw-line-index" aria-hidden="true">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <Link to={item.href || '#'} className="gw-line-media">
                          <SmartImage src={String(item.image || '')} alt={pick(item.name as { en?: string; ar?: string })} />
                        </Link>
                        <div className="gw-line-body">
                          <Link to={item.href || '#'} className="gw-line-name">
                            {pick(item.name as { en?: string; ar?: string })}
                          </Link>
                          <p className="gw-line-meta">
                            {item.type === 'product' && item.color && product ? (
                              <span>
                                {String(
                                  pick(
                                    ((Array.isArray(product.colors) ? product.colors : []).find(
                                      (c) => c.key === item.color,
                                    )?.name as { en?: string; ar?: string } | undefined) || {
                                      en: String(item.color),
                                      ar: String(item.color),
                                    },
                                  ) || item.color,
                                )}
                              </span>
                            ) : null}
                            {item.type === 'product' && item.size && item.size !== 'OS' ? (
                              <span>{` · ${String(item.size)}`}</span>
                            ) : null}
                            {item.type === 'training' ? <span>{cartCopy.digital || ''}</span> : null}
                            {item.type === 'event' ? <span>{cartCopy.event || ''}</span> : null}
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
                              <span className="gw-line-fixed">{cartCopy.qty}: 1</span>
                            )}
                            <button
                              type="button"
                              className="gw-line-remove"
                              onClick={() => removeItem(item.key)}
                            >
                              {cartCopy.remove}
                            </button>
                          </div>
                        </div>
                        <div className="gw-line-price">
                          {format(Number(item.price || 0) * Number(item.quantity || 0), lang)}
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <Link to="/shop" className="gw-ledger-back">
                  <Icon name="back" size={18} /> {cartCopy.continue}
                </Link>
              </div>

              {/* THE RECKONING — a specification block, with the total set
                  apart by a heavier rule rather than by colour. */}
              <aside className="gw-reckoning" aria-labelledby="gw-reckoning-title">
                <h2 id="gw-reckoning-title" className="gw-kicker gw-reckoning-title">
                  {cartCopy.title}
                </h2>
                <dl className="gw-reckoning-rows">
                  <div>
                    <dt>{cartCopy.subtotal}</dt>
                    <dd>{format(subtotal, lang)}</dd>
                  </div>
                  <div>
                    <dt>{cartCopy.shipping}</dt>
                    <dd className="gw-reckoning-muted">
                      {hasPhysical
                        ? cartCopy.shippingCalc
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
                  <span>{cartCopy.total}</span>
                  <span>{format(subtotal, lang)}</span>
                </p>
                <Link to="/checkout" className="gw-btn gw-btn--primary gw-reckoning-commit">
                  {cartCopy.checkout}
                </Link>
                <p className="gw-reckoning-note">{checkoutCopy.secureNote}</p>
              </aside>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import Icon from '../icons/Icon';

export default function AccountOverview({
  cartCount,
  wishlistCount,
  compareCount,
  ordersCount,
}: {
  cartCount: number;
  wishlistCount: number;
  compareCount: number;
  ordersCount: number;
}) {
  const { pick } = useLanguage();
  const cards = [
    {
      key: 'cart',
      label: pick({ en: 'Cart', ar: 'السلة' }),
      value: cartCount,
      icon: 'bag',
    },
    {
      key: 'wishlist',
      label: pick({ en: 'Wishlist', ar: 'المفضلة' }),
      value: wishlistCount,
      icon: 'heart',
    },
    {
      key: 'compare',
      label: pick({ en: 'Comparisons', ar: 'المقارنات' }),
      value: compareCount,
      icon: 'compare',
    },
    {
      key: 'orders',
      label: pick({ en: 'Orders', ar: 'الطلبات' }),
      value: ordersCount,
      icon: 'orders',
    },
  ];

  return (
    <div className="gw-account-summary">
      {cards.map((card) => (
        <article className="gw-account-summary-card" key={card.key}>
          <div className="gw-account-summary-card__top">
            <h2>{card.label}</h2>
            <span className="gw-account-summary-card__icon" aria-hidden="true">
              <Icon name={card.icon} size={19} strokeWidth={1.8} />
            </span>
          </div>
          <strong>{card.value}</strong>
          {card.key === 'orders' ? (
            <Link to="/order-tracking">
              {pick({ en: 'View My Orders', ar: 'عرض طلباتي' })}
            </Link>
          ) : null}
        </article>
      ))}
    </div>
  );
}

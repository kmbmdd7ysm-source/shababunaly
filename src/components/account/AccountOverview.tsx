import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';

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
  return (
    <div className="gw-account-summary">
      <article className="gw-account-summary-card">
        <h2>{pick({ en: 'Cart', ar: 'السلة' })}</h2>
        <strong>{cartCount}</strong>
      </article>
      <article className="gw-account-summary-card">
        <h2>{pick({ en: 'Wishlist', ar: 'المفضلة' })}</h2>
        <strong>{wishlistCount}</strong>
      </article>
      <article className="gw-account-summary-card">
        <h2>{pick({ en: 'Comparisons', ar: 'المقارنات' })}</h2>
        <strong>{compareCount}</strong>
      </article>
      <article className="gw-account-summary-card">
        <h2>{pick({ en: 'Orders', ar: 'الطلبات' })}</h2>
        <strong>{ordersCount}</strong>
        <Link to="/order-tracking">{pick({ en: 'View My Orders', ar: 'عرض طلباتي' })}</Link>
      </article>
    </div>
  );
}

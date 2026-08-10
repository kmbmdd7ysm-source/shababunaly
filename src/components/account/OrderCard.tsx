import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { presentOrderStatus } from '../../services/orderStatus.ts';

export type OrderLike = {
  orderNumber?: string;
  createdAt?: string;
  orderStatus?: string;
  paymentStatus?: string;
  syncState?: string;
  displayTotal?: number;
  total?: number;
  displayCurrency?: string;
  items?: Array<{ id?: string; sku?: string; quantity?: number; name?: string }>;
  [key: string]: unknown;
};

export default function OrderCard({
  order,
  compact = false,
}: {
  order: OrderLike;
  compact?: boolean;
}) {
  const { pick, lang } = useLanguage();
  const orderStatus = presentOrderStatus('order', order.orderStatus, lang === 'ar' ? 'ar' : 'en');
  const paymentStatus = presentOrderStatus(
    'payment',
    order.paymentStatus,
    lang === 'ar' ? 'ar' : 'en',
  );
  return (
    <article className={`order-card${compact ? ' order-card--compact' : ''}`}>
      <div className="order-card-head">
        <div>
          <h3>{String(order.orderNumber || '')}</h3>
          <time dateTime={String(order.createdAt || '')}>
            {new Intl.DateTimeFormat(lang === 'ar' ? 'ar' : 'en', { dateStyle: 'medium' }).format(
              new Date(String(order.createdAt || Date.now())),
            )}
          </time>
        </div>
        {order.syncState === 'local-only' && (
          <span className="status-badge status-neutral">
            {pick({ en: 'Local order', ar: 'طلب محلي' })}
          </span>
        )}
      </div>
      <dl>
        <div>
          <dt>{pick({ en: 'Order status', ar: 'حالة الطلب' })}</dt>
          <dd>
            <span className={`status-badge status-${orderStatus.category}`}>
              {orderStatus.label}
            </span>
          </dd>
        </div>
        <div>
          <dt>{pick({ en: 'Payment', ar: 'الدفع' })}</dt>
          <dd>
            <span className={`status-badge status-${paymentStatus.category}`}>
              {paymentStatus.label}
            </span>
          </dd>
        </div>
        <div>
          <dt>{pick({ en: 'Total', ar: 'الإجمالي' })}</dt>
          <dd>
            {(order.displayTotal ?? order.total ?? 0).toFixed(2)} {order.displayCurrency}
          </dd>
        </div>
      </dl>
      {!compact && (
        <ul>
          {(order.items || []).map((item, index) => (
            <li key={`${item.id || item.sku}-${index}`}>
              {item.quantity} × {item.name}
            </li>
          ))}
        </ul>
      )}
      <Link
        className="link-btn"
        to={`/order-tracking/${encodeURIComponent(String(order.orderNumber || ''))}`}
      >
        {pick({ en: 'View Details', ar: 'عرض التفاصيل' })}
      </Link>
    </article>
  );
}

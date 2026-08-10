import { Link } from 'react-router-dom';
import type { ReactElement } from 'react';
import OrderCard from '../../components/account/OrderCard';

type PickFn = (value: unknown) => string;

type OrdersState = {
  state: string;
  orders: Array<Record<string, unknown> & { id?: string }>;
};

export default function OrdersSection({
  pick,
  ordersState,
  loadOrders,
}: {
  pick: PickFn;
  ordersState: OrdersState;
  loadOrders: () => void;
}): ReactElement {
  return (
    <section aria-labelledby="account-orders-title">
      <div className="section-heading-row">
        <h2 id="account-orders-title">
          {pick({ en: 'Recent Orders', ar: 'الطلبات الأخيرة' })}
        </h2>
        {['error', 'partial'].includes(ordersState.state) ? (
          <button
            className="btn-secondary"
            type="button"
            onClick={loadOrders}
            disabled={ordersState.state === 'retrying'}
          >
            {ordersState.state === 'retrying'
              ? pick({ en: 'Retrying…', ar: 'جارٍ إعادة المحاولة…' })
              : pick({ en: 'Retry', ar: 'إعادة المحاولة' })}
          </button>
        ) : null}
      </div>
      {ordersState.state === 'loading' ? (
        <p role="status">{pick({ en: 'Loading orders…', ar: 'جاري تحميل الطلبات…' })}</p>
      ) : null}
      {ordersState.state === 'partial' ? (
        <div className="notice notice--info" role="status">
          {pick({
            en: 'Cloud synchronization is temporarily unavailable. Local orders are shown.',
            ar: 'المزامنة السحابية غير متاحة مؤقتاً. يتم عرض الطلبات المحلية.',
          })}
        </div>
      ) : null}
      {ordersState.state === 'error' ? (
        <div className="notice notice--info" role="alert">
          {pick({ en: 'We could not load your orders.', ar: 'تعذر تحميل طلباتك.' })}
        </div>
      ) : null}
      {!['loading', 'error'].includes(ordersState.state) ? (
        ordersState.orders.length ? (
          <div className="orders-list">
            {ordersState.orders.slice(0, 5).map((order) => (
              <OrderCard
                key={String(order.id)}
                order={order as never}
                compact
              />
            ))}
          </div>
        ) : (
          <div className="notice notice--muted">
            {pick({ en: 'No orders yet.', ar: 'لا توجد طلبات حتى الآن.' })}
          </div>
        )
      ) : null}
      <Link className="btn-secondary" to="/order-tracking">
        {pick({ en: 'View All Orders', ar: 'عرض كل الطلبات' })}
      </Link>
    </section>
  );
}

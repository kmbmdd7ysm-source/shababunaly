export { Stat } from './Stat';
import { useEffect, useState } from 'react';
import {
  publishDesignProof,
  recordManualPayment,
  recordQuotePayment,
  recordRefund,
  setShippingQuote,
  updateAdminUserRole,
  updateCatalogProduct,
  updateCatalogVariant,
  updateOrderWorkflow,
  updateQuoteWorkflow,
  updateReturnRequest,
  updateSpecialRequest,
  uploadDesignProofFiles,
} from '../../services/operations';

const ORDER_TRANSITIONS = {
  received: ['awaiting_cash_confirmation', 'awaiting_payment', 'confirmed', 'cancelled'],
  pending_shipping_quote: ['awaiting_payment', 'cancelled'],
  awaiting_cash_confirmation: ['confirmed', 'cancelled'],
  awaiting_payment: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'design_in_progress', 'in_production', 'ready_to_ship', 'cancelled'],
  processing: [
    'design_in_progress',
    'in_production',
    'quality_control',
    'ready_to_ship',
    'cancelled',
  ],
  design_in_progress: ['awaiting_design_approval', 'cancelled'],
  awaiting_design_approval: ['design_approved', 'design_in_progress', 'cancelled'],
  design_approved: ['in_production', 'cancelled'],
  in_production: ['quality_control', 'arrived', 'cancelled'],
  quality_control: ['arrived', 'final_payment_required', 'ready_to_ship', 'cancelled'],
  arrived: ['final_payment_required', 'ready_to_ship', 'cancelled'],
  final_payment_required: ['ready_to_ship', 'cancelled'],
  ready_to_ship: ['shipped', 'out_for_delivery', 'delivered', 'cancelled'],
  shipped: ['out_for_delivery', 'delivered'],
  out_for_delivery: ['delivered'],
  completed: ['delivered'],
  delivered: [],
  cancelled: [],
};
const QUOTE_TRANSITIONS = {
  under_review: ['quote_sent', 'cancelled'],
  quote_sent: ['awaiting_approval', 'deposit_required', 'under_review', 'cancelled'],
  awaiting_approval: ['deposit_required', 'under_review', 'cancelled'],
  deposit_required: ['cancelled'],
  deposit_paid: ['design_in_progress', 'in_production', 'cancelled'],
  design_in_progress: ['awaiting_design_approval', 'cancelled'],
  awaiting_design_approval: ['design_approved', 'design_in_progress', 'cancelled'],
  design_approved: ['in_production', 'cancelled'],
  in_production: ['quality_control', 'arrived', 'cancelled'],
  quality_control: ['arrived', 'final_payment_required', 'cancelled'],
  arrived: ['final_payment_required', 'cancelled'],
  final_payment_required: ['cancelled'],
  completed: [],
  cancelled: [],
};
const RETURN_TRANSITIONS = {
  requested: ['under_review', 'approved', 'rejected'],
  under_review: ['approved', 'rejected'],
  approved: ['received'],
  received: ['refund_pending', 'closed'],
  refund_pending: ['closed'],
  refunded: ['closed'],
  closed: [],
  rejected: [],
  cancelled: [],
};
const money = (value) => (value == null ? '—' : `$${Number(value).toFixed(2)}`);

export function StaffAccessManager({
  state,
  accessToken,
  currentUserId,
  pick,
  saving,
  run,
  onUpdated,
}) {
  if (state.loading)
    return <p role="status">{pick({ en: 'Loading users…', ar: 'جاري تحميل المستخدمين…' })}</p>;
  if (state.error) return <p className="form-error">{state.error}</p>;
  return (
    <div className="operations-table-wrap">
      <table className="operations-table staff-access-table">
        <thead>
          <tr>
            <th>{pick({ en: 'User', ar: 'المستخدم' })}</th>
            <th>{pick({ en: 'Account', ar: 'الحساب' })}</th>
            <th>{pick({ en: 'Role', ar: 'الصلاحية' })}</th>
            <th>{pick({ en: 'Action', ar: 'الإجراء' })}</th>
          </tr>
        </thead>
        <tbody>
          {state.rows.map((user) => (
            <StaffAccessRow
              key={user.id}
              user={user}
              accessToken={accessToken}
              currentUserId={currentUserId}
              pick={pick}
              saving={saving}
              run={run}
              onUpdated={onUpdated}
            />
          ))}
          {!state.rows.length && (
            <tr>
              <td colSpan="4">{pick({ en: 'No users found.', ar: 'لا يوجد مستخدمون.' })}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function StaffAccessRow({ user, accessToken, currentUserId, pick, saving, run, onUpdated }) {
  const [role, setRole] = useState(user.role || 'customer');
  useEffect(() => setRole(user.role || 'customer'), [user.role]);
  const key = `staff-role-${user.id}`;
  return (
    <tr>
      <td>
        <strong>{user.displayName || user.email}</strong>
        <small>{user.email}</small>
      </td>
      <td>{user.organizationName || user.accountType || 'customer'}</td>
      <td>
        <select
          value={role}
          onChange={(event) => setRole(event.target.value)}
          disabled={user.id === currentUserId}
        >
          <option value="customer">Customer</option>
          <option value="sales">Sales</option>
          <option value="operations">Operations</option>
          <option value="admin">Admin</option>
          <option value="super_admin">Super Admin</option>
        </select>
      </td>
      <td>
        <button
          className="btn-secondary compact"
          disabled={saving === key || role === user.role || user.id === currentUserId}
          onClick={() =>
            run(
              key,
              async () => {
                const result = await updateAdminUserRole(accessToken, user.id, role);
                onUpdated(result.user);
                return result.user;
              },
              pick({ en: 'Staff role updated securely.', ar: 'تم تحديث صلاحية الموظف بأمان.' }),
            )
          }
        >
          {pick({ en: 'Save Role', ar: 'حفظ الصلاحية' })}
        </button>
      </td>
    </tr>
  );
}


export function SpecialRequestOperationsCard({ request, pick, saving, run }) {
  const [values, setValues] = useState({
    status: request.status || 'under_review',
    productCost: request.quoted_product_cost ?? '',
    shippingCost: request.shipping_cost ?? '',
    taxTotal: request.tax_total ?? '0',
    discountTotal: request.discount_total ?? '0',
    currency: request.currency || 'USD',
    estimatedArrivalDays: request.estimated_arrival_days ?? '',
    staffNotes: request.staff_notes || '',
    paymentUrl: request.payment_url || '',
    quoteExpiresAt: request.quote_expires_at ? String(request.quote_expires_at).slice(0, 16) : '',
  });
  const key = `special-${request.id}`;
  const total = Math.max(
    0,
    Number(values.productCost || 0) +
      Number(values.shippingCost || 0) +
      Number(values.taxTotal || 0) -
      Number(values.discountTotal || 0),
  );
  const set = (field) => (event) =>
    setValues((current) => ({ ...current, [field]: event.target.value }));
  return (
    <article className="operations-card special-request-operations-card">
      <div>
        <span>{request.request_number}</span>
        <strong>{request.status}</strong>
      </div>
      <p>
        {request.customer_name} · {request.customer_email}
      </p>
      <p>{request.description}</p>
      {request.product_url && (
        <a href={request.product_url} target="_blank" rel="noopener noreferrer">
          {pick({ en: 'Open product reference', ar: 'فتح مرجع المنتج' })}
        </a>
      )}
      <div className="operations-form-grid">
        <label>
          <span>{pick({ en: 'Status', ar: 'الحالة' })}</span>
          <select value={values.status} onChange={set('status')}>
            {[
              'submitted',
              'under_review',
              'more_information_required',
              'quoted',
              'awaiting_customer',
              'awaiting_payment',
              'ordered',
              'unavailable',
              'rejected',
              'closed',
            ].map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </label>
        <label>
          <span>{pick({ en: 'Currency', ar: 'العملة' })}</span>
          <select value={values.currency} onChange={set('currency')}>
            <option>USD</option>
            <option>LYD</option>
          </select>
        </label>
        <label>
          <span>{pick({ en: 'Product cost', ar: 'سعر المنتج' })}</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={values.productCost}
            onChange={set('productCost')}
          />
        </label>
        <label>
          <span>{pick({ en: 'Shipping', ar: 'الشحن' })}</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={values.shippingCost}
            onChange={set('shippingCost')}
          />
        </label>
        <label>
          <span>{pick({ en: 'Tax', ar: 'الضريبة' })}</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={values.taxTotal}
            onChange={set('taxTotal')}
          />
        </label>
        <label>
          <span>{pick({ en: 'Discount', ar: 'الخصم' })}</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={values.discountTotal}
            onChange={set('discountTotal')}
          />
        </label>
        <label>
          <span>{pick({ en: 'Arrival days', ar: 'مدة الوصول بالأيام' })}</span>
          <input
            type="number"
            min="1"
            max="365"
            value={values.estimatedArrivalDays}
            onChange={set('estimatedArrivalDays')}
          />
        </label>
        <label>
          <span>{pick({ en: 'Quote expires', ar: 'انتهاء العرض' })}</span>
          <input
            type="datetime-local"
            value={values.quoteExpiresAt}
            onChange={set('quoteExpiresAt')}
          />
        </label>
      </div>
      <p>
        <strong>
          {pick({ en: 'Calculated total', ar: 'الإجمالي المحسوب' })}: {total.toFixed(2)}{' '}
          {values.currency}
        </strong>
      </p>
      <label>
        <span>{pick({ en: 'Secure payment URL', ar: 'رابط الدفع الآمن' })}</span>
        <input
          type="url"
          value={values.paymentUrl}
          onChange={set('paymentUrl')}
          placeholder="https://"
        />
      </label>
      <label>
        <span>{pick({ en: 'Operations note', ar: 'ملاحظة العمليات' })}</span>
        <textarea rows={3} value={values.staffNotes} onChange={set('staffNotes')} />
      </label>
      <button
        className="btn-primary compact"
        disabled={saving === key}
        onClick={() =>
          run(
            key,
            () => updateSpecialRequest({ requestId: request.id, ...values }),
            pick({
              en: 'Special request updated and notification queued.',
              ar: 'تم تحديث الطلب الخاص وإضافة الإشعار.',
            }),
          )
        }
      >
        {pick({ en: 'Save request', ar: 'حفظ الطلب' })}
      </button>
    </article>
  );
}

export function ShippingQuoteRow({ order, pick, saving, run }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const key = `shipping-${order.id}`;
  return (
    <tr>
      <td>
        <strong>{order.order_number}</strong>
        <small>{order.customer_email}</small>
      </td>
      <td>{order.shipping_summary?.countryCode || order.shipping_summary?.country || '—'}</td>
      <td>{Array.isArray(order.items_snapshot) ? order.items_snapshot.length : '—'}</td>
      <td>
        <input
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          aria-label={pick({ en: 'Shipping price in USD', ar: 'سعر الشحن بالدولار' })}
        />
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={pick({ en: 'Optional note', ar: 'ملاحظة اختيارية' })}
        />
      </td>
      <td>
        <button
          className="btn-primary compact"
          disabled={saving === key || amount === ''}
          onClick={() =>
            run(
              key,
              () => setShippingQuote({ orderId: order.id, amountUsd: amount, note }),
              pick({
                en: 'Shipping price saved and email notification queued.',
                ar: 'تم حفظ سعر الشحن وإضافة إشعار البريد.',
              }),
            )
          }
        >
          {pick({ en: 'Add & Notify', ar: 'إضافة وإشعار' })}
        </button>
      </td>
    </tr>
  );
}

export function OrderOperationsCard({ order, pick, saving, run }) {
  const [nextStatus, setNextStatus] = useState(order.order_status);
  const [payment, setPayment] = useState(String(order.amount_due_now || ''));
  const [method, setMethod] = useState('cash');
  const [reference, setReference] = useState('');
  const [refund, setRefund] = useState('');
  const [refundReference, setRefundReference] = useState('');
  const transitions = [order.order_status, ...(ORDER_TRANSITIONS[order.order_status] || [])];
  const workflowKey = `workflow-${order.id}`;
  const paymentKey = `payment-${order.id}`;
  const refundKey = `refund-${order.id}`;
  const refundable = Math.max(
    0,
    Number(order.amount_paid || 0) - Number(order.amount_refunded || 0),
  );
  return (
    <article className="operations-card order-operations-card">
      <div>
        <span>{order.order_number}</span>
        <strong>{money(order.total)}</strong>
      </div>
      <p>{order.customer_email}</p>
      <div className="operations-payment-summary">
        <small>
          {pick({ en: 'Paid', ar: 'مدفوع' })}: {money(order.amount_paid)}
        </small>
        <small>
          {pick({ en: 'Refunded', ar: 'مسترد' })}: {money(order.amount_refunded || 0)}
        </small>
        <small>
          {pick({ en: 'Due now', ar: 'مطلوب الآن' })}: {money(order.amount_due_now)}
        </small>
        <small>
          {pick({ en: 'Later', ar: 'لاحقًا' })}:{' '}
          {money(
            Math.max(
              0,
              Number(order.outstanding_balance ?? order.remaining_balance ?? 0) -
                Number(order.amount_due_now || 0),
            ),
          )}
        </small>
      </div>
      <label>
        <span>{pick({ en: 'Next valid status', ar: 'الحالة التالية المسموحة' })}</span>
        <select value={nextStatus} onChange={(event) => setNextStatus(event.target.value)}>
          {transitions.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
      </label>
      <button
        className="btn-secondary"
        disabled={saving === workflowKey || nextStatus === order.order_status}
        onClick={() =>
          run(
            workflowKey,
            () =>
              updateOrderWorkflow({
                orderId: order.id,
                orderStatus: nextStatus,
                paymentStatus: null,
                fulfillmentStatus: null,
              }),
            pick({
              en: 'Order status saved and notification queued.',
              ar: 'تم حفظ حالة الطلب وإضافة الإشعار.',
            }),
          )
        }
      >
        {pick({ en: 'Update Status', ar: 'تحديث الحالة' })}
      </button>
      {Number(order.amount_due_now) > 0 && (
        <div className="manual-payment-panel">
          <strong>{pick({ en: 'Record confirmed payment', ar: 'تسجيل دفعة مؤكدة' })}</strong>
          <div className="operations-price-grid">
            <input
              type="number"
              min="0.01"
              max={order.amount_due_now}
              step="0.01"
              value={payment}
              onChange={(event) => setPayment(event.target.value)}
            />
            <select value={method} onChange={(event) => setMethod(event.target.value)}>
              <option value="cash">Cash</option>
              <option value="libyan_bank_card">Libyan Bank Card</option>
              <option value="bank_transfer">Bank Transfer</option>
            </select>
            <input
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder={pick({ en: 'Reference', ar: 'المرجع' })}
            />
          </div>
          <button
            className="btn-primary compact"
            disabled={saving === paymentKey || !payment}
            onClick={() =>
              run(
                paymentKey,
                () =>
                  recordManualPayment({ orderId: order.id, amountUsd: payment, method, reference }),
                pick({ en: 'Payment recorded securely.', ar: 'تم تسجيل الدفعة بأمان.' }),
              )
            }
          >
            {pick({ en: 'Confirm Payment', ar: 'تأكيد الدفع' })}
          </button>
        </div>
      )}
      {refundable > 0 && (
        <details className="refund-panel">
          <summary>{pick({ en: 'Issue a verified refund', ar: 'تسجيل استرداد موثق' })}</summary>
          <div className="operations-price-grid">
            <input
              type="number"
              min="0.01"
              max={refundable}
              step="0.01"
              value={refund}
              onChange={(event) => setRefund(event.target.value)}
              placeholder={money(refundable)}
            />
            <input
              value={refundReference}
              onChange={(event) => setRefundReference(event.target.value)}
              placeholder={pick({ en: 'Refund reference', ar: 'مرجع الاسترداد' })}
            />
          </div>
          <button
            className="btn-secondary compact"
            disabled={saving === refundKey || !refund || Number(refund) > refundable}
            onClick={() =>
              run(
                refundKey,
                () =>
                  recordRefund({
                    orderId: order.id,
                    amountUsd: refund,
                    method: 'manual',
                    reference: refundReference,
                  }),
                pick({
                  en: 'Refund recorded and customer notification queued.',
                  ar: 'تم تسجيل الاسترداد وإضافة إشعار العميل.',
                }),
              )
            }
          >
            {pick({ en: 'Confirm Refund', ar: 'تأكيد الاسترداد' })}
          </button>
        </details>
      )}
    </article>
  );
}

export function QuoteCard({ quote, pick, saving, run }) {
  const [values, setValues] = useState({
    subtotal: quote.subtotal ?? '',
    shipping: quote.shipping_total ?? '',
    tax: quote.tax_total ?? 0,
    discount: quote.discount_total ?? 0,
    status: quote.status,
  });
  const [payment, setPayment] = useState(String(quote.amount_due_now || ''));
  const [method, setMethod] = useState('bank_transfer');
  const [reference, setReference] = useState('');
  const total =
    values.subtotal === '' || values.shipping === ''
      ? null
      : Math.max(
          0,
          Number(values.subtotal) +
            Number(values.shipping) +
            Number(values.tax || 0) -
            Number(values.discount || 0),
        );
  const transitions = [quote.status, ...(QUOTE_TRANSITIONS[quote.status] || [])];
  const key = `quote-${quote.id}`;
  const paymentKey = `quote-payment-${quote.id}`;
  return (
    <article className="operations-card">
      <div>
        <span>{quote.quote_number}</span>
        <strong>{money(total)}</strong>
      </div>
      <div className="operations-payment-summary">
        <small>
          {pick({ en: 'Paid', ar: 'مدفوع' })}: {money(quote.amount_paid)}
        </small>
        <small>
          {pick({ en: 'Due now', ar: 'مطلوب الآن' })}: {money(quote.amount_due_now)}
        </small>
        <small>
          {pick({ en: 'Later', ar: 'لاحقًا' })}:{' '}
          {money(
            Math.max(
              0,
              Number(quote.outstanding_balance ?? quote.remaining_balance ?? 0) -
                Number(quote.amount_due_now || 0),
            ),
          )}
        </small>
      </div>
      <select
        value={values.status}
        onChange={(event) => setValues({ ...values, status: event.target.value })}
      >
        {transitions.map((status) => (
          <option key={status}>{status}</option>
        ))}
      </select>
      <div className="operations-price-grid">
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Subtotal"
          value={values.subtotal}
          onChange={(event) => setValues({ ...values, subtotal: event.target.value })}
        />
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Shipping"
          value={values.shipping}
          onChange={(event) => setValues({ ...values, shipping: event.target.value })}
        />
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Tax"
          value={values.tax}
          onChange={(event) => setValues({ ...values, tax: event.target.value })}
        />
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Discount"
          value={values.discount}
          onChange={(event) => setValues({ ...values, discount: event.target.value })}
        />
        <output aria-label="Verified quote total">
          {total == null || !Number.isFinite(total) ? '—' : money(total)}
        </output>
      </div>
      <small>Subtotal + Shipping + Tax − Discount</small>
      <button
        className="btn-secondary"
        disabled={saving === key}
        onClick={() =>
          run(
            key,
            () =>
              updateQuoteWorkflow({
                quoteId: quote.id,
                status: values.status,
                subtotal: values.subtotal,
                shippingTotal: values.shipping,
                taxTotal: values.tax,
                discountTotal: values.discount,
              }),
            pick({ en: 'Quote saved with verified total.', ar: 'تم حفظ العرض بإجمالي متحقق منه.' }),
          )
        }
      >
        {pick({ en: 'Save Quote', ar: 'حفظ العرض' })}
      </button>
      {Number(quote.amount_due_now) > 0 && (
        <div className="manual-payment-panel">
          <strong>{pick({ en: 'Record exact quote payment', ar: 'تسجيل دفعة عرض السعر' })}</strong>
          <div className="operations-price-grid">
            <input
              type="number"
              min="0.01"
              max={quote.amount_due_now}
              step="0.01"
              value={payment}
              onChange={(event) => setPayment(event.target.value)}
            />
            <select value={method} onChange={(event) => setMethod(event.target.value)}>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="libyan_bank_card">Libyan Bank Card</option>
              <option value="cash">Cash</option>
            </select>
            <input
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder={pick({ en: 'Reference', ar: 'المرجع' })}
            />
          </div>
          <button
            className="btn-primary compact"
            disabled={saving === paymentKey || Number(payment) !== Number(quote.amount_due_now)}
            onClick={() =>
              run(
                paymentKey,
                () =>
                  recordQuotePayment({ quoteId: quote.id, amountUsd: payment, method, reference }),
                pick({ en: 'Quote payment recorded securely.', ar: 'تم تسجيل دفعة العرض بأمان.' }),
              )
            }
          >
            {pick({ en: 'Confirm Payment', ar: 'تأكيد الدفع' })}
          </button>
        </div>
      )}
    </article>
  );
}

export function ReturnOperationsCard({ request, orders, pick, saving, run }) {
  const order = orders.find((item) => item.id === request.order_id);
  const [status, setStatus] = useState(request.status);
  const [resolution, setResolution] = useState(request.resolution || 'refund');
  const [refundAmount, setRefundAmount] = useState(String(request.refund_amount || ''));
  const [note, setNote] = useState(request.staff_note || '');
  const [restock, setRestock] = useState(false);
  const [reference, setReference] = useState('');
  const transitions = [request.status, ...(RETURN_TRANSITIONS[request.status] || [])];
  const updateKey = `return-${request.id}`;
  const refundKey = `return-refund-${request.id}`;
  const refundable = Math.max(
    0,
    Number(order?.amount_paid || 0) - Number(order?.amount_refunded || 0),
  );
  return (
    <article className="operations-card return-operations-card">
      <div>
        <span>{request.return_number}</span>
        <strong>{request.status}</strong>
      </div>
      <p>
        {request.order_number} · {request.customer_email}
      </p>
      <p>{request.reason}</p>
      <ul>
        {(request.requested_items || []).map((item, index) => (
          <li key={`${item.variantId || item.sku}-${index}`}>
            {item.quantity} × {item.name || item.sku}
          </li>
        ))}
      </ul>
      <label>
        <span>{pick({ en: 'Next return status', ar: 'حالة الإرجاع التالية' })}</span>
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          {transitions.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </label>
      <label>
        <span>{pick({ en: 'Resolution', ar: 'الحل' })}</span>
        <select value={resolution} onChange={(event) => setResolution(event.target.value)}>
          <option value="refund">Refund</option>
          <option value="replacement">Replacement</option>
          <option value="store_credit">Store Credit</option>
          <option value="no_action">No Action</option>
        </select>
      </label>
      <textarea
        rows={3}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder={pick({ en: 'Staff note sent to customer', ar: 'ملاحظة الموظف للعميل' })}
      />
      {status === 'received' && (
        <label className="operations-check">
          <input
            type="checkbox"
            checked={restock}
            onChange={(event) => setRestock(event.target.checked)}
          />
          <span>
            {pick({
              en: 'Return approved inventory to tracked stock',
              ar: 'إعادة المنتجات المقبولة إلى المخزون المتتبع',
            })}
          </span>
        </label>
      )}
      <button
        className="btn-secondary"
        disabled={saving === updateKey || status === request.status}
        onClick={() =>
          run(
            updateKey,
            () =>
              updateReturnRequest({
                returnId: request.id,
                status,
                resolution,
                refundAmount: refundAmount || null,
                staffNote: note,
                restock,
              }),
            pick({
              en: 'Return updated and customer notified.',
              ar: 'تم تحديث الإرجاع وإشعار العميل.',
            }),
          )
        }
      >
        {pick({ en: 'Save Return', ar: 'حفظ الإرجاع' })}
      </button>
      {request.status === 'refund_pending' && order && (
        <div className="manual-payment-panel">
          <strong>{pick({ en: 'Complete refund', ar: 'إكمال رد المبلغ' })}</strong>
          <div className="operations-price-grid">
            <input
              type="number"
              min="0.01"
              max={refundable}
              step="0.01"
              value={refundAmount}
              onChange={(event) => setRefundAmount(event.target.value)}
            />
            <input
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder={pick({ en: 'Refund reference', ar: 'مرجع الاسترداد' })}
            />
          </div>
          <button
            className="btn-primary compact"
            disabled={saving === refundKey || !refundAmount || Number(refundAmount) > refundable}
            onClick={() =>
              run(
                refundKey,
                () =>
                  recordRefund({
                    orderId: order.id,
                    amountUsd: refundAmount,
                    method: 'return_refund',
                    reference,
                    returnRequestId: request.id,
                  }),
                pick({
                  en: 'Refund completed and customer notified.',
                  ar: 'تم رد المبلغ وإشعار العميل.',
                }),
              )
            }
          >
            {pick({ en: 'Confirm Refund', ar: 'تأكيد رد المبلغ' })}
          </button>
        </div>
      )}
    </article>
  );
}

export function DesignProofCard({ design, pick, saving, run, accessToken }) {
  const [proofUrls, setProofUrls] = useState((design.proof_data?.urls || []).join('\n'));
  const [proofFiles, setProofFiles] = useState([]);
  const [note, setNote] = useState(design.approval_note || '');
  const locked = design.status === 'approved';
  const key = `proof-${design.id}`;
  return (
    <article className="operations-card">
      <div>
        <span>{design.name}</span>
        <strong>{design.status}</strong>
      </div>
      <p>
        {design.product_type} · v{design.version || 1}
      </p>
      <label>
        <span>
          {pick({
            en: 'Upload proof files (scanned before access)',
            ar: 'رفع ملفات البروفة (يتم فحصها قبل الوصول)',
          })}
        </span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          multiple
          disabled={locked}
          onChange={(event) => setProofFiles(Array.from(event.target.files || []))}
        />
      </label>
      <button
        type="button"
        className="btn-secondary compact"
        disabled={locked || saving === `${key}-upload` || !proofFiles.length}
        onClick={() =>
          run(
            `${key}-upload`,
            () => uploadDesignProofFiles({ accessToken, designId: design.id, files: proofFiles }),
            pick({
              en: 'Proof files uploaded to private quarantine for malware scanning.',
              ar: 'تم رفع ملفات البروفة إلى الحجر الخاص لفحصها.',
            }),
          )
        }
      >
        {pick({ en: 'Upload & Scan', ar: 'رفع وفحص' })}
      </button>
      <textarea
        rows={3}
        value={proofUrls}
        onChange={(event) => setProofUrls(event.target.value)}
        placeholder={pick({
          en: 'One secure proof image/PDF URL per line',
          ar: 'رابط صورة أو PDF للبروفة في كل سطر',
        })}
        disabled={locked}
      />
      <textarea
        rows={3}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder={pick({ en: 'Proof note for the customer', ar: 'ملاحظة البروفة للعميل' })}
        disabled={locked}
      />
      <button
        className="btn-secondary"
        disabled={locked || saving === key || !proofUrls.trim()}
        onClick={() =>
          run(
            key,
            () =>
              publishDesignProof({
                designId: design.id,
                proofUrls: proofUrls.split(/\r?\n|,/),
                note,
              }),
            pick({
              en: 'Proof published and email notification queued.',
              ar: 'تم نشر البروفة وإضافة إشعار البريد.',
            }),
          )
        }
      >
        {locked
          ? pick({ en: 'Approved & locked', ar: 'معتمد ومقفل' })
          : pick({ en: 'Publish Proof', ar: 'نشر البروفة' })}
      </button>
    </article>
  );
}

export function ProductContentCard({ row, pick, saving, run }) {
  const data = row.variant_data || {};
  const [values, setValues] = useState({
    nameEn: data.nameEn || row.product_name || '',
    nameAr: data.nameAr || '',
    descriptionEn: data.descriptionEn || '',
    descriptionAr: data.descriptionAr || '',
    brand: data.brand || '',
    category: data.category || '',
    subcategory: data.subcategory || '',
    productType: data.productType || '',
    imageUrl: data.imageUrl || '',
    featured: Boolean(data.featured),
    newArrival: Boolean(data.newArrival),
    bestSeller: Boolean(data.bestSeller),
    comingSoon: Boolean(data.comingSoon),
    quoteOnly: Boolean(data.quoteOnly),
  });
  const key = `catalog-product-${row.product_id}`;
  const set = (field) => (event) =>
    setValues((current) => ({
      ...current,
      [field]: event.target.type === 'checkbox' ? event.target.checked : event.target.value,
    }));
  return (
    <details className="operations-product-card">
      <summary>
        <span>
          <strong>{values.nameEn || row.product_name}</strong>
          <small>
            {row.product_id} · {values.brand || data.brand || 'Shababuna'}
          </small>
        </span>
        <span>{pick({ en: 'Edit', ar: 'تعديل' })}</span>
      </summary>
      <div className="operations-product-editor">
        <div className="operations-form-grid">
          <label>
            <span>English name</span>
            <input value={values.nameEn} onChange={set('nameEn')} />
          </label>
          <label>
            <span>{pick({ en: 'Arabic name (optional)', ar: 'الاسم العربي (اختياري)' })}</span>
            <input value={values.nameAr} onChange={set('nameAr')} />
          </label>
          <label>
            <span>Brand</span>
            <input value={values.brand} onChange={set('brand')} />
          </label>
          <label>
            <span>Product type</span>
            <input value={values.productType} onChange={set('productType')} />
          </label>
          <label>
            <span>Category</span>
            <input value={values.category} onChange={set('category')} />
          </label>
          <label>
            <span>Subcategory</span>
            <input value={values.subcategory} onChange={set('subcategory')} />
          </label>
        </div>
        <label>
          <span>
            {pick({
              en: 'Product image URL or /public path',
              ar: 'رابط صورة المنتج أو مسار public',
            })}
          </span>
          <input
            value={values.imageUrl}
            onChange={set('imageUrl')}
            placeholder="/images/products/item.webp"
          />
        </label>
        <div className="operations-form-grid operations-form-grid--descriptions">
          <label>
            <span>English description</span>
            <textarea rows={4} value={values.descriptionEn} onChange={set('descriptionEn')} />
          </label>
          <label>
            <span>{pick({ en: 'Arabic description', ar: 'الوصف العربي' })}</span>
            <textarea rows={4} value={values.descriptionAr} onChange={set('descriptionAr')} />
          </label>
        </div>
        <div className="operations-check-grid">
          {[
            ['featured', 'Featured'],
            ['newArrival', 'New Arrival'],
            ['bestSeller', 'Best Seller'],
            ['comingSoon', 'Coming Soon'],
            ['quoteOnly', 'Quote Only'],
          ].map(([field, label]) => (
            <label key={field}>
              <input type="checkbox" checked={values[field]} onChange={set(field)} />
              <span>{label}</span>
            </label>
          ))}
        </div>
        <button
          className="btn-primary compact"
          disabled={saving === key || !values.nameEn.trim()}
          onClick={() =>
            run(
              key,
              () => updateCatalogProduct({ productId: row.product_id, ...values }),
              pick({
                en: 'Product content saved and published to the live catalog.',
                ar: 'تم حفظ محتوى المنتج ونشره في الكتالوج المباشر.',
              }),
            )
          }
        >
          {pick({ en: 'Save Product', ar: 'حفظ المنتج' })}
        </button>
      </div>
    </details>
  );
}

export function CatalogRow({ row, pick, saving, run }) {
  const [values, setValues] = useState({
    price: row.unit_price ?? '',
    wholesale: row.variant_data?.wholesalePrice ?? '',
    stock: row.inventory_quantity ?? '',
    ready: Boolean(row.variant_data?.readyToShip),
    active: Boolean(row.active),
  });
  const key = `catalog-${row.variant_id}`;
  return (
    <tr>
      <td>
        <strong>{row.sku}</strong>
        <small>
          {row.variant_data?.color || ''} {row.variant_data?.size || ''}
        </small>
      </td>
      <td>{row.product_name}</td>
      <td>
        <input
          type="number"
          min="0"
          step="0.01"
          value={values.price}
          onChange={(event) => setValues({ ...values, price: event.target.value })}
        />
      </td>
      <td>
        <input
          type="number"
          min="0"
          step="0.01"
          value={values.wholesale}
          onChange={(event) => setValues({ ...values, wholesale: event.target.value })}
        />
      </td>
      <td>
        <input
          type="number"
          min="0"
          step="1"
          value={values.stock}
          onChange={(event) => setValues({ ...values, stock: event.target.value })}
        />
      </td>
      <td>
        <input
          type="checkbox"
          checked={values.ready}
          onChange={(event) => setValues({ ...values, ready: event.target.checked })}
          aria-label={pick({ en: 'Ready to ship', ar: 'تسليم فوري' })}
        />
      </td>
      <td>
        <input
          type="checkbox"
          checked={values.active}
          onChange={(event) => setValues({ ...values, active: event.target.checked })}
          aria-label={pick({ en: 'Active', ar: 'نشط' })}
        />
      </td>
      <td>
        <button
          className="btn-secondary compact"
          disabled={saving === key}
          onClick={() =>
            run(
              key,
              () =>
                updateCatalogVariant({
                  variantId: row.variant_id,
                  unitPrice: values.price,
                  wholesalePrice: values.wholesale,
                  inventoryQuantity: values.stock,
                  readyToShip: values.ready,
                  active: values.active,
                }),
              pick({ en: 'Catalog variant saved.', ar: 'تم حفظ خيار المنتج.' }),
            )
          }
        >
          {pick({ en: 'Save', ar: 'حفظ' })}
        </button>
      </td>
    </tr>
  );
}

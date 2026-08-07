import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMySpecialRequests, respondToSpecialRequest, startSpecialRequestPayment } from '../../services/specialRequests';
import { isPaymentMethodConfigured } from '../../utils/payments';
import { useLanguage } from '../../context/LanguageContext';

const statusLabels = {
  submitted: { en: 'Submitted', ar: 'تم الإرسال' }, under_review: { en: 'Under review', ar: 'قيد المراجعة' },
  more_information_required: { en: 'More information required', ar: 'مطلوب معلومات إضافية' },
  quoted: { en: 'Quote ready', ar: 'العرض جاهز' }, awaiting_customer: { en: 'Awaiting your response', ar: 'بانتظار ردك' },
  awaiting_payment: { en: 'Awaiting payment', ar: 'بانتظار الدفع' }, ordered: { en: 'Ordered', ar: 'تم الطلب' },
  unavailable: { en: 'Unavailable', ar: 'غير متوفر' }, rejected: { en: 'Rejected', ar: 'مرفوض' }, closed: { en: 'Closed', ar: 'مغلق' },
};

function money(value, currency) {
  if (value == null) return '—';
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(Number(value)); }
  catch { return `${Number(value).toFixed(2)} ${currency || 'USD'}`; }
}

export default function SpecialRequestsSection() {
  const { pick } = useLanguage();
  const [state, setState] = useState({ loading: true, rows: [], error: '' });
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState({});
  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }));
    try { setState({ loading: false, rows: await getMySpecialRequests(), error: '' }); }
    catch (error) { setState({ loading: false, rows: [], error: error?.message || 'requests_unavailable' }); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const pay = async (row, paymentMethod) => {
    setBusy(row.id);
    try { await startSpecialRequestPayment({ requestNumber: row.request_number, customerEmail: row.customer_email, paymentMethod }); }
    catch (error) { setState((current) => ({ ...current, error: error?.message || 'payment_unavailable' })); setBusy(''); }
  };

  const respond = async (row, decision) => {
    setBusy(row.id);
    try { await respondToSpecialRequest(row.id, decision, note[row.id] || ''); await load(); }
    catch (error) { setState((current) => ({ ...current, error: error?.message || 'response_failed' })); }
    finally { setBusy(''); }
  };

  if (state.loading) return <p role="status">{pick({ en: 'Loading special requests…', ar: 'جاري تحميل الطلبات الخاصة…' })}</p>;
  return <section className="account-panel special-requests-account">
    <div className="section-heading-row"><div><h2>{pick({ en: 'Special Requests', ar: 'الطلبات الخاصة' })}</h2><p>{pick({ en: 'Review sourcing requests and respond to verified quotes.', ar: 'راجع طلبات التوفير ورد على عروض الأسعار الموثقة.' })}</p></div><Link className="btn-primary compact" to="/special-request">{pick({ en: 'New request', ar: 'طلب جديد' })}</Link></div>
    {state.error && <p className="form-status form-status--error" role="alert">{pick({ en: 'Requests could not be loaded or updated.', ar: 'تعذر تحميل الطلبات أو تحديثها.' })} ({state.error})</p>}
    {!state.rows.length ? <div className="account-empty"><p>{pick({ en: 'You have no special requests yet.', ar: 'لا توجد لديك طلبات خاصة بعد.' })}</p><Link to="/special-request">{pick({ en: 'Ask us to source a product', ar: 'اطلب منا توفير منتج' })} →</Link></div> : <div className="special-request-account-grid">{state.rows.map((row) => {
      const canRespond = ['quoted', 'awaiting_customer'].includes(row.status) && (!row.quote_expires_at || new Date(row.quote_expires_at) > new Date());
      return <article className="special-request-account-card" key={row.id}>
        <div className="special-request-card-head"><strong>{row.request_number}</strong><span>{pick(statusLabels[row.status] || { en: row.status, ar: row.status })}</span></div>
        <p>{row.description}</p><dl><div><dt>{pick({ en: 'Quantity', ar: 'الكمية' })}</dt><dd>{row.desired_quantity}</dd></div><div><dt>{pick({ en: 'Created', ar: 'تاريخ الإنشاء' })}</dt><dd>{new Date(row.created_at).toLocaleDateString()}</dd></div>{row.quote_total != null && <div><dt>{pick({ en: 'Quote total', ar: 'إجمالي العرض' })}</dt><dd>{money(row.quote_total, row.currency)}</dd></div>}{row.estimated_arrival_days && <div><dt>{pick({ en: 'Estimated arrival', ar: 'الوصول التقديري' })}</dt><dd>{row.estimated_arrival_days} {pick({ en: 'days', ar: 'يومًا' })}</dd></div>}</dl>
        {row.staff_notes && <div className="special-request-note"><strong>{pick({ en: 'Operations note', ar: 'ملاحظة العمليات' })}</strong><p>{row.staff_notes}</p></div>}
        {canRespond && <div className="special-request-response"><label className="field"><span>{pick({ en: 'Optional response note', ar: 'ملاحظة رد اختيارية' })}</span><textarea rows={2} value={note[row.id] || ''} onChange={(event) => setNote((current) => ({ ...current, [row.id]: event.target.value }))} /></label><div><button className="btn-primary compact" disabled={busy === row.id} onClick={() => respond(row, 'accepted')}>{pick({ en: 'Accept quote', ar: 'قبول العرض' })}</button><button className="btn-secondary compact" disabled={busy === row.id} onClick={() => respond(row, 'rejected')}>{pick({ en: 'Reject', ar: 'رفض' })}</button></div></div>}
        {row.status === 'awaiting_payment' && <div className="quote-pay-actions">{isPaymentMethodConfigured('online_card') && <button type="button" className="btn-primary compact" disabled={busy === row.id} onClick={() => pay(row, 'online_card')}>{pick({ en: 'Pay securely by card', ar: 'الدفع الآمن بالبطاقة' })}</button>}{isPaymentMethodConfigured('libyan_bank_card') && <button type="button" className="btn-secondary compact" disabled={busy === row.id} onClick={() => pay(row, 'libyan_bank_card')}>{pick({ en: 'Libyan bank card', ar: 'بطاقة مصرفية ليبية' })}</button>}{!isPaymentMethodConfigured('online_card') && !isPaymentMethodConfigured('libyan_bank_card') && row.payment_url && <a className="btn-primary compact" href={row.payment_url} rel="noopener noreferrer">{pick({ en: 'Open secure payment', ar: 'فتح الدفع الآمن' })}</a>}</div>}
      </article>;
    })}</div>}
  </section>;
}

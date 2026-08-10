import type { ReactElement } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getMySpecialRequests,
  respondToSpecialRequest,
  startSpecialRequestPayment,
} from '../../services/specialRequests';
import { isPaymentMethodConfigured } from '../../utils/payments';
import { useLanguage } from '../../context/LanguageContext';

const statusLabels = {
  submitted: { en: 'Submitted', ar: 'تم الإرسال' },
  under_review: { en: 'Under review', ar: 'قيد المراجعة' },
  more_information_required: { en: 'More information required', ar: 'مطلوب معلومات إضافية' },
  quoted: { en: 'Quote ready', ar: 'العرض جاهز' },
  awaiting_customer: { en: 'Awaiting your response', ar: 'بانتظار ردك' },
  awaiting_payment: { en: 'Awaiting payment', ar: 'بانتظار الدفع' },
  ordered: { en: 'Ordered', ar: 'تم الطلب' },
  unavailable: { en: 'Unavailable', ar: 'غير متوفر' },
  rejected: { en: 'Rejected', ar: 'مرفوض' },
  closed: { en: 'Closed', ar: 'مغلق' },
};

function money(value: unknown, currency?: string): string {
  if (value == null) return '—';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(Number(value));
  } catch {
    return `${Number(value).toFixed(2)} ${currency || 'USD'}`;
  }
}

export default function SpecialRequestsSection(): ReactElement {
  const { pick } = useLanguage();
  const [state, setState] = useState<{
    loading: boolean;
    rows: Array<Record<string, unknown>>;
    error: string;
  }>({ loading: true, rows: [], error: '' });
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState<Record<string, string>>({});
  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const rows = await getMySpecialRequests();
      setState({
        loading: false,
        rows: (Array.isArray(rows) ? rows : []).map((row) => row as Record<string, unknown>),
        error: '',
      });
    } catch (error) {
      setState({
        loading: false,
        rows: [],
        error: (error instanceof Error ? error.message : '') || 'requests_unavailable',
      });
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const pay = async (row: Record<string, unknown>, paymentMethod: string) => {
    setBusy(String(row.id || ''));
    try {
      await startSpecialRequestPayment({
        requestNumber: String(row.request_number || ''),
        customerEmail: String(row.customer_email || ''),
        paymentMethod,
      });
    } catch (error) {
      setState((current) => ({
        ...current,
        error: (error instanceof Error ? error.message : '') || 'payment_unavailable',
      }));
      setBusy('');
    }
  };

  const respond = async (row: Record<string, unknown>, decision: string) => {
    setBusy(String(row.id || ''));
    try {
      await respondToSpecialRequest(
        String(row.id || ''),
        decision,
        note[String(row.id || '')] || '',
      );
      await load();
    } catch (error) {
      setState((current) => ({
        ...current,
        error: (error instanceof Error ? error.message : '') || 'response_failed',
      }));
    } finally {
      setBusy('');
    }
  };

  if (state.loading)
    return (
      <p role="status">
        {pick({ en: 'Loading special requests…', ar: 'جاري تحميل الطلبات الخاصة…' })}
      </p>
    );
  return (
    <section className="account-panel special-requests-account">
      <div className="section-heading-row">
        <div>
          <h2>{pick({ en: 'Special Requests', ar: 'الطلبات الخاصة' })}</h2>
          <p>
            {pick({
              en: 'Review sourcing requests and respond to verified quotes.',
              ar: 'راجع طلبات التوفير ورد على عروض الأسعار الموثقة.',
            })}
          </p>
        </div>
        <Link className="btn-primary compact" to="/special-request">
          {pick({ en: 'New request', ar: 'طلب جديد' })}
        </Link>
      </div>
      {state.error && (
        <p className="form-status form-status--error" role="alert">
          {pick({
            en: 'Requests could not be loaded or updated.',
            ar: 'تعذر تحميل الطلبات أو تحديثها.',
          })}{' '}
          ({state.error})
        </p>
      )}
      {!state.rows.length ? (
        <div className="account-empty">
          <p>
            {pick({ en: 'You have no special requests yet.', ar: 'لا توجد لديك طلبات خاصة بعد.' })}
          </p>
          <Link to="/special-request">
            {pick({ en: 'Ask us to source a product', ar: 'اطلب منا توفير منتج' })} →
          </Link>
        </div>
      ) : (
        <div className="special-request-account-grid">
          {state.rows.map((row: Record<string, unknown>) => {
            const canRespond =
              ['quoted', 'awaiting_customer'].includes(String(row.status || '')) &&
              (!row.quote_expires_at || new Date(String(row.quote_expires_at)) > new Date());
            return (
              <article className="special-request-account-card" key={String(row.id ?? '')}>
                <div className="special-request-card-head">
                  <strong>{String(row.request_number ?? '')}</strong>
                  <span>
                    {pick(
                      (statusLabels as Record<string, { en: string; ar: string }>)[
                        String(row.status || '')
                      ] || {
                        en: String(row.status || ''),
                        ar: String(row.status || ''),
                      },
                    )}
                  </span>
                </div>
                <p>{String(row.description ?? '')}</p>
                <dl>
                  <div>
                    <dt>{pick({ en: 'Quantity', ar: 'الكمية' })}</dt>
                    <dd>{String(row.desired_quantity ?? '')}</dd>
                  </div>
                  <div>
                    <dt>{pick({ en: 'Created', ar: 'تاريخ الإنشاء' })}</dt>
                    <dd>{new Date(String(row.created_at || Date.now())).toLocaleDateString()}</dd>
                  </div>
                  {row.quote_total != null && (
                    <div>
                      <dt>{pick({ en: 'Quote total', ar: 'إجمالي العرض' })}</dt>
                      <dd>{money(row.quote_total, String(row.currency || 'USD'))}</dd>
                    </div>
                  )}
                  {Boolean(row.estimated_arrival_days) && (
                    <div>
                      <dt>{pick({ en: 'Estimated arrival', ar: 'الوصول التقديري' })}</dt>
                      <dd>
                        {String(row.estimated_arrival_days)} {pick({ en: 'days', ar: 'يومًا' })}
                      </dd>
                    </div>
                  )}
                </dl>
                {Boolean(row.staff_notes) && (
                  <div className="special-request-note">
                    <strong>{pick({ en: 'Operations note', ar: 'ملاحظة العمليات' })}</strong>
                    <p>{String(row.staff_notes || '')}</p>
                  </div>
                )}
                {canRespond && (
                  <div className="special-request-response">
                    <label className="field">
                      <span>
                        {pick({ en: 'Optional response note', ar: 'ملاحظة رد اختيارية' })}
                      </span>
                      <textarea
                        rows={2}
                        value={note[String(row.id || '')] || ''}
                        onChange={(event) =>
                          setNote((current) => ({
                            ...current,
                            [String(row.id || '')]: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <div>
                      <button
                        className="btn-primary compact"
                        disabled={busy === String(row.id || '')}
                        onClick={() => {
                          void respond(row, 'accepted');
                        }}
                      >
                        {pick({ en: 'Accept quote', ar: 'قبول العرض' })}
                      </button>
                      <button
                        className="btn-secondary compact"
                        disabled={busy === String(row.id || '')}
                        onClick={() => {
                          void respond(row, 'rejected');
                        }}
                      >
                        {pick({ en: 'Reject', ar: 'رفض' })}
                      </button>
                    </div>
                  </div>
                )}
                {row.status === 'awaiting_payment' && (
                  <div className="quote-pay-actions">
                    {isPaymentMethodConfigured('online_card') && (
                      <button
                        type="button"
                        className="btn-primary compact"
                        disabled={busy === String(row.id || '')}
                        onClick={() => {
                          void pay(row, 'online_card');
                        }}
                      >
                        {pick({ en: 'Pay securely by card', ar: 'الدفع الآمن بالبطاقة' })}
                      </button>
                    )}
                    {isPaymentMethodConfigured('libyan_bank_card') && (
                      <button
                        type="button"
                        className="btn-secondary compact"
                        disabled={busy === String(row.id || '')}
                        onClick={() => {
                          void pay(row, 'libyan_bank_card');
                        }}
                      >
                        {pick({ en: 'Libyan bank card', ar: 'بطاقة مصرفية ليبية' })}
                      </button>
                    )}
                    {!isPaymentMethodConfigured('online_card') &&
                      !isPaymentMethodConfigured('libyan_bank_card') &&
                      Boolean(row.payment_url) && (
                        <a
                          className="btn-primary compact"
                          href={String(row.payment_url || '')}
                          rel="noopener noreferrer"
                        >
                          {pick({ en: 'Open secure payment', ar: 'فتح الدفع الآمن' })}
                        </a>
                      )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

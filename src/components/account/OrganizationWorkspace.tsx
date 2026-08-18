import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent, ReactElement } from 'react';
import type { LocaleValue } from '../../context/LanguageContext';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { isPaymentMethodConfigured } from '../../utils/payments';
import {
  createProjectMessage,
  createReorderRequest,
  ensureOrganization,
  listProductionUpdates,
  listQuoteRequests,
  listRosters,
  listSavedDesigns,
  loadEnterpriseWorkspace,
  respondToDesign,
  respondToQuote,
  signOrganizationContract,
  startExternalContractSignature,
  startQuotePayment,
  submitPaymentProof,
} from '../../services/b2b';
import { createTextPdf, downloadBlob } from '../../utils/simplePdf';

type StatusLabel = { en: string; ar: string };
type PickFn = (value: LocaleValue) => string;
type Row = Record<string, unknown>;

function asRecord(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Row) : {};
}

function asRows(value: unknown): Row[] {
  return Array.isArray(value) ? (value as Row[]) : [];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}


const STATUS_LABELS = {
  draft: { en: 'Draft', ar: 'مسودة' },
  quote_requested: { en: 'Quote requested', ar: 'تم طلب عرض السعر' },
  under_review: { en: 'Under review', ar: 'قيد المراجعة' },
  quote_sent: { en: 'Quote sent', ar: 'تم إرسال العرض' },
  proof_ready: { en: 'Proof ready', ar: 'البروفة جاهزة' },
  changes_requested: { en: 'Changes requested', ar: 'تم طلب تعديلات' },
  approved: { en: 'Approved', ar: 'معتمد' },
  awaiting_approval: { en: 'Awaiting approval', ar: 'بانتظار الاعتماد' },
  deposit_required: { en: 'Deposit required', ar: 'العربون مطلوب' },
  deposit_paid: { en: 'Deposit paid', ar: 'تم دفع العربون' },
  design_approved: { en: 'Design approved', ar: 'تم اعتماد التصميم' },
  in_production: { en: 'In production', ar: 'قيد التصنيع' },
  quality_control: { en: 'Quality control', ar: 'مراقبة الجودة' },
  shipped: { en: 'Shipped', ar: 'تم الشحن' },
  arrived: { en: 'Arrived', ar: 'وصلت البضاعة' },
  final_payment_required: { en: 'Final payment required', ar: 'الدفعة الأخيرة مطلوبة' },
  completed: { en: 'Completed', ar: 'مكتمل' },
};

function statusLabel(status: unknown): StatusLabel | undefined {
  return (STATUS_LABELS as Record<string, StatusLabel>)[String(status || '')];
}

const WORKSPACE_TABS = [
  { key: 'designs', en: 'Designs', ar: 'التصاميم' },
  { key: 'rosters', en: 'Rosters', ar: 'قوائم الفريق' },
  { key: 'quotes', en: 'Quotes', ar: 'عروض الأسعار' },
  { key: 'production', en: 'Production', ar: 'التصنيع' },
  { key: 'documents', en: 'Documents', ar: 'المستندات' },
  { key: 'shipping', en: 'Shipping', ar: 'الشحن' },
  { key: 'messages', en: 'Messages', ar: 'الرسائل' },
  { key: 'reorders', en: 'Reorders', ar: 'إعادة الطلب' },
  { key: 'locker', en: 'Team Locker', ar: 'متجر الفريق' },
];

function formatDate(value: unknown, lang?: string): string {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-LY' : 'en-US', {
      dateStyle: 'medium',
    }).format(new Date(String(value)));
  } catch {
    return String(value).slice(0, 10);
  }
}

export default function OrganizationWorkspace(): ReactElement {
  const { pick, lang } = useLanguage();
  const auth = useAuth();
  const userMeta = ((auth.user as { user_metadata?: Row } | null)?.user_metadata || {}) as Row;
  const [tab, setTab] = useState('designs');
  type WorkspaceState = {
    loading: boolean;
    designs: Row[];
    rosters: Row[];
    quotes: Row[];
    production: Row[];
    documents: Row[];
    shipping: Row[];
    messages: Row[];
    reorders: Row[];
    locker: Row[];
    organizationIds: string[];
    error: string;
    [key: string]: unknown;
  };
  const [state, setState] = useState<WorkspaceState>({
    loading: true,
    designs: [],
    rosters: [],
    quotes: [],
    production: [],
    documents: [],
    shipping: [],
    messages: [],
    reorders: [],
    locker: [],
    organizationIds: [],
    error: '',
  });
  const listFor = (key: string): Row[] => asRows(state[key]);
  const accountType = String(userMeta.account_type || 'customer');
  const isOrganization = accountType === 'organization';

  const load = useCallback(async () => {
    if (!auth.user?.id) return;
    setState((current) => ({ ...current, loading: true, error: '' }));
    try {
      if (isOrganization) {
        await ensureOrganization({
          userId: String(auth.user.id),
          name: String(userMeta.organization_name || ''),
          type: String(userMeta.organization_type || 'club'),
          countryCode: String(userMeta.country_code || 'LY'),
        });
      }
      const [designsRaw, rostersRaw, quotesRaw, productionRaw, enterpriseRaw] = await Promise.all([
        listSavedDesigns(String(auth.user.id)),
        listRosters(String(auth.user.id)),
        listQuoteRequests(String(auth.user.id)),
        listProductionUpdates(String(auth.user.id)),
        loadEnterpriseWorkspace(String(auth.user.id)),
      ]);
      const enterprise = asRecord(enterpriseRaw);
      const documents: Row[] = [
        ...asRows(enterprise.invoices).map((row) => ({ ...row, document_kind: 'invoice' }) as Row),
        ...asRows(enterprise.contracts).map((row) => ({ ...row, document_kind: 'contract' }) as Row),
        ...asRows(enterprise.paymentProofs).map(
          (row) => ({ ...row, document_kind: 'payment_proof' }) as Row,
        ),
      ].sort((a, b) =>
        String(b.updated_at || b.created_at || '').localeCompare(
          String(a.updated_at || a.created_at || ''),
        ),
      );
      setState({
        loading: false,
        designs: asRows(designsRaw),
        rosters: asRows(rostersRaw),
        quotes: asRows(quotesRaw),
        production: asRows(productionRaw),
        documents,
        shipping: asRows(enterprise.shipments),
        messages: asRows(enterprise.messages),
        reorders: asRows(enterprise.reorders),
        locker: asRows(enterprise.lockers),
        organizationIds: asRows(enterprise.organizations).map((row) => String(row.id || '')),
        error: '',
      });
    } catch {
      setState((current) => ({
        ...current,
        loading: false,
        error: pick({
          en: 'Workspace data could not be refreshed.',
          ar: 'تعذر تحديث بيانات المنصة.',
        }),
      }));
    }
  }, [
    auth.user?.id,
    userMeta.country_code,
    userMeta.organization_name,
    userMeta.organization_type,
    isOrganization,
    pick,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeRows = useMemo(() => asRows(state[tab]), [state, tab]);

  if (!isOrganization) {
    return (
      <div className="organization-upgrade-card">
        <div>
          <p className="section-label">TEAMS & WHOLESALE</p>
          <h2>{pick({ en: 'Organization workspace', ar: 'منصة المؤسسة' })}</h2>
          <p>
            {pick({
              en: 'Create a team or business account to manage designs, rosters, quotes, deposits and production progress in one place.',
              ar: 'أنشئ حساب فريق أو مؤسسة لإدارة التصاميم وقوائم اللاعبين وعروض الأسعار والعربون ومراحل التصنيع في مكان واحد.',
            })}
          </p>
        </div>
        <Link to="/teams-wholesale#quote" className="btn-primary">
          {pick({ en: 'Apply for organization access', ar: 'اطلب حساب مؤسسة' })}
        </Link>
      </div>
    );
  }

  return (
    <section className="organization-workspace" aria-labelledby="organization-workspace-title">
      <div className="section-heading-row">
        <div>
          <p className="section-label">B2B WORKSPACE</p>
          <h2 id="organization-workspace-title">
            {String(userMeta.organization_name || '') ||
              pick({ en: 'Organization workspace', ar: 'منصة المؤسسة' })}
          </h2>
        </div>
        <div className="workspace-heading-actions">
          <Link to="/customize" className="btn-primary">
            {pick({ en: 'New Design', ar: 'تصميم جديد' })}
          </Link>
          <button type="button" className="btn-secondary" onClick={() => { void load(); }} disabled={state.loading}>
            {state.loading
              ? pick({ en: 'Refreshing…', ar: 'جاري التحديث…' })
              : pick({ en: 'Refresh', ar: 'تحديث' })}
          </button>
        </div>
      </div>
      <nav
        className="workspace-tabs"
        aria-label={pick({ en: 'Organization workspace sections', ar: 'أقسام منصة المؤسسة' })}
      >
        {WORKSPACE_TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={tab === item.key ? 'active' : ''}
            onClick={() => setTab(item.key)}
          >
            <span>{pick({ en: item.en, ar: item.ar })}</span>
            <b>{listFor(item.key).length}</b>
          </button>
        ))}
      </nav>
      {state.error && (
        <p className="form-status" role="alert">
          {state.error}
        </p>
      )}
      {state.loading ? (
        <p role="status">{pick({ en: 'Loading workspace…', ar: 'جاري تحميل المنصة…' })}</p>
      ) : activeRows.length === 0 ? (
        <div className="workspace-empty">
          <h3>
            {pick({
              en: `No ${WORKSPACE_TABS.find((item) => item.key === tab)?.en.toLowerCase()} yet`,
              ar: 'لا توجد بيانات حتى الآن',
            })}
          </h3>
          <p>
            {tab === 'designs'
              ? pick({
                  en: 'Start a custom product in the Design Studio.',
                  ar: 'ابدأ منتجًا مخصصًا داخل استوديو التصميم.',
                })
              : tab === 'rosters'
                ? pick({
                    en: 'Rosters are saved when you prepare a team design or quote.',
                    ar: 'يتم حفظ قوائم الفريق عند تجهيز تصميم أو عرض سعر.',
                  })
                : pick({
                    en: 'Your Shababuna team will update this workspace as the project moves forward.',
                    ar: 'سيحدّث فريق شبابنا هذه المنصة مع تقدم المشروع.',
                  })}
          </p>
          {tab === 'designs' && (
            <Link className="btn-secondary" to="/customize">
              {pick({ en: 'Open Design Studio', ar: 'افتح استوديو التصميم' })}
            </Link>
          )}
        </div>
      ) : null}

      {!state.loading && tab === 'designs' && activeRows.length > 0 && (
        <div className="workspace-card-grid">
          {activeRows.map((item) => (
            <DesignWorkspaceCard
              key={String(item.id)}
              item={item}
              pick={pick}
              lang={String(lang)}
              onSaved={load}
            />
          ))}
        </div>
      )}

      {!state.loading && tab === 'rosters' && activeRows.length > 0 && (
        <div className="workspace-list">
          {activeRows.map((item) => {
            const players = asRows(item.players);
            return (
              <article key={String(item.id)}>
                <div>
                  <span className="workspace-index">
                    {String(item.player_count || players.length || 0).padStart(2, '0')}
                  </span>
                  <div>
                    <h3>{String(item.name || '')}</h3>
                    <p>
                      {pick({ en: 'players', ar: 'لاعب' })} ·{' '}
                      {item.validation_errors
                        ? pick({
                            en: `${String(item.validation_errors)} issues`,
                            ar: `${String(item.validation_errors)} ملاحظات`,
                          })
                        : pick({ en: 'Validated', ar: 'تم التحقق' })}
                    </p>
                  </div>
                </div>
                <small>{formatDate(item.updated_at, lang)}</small>
              </article>
            );
          })}
        </div>
      )}

      {!state.loading && tab === 'quotes' && activeRows.length > 0 && (
        <div className="workspace-list">
          {activeRows.map((item) => (
            <QuoteWorkspaceRow
              key={String(item.id)}
              item={item}
              pick={pick}
              lang={String(lang)}
              onSaved={load}
            />
          ))}
        </div>
      )}

      {!state.loading && tab === 'production' && activeRows.length > 0 && (
        <div className="production-timeline">
          {activeRows.map((item) => (
            <article key={String(item.id)}>
              <span className="timeline-marker" />
              <div>
                <small>{formatDate(item.created_at, lang)}</small>
                <h3>
                  {pick(
                    statusLabel(item.status) || {
                      en: String(item.title || item.status || ''),
                      ar: String(item.title_ar || item.status || ''),
                    },
                  )}
                </h3>
                {Boolean(item.message) && <p>{String(item.message || '')}</p>}
              </div>
            </article>
          ))}
        </div>
      )}

      {!state.loading && tab === 'documents' && (
        <EnterpriseDocuments
          rows={state.documents}
          quotes={state.quotes}
          {...(auth.session?.access_token
            ? { accessToken: String(auth.session.access_token) }
            : {})}
          {...(auth.user ? { user: auth.user } : {})}
          pick={pick}
          lang={String(lang)}
          onSaved={load}
        />
      )}
      {!state.loading && tab === 'shipping' && (
        <ShipmentWorkspace rows={state.shipping} pick={pick} lang={String(lang)} />
      )}
      {!state.loading && tab === 'messages' && (
        <MessageWorkspace
          rows={state.messages}
          {...(state.organizationIds[0] ? { organizationId: state.organizationIds[0] } : {})}
          pick={pick}
          lang={String(lang)}
          onSaved={load}
        />
      )}
      {!state.loading && tab === 'reorders' && (
        <ReorderWorkspace
          rows={state.reorders}
          {...(state.organizationIds[0] ? { organizationId: state.organizationIds[0] } : {})}
          designs={state.designs}
          quotes={state.quotes}
          pick={pick}
          lang={String(lang)}
          onSaved={load}
        />
      )}
      {!state.loading && tab === 'locker' && (
        <TeamLockerWorkspace rows={state.locker} pick={pick} lang={String(lang)} />
      )}
    </section>
  );
}

function DesignWorkspaceCard({ item, pick, lang, onSaved }: { item: Row; pick: PickFn; lang: string; onSaved: () => void | Promise<void> }): ReactElement {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');
  const preview = asRecord(item.preview_data);
  const designData = asRecord(item.design_data);
  const proofData = asRecord(item.proof_data);
  const proofUrls = Array.isArray(proofData.urls)
    ? (proofData.urls as unknown[]).filter((url) => /^https:\/\//i.test(String(url || '')))
    : [];
  const actionable = item.status === 'proof_ready';
  const respond = async (decision: string) => {
    setBusy(decision);
    try {
      await respondToDesign({ designId: String(item.id || ''), decision, note });
      await onSaved();
    } finally {
      setBusy('');
    }
  };
  return (
    <article
      className={`workspace-card design-workspace-card ${actionable ? 'workspace-card--actionable' : ''}`}
    >
      <svg className="workspace-design-swatch" viewBox="0 0 80 96" aria-hidden="true">
        <rect
          width="80"
          height="96"
          rx="10"
          fill={String(preview.primary || designData.primary || '#050505')}
        />
        <path
          d="M0 66L80 36V96H0Z"
          fill={String(preview.secondary || designData.secondary || '#ffffff')}
          opacity=".3"
        />
        <text
          x="40"
          y="58"
          textAnchor="middle"
          dominantBaseline="middle"
          fill={String(preview.secondary || designData.secondary || '#ffffff')}
          fontSize="28"
          fontWeight="900"
        >
          {String(preview.number || designData.number || '00')}
        </text>
      </svg>
      <div className="workspace-card-copy">
        <span className="workspace-status">
          {pick(
            statusLabel(item.status) || {
              en: String(item.status || 'Draft'),
              ar: String(item.status || 'مسودة'),
            },
          )}
        </span>
        <h3>{String(item.name || '')}</h3>
        <p>
          {String(item.product_type || '')} · v{String(item.version || 1)}
        </p>
        <small>{formatDate(item.updated_at, lang)}</small>
        {proofUrls.length > 0 && (
          <div className="proof-link-row">
            {proofUrls.map((url: unknown, index: number) => (
              <a key={`${String(url)}-${index}`} href={String(url)} target="_blank" rel="noreferrer">
                {pick({ en: `Proof ${index + 1}`, ar: `البروفة ${index + 1}` })}
              </a>
            ))}
          </div>
        )}
        {actionable && (
          <div className="workspace-approval">
            <textarea
              rows={2}
              value={note}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setNote(event.target.value)}
              placeholder={pick({
                en: 'Optional approval or change note',
                ar: 'ملاحظة اختيارية للاعتماد أو التعديل',
              })}
            />
            <div>
              <button
                type="button"
                className="btn-primary compact"
                disabled={Boolean(busy)}
                onClick={() => { void respond('approved'); }}
              >
                {busy === 'approved'
                  ? pick({ en: 'Approving…', ar: 'جاري الاعتماد…' })
                  : pick({ en: 'Approve Proof', ar: 'اعتماد البروفة' })}
              </button>
              <button
                type="button"
                className="btn-secondary compact"
                disabled={Boolean(busy)}
                onClick={() => { void respond('changes_requested'); }}
              >
                {pick({ en: 'Request Changes', ar: 'طلب تعديلات' })}
              </button>
            </div>
          </div>
        )}
      </div>
      <Link to={`/customize?design=${encodeURIComponent(String(item.id || ''))}`}>
        {item.status === 'approved'
          ? pick({ en: 'View', ar: 'عرض' })
          : pick({ en: 'Open', ar: 'فتح' })}{' '}
        →
      </Link>
    </article>
  );
}

function QuoteWorkspaceRow({ item, pick, lang, onSaved }: { item: Row; pick: PickFn; lang: string; onSaved: () => void | Promise<void> }): ReactElement {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const requestData = asRecord(item.request_data);
  const actionable = ['quote_sent', 'awaiting_approval'].includes(String(item.status || ''));
  const payable =
    ['deposit_required', 'final_payment_required'].includes(String(item.status || '')) &&
    Number(item.amount_due_now) > 0;
  const onlineCardConfigured = isPaymentMethodConfigured('online_card');
  const libyanCardConfigured = isPaymentMethodConfigured('libyan_bank_card');
  const customerEmail = String(requestData.customerEmail || requestData.email || '');
  const respond = async (decision: string) => {
    setBusy(decision);
    setMessage('');
    try {
      await respondToQuote({ quoteId: String(item.id || ''), decision, note });
      await onSaved();
    } catch (error: unknown) {
      setMessage(errorMessage(error));
    } finally {
      setBusy('');
    }
  };
  const pay = async (paymentMethod: string) => {
    setBusy(paymentMethod);
    setMessage('');
    try {
      await startQuotePayment({
        quoteNumber: String(item.quote_number || ''),
        customerEmail,
        paymentMethod,
      });
    } catch {
      setMessage(
        pick({
          en: 'The selected payment method is temporarily unavailable.',
          ar: 'وسيلة الدفع المحددة غير متاحة مؤقتًا.',
        }),
      );
      setBusy('');
    }
  };
  const downloadDocument = (kind: string) => {
    const isInvoice = kind === 'invoice';
    const blob = createTextPdf({
      title: isInvoice ? 'SHABABUNA INVOICE' : 'SHABABUNA QUOTE',
      subtitle: `${String(item.quote_number || item.id || '')} · BUILT DIFFERENT`,
      sections: [
        {
          heading: 'Customer',
          rows: [
            ['Email', customerEmail || '—'],
            [
              'Organization',
              String(requestData.organizationName || requestData.teamName || '—'),
            ],
            ['Status', String(item.status || '—')],
            ['Created', formatDate(item.created_at, lang)],
          ],
        },
        {
          heading: 'Commercial summary',
          rows: [
            ['Subtotal', `${Number(item.subtotal || 0).toFixed(2)} ${item.currency || 'USD'}`],
            [
              'Shipping',
              `${Number(item.shipping_total || 0).toFixed(2)} ${item.currency || 'USD'}`,
            ],
            ['Tax', `${Number(item.tax_total || 0).toFixed(2)} ${item.currency || 'USD'}`],
            [
              'Discount',
              `${Number(item.discount_total || 0).toFixed(2)} ${item.currency || 'USD'}`,
            ],
            ['Total', `${Number(item.total || 0).toFixed(2)} ${item.currency || 'USD'}`],
            ['Paid', `${Number(item.amount_paid || 0).toFixed(2)} ${item.currency || 'USD'}`],
            [
              'Outstanding',
              `${Number(item.outstanding_balance ?? item.remaining_balance ?? 0).toFixed(2)} ${item.currency || 'USD'}`,
            ],
          ],
        },
        {
          heading: 'Terms',
          rows: [
            'Custom and wholesale production requires an approved proof and deposit.',
            'Production timing and payment terms follow the approved quote for this order.',
            'This document is generated from the trusted account record.',
          ],
        },
      ],
    });
    downloadBlob(
      blob,
      `${isInvoice ? 'invoice' : 'quote'}-${String(item.quote_number || item.id || '')}.pdf`,
    );
  };
  return (
    <article className={actionable || payable ? 'workspace-list-actionable' : ''}>
      <div>
        <span className="workspace-status-dot" data-status={String(item.status || '')} />
        <div>
          <h3>{String(item.quote_number || item.id || '')}</h3>
          <p>
            {pick(
              statusLabel(item.status) || {
                en: String(item.status || ''),
                ar: String(item.status || ''),
              },
            )}
          </p>
          <div className="quote-payment-breakdown">
            <small>
              {pick({ en: 'Paid', ar: 'مدفوع' })}: ${Number(item.amount_paid || 0).toFixed(2)}
            </small>
            <small>
              {pick({ en: 'Due now', ar: 'مطلوب الآن' })}: $
              {Number(item.amount_due_now || 0).toFixed(2)}
            </small>
            <small>
              {pick({ en: 'Later', ar: 'لاحقًا' })}: $
              {Math.max(
                0,
                Number(item.outstanding_balance ?? item.remaining_balance ?? 0) -
                  Number(item.amount_due_now || 0),
              ).toFixed(2)}
            </small>
          </div>
          {actionable && (
            <div className="quote-response">
              <input
                value={note}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setNote(event.target.value)}
                placeholder={pick({ en: 'Optional note', ar: 'ملاحظة اختيارية' })}
              />
              <div>
                <button
                  type="button"
                  className="btn-primary compact"
                  disabled={Boolean(busy)}
                  onClick={() => { void respond('accepted'); }}
                >
                  {pick({ en: 'Accept Quote', ar: 'قبول العرض' })}
                </button>
                <button
                  type="button"
                  className="btn-secondary compact"
                  disabled={Boolean(busy)}
                  onClick={() => { void respond('changes_requested'); }}
                >
                  {pick({ en: 'Request Changes', ar: 'طلب تعديل' })}
                </button>
              </div>
            </div>
          )}
          {payable && (onlineCardConfigured || libyanCardConfigured) && (
            <div className="quote-pay-actions">
              {onlineCardConfigured && (
                <button
                  type="button"
                  className="btn-primary compact"
                  disabled={Boolean(busy)}
                  onClick={() => { void pay('online_card'); }}
                >
                  {pick({ en: 'Pay by Card', ar: 'الدفع بالبطاقة' })}
                </button>
              )}
              {libyanCardConfigured && (
                <button
                  type="button"
                  className="btn-secondary compact"
                  disabled={Boolean(busy)}
                  onClick={() => { void pay('libyan_bank_card'); }}
                >
                  {pick({ en: 'Libyan Bank Card', ar: 'بطاقة مصرفية ليبية' })}
                </button>
              )}
            </div>
          )}
          <div className="quote-document-actions">
            <button
              type="button"
              className="btn-secondary compact"
              onClick={() => downloadDocument('quote')}
            >
              {pick({ en: 'Download Quote PDF', ar: 'تحميل عرض السعر PDF' })}
            </button>
            {Number(item.amount_paid || 0) > 0 && (
              <button
                type="button"
                className="btn-secondary compact"
                onClick={() => downloadDocument('invoice')}
              >
                {pick({ en: 'Download Invoice PDF', ar: 'تحميل الفاتورة PDF' })}
              </button>
            )}
          </div>
          {message && (
            <p className="form-status" role="status">
              {message}
            </p>
          )}
        </div>
      </div>
      <div className="workspace-money">
        <strong>
          {item.total == null
            ? pick({ en: 'Under review', ar: 'قيد المراجعة' })
            : `${String(item.total)} ${String(item.currency || 'USD')}`}
        </strong>
        <small>{formatDate(item.updated_at || item.created_at, lang)}</small>
      </div>
    </article>
  );
}

function EnterpriseDocuments({ rows, quotes, accessToken, user, pick, lang, onSaved }: { rows: Row[]; quotes: Row[]; accessToken?: string | undefined; user?: unknown; pick: PickFn; lang: string; onSaved: () => void | Promise<void> }): ReactElement {
  const [entityType, setEntityType] = useState('quote');
  const [entityId, setEntityId] = useState(String(quotes[0]?.id || ''));
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const invoices = rows.filter((row) => row.document_kind === 'invoice');
  const contracts = rows.filter((row) => row.document_kind === 'contract');
  const proofs = rows.filter((row) => row.document_kind === 'payment_proof');
  const entityOptions = entityType === 'invoice' ? invoices : quotes;
  useEffect(() => {
    if (!entityOptions.some((row) => String(row.id || '') === entityId)) {
      setEntityId(String(entityOptions[0]?.id || ''));
    }
  }, [entityId, entityOptions]);
  const upload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy('proof');
    setMessage('');
    try {
      await submitPaymentProof({
        ...(accessToken ? { accessToken } : {}),
        entityType,
        entityId,
        file,
        amount,
        reference,
      });
      setFile(null);
      setAmount('');
      setReference('');
      setMessage(
        pick({
          en: 'Payment proof uploaded securely and queued for verification.',
          ar: 'تم رفع إثبات الدفع بأمان وإرساله للمراجعة.',
        }),
      );
      await onSaved();
    } catch (error: unknown) {
      setMessage(errorMessage(error));
    } finally {
      setBusy('');
    }
  };
  return (
    <div className="enterprise-panel-stack">
      <form className="enterprise-action-card" onSubmit={(event) => { void upload(event); }}>
        <div>
          <p className="section-label">PAYMENT PROOF</p>
          <h3>{pick({ en: 'Submit bank-transfer proof', ar: 'إرسال إثبات التحويل المصرفي' })}</h3>
          <p>
            {pick({
              en: 'Files remain private and quarantined until security scanning completes.',
              ar: 'تبقى الملفات خاصة وفي الحجر إلى أن يكتمل الفحص الأمني.',
            })}
          </p>
        </div>
        <div className="operations-form-grid">
          <label>
            <span>{pick({ en: 'Document type', ar: 'نوع المستند' })}</span>
            <select value={entityType} onChange={(event: ChangeEvent<HTMLSelectElement>) => setEntityType(event.target.value)}>
              <option value="quote">{pick({ en: 'Quote', ar: 'عرض سعر' })}</option>
              <option value="invoice">{pick({ en: 'Invoice', ar: 'فاتورة' })}</option>
            </select>
          </label>
          <label>
            <span>{pick({ en: 'Reference document', ar: 'المستند المرجعي' })}</span>
            <select value={entityId} onChange={(event: ChangeEvent<HTMLSelectElement>) => setEntityId(event.target.value)} required>
              <option value="">—</option>
              {entityOptions.map((row) => (
                <option key={String(row.id)} value={String(row.id || '')}>
                  {String(row.quote_number || row.invoice_number || row.id || '')}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{pick({ en: 'Amount', ar: 'المبلغ' })}</span>
            <input
              type="number"
              min={0.01}
              step={0.01}
              value={amount}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setAmount(event.target.value)}
              required
            />
          </label>
          <label>
            <span>{pick({ en: 'Transfer reference', ar: 'مرجع التحويل' })}</span>
            <input
              value={reference}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setReference(event.target.value)}
              maxLength={240}
            />
          </label>
        </div>
        <label>
          <span>{pick({ en: 'Proof image or PDF', ar: 'صورة أو PDF للإثبات' })}</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setFile(event.target.files?.[0] || null)
            }
            required
          />
        </label>
        <button
          className="btn-primary compact"
          disabled={busy === 'proof' || !entityId || !file || !amount}
        >
          {busy === 'proof'
            ? pick({ en: 'Uploading…', ar: 'جاري الرفع…' })
            : pick({ en: 'Upload Proof', ar: 'رفع الإثبات' })}
        </button>
        {message && (
          <p className="form-status" role="status">
            {message}
          </p>
        )}
      </form>
      <div className="workspace-card-grid">
        {contracts.map((contract) => (
          <ContractWorkspaceCard
            key={String(contract.id)}
            contract={contract}
            {...(accessToken ? { accessToken } : {})}
            {...(user !== undefined ? { user } : {})}
            pick={pick}
            lang={String(lang)}
            onSaved={onSaved}
          />
        ))}
      </div>
      <div className="workspace-list">
        {invoices.map((invoice) => (
          <InvoiceWorkspaceRow key={String(invoice.id)} invoice={invoice} pick={pick} lang={String(lang)} />
        ))}
        {proofs.map((proof) => (
          <article key={String(proof.id)}>
            <div>
              <span className="workspace-status-dot" data-status={String(proof.status || '')} />
              <div>
                <h3>{String(proof.proof_number || '')}</h3>
                <p>
                  {pick({ en: 'Payment proof', ar: 'إثبات دفع' })} · {String(proof.status || '')}
                </p>
              </div>
            </div>
            <div className="workspace-money">
              <strong>
                {Number(proof.amount || 0).toFixed(2)} {String(proof.currency || '')}
              </strong>
              <small>{formatDate(proof.created_at, lang)}</small>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function ContractWorkspaceCard({ contract, accessToken, user, pick, lang, onSaved }: { contract: Row; accessToken?: string | undefined; user?: unknown; pick: PickFn; lang: string; onSaved: () => void | Promise<void> }): ReactElement {
  const authUser = asRecord(user);
  const userMetadata = asRecord(authUser.user_metadata);
  const [name, setName] = useState(
    String(userMetadata.full_name || String(authUser.email || '').split('@')[0] || ''),
  );
  const [signature, setSignature] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const signable = ['sent', 'viewed', 'changes_requested'].includes(String(contract.status || ''));
  const externalProviderConfigured = Boolean(import.meta.env.VITE_SIGNATURE_PROVIDER);
  const externalRequired = contract.signature_mode === 'external_required';
  const sign = async () => {
    setBusy(true);
    setMessage('');
    try {
      if (
        externalRequired ||
        (contract.signature_mode === 'external_optional' && externalProviderConfigured)
      ) {
        await startExternalContractSignature({
          ...(accessToken ? { accessToken } : {}),
          contractId: String(contract.id || ''),
          signerName: name,
          signerEmail: String(authUser.email || ''),
        });
        return;
      }
      await signOrganizationContract({
        ...(accessToken ? { accessToken } : {}),
        contractId: String(contract.id || ''),
        signerName: name,
        signerEmail: String(authUser.email || ''),
        signatureValue: signature,
        signatureType: 'typed',
        consentVersion: String(contract.terms_version || '1.0'),
      });
      setMessage(
        pick({
          en: 'Internal acceptance recorded with an audit trail.',
          ar: 'تم تسجيل القبول الداخلي مع سجل تدقيق.',
        }),
      );
      await onSaved();
    } catch (error: unknown) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <article className="workspace-card">
      <div className="workspace-card-copy">
        <span className="workspace-status">{String(contract.status || '')}</span>
        <h3>{String(contract.title || '')}</h3>
        <p>
          {String(contract.contract_number || '')} · {formatDate(contract.created_at, lang)}
        </p>
        {Boolean(contract.valid_until) && (
          <small>
            {pick({ en: 'Valid until', ar: 'صالح حتى' })}: {formatDate(contract.valid_until, lang)}
          </small>
        )}
        {signable && (
          <div className="workspace-approval">
            <input
              value={name}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setName(event.target.value)}
              placeholder={pick({ en: 'Authorized signer name', ar: 'اسم المفوض بالتوقيع' })}
            />
            {!externalRequired && (
              <input
                value={signature}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setSignature(event.target.value)}
                placeholder={pick({
                  en: 'Type your full legal name as signature',
                  ar: 'اكتب اسمك القانوني الكامل كتوقيع',
                })}
              />
            )}
            <label className="operations-check">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setConsent(event.target.checked)}
              />
              <span>
                {pick({
                  en: 'I am authorized and agree to the contract terms.',
                  ar: 'أنا مفوض وأوافق على شروط العقد.',
                })}
              </span>
            </label>
            {externalRequired && !externalProviderConfigured && (
              <p className="form-status" role="alert">
                {pick({
                  en: 'A verified external signature provider is required but is not configured.',
                  ar: 'يلزم مزود توقيع خارجي موثق لكنه غير مربوط حاليًا.',
                })}
              </p>
            )}
            <button
              type="button"
              className="btn-primary compact"
              disabled={
                busy ||
                !consent ||
                name.trim().length < 2 ||
                (!externalRequired && signature.trim().length < 2) ||
                (externalRequired && !externalProviderConfigured)
              }
              onClick={() => { void sign(); }}
            >
              {busy
                ? pick({ en: 'Opening secure signature…', ar: 'جاري فتح التوقيع الآمن…' })
                : externalRequired
                  ? pick({ en: 'Open Verified Signature', ar: 'فتح التوقيع الموثق' })
                  : pick({ en: 'Record Acceptance', ar: 'تسجيل القبول' })}
            </button>
            <small>
              {externalRequired
                ? pick({
                    en: 'Completion requires the provider-signed document and audit certificate.',
                    ar: 'لا يكتمل العقد إلا بوثيقة المزود الموقعة وشهادة التدقيق.',
                  })
                : pick({
                    en: 'This is an internal acceptance record, not a third-party legal certificate.',
                    ar: 'هذا سجل قبول داخلي وليس شهادة قانونية من مزود خارجي.',
                  })}
            </small>
          </div>
        )}
        {message && (
          <p className="form-status" role="status">
            {message}
          </p>
        )}
      </div>
    </article>
  );
}

function InvoiceWorkspaceRow({ invoice, pick, lang }: { invoice: Row; pick: PickFn; lang: string }): ReactElement {
  const currency = String(invoice.currency || 'USD');
  const download = () => {
    const blob = createTextPdf({
      title: 'SHABABUNA INVOICE',
      subtitle: `${String(invoice.invoice_number || '')} · BUILT DIFFERENT`,
      sections: [
        {
          heading: 'Invoice',
          rows: [
            ['Status', String(invoice.status || '')],
            ['Created', formatDate(invoice.created_at, lang)],
            ['Due', formatDate(invoice.due_at, lang)],
          ],
        },
        {
          heading: 'Commercial summary',
          rows: [
            ['Subtotal', `${Number(invoice.subtotal || 0).toFixed(2)} ${currency}`],
            ['Shipping', `${Number(invoice.shipping_total || 0).toFixed(2)} ${currency}`],
            ['Tax', `${Number(invoice.tax_total || 0).toFixed(2)} ${currency}`],
            ['Discount', `${Number(invoice.discount_total || 0).toFixed(2)} ${currency}`],
            ['Total', `${Number(invoice.total || 0).toFixed(2)} ${currency}`],
            ['Paid', `${Number(invoice.amount_paid || 0).toFixed(2)} ${currency}`],
          ],
        },
      ],
    });
    downloadBlob(blob, `invoice-${String(invoice.invoice_number || 'invoice')}.pdf`);
  };
  return (
    <article>
      <div>
        <span className="workspace-status-dot" data-status={String(invoice.status || '')} />
        <div>
          <h3>{String(invoice.invoice_number || '')}</h3>
          <p>
            {String(invoice.status || '')} · {formatDate(invoice.created_at, lang)}
          </p>
        </div>
      </div>
      <div className="workspace-money">
        <strong>
          {Number(invoice.total || 0).toFixed(2)} {currency}
        </strong>
        <button type="button" className="btn-secondary compact" onClick={download}>
          {pick({ en: 'Download PDF', ar: 'تحميل PDF' })}
        </button>
      </div>
    </article>
  );
}

function ShipmentWorkspace({ rows, pick, lang }: { rows: Row[]; pick: PickFn; lang: string }): ReactElement | null {
  if (!rows.length) return null;
  return (
    <div className="workspace-list">
      {rows.map((shipment) => {
        const carrier = asRecord(shipment.carrier);
        const template = String(carrier.tracking_url_template || '');
        const trackingNumber = String(shipment.tracking_number || '');
        const trackingUrl =
          trackingNumber && template
            ? template
                .replace('{tracking}', encodeURIComponent(trackingNumber))
                .replace('{trackingNumber}', encodeURIComponent(trackingNumber))
            : '';
        return (
          <article key={String(shipment.id)}>
            <div>
              <span className="workspace-status-dot" data-status={String(shipment.status || '')} />
              <div>
                <h3>{String(shipment.shipment_number || '')}</h3>
                <p>
                  {String(carrier.name || '') ||
                    pick({ en: 'Carrier pending', ar: 'شركة الشحن قيد التحديد' })}{' '}
                  · {String(shipment.status || '')}
                </p>
                {Boolean(trackingNumber) && <small>{trackingNumber}</small>}
              </div>
            </div>
            <div className="workspace-money">
              <small>{formatDate(shipment.shipped_at || shipment.created_at, lang)}</small>
              {Boolean(trackingUrl) && (
                <a
                  className="btn-secondary compact"
                  href={trackingUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {pick({ en: 'Track', ar: 'تتبع' })}
                </a>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function MessageWorkspace({ rows, organizationId, pick, lang, onSaved }: { rows: Row[]; organizationId?: string | undefined; pick: PickFn; lang: string; onSaved: () => void | Promise<void> }): ReactElement {
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      await createProjectMessage({
        ...(organizationId ? { organizationId } : {}),
        body,
      });
      setBody('');
      await onSaved();
    } catch (error: unknown) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="enterprise-panel-stack">
      <form className="enterprise-action-card" onSubmit={(event) => { void submit(event); }}>
        <h3>{pick({ en: 'Message the Shababuna project team', ar: 'راسل فريق مشروع شبابنا' })}</h3>
        <textarea
          rows={4}
          maxLength={5000}
          value={body}
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setBody(event.target.value)}
          required
        />
        <button className="btn-primary compact" disabled={busy || !organizationId || !body.trim()}>
          {pick({ en: 'Send Message', ar: 'إرسال الرسالة' })}
        </button>
        {message && (
          <p className="form-status" role="status">
            {message}
          </p>
        )}
      </form>
      <div className="workspace-list">
        {rows.map((row) => (
          <article key={String(row.id)}>
            <div>
              <span className="workspace-status-dot" />
              <div>
                <h3>
                  {row.sender_id
                    ? pick({ en: 'Project message', ar: 'رسالة المشروع' })
                    : pick({ en: 'Shababuna update', ar: 'تحديث شبابنا' })}
                </h3>
                <p>{String(row.body || '')}</p>
              </div>
            </div>
            <small>{formatDate(row.created_at, lang)}</small>
          </article>
        ))}
      </div>
    </div>
  );
}

function ReorderWorkspace({ rows, organizationId, designs, quotes, pick, lang, onSaved }: { rows: Row[]; organizationId?: string | undefined; designs: Row[]; quotes: Row[]; pick: PickFn; lang: string; onSaved: () => void | Promise<void> }): ReactElement {
  const sources = [
    ...quotes.map((row) => ({
      kind: 'quote',
      id: String(row.id || ''),
      label: String(row.quote_number || row.id || ''),
    })),
    ...designs.map((row) => ({
      kind: 'design',
      id: String(row.id || ''),
      label: String(row.name || row.id || ''),
    })),
  ];
  const [source, setSource] = useState(sources[0] ? `${sources[0].kind}:${sources[0].id}` : '');
  const [type, setType] = useState('full_reorder');
  const [note, setNote] = useState('');
  const [player, setPlayer] = useState({ name: '', number: '', size: '' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const [kind, ...parts] = source.split(':');
      const id = parts.join(':');
      await createReorderRequest({
        ...(organizationId ? { organizationId } : {}),
        sourceQuoteId: kind === 'quote' ? id : null,
        sourceDesignId: kind === 'design' ? id : null,
        requestType: type,
        playerDetails: type === 'single_player' ? player : {},
        note,
      });
      setNote('');
      await onSaved();
    } catch (error: unknown) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="enterprise-panel-stack">
      <form className="enterprise-action-card" onSubmit={(event) => { void submit(event); }}>
        <h3>{pick({ en: 'Reorder an approved project', ar: 'إعادة طلب مشروع معتمد' })}</h3>
        <div className="operations-form-grid">
          <label>
            <span>{pick({ en: 'Source', ar: 'المصدر' })}</span>
            <select value={source} onChange={(event: ChangeEvent<HTMLSelectElement>) => setSource(event.target.value)} required>
              <option value="">—</option>
              {sources.map((row) => (
                <option key={`${row.kind}:${row.id}`} value={`${row.kind}:${row.id}`}>
                  {row.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{pick({ en: 'Request type', ar: 'نوع الطلب' })}</span>
            <select value={type} onChange={(event: ChangeEvent<HTMLSelectElement>) => setType(event.target.value)}>
              <option value="full_reorder">
                {pick({ en: 'Full reorder', ar: 'إعادة الطلب كاملًا' })}
              </option>
              <option value="single_player">{pick({ en: 'One player', ar: 'لاعب واحد' })}</option>
              <option value="replacement">{pick({ en: 'Replacement', ar: 'بديل' })}</option>
              <option value="additional_units">
                {pick({ en: 'Additional units', ar: 'قطع إضافية' })}
              </option>
            </select>
          </label>
        </div>
        {type === 'single_player' && (
          <div className="operations-form-grid">
            <input
              placeholder={pick({ en: 'Player name', ar: 'اسم اللاعب' })}
              value={player.name}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setPlayer({ ...player, name: event.target.value })
              }
            />
            <input
              placeholder={pick({ en: 'Number', ar: 'الرقم' })}
              value={player.number}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setPlayer({ ...player, number: event.target.value })
              }
            />
            <input
              placeholder={pick({ en: 'Size', ar: 'المقاس' })}
              value={player.size}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setPlayer({ ...player, size: event.target.value })
              }
            />
          </div>
        )}
        <textarea
          rows={3}
          value={note}
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setNote(event.target.value)}
          placeholder={pick({
            en: 'Quantities or changes needed',
            ar: 'الكميات أو التعديلات المطلوبة',
          })}
        />
        <button className="btn-primary compact" disabled={busy || !organizationId || !source}>
          {pick({ en: 'Submit Reorder', ar: 'إرسال إعادة الطلب' })}
        </button>
        {message && (
          <p className="form-status" role="status">
            {message}
          </p>
        )}
      </form>
      <div className="workspace-list">
        {rows.map((row) => (
          <article key={String(row.id)}>
            <div>
              <span className="workspace-status-dot" data-status={String(row.status || '')} />
              <div>
                <h3>{String(row.request_number || '')}</h3>
                <p>
                  {String(row.request_type || '')} · {String(row.status || '')}
                </p>
              </div>
            </div>
            <small>{formatDate(row.created_at, lang)}</small>
          </article>
        ))}
      </div>
    </div>
  );
}

function TeamLockerWorkspace({ rows, pick, lang }: { rows: Row[]; pick: PickFn; lang: string }): ReactElement | null {
  if (!rows.length) return null;
  return (
    <div className="workspace-card-grid">
      {rows.map((store) => (
        <article className="workspace-card" key={String(store.id)}>
          <div className="workspace-card-copy">
            <span className="workspace-status">{String(store.status || '')}</span>
            <h3>{String(store.name || '')}</h3>
            <p>
              {String(store.description || '') ||
                pick({ en: 'Private organization storefront', ar: 'متجر خاص بالمؤسسة' })}
            </p>
            <small>
              {store.opens_at
                ? `${pick({ en: 'Opens', ar: 'يفتح' })}: ${formatDate(store.opens_at, lang)}`
                : pick({ en: 'Available to authorized members', ar: 'متاح للأعضاء المصرح لهم' })}
            </small>
          </div>
          {store.status === 'active' && (
            <Link to={`/team-locker/${encodeURIComponent(String(store.slug || ''))}`}>
              {pick({ en: 'Open Store', ar: 'فتح المتجر' })} →
            </Link>
          )}
        </article>
      ))}
    </div>
  );
}

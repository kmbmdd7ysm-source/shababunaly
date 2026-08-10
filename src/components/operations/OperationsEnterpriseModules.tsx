import type { ReactElement } from 'react';
import { useState } from 'react';
import { reviewPaymentProof, upsertOperationalEntity } from '../../services/operations';
import type { OperationsRunFn } from '../../types/operations';

export { InventoryCsvManager } from './InventoryCsvManager';

export function EnterpriseOperationsPanel({
  state,
  pick,
  saving,
  run,
}: {
  state: unknown;
  pick: (value: import('../../context/LanguageContext').LocaleValue) => string;
  saving?: string | boolean | undefined;
  run: OperationsRunFn;
}): ReactElement {
  const s = (state || {}) as Record<string, unknown>;
  const rows = (key: string) =>
    Array.isArray(s[key]) ? (s[key] as Array<Record<string, unknown>>) : [];
  const firstId = (key: string) => String(rows(key)[0]?.id || '');
  const [contract, setContract] = useState({
    organization_id: firstId('organizations'),
    quote_id: '',
    title: '',
    status: 'draft',
    terms: '{}',
  });
  const [locker, setLocker] = useState({
    organization_id: firstId('organizations'),
    name: '',
    slug: '',
    status: 'draft',
    access_mode: 'private',
  });
  const [lockerProduct, setLockerProduct] = useState({
    locker_store_id: firstId('lockers'),
    product_id: '',
    status: 'active',
  });
  const createContract = () => {
    let terms;
    try {
      terms = JSON.parse(contract.terms || '{}');
    } catch {
      throw new Error('invalid_contract_terms_json');
    }
    return upsertOperationalEntity('organization_contracts', {
      organization_id: contract.organization_id,
      quote_id: contract.quote_id || null,
      title: contract.title.trim(),
      status: contract.status,
      terms,
    });
  };
  const createLocker = () =>
    upsertOperationalEntity('team_locker_stores', {
      organization_id: locker.organization_id,
      name: locker.name.trim(),
      slug: locker.slug.trim().toLowerCase(),
      status: locker.status,
      access_mode: locker.access_mode,
      created_by: null,
    });
  const addLockerProduct = () =>
    upsertOperationalEntity('team_locker_products', {
      locker_store_id: lockerProduct.locker_store_id,
      product_id: lockerProduct.product_id.trim(),
      status: lockerProduct.status,
      variant_ids: [],
    });
  return (
    <div className="enterprise-panel-stack">
      <div className="operations-card-grid">
        <form
          className="operations-card"
          onSubmit={(event) => {
            event.preventDefault();
            void run(
              'enterprise-contract',
              createContract,
              pick({ en: 'Contract created.', ar: 'تم إنشاء العقد.' }),
            );
          }}
        >
          <div>
            <span>{pick({ en: 'New contract', ar: 'عقد جديد' })}</span>
            <strong>{contract.status}</strong>
          </div>
          <label>
            <span>{pick({ en: 'Organization', ar: 'المؤسسة' })}</span>
            <select
              value={contract.organization_id}
              onChange={(event) =>
                setContract({ ...contract, organization_id: event.target.value })
              }
              required
            >
              <option value="">—</option>
              {rows('organizations').map((row: Record<string, unknown>) => (
                <option key={String(row.id)} value={String(row.id || '')}>
                  {String(row.name || '')}
                </option>
              ))}
            </select>
          </label>
          <input
            value={contract.quote_id}
            onChange={(event) => setContract({ ...contract, quote_id: event.target.value })}
            placeholder={pick({ en: 'Quote ID (optional)', ar: 'معرف العرض (اختياري)' })}
          />
          <input
            value={contract.title}
            onChange={(event) => setContract({ ...contract, title: event.target.value })}
            placeholder={pick({ en: 'Contract title', ar: 'عنوان العقد' })}
            required
          />
          <textarea
            rows={4}
            value={contract.terms}
            onChange={(event) => setContract({ ...contract, terms: event.target.value })}
            aria-label={pick({ en: 'Contract terms JSON', ar: 'شروط العقد JSON' })}
          />
          <button
            className="btn-primary compact"
            disabled={
              saving === 'enterprise-contract' ||
              !contract.organization_id ||
              !contract.title.trim()
            }
          >
            {pick({ en: 'Create Contract', ar: 'إنشاء العقد' })}
          </button>
        </form>
        <form
          className="operations-card"
          onSubmit={(event) => {
            event.preventDefault();
            void run(
              'enterprise-locker',
              createLocker,
              pick({ en: 'Team locker created.', ar: 'تم إنشاء متجر الفريق.' }),
            );
          }}
        >
          <div>
            <span>{pick({ en: 'New team locker', ar: 'متجر فريق جديد' })}</span>
            <strong>{locker.status}</strong>
          </div>
          <label>
            <span>{pick({ en: 'Organization', ar: 'المؤسسة' })}</span>
            <select
              value={String(locker.organization_id || '')}
              onChange={(event) => setLocker({ ...locker, organization_id: event.target.value })}
              required
            >
              <option value="">—</option>
              {rows('organizations').map((row: Record<string, unknown>) => (
                <option key={String(row.id)} value={String(row.id || '')}>
                  {String(row.name || '')}
                </option>
              ))}
            </select>
          </label>
          <input
            value={String(locker.name || '')}
            onChange={(event) => setLocker({ ...locker, name: event.target.value })}
            placeholder={pick({ en: 'Store name', ar: 'اسم المتجر' })}
            required
          />
          <input
            value={String(locker.slug || '')}
            onChange={(event) =>
              setLocker({
                ...locker,
                slug: event.target.value.replace(/[^a-z0-9-]/gi, '-').toLowerCase(),
              })
            }
            placeholder="team-store-slug"
            required
          />
          <div className="operations-form-grid">
            <select
              value={String(locker.status || '')}
              onChange={(event) => setLocker({ ...locker, status: event.target.value })}
            >
              <option value="draft">draft</option>
              <option value="active">active</option>
              <option value="paused">paused</option>
            </select>
            <select
              value={String(locker.access_mode || '')}
              onChange={(event) => setLocker({ ...locker, access_mode: event.target.value })}
            >
              <option value="private">private</option>
              <option value="code">code</option>
              <option value="public">public</option>
            </select>
          </div>
          <button
            className="btn-primary compact"
            disabled={
              saving === 'enterprise-locker' ||
              !locker.organization_id ||
              !locker.name.trim() ||
              !locker.slug.trim()
            }
          >
            {pick({ en: 'Create Team Locker', ar: 'إنشاء متجر الفريق' })}
          </button>
        </form>
        <form
          className="operations-card"
          onSubmit={(event) => {
            event.preventDefault();
            void run(
              'enterprise-locker-product',
              addLockerProduct,
              pick({ en: 'Locker product added.', ar: 'تمت إضافة المنتج للمتجر.' }),
            );
          }}
        >
          <div>
            <span>{pick({ en: 'Publish locker product', ar: 'نشر منتج في متجر الفريق' })}</span>
            <strong>{lockerProduct.status}</strong>
          </div>
          <select
            value={lockerProduct.locker_store_id}
            onChange={(event) =>
              setLockerProduct({ ...lockerProduct, locker_store_id: event.target.value })
            }
            required
          >
            <option value="">—</option>
            {rows('lockers').map((row: Record<string, unknown>) => (
              <option key={String(row.id)} value={String(row.id || '')}>
                {String(row.name || '')}
              </option>
            ))}
          </select>
          <input
            value={lockerProduct.product_id}
            onChange={(event) =>
              setLockerProduct({ ...lockerProduct, product_id: event.target.value })
            }
            placeholder={pick({ en: 'Catalog product ID', ar: 'معرف المنتج في الكتالوج' })}
            required
          />
          <select
            value={lockerProduct.status}
            onChange={(event) => setLockerProduct({ ...lockerProduct, status: event.target.value })}
          >
            <option value="active">active</option>
            <option value="draft">draft</option>
            <option value="hidden">hidden</option>
            <option value="sold_out">sold_out</option>
          </select>
          <button
            className="btn-secondary compact"
            disabled={
              saving === 'enterprise-locker-product' ||
              !lockerProduct.locker_store_id ||
              !lockerProduct.product_id.trim()
            }
          >
            {pick({ en: 'Add Product', ar: 'إضافة المنتج' })}
          </button>
        </form>
      </div>
      <div className="operations-card-grid">
        {rows('paymentProofs').map((proof) => (
          <PaymentProofReviewCard
            key={String(proof.id)}
            proof={proof}
            pick={pick}
            saving={saving}
            run={run}
          />
        ))}
        {!rows('paymentProofs').length && (
          <p>
            {pick({
              en: 'No payment proofs awaiting review.',
              ar: 'لا توجد إثباتات دفع للمراجعة.',
            })}
          </p>
        )}
      </div>
      <details>
        <summary>
          {pick({
            en: 'Contracts, reorders and team lockers',
            ar: 'العقود وإعادات الطلب ومتاجر الفرق',
          })}
        </summary>
        <div className="workspace-list">
          {rows('contracts').map((row: Record<string, unknown>) => (
            <article key={String(row.id)}>
              <div>
                <span className="workspace-status-dot" data-status={String(row.status ?? '')} />
                <div>
                  <h3>{String(row.contract_number ?? '')}</h3>
                  <p>
                    {String(row.title || '')} · {String(row.status ?? '')}
                  </p>
                </div>
              </div>
              <small>{String(row.created_at || '').slice(0, 10)}</small>
            </article>
          ))}
          {rows('reorders').map((row: Record<string, unknown>) => (
            <article key={String(row.id)}>
              <div>
                <span className="workspace-status-dot" data-status={String(row.status ?? '')} />
                <div>
                  <h3>{String(row.request_number ?? '')}</h3>
                  <p>
                    {String(row.request_type ?? '')} · {String(row.status ?? '')}
                  </p>
                </div>
              </div>
              <select
                aria-label={pick({ en: 'Reorder status', ar: 'حالة إعادة الطلب' })}
                value={String(row.status ?? '')}
                onChange={(event) =>
                  void run(
                    `reorder-${row.id}`,
                    () =>
                      upsertOperationalEntity('reorder_requests', {
                        ...row,
                        status: event.target.value,
                      }),
                    pick({ en: 'Reorder status updated.', ar: 'تم تحديث حالة إعادة الطلب.' }),
                  )
                }
              >
                <option>submitted</option>
                <option>under_review</option>
                <option>quoted</option>
                <option>accepted</option>
                <option>rejected</option>
                <option>in_production</option>
                <option>completed</option>
                <option>cancelled</option>
              </select>
            </article>
          ))}
        </div>
      </details>
    </div>
  );
}

function PaymentProofReviewCard({
  proof,
  pick,
  saving,
  run,
}: {
  proof: Record<string, unknown>;
  pick: (value: import('../../context/LanguageContext').LocaleValue) => string;
  saving?: string | boolean | undefined;
  run: OperationsRunFn;
}): ReactElement {
  const [note, setNote] = useState('');
  const review = (status: string) =>
    void run(
      `payment-proof-${String(proof.id ?? '')}-${status}`,
      () => reviewPaymentProof({ proofId: String(proof.id || ''), status, note }),
      pick({
        en: `Payment proof ${status}.`,
        ar: status === 'verified' ? 'تم اعتماد إثبات الدفع.' : 'تم رفض إثبات الدفع.',
      }),
    );
  return (
    <article className="operations-card">
      <div>
        <span>{String(proof.proof_number ?? '')}</span>
        <strong>{String(proof.status ?? '')}</strong>
      </div>
      <p>
        {Number(proof.amount || 0).toFixed(2)} {String(proof.currency ?? '')} ·{' '}
        {String(proof.payment_method ?? '')}
      </p>
      <p>{String(proof.reference || '—')}</p>
      <textarea
        rows={2}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder={pick({ en: 'Review note', ar: 'ملاحظة المراجعة' })}
      />
      <div className="quote-pay-actions">
        <button
          type="button"
          className="btn-primary compact"
          disabled={Boolean(saving)}
          onClick={() => {
            void Promise.resolve(review('verified'));
          }}
        >
          {pick({ en: 'Verify', ar: 'اعتماد' })}
        </button>
        <button
          type="button"
          className="btn-secondary compact"
          disabled={Boolean(saving)}
          onClick={() => {
            void Promise.resolve(review('rejected'));
          }}
        >
          {pick({ en: 'Reject', ar: 'رفض' })}
        </button>
      </div>
    </article>
  );
}

import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import Seo from '../../common/Seo';
import '../../../styles/command.css';
import { useLanguage } from '../../../context/LanguageContext';
import { loadOperationsSection } from '../../../services/operations';
import { workflowLabel } from '../commerceHelpers';

function Row({
  value,
  pick,
}: {
  value?: Record<string, unknown>;
  pick: (value: { en: string; ar: string }) => string;
}): ReactElement {
  const label =
    value?.order_number ||
    value?.quote_number ||
    value?.sku ||
    value?.name ||
    value?.code ||
    value?.id ||
    '—';
  const status =
    value?.status ||
    value?.order_status ||
    value?.payment_status ||
    value?.scan_status ||
    value?.active;
  return (
    <li>
      <strong>{String(label)}</strong>
      {status !== undefined ? (
        <span>
          {' · '}
          {typeof status === 'boolean'
            ? status
              ? pick({ en: 'Active', ar: 'نشط' })
              : pick({ en: 'Inactive', ar: 'غير نشط' })
            : workflowLabel(status, pick)}
        </span>
      ) : null}
    </li>
  );
}

export default function OperationsSectionView({
  section,
  title,
  description,
}: {
  section: string;
  title: { en: string; ar: string };
  description: { en: string; ar: string };
}): ReactElement {
  const { pick } = useLanguage();
  const [state, setState] = useState<{
    loading: boolean;
    data: Record<string, unknown> | null;
    error: string;
  }>({ loading: true, data: null, error: '' });
  useEffect(() => {
    let active = true;
    setState({ loading: true, data: null, error: '' });
    loadOperationsSection(section)
      .then((data) => {
        if (active) setState({ loading: false, data: data as Record<string, unknown>, error: '' });
      })
      .catch((error) => {
        if (active)
          setState({
            loading: false,
            data: null,
            error:
              error instanceof Error ? error.message : 'operations_section_unavailable',
          });
      });
    return () => {
      active = false;
    };
  }, [section]);
  const groupLabel = (name: string) => {
    const labels: Record<string, { en: string; ar: string }> = {
      orders: { en: 'Orders', ar: 'الطلبات' },
      quotes: { en: 'Quotes', ar: 'عروض الأسعار' },
      payments: { en: 'Payments', ar: 'المدفوعات' },
      returns: { en: 'Returns', ar: 'الإرجاع' },
      inventory: { en: 'Inventory', ar: 'المخزون' },
      catalog: { en: 'Catalog', ar: 'الكتالوج' },
      products: { en: 'Products', ar: 'المنتجات' },
      media: { en: 'Media', ar: 'الوسائط' },
      users: { en: 'Users', ar: 'المستخدمون' },
      staff: { en: 'Staff', ar: 'الموظفون' },
      shipping: { en: 'Shipping', ar: 'الشحن' },
      settings: { en: 'Settings', ar: 'الإعدادات' },
      organizations: { en: 'Organizations', ar: 'المؤسسات' },
      contracts: { en: 'Contracts', ar: 'العقود' },
      reorders: { en: 'Reorders', ar: 'إعادة الطلب' },
      lockers: { en: 'Team lockers', ar: 'متاجر الفرق' },
      security: { en: 'Security', ar: 'الأمان' },
    };
    return labels[name] ? pick(labels[name]) : name.replaceAll('_', ' ');
  };
  const groups = useMemo(
    () =>
      Object.entries(state.data || {}).filter((entry): entry is [string, unknown[]] =>
        Array.isArray(entry[1]),
      ),
    [state.data],
  );
  return (
    <>
      <Seo title={pick(title)} path={`/operations/${section}`} noindex />
      <header className="gw-modulehead">
        <p className="gw-spec">{pick({ en: 'STAFF', ar: 'الموظفون' })}</p>
        <h1 className="gw-modulehead-title">{pick(title)}</h1>
        <p className="gw-modulehead-lede">{pick(description)}</p>
      </header>
      <section className="operations-page">
        <div>
          {state.loading ? (
            <p role="status">{pick({ en: 'Loading module…', ar: 'جاري تحميل القسم…' })}</p>
          ) : null}
          {state.error ? (
            <p role="alert" className="form-error">
              {pick({ en: 'This operations module could not be loaded.', ar: 'تعذر تحميل هذا القسم التشغيلي.' })}
            </p>
          ) : null}
          {!state.loading &&
            !state.error &&
            groups.map(([name, rows]) => (
              <section className="operations-section" key={name}>
                <h2>{groupLabel(name)}</h2>
                <p>
                  {rows.length} {pick({ en: 'records', ar: 'سجلات' })}
                </p>
                <ul className="operations-compact-list">
                  {rows.slice(0, 100).map((row, index) => {
                    const record = (row || {}) as Record<string, unknown>;
                    return (
                      <Row
                        key={String(record.id || record.variant_id || `${name}-${index}`)}
                        value={record}
                        pick={pick}
                      />
                    );
                  })}
                </ul>
              </section>
            ))}
        </div>
      </section>
    </>
  );
}

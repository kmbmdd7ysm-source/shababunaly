import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import Seo from '../../common/Seo';
import '../../../styles/command.css';
import { useLanguage } from '../../../context/LanguageContext';
import { loadOperationsSection } from '../../../services/operations';

function Row({ value }: { value?: Record<string, unknown> }): ReactElement {
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
      {status !== undefined ? <span> · {String(status)}</span> : null}
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
            error: error instanceof Error ? error.message : 'operations_section_unavailable',
          });
      });
    return () => {
      active = false;
    };
  }, [section]);
  const groups = useMemo(
    () =>
      Object.entries(state.data || {}).filter((entry): entry is [string, unknown[]] =>
        Array.isArray(entry[1]),
      ),
    [state.data],
  );
  return (
    <>
      <Seo title={title.en} path={`/operations/${section}`} noindex />
      <header className="gw-modulehead">
        <p className="gw-spec">STAFF</p>
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
              {state.error}
            </p>
          ) : null}
          {!state.loading &&
            !state.error &&
            groups.map(([name, rows]) => (
              <section className="operations-section" key={name}>
                <h2>{name}</h2>
                <p>{rows.length} records</p>
                <ul className="operations-compact-list">
                  {rows.slice(0, 100).map((row, index) => {
                    const record = (row || {}) as Record<string, unknown>;
                    return (
                      <Row
                        key={String(record.id || record.variant_id || `${name}-${index}`)}
                        value={record}
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

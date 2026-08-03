import { useEffect, useMemo, useState } from 'react';
import Seo from '../../common/Seo';
import '../../../styles/command.css';
import { useLanguage } from '../../../context/LanguageContext';
import { loadOperationsSection } from '../../../services/operations';

function Row({ value }) {
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
      {status !== undefined && <span> · {String(status)}</span>}
    </li>
  );
}
export default function OperationsSectionView({ section, title, description }) {
  const { pick } = useLanguage();
  const [state, setState] = useState({ loading: true, data: null, error: '' });
  useEffect(() => {
    let active = true;
    setState({ loading: true, data: null, error: '' });
    loadOperationsSection(section)
      .then((data) => {
        if (active) setState({ loading: false, data, error: '' });
      })
      .catch((error) => {
        if (active)
          setState({
            loading: false,
            data: null,
            error: error?.message || 'operations_section_unavailable',
          });
      });
    return () => {
      active = false;
    };
  }, [section]);
  const groups = useMemo(
    () => Object.entries(state.data || {}).filter(([, value]) => Array.isArray(value)),
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
          {state.loading && (
            <p role="status">{pick({ en: 'Loading module…', ar: 'جاري تحميل القسم…' })}</p>
          )}
          {state.error && (
            <p role="alert" className="form-error">
              {state.error}
            </p>
          )}
          {!state.loading &&
            !state.error &&
            groups.map(([name, rows]) => (
              <section className="operations-section" key={name}>
                <h2>{name}</h2>
                <p>{rows.length} records</p>
                <ul className="operations-compact-list">
                  {rows.slice(0, 100).map((row, index) => (
                    <Row key={row?.id || row?.variant_id || `${name}-${index}`} value={row} />
                  ))}
                </ul>
              </section>
            ))}
        </div>
      </section>
    </>
  );
}

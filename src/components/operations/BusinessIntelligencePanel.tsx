import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { getSupabase } from '../../services/supabase';

const EMPTY = {
  checkout_started: 0,
  purchases: 0,
  recognized_revenue_usd: 0,
  average_order_value_usd: 0,
  checkout_conversion_percent: 0,
  quotes_created: 0,
  quotes_approved: 0,
  quote_to_order_percent: 0,
  purchasing_customers: 0,
  repeat_customers: 0,
  repeat_customer_percent: 0,
  stockout_variants: 0,
  stocked_variants: 0,
  refunds: 0,
};
const number = (value: unknown) => (Number.isFinite(Number(value)) ? Number(value) : 0);

export default function BusinessIntelligencePanel({
  pick,
}: {
  pick: (value: string | { en?: string; ar?: string }) => string;
}): ReactElement {
  const [state, setState] = useState<{
    loading: boolean;
    data: Record<string, unknown>;
    error: string;
  }>({ loading: true, data: EMPTY, error: '' });
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const client = await getSupabase();
        if (!client) throw new Error('cloud_not_configured');
        const { data, error } = await client
          .from('business_intelligence_summary')
          .select('*')
          .maybeSingle();
        if (error) throw error;
        if (active) setState({ loading: false, data: { ...EMPTY, ...(data || {}) }, error: '' });
      } catch (error) {
        if (active)
          setState({
            loading: false,
            data: EMPTY,
            error: (error instanceof Error ? error.message : '') || 'analytics_unavailable',
          });
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  const d = state.data;
  const metrics = [
    [
      pick({ en: 'Recognized revenue', ar: 'الإيراد المسجل' }),
      `$${number(d.recognized_revenue_usd).toFixed(2)}`,
    ],
    [
      pick({ en: 'Average order value', ar: 'متوسط قيمة الطلب' }),
      `$${number(d.average_order_value_usd).toFixed(2)}`,
    ],
    [
      pick({ en: 'Checkout conversion', ar: 'تحويل إتمام الشراء' }),
      `${number(d.checkout_conversion_percent).toFixed(2)}%`,
    ],
    [
      pick({ en: 'Quote-to-order', ar: 'تحويل العرض إلى طلب' }),
      `${number(d.quote_to_order_percent).toFixed(2)}%`,
    ],
    [
      pick({ en: 'Repeat customer rate', ar: 'نسبة العملاء المتكررين' }),
      `${number(d.repeat_customer_percent).toFixed(2)}%`,
    ],
    [pick({ en: 'Completed purchases', ar: 'عمليات الشراء المكتملة' }), number(d.purchases)],
    [pick({ en: 'Stocked variants', ar: 'الخيارات ذات المخزون' }), number(d.stocked_variants)],
    [pick({ en: 'Stockout variants', ar: 'الخيارات النافدة' }), number(d.stockout_variants)],
  ];
  return (
    <section className="operations-card operations-bi" aria-labelledby="operations-bi-title">
      <div className="operations-section-head">
        <div>
          <p className="section-label">BUSINESS INTELLIGENCE</p>
          <h2 id="operations-bi-title">
            {pick({ en: 'Commerce performance', ar: 'أداء التجارة' })}
          </h2>
        </div>
        <span className="status-chip">365D</span>
      </div>
      {state.loading ? (
        <p role="status">
          {pick({
            en: 'Loading verified commerce metrics…',
            ar: 'جارٍ تحميل مؤشرات التجارة الموثقة…',
          })}
        </p>
      ) : state.error ? (
        <p className="form-status" role="status">
          {pick({
            en: 'Connect the analytics migration to activate this dashboard.',
            ar: 'طبّق ترحيل التحليلات لتفعيل لوحة المؤشرات.',
          })}
        </p>
      ) : (
        <div className="operations-bi-grid">
          {metrics.map(([label, value]) => (
            <article key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

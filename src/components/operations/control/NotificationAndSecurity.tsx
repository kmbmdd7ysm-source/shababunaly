import type { ReactElement } from 'react';
import { retryCommerceNotification, resolveSecurityEvent } from '../../../services/operations';
import type { OperationsRunFn } from '../../../types/operations';

export default function NotificationAndSecurity({
  state,
  pick,
  saving,
  run,
}: {
  state: unknown;
  pick: (value: string | { en?: string; ar?: string }) => string;
  saving?: string | boolean | undefined;
  run: OperationsRunFn;
}): ReactElement {
  const stateRecord = (state || {}) as Record<string, unknown>;
  const notifications = Array.isArray(stateRecord.notifications)
    ? (stateRecord.notifications as Array<Record<string, unknown>>)
    : [];
  const securityEvents = Array.isArray(stateRecord.securityEvents)
    ? (stateRecord.securityEvents as Array<Record<string, unknown>>)
    : [];
  const failed = notifications.filter((row) => row.delivery_status === 'failed');
  const alerts = securityEvents.filter((row) => !row.resolved_at);
  return (
    <section className="operations-subsection">
      <div className="section-heading-row">
        <div>
          <h3>
            {pick({ en: 'Notifications & security response', ar: 'الإشعارات والاستجابة الأمنية' })}
          </h3>
          <p>
            {pick({
              en: 'Retry failed outbox deliveries and resolve reviewed security events with an audit trail.',
              ar: 'أعد محاولة الإشعارات الفاشلة وأغلق التنبيهات الأمنية بعد مراجعتها مع سجل تدقيق.',
            })}
          </p>
        </div>
      </div>
      <div className="operations-card-grid">
        {failed.slice(0, 25).map((row) => (
          <article className="operations-card" key={String(row.id)}>
            <div>
              <span>{String(row.event_type || '')}</span>
              <strong>{String(row.delivery_status || '')}</strong>
            </div>
            <p>
              {String(row.entity_type || '')} · {String(row.entity_id || '')}
            </p>
            <p>{String(row.last_error || '—')}</p>
            <small>
              {pick({ en: 'Attempts', ar: 'المحاولات' })}: {String(row.attempts ?? '')}
            </small>
            <button
              type="button"
              className="btn-secondary compact"
              disabled={saving === `notification-${String(row.id || '')}`}
              onClick={() => {
                void Promise.resolve(
                  run(
                    `notification-${String(row.id || '')}`,
                    () => retryCommerceNotification(String(row.id || '')),
                    pick({
                      en: 'Notification queued for retry.',
                      ar: 'تمت إعادة الإشعار إلى قائمة المحاولة.',
                    }),
                  ),
                );
              }}
            >
              {pick({ en: 'Retry safely', ar: 'إعادة المحاولة بأمان' })}
            </button>
          </article>
        ))}
        {alerts.slice(0, 25).map((row) => (
          <article className="operations-card" key={String(row.id)}>
            <div>
              <span>{String(row.event_type || '')}</span>
              <strong>{String(row.severity || '')}</strong>
            </div>
            <p>
              {String(row.source || '')} · {String(row.message || '')}
            </p>
            <small>{String(row.created_at || '').slice(0, 19)}</small>
            <button
              type="button"
              className="btn-secondary compact"
              disabled={saving === `security-${String(row.id || '')}`}
              onClick={() => {
                void Promise.resolve(
                  run(
                    `security-${String(row.id || '')}`,
                    () => resolveSecurityEvent(String(row.id || ''), true),
                    pick({ en: 'Security event resolved.', ar: 'تم إغلاق التنبيه الأمني.' }),
                  ),
                );
              }}
            >
              {pick({ en: 'Mark resolved', ar: 'تحديد كمغلق' })}
            </button>
          </article>
        ))}
        {!failed.length && !alerts.length ? (
          <p>
            {pick({
              en: 'No failed notifications or unresolved security alerts.',
              ar: 'لا توجد إشعارات فاشلة أو تنبيهات أمنية مفتوحة.',
            })}
          </p>
        ) : null}
      </div>
    </section>
  );
}

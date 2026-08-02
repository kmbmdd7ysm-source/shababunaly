import { retryCommerceNotification, resolveSecurityEvent } from '../../../services/operations';

export default function NotificationAndSecurity({ state, pick, saving, run }) {
  const failed = state.notifications.filter((row) => row.delivery_status === 'failed');
  const alerts = state.securityEvents.filter((row) => !row.resolved_at);
  return <section className="operations-subsection"><div className="section-heading-row"><div><h3>{pick({ en: 'Notifications & security response', ar: 'الإشعارات والاستجابة الأمنية' })}</h3><p>{pick({ en: 'Retry failed outbox deliveries and resolve reviewed security events with an audit trail.', ar: 'أعد محاولة الإشعارات الفاشلة وأغلق التنبيهات الأمنية بعد مراجعتها مع سجل تدقيق.' })}</p></div></div>
    <div className="operations-card-grid">
      {failed.slice(0, 25).map((row) => <article className="operations-card" key={row.id}><div><span>{row.event_type}</span><strong>{row.delivery_status}</strong></div><p>{row.entity_type} · {row.entity_id}</p><p>{row.last_error || '—'}</p><small>{pick({ en: 'Attempts', ar: 'المحاولات' })}: {row.attempts}</small><button type="button" className="btn-secondary compact" disabled={saving === `notification-${row.id}`} onClick={() => run(`notification-${row.id}`, () => retryCommerceNotification(row.id), pick({ en: 'Notification queued for retry.', ar: 'تمت إعادة الإشعار إلى قائمة المحاولة.' }))}>{pick({ en: 'Retry safely', ar: 'إعادة المحاولة بأمان' })}</button></article>)}
      {alerts.slice(0, 25).map((row) => <article className="operations-card" key={row.id}><div><span>{row.event_type}</span><strong>{row.severity}</strong></div><p>{row.source} · {row.message}</p><small>{String(row.created_at || '').slice(0,19)}</small><button type="button" className="btn-secondary compact" disabled={saving === `security-${row.id}`} onClick={() => run(`security-${row.id}`, () => resolveSecurityEvent(row.id, true), pick({ en: 'Security event resolved.', ar: 'تم إغلاق التنبيه الأمني.' }))}>{pick({ en: 'Mark resolved', ar: 'تحديد كمغلق' })}</button></article>)}
      {!failed.length && !alerts.length && <p>{pick({ en: 'No failed notifications or unresolved security alerts.', ar: 'لا توجد إشعارات فاشلة أو تنبيهات أمنية مفتوحة.' })}</p>}
    </div>
  </section>;
}

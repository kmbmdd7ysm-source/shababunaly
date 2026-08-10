const clean = (value: unknown, max = 12000): string =>
  String(value ?? '')
    .replace(/\0/g, '')
    .trim()
    .slice(0, max);

const EVENT_COPY = Object.freeze({
  order_created: {
    en: {
      title: 'Order received',
      body: 'Your SHABABUNA order was received and is waiting for the next confirmed step.',
    },
    ar: {
      title: 'تم استلام الطلب',
      body: 'تم استلام طلبك لدى شبابنا وهو بانتظار الخطوة المؤكدة التالية.',
    },
  },
  payment_required: {
    en: {
      title: 'Payment required',
      body: 'A verified payment is required before this order can move forward.',
    },
    ar: {
      title: 'الدفع مطلوب',
      body: 'يلزم إتمام دفعة موثقة قبل انتقال الطلب إلى المرحلة التالية.',
    },
  },
  shipping_quote_ready: {
    en: {
      title: 'Shipping quote ready',
      body: 'Your shipping quote is ready for review in your account.',
    },
    ar: { title: 'سعر الشحن جاهز', body: 'أصبح سعر الشحن جاهزًا للمراجعة داخل حسابك.' },
  },
  quote_ready: {
    en: { title: 'Quote ready', body: 'Your commercial quote is ready for review and approval.' },
    ar: { title: 'عرض السعر جاهز', body: 'عرض السعر التجاري جاهز للمراجعة والاعتماد.' },
  },
  proof_ready: {
    en: {
      title: 'Design proof ready',
      body: 'A design proof is ready for approval or requested changes.',
    },
    ar: { title: 'بروفة التصميم جاهزة', body: 'بروفة التصميم جاهزة للاعتماد أو طلب التعديلات.' },
  },
  refund_updated: {
    en: { title: 'Refund update', body: 'There is a new update on your refund request.' },
    ar: { title: 'تحديث الاسترداد', body: 'يوجد تحديث جديد على طلب استرداد المبلغ.' },
  },
  return_updated: {
    en: { title: 'Return update', body: 'There is a new update on your return request.' },
    ar: { title: 'تحديث الإرجاع', body: 'يوجد تحديث جديد على طلب الإرجاع.' },
  },
  special_request_updated: {
    en: {
      title: 'Special request update',
      body: 'There is a new update on your special product request.',
    },
    ar: { title: 'تحديث الطلب الخاص', body: 'يوجد تحديث جديد على طلب المنتج الخاص بك.' },
  },
});

function localeOf(payload: Record<string, unknown>): 'en' | 'ar' {
  return clean(payload?.locale || payload?.language, 5).toLowerCase() === 'ar' ? 'ar' : 'en';
}

export function notificationReference(row: Record<string, unknown> = {}, payload: Record<string, unknown> = {}): string {
  return clean(
    payload.orderNumber ||
      payload.quoteNumber ||
      payload.requestNumber ||
      payload.referenceId ||
      row.entity_id,
    160,
  );
}

export function buildNotificationTemplate(
  row: Record<string, unknown> = {},
): Record<string, unknown> {
  const payload: Record<string, unknown> =
    row.payload && typeof row.payload === 'object'
      ? (row.payload as Record<string, unknown>)
      : {};
  const locale = localeOf(payload);
  const eventType = String(row.event_type || '');
  const copy =
    (EVENT_COPY as Record<string, { en: { title: string; body: string }; ar: { title: string; body: string } }>)[
      eventType
    ]?.[locale] || {
      title: clean(row.subject, 240) || (locale === 'ar' ? 'تحديث من شبابنا' : 'SHABABUNA update'),
      body:
        locale === 'ar'
          ? 'يوجد تحديث جديد مرتبط بطلبك.'
          : 'There is a new update related to your request.',
    };
  const reference = notificationReference(row, payload);
  const amount = clean(payload.amount ?? payload.total ?? payload.totalUsd, 80);
  const currency = clean(payload.currency || 'USD', 12);
  const accountUrl = clean(
    payload.customerAccountUrl || payload.trackingUrl || payload.paymentRecoveryUrl,
    1000,
  );
  const lines = [copy.body];
  if (reference) lines.push(`${locale === 'ar' ? 'المرجع' : 'Reference'}: ${reference}`);
  if (amount) lines.push(`${locale === 'ar' ? 'المبلغ' : 'Amount'}: ${amount} ${currency}`);
  if (accountUrl) lines.push(`${locale === 'ar' ? 'الرابط الآمن' : 'Secure link'}: ${accountUrl}`);
  return {
    templateVersion: '2026-08-01.1',
    locale,
    title: copy.title,
    customerMessage: lines.join('\n'),
    adminSummary: [
      `Event: ${clean(row.event_type, 80)}`,
      `Entity: ${clean(row.entity_type, 80)} ${clean(row.entity_id, 160)}`,
      `Reference: ${reference}`,
      `Customer: ${clean(payload.customerName || payload.name, 240)}`,
      `Email: ${clean(payload.customerEmail || row.recipient_email, 320)}`,
    ].join('\n'),
  };
}

export { EVENT_COPY };

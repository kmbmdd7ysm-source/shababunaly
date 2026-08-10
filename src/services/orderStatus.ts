type StatusCategory = 'pending' | 'success' | 'warning' | 'error' | 'neutral';
type Lang = 'en' | 'ar';

interface StatusItem {
  category: StatusCategory;
  en: string;
  ar: string;
}

const STATUS_MAP = {
  payment: {
    pending: { category: 'pending', en: 'Payment Pending', ar: 'الدفع قيد الانتظار' },
    paid: { category: 'success', en: 'Paid', ar: 'مدفوع' },
    unpaid: { category: 'warning', en: 'Unpaid', ar: 'غير مدفوع' },
    failed: { category: 'error', en: 'Payment Failed', ar: 'فشل الدفع' },
    refunded: { category: 'neutral', en: 'Refunded', ar: 'تم رد المبلغ' },
    cancelled: { category: 'error', en: 'Payment Cancelled', ar: 'تم إلغاء الدفع' },
  },
  order: {
    pending: { category: 'pending', en: 'Pending', ar: 'قيد الانتظار' },
    received: { category: 'pending', en: 'Order Received', ar: 'تم استلام الطلب' },
    confirmed: { category: 'pending', en: 'Confirmed', ar: 'تم التأكيد' },
    processing: { category: 'pending', en: 'Processing', ar: 'قيد التجهيز' },
    in_delivery_process: { category: 'pending', en: 'In Delivery Process', ar: 'قيد التوصيل' },
    out_for_delivery: { category: 'pending', en: 'Out for Delivery', ar: 'أثناء التوصيل' },
    delivered: { category: 'success', en: 'Delivered', ar: 'تم التوصيل' },
    completed: { category: 'success', en: 'Completed', ar: 'مكتمل' },
    fulfilled: { category: 'success', en: 'Fulfilled', ar: 'تم التنفيذ' },
    cancelled: { category: 'error', en: 'Cancelled', ar: 'ملغي' },
  },
  fulfillment: {
    unfulfilled: { category: 'pending', en: 'Not Fulfilled', ar: 'لم يتم التنفيذ' },
    processing: { category: 'pending', en: 'Preparing', ar: 'قيد التحضير' },
    in_delivery_process: { category: 'pending', en: 'In Delivery Process', ar: 'قيد التوصيل' },
    out_for_delivery: { category: 'pending', en: 'Out for Delivery', ar: 'أثناء التوصيل' },
    delivered: { category: 'success', en: 'Delivered', ar: 'تم التوصيل' },
    fulfilled: { category: 'success', en: 'Fulfilled', ar: 'تم التنفيذ' },
    cancelled: { category: 'error', en: 'Cancelled', ar: 'ملغي' },
  },
} as const satisfies Record<string, Record<string, StatusItem>>;

export function presentOrderStatus(kind: unknown, value: unknown, lang: Lang = 'en') {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  const normalizedKind = String(kind);
  const groups = STATUS_MAP as Record<string, Record<string, StatusItem>>;
  const statusGroup = groups[normalizedKind] ?? {};
  const item = statusGroup[normalized];
  if (item) {
    return {
      value: normalized,
      label: item[lang] || item.en,
      category: item.category,
      accessibleLabel: item[lang] || item.en,
      known: true as const,
    };
  }
  return {
    value: normalized || 'unknown',
    label: lang === 'ar' ? 'الحالة غير متاحة' : 'Status unavailable',
    category: 'neutral' as const,
    accessibleLabel: lang === 'ar' ? 'الحالة غير متاحة' : 'Status unavailable',
    known: false as const,
  };
}

export const ALLOWED_ORDER_STATUSES = {
  payment: Object.keys(STATUS_MAP.payment),
  order: Object.keys(STATUS_MAP.order),
  fulfillment: Object.keys(STATUS_MAP.fulfillment),
};

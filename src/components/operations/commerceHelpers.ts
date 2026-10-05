export const ORDER_TRANSITIONS = {
  received: ['awaiting_cash_confirmation', 'awaiting_payment', 'confirmed', 'cancelled'],
  pending_shipping_quote: ['awaiting_payment', 'cancelled'],
  awaiting_cash_confirmation: ['confirmed', 'cancelled'],
  awaiting_payment: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'design_in_progress', 'in_production', 'ready_to_ship', 'cancelled'],
  processing: [
    'design_in_progress',
    'in_production',
    'quality_control',
    'ready_to_ship',
    'cancelled',
  ],
  design_in_progress: ['awaiting_design_approval', 'cancelled'],
  awaiting_design_approval: ['design_approved', 'design_in_progress', 'cancelled'],
  design_approved: ['in_production', 'cancelled'],
  in_production: ['quality_control', 'arrived', 'cancelled'],
  quality_control: ['arrived', 'final_payment_required', 'ready_to_ship', 'cancelled'],
  arrived: ['final_payment_required', 'ready_to_ship', 'cancelled'],
  final_payment_required: ['ready_to_ship', 'cancelled'],
  ready_to_ship: ['shipped', 'out_for_delivery', 'delivered', 'cancelled'],
  shipped: ['out_for_delivery', 'delivered'],
  out_for_delivery: ['delivered'],
  completed: ['delivered'],
  delivered: [],
  cancelled: [],
};
export const QUOTE_TRANSITIONS = {
  under_review: ['quote_sent', 'cancelled'],
  quote_sent: ['awaiting_approval', 'deposit_required', 'under_review', 'cancelled'],
  awaiting_approval: ['deposit_required', 'under_review', 'cancelled'],
  deposit_required: ['cancelled'],
  deposit_paid: ['design_in_progress', 'in_production', 'cancelled'],
  design_in_progress: ['awaiting_design_approval', 'cancelled'],
  awaiting_design_approval: ['design_approved', 'design_in_progress', 'cancelled'],
  design_approved: ['in_production', 'cancelled'],
  in_production: ['quality_control', 'arrived', 'cancelled'],
  quality_control: ['arrived', 'final_payment_required', 'cancelled'],
  arrived: ['final_payment_required', 'cancelled'],
  final_payment_required: ['cancelled'],
  completed: [],
  cancelled: [],
};
export const RETURN_TRANSITIONS = {
  requested: ['under_review', 'approved', 'rejected'],
  under_review: ['approved', 'rejected'],
  approved: ['received'],
  received: ['refund_pending', 'closed'],
  refund_pending: ['closed'],
  refunded: ['closed'],
  closed: [],
  rejected: [],
  cancelled: [],
};
export const money = (value: unknown): string =>
  value == null ? '—' : `$${Number(value).toFixed(2)}`;


export const WORKFLOW_LABELS: Record<string, { en: string; ar: string }> = {
  received: { en: 'Received', ar: 'مستلم' },
  pending_shipping_quote: { en: 'Pending shipping quote', ar: 'بانتظار تسعيرة الشحن' },
  awaiting_cash_confirmation: { en: 'Awaiting cash confirmation', ar: 'بانتظار تأكيد النقد' },
  awaiting_payment: { en: 'Awaiting payment', ar: 'بانتظار الدفع' },
  confirmed: { en: 'Confirmed', ar: 'مؤكد' },
  processing: { en: 'Processing', ar: 'قيد المعالجة' },
  design_in_progress: { en: 'Design in progress', ar: 'التصميم قيد التنفيذ' },
  awaiting_design_approval: { en: 'Awaiting design approval', ar: 'بانتظار اعتماد التصميم' },
  design_approved: { en: 'Design approved', ar: 'التصميم معتمد' },
  in_production: { en: 'In production', ar: 'قيد الإنتاج' },
  quality_control: { en: 'Quality control', ar: 'فحص الجودة' },
  arrived: { en: 'Arrived', ar: 'وصل' },
  final_payment_required: { en: 'Final payment required', ar: 'الدفعة النهائية مطلوبة' },
  ready_to_ship: { en: 'Ready to ship', ar: 'جاهز للشحن' },
  shipped: { en: 'Shipped', ar: 'تم الشحن' },
  out_for_delivery: { en: 'Out for delivery', ar: 'خرج للتوصيل' },
  completed: { en: 'Completed', ar: 'مكتمل' },
  delivered: { en: 'Delivered', ar: 'تم التسليم' },
  cancelled: { en: 'Cancelled', ar: 'ملغي' },
  under_review: { en: 'Under review', ar: 'قيد المراجعة' },
  quote_sent: { en: 'Quote sent', ar: 'تم إرسال العرض' },
  awaiting_approval: { en: 'Awaiting approval', ar: 'بانتظار الاعتماد' },
  deposit_required: { en: 'Deposit required', ar: 'العربون مطلوب' },
  deposit_paid: { en: 'Deposit paid', ar: 'تم دفع العربون' },
  requested: { en: 'Requested', ar: 'تم الطلب' },
  approved: { en: 'Approved', ar: 'معتمد' },
  rejected: { en: 'Rejected', ar: 'مرفوض' },
  refund_pending: { en: 'Refund pending', ar: 'الاسترداد قيد الانتظار' },
  refunded: { en: 'Refunded', ar: 'تم الاسترداد' },
  closed: { en: 'Closed', ar: 'مغلق' },
  draft: { en: 'Draft', ar: 'مسودة' },
  active: { en: 'Active', ar: 'نشط' },
  paused: { en: 'Paused', ar: 'متوقف مؤقتًا' },
  archived: { en: 'Archived', ar: 'مؤرشف' },
  private: { en: 'Private', ar: 'خاص' },
  public: { en: 'Public', ar: 'عام' },
  hidden: { en: 'Hidden', ar: 'مخفي' },
  sold_out: { en: 'Sold out', ar: 'نفد المخزون' },
  submitted: { en: 'Submitted', ar: 'تم الإرسال' },
  quoted: { en: 'Quoted', ar: 'تم التسعير' },
  accepted: { en: 'Accepted', ar: 'مقبول' },
  verified: { en: 'Verified', ar: 'موثق' },
  failed: { en: 'Failed', ar: 'فشل' },
};

export const workflowLabel = (
  value: unknown,
  pick: (label: { en: string; ar: string }) => string,
): string => {
  const key = String(value || '');
  const known = WORKFLOW_LABELS[key];
  if (known) return pick(known);
  const fallback = key.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  return fallback || '—';
};

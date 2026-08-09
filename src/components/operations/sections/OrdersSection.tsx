import OperationsSectionView from './OperationsSectionView';
export default function OrdersSection() {
  return (
    <OperationsSectionView
      section="orders"
      title={{ en: 'Orders', ar: 'الطلبات' }}
      description={{
        en: 'Load and manage customer orders without downloading unrelated operational datasets.',
        ar: 'تحميل وإدارة طلبات العملاء دون تنزيل بيانات تشغيلية غير مرتبطة.',
      }}
    />
  );
}

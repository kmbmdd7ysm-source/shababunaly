import OperationsSectionView from './OperationsSectionView';
export default function ShippingSection() {
  return (
    <OperationsSectionView
      section="shipping"
      title={{ en: 'Shipping', ar: 'الشحن' }}
      description={{
        en: 'Rates, carriers, shipments and shipment items.',
        ar: 'الأسعار وشركات الشحن والشحنات وعناصرها.',
      }}
    />
  );
}

import OperationsSectionView from './OperationsSectionView';
export default function SettingsSection() {
  return (
    <OperationsSectionView
      section="settings"
      title={{ en: 'Settings', ar: 'الإعدادات' }}
      description={{
        en: 'Exchange rate, content, coupons and tax rules.',
        ar: 'سعر الصرف والمحتوى والكوبونات وقواعد الضرائب.',
      }}
    />
  );
}

import OperationsSectionView from './OperationsSectionView';
export default function MediaSection() {
  return (
    <OperationsSectionView
      section="media"
      title={{ en: 'Media', ar: 'الوسائط' }}
      description={{
        en: 'Quarantined media and publishing assets.',
        ar: 'الوسائط المحجوزة وأصول النشر.',
      }}
    />
  );
}

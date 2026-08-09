import OperationsSectionView from './OperationsSectionView';
export default function CatalogSection() {
  return (
    <OperationsSectionView
      section="catalog"
      title={{ en: 'Catalog', ar: 'الكتالوج' }}
      description={{
        en: 'Products, brands, categories and collections.',
        ar: 'المنتجات والعلامات والتصنيفات والمجموعات.',
      }}
    />
  );
}

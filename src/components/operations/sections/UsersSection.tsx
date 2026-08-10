import OperationsSectionView from './OperationsSectionView';
export default function UsersSection() {
  return (
    <OperationsSectionView
      section="users"
      title={{ en: 'Users & Access', ar: 'المستخدمون والصلاحيات' }}
      description={{
        en: 'Organizations, staff access and team lockers.',
        ar: 'المؤسسات وصلاحيات الموظفين ومتاجر الفرق.',
      }}
    />
  );
}

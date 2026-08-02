import { useLanguage } from '../../context/LanguageContext';

export const SORT_OPTIONS = [
  'featured',
  'newest',
  'price-asc',
  'price-desc',
  'name-asc',
  'name-desc',
];

export default function SortSelect({ value, onChange, options = SORT_OPTIONS }) {
  const { t } = useLanguage();
  const labels = {
    featured: t.shop.sortFeatured,
    newest: t.shop.sortNewest,
    'price-asc': t.shop.sortPriceAsc,
    'price-desc': t.shop.sortPriceDesc,
    'name-asc': t.shop.sortNameAsc,
    'name-desc': t.shop.sortNameDesc,
  };
  return (
    <label className="sort-select">
      <span className="sr-only">{t.shop.sortBy}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={t.shop.sortBy}>
        {options.map((o) => (
          <option key={o} value={o}>
            {labels[o]}
          </option>
        ))}
      </select>
    </label>
  );
}

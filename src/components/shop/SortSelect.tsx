import { useLanguage } from '../../context/LanguageContext';

export const SORT_OPTIONS = [
  'featured',
  'newest',
  'price-asc',
  'price-desc',
  'name-asc',
  'name-desc',
] as const;

type SortOption = (typeof SORT_OPTIONS)[number] | string;

export default function SortSelect({
  value,
  onChange,
  options = [...SORT_OPTIONS],
}: {
  value: string;
  onChange: (value: string) => void;
  options?: SortOption[];
}) {
  const { t } = useLanguage();
  const shop = (t.shop as Record<string, string> | undefined) || {};
  const labels: Record<string, string> = {
    featured: shop.sortFeatured || 'Featured',
    newest: shop.sortNewest || 'Newest',
    'price-asc': shop.sortPriceAsc || 'Price ↑',
    'price-desc': shop.sortPriceDesc || 'Price ↓',
    'name-asc': shop.sortNameAsc || 'Name A–Z',
    'name-desc': shop.sortNameDesc || 'Name Z–A',
  };
  return (
    <label className="sort-select">
      <span className="sr-only">{shop.sortBy}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={shop.sortBy}>
        {options.map((o) => (
          <option key={o} value={o}>
            {labels[o] || o}
          </option>
        ))}
      </select>
    </label>
  );
}

import ProductCard from '../shop/ProductCard';
import { useCatalog } from '../../context/CatalogContext';
import { recommend, type RecommendProduct } from '../../utils/recommendations.ts';
import { useRecentlyViewed } from '../../hooks/useRecentlyViewed';
import { useWishlist } from '../../hooks/useWishlist';
import { useCart } from '../../context/CartContext';
import { useLanguage } from '../../context/LanguageContext';

export default function Recommendations({
  current,
}: {
  current?: RecommendProduct | null;
}) {
  const { products } = useCatalog();
  const { ids } = useRecentlyViewed(),
    w = useWishlist(),
    { items } = useCart(),
    { pick } = useLanguage();
  const catalog = products as RecommendProduct[];
  const list = recommend(catalog, {
    current: current || null,
    recent: ids,
    wishlist: w.ids || [],
    cart: (items as Array<{ id: string }>) || [],
  }).slice(0, 4);
  if (!list.length) return null;
  return (
    <section className="section section--muted">
      <div className="container">
        <p className="section-label">{pick({ en: 'PERSONALIZED', ar: 'مختارة لك' })}</p>
        <h2 className="section-title">{pick({ en: 'Recommended for you', ar: 'مقترحة لك' })}</h2>
        <div className="product-grid">
          {list.map((p) => (
            <ProductCard key={String(p.id)} product={p} />
          ))}
        </div>
      </div>
    </section>
  );
}

import ProductCard from '../shop/ProductCard';
import { useCatalog } from '../../context/CatalogContext';
import { recommend } from '../../utils/recommendations';
import { useRecentlyViewed } from '../../hooks/useRecentlyViewed';
import { useWishlist } from '../../hooks/useWishlist';
import { useCart } from '../../context/CartContext';
import { useLanguage } from '../../context/LanguageContext';
export default function Recommendations({ current }) {
  const { products } = useCatalog();
  const { ids } = useRecentlyViewed(),
    w = useWishlist(),
    { items } = useCart(),
    { pick } = useLanguage();
  const list = recommend(products, {
    current,
    recent: ids,
    wishlist: w.ids || [],
    cart: items,
  }).slice(0, 4);
  if (!list.length) return null;
  return (
    <section className="section section--muted">
      <div className="container">
        <p className="section-label">{pick({ en: 'PERSONALIZED', ar: 'مختارة لك' })}</p>
        <h2 className="section-title">{pick({ en: 'Recommended for you', ar: 'مقترحة لك' })}</h2>
        <div className="product-grid">
          {list.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </section>
  );
}

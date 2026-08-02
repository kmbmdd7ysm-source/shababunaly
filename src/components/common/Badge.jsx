// Badge tones: 'new' | 'sale' | 'sold' | 'limited' | 'best' | 'free'
export default function Badge({ tone = 'new', children }) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}

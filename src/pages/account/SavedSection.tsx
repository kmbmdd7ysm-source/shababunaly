import type { ReactElement } from 'react';
import Icon from '../../components/icons/Icon';

type PickFn = (value: { en: string; ar: string }) => string;

export default function SavedSection({
  pick,
  wishlistCount,
  recentlyViewedCount,
  compareCount,
}: {
  pick: PickFn;
  wishlistCount: number;
  recentlyViewedCount: number;
  compareCount: number;
}): ReactElement {
  const cards = [
    {
      key: 'wishlist',
      label: pick({ en: 'Wishlist', ar: 'المفضلة' }),
      value: wishlistCount,
      icon: 'heart',
    },
    {
      key: 'recent',
      label: pick({ en: 'Recently viewed', ar: 'شوهدت مؤخرًا' }),
      value: recentlyViewedCount,
      icon: 'eye',
    },
    {
      key: 'compare',
      label: pick({ en: 'Compared', ar: 'المقارنة' }),
      value: compareCount,
      icon: 'compare',
    },
  ];

  return (
    <section className="account-saved-section">
      <div className="account-section-heading">
        <div>
          <p className="section-label">{pick({ en: 'Saved', ar: 'المحفوظات' })}</p>
          <h2>{pick({ en: 'Saved activity', ar: 'النشاط المحفوظ' })}</h2>
          <p>
            {pick({
              en: 'Your saved products and recent shopping activity in one place.',
              ar: 'منتجاتك المحفوظة ونشاط التسوق الأخير في مكان واحد.',
            })}
          </p>
        </div>
      </div>
      <div className="account-saved-grid">
        {cards.map((card) => (
          <article className="account-saved-card" key={card.key}>
            <span className="account-saved-card__icon" aria-hidden="true">
              <Icon name={card.icon} size={19} strokeWidth={1.8} />
            </span>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}

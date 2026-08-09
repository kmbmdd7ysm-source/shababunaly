import type { ReactElement } from 'react';

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
  return (
    <div>
      <h2>{pick({ en: 'Saved activity', ar: 'النشاط المحفوظ' })}</h2>
      <p>
        {pick({
          en: `${wishlistCount} wishlist items, ${recentlyViewedCount} recently viewed, ${compareCount} compared.`,
          ar: `${wishlistCount} في المفضلة، ${recentlyViewedCount} شوهدت مؤخرًا، ${compareCount} في المقارنة.`,
        })}
      </p>
    </div>
  );
}

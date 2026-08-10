import type { Dispatch, FormEvent, ReactElement, SetStateAction } from 'react';
import CurrencySelector from '../../components/common/CurrencySelector';

type PickFn = (value: unknown) => string;

type Profile = Record<string, unknown> & {
  preferredSize?: string;
  marketingConsent?: boolean;
};

type CommerceLike = {
  preferenceStatus?: string;
  [key: string]: unknown;
};

type UserDataLike = {
  clearPersonalization?: () => void;
  [key: string]: unknown;
};

export default function PreferencesSection({
  pick,
  profile,
  setProfile,
  save,
  commerce,
  data,
}: {
  pick: PickFn;
  profile: Profile;
  setProfile: Dispatch<SetStateAction<Profile>>;
  save: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  commerce: CommerceLike;
  data: UserDataLike;
}): ReactElement {
  const statusLabel =
    commerce.preferenceStatus === 'synced'
      ? pick({ en: 'Synced', ar: 'تمت المزامنة' })
      : commerce.preferenceStatus === 'syncing'
        ? pick({ en: 'Synchronizing…', ar: 'جارٍ المزامنة…' })
        : commerce.preferenceStatus === 'offline'
          ? pick({ en: 'Saved locally — offline', ar: 'محفوظ محليًا — غير متصل' })
          : commerce.preferenceStatus === 'error'
            ? pick({
                en: 'Saved locally — sync pending',
                ar: 'محفوظ محليًا — المزامنة معلقة',
              })
            : pick({ en: 'Saved locally', ar: 'محفوظ محليًا' });

  return (
    <form
      onSubmit={(event) => {
        void save(event);
      }}
      className="account-form"
    >
      <div className="account-preference-row">
        <div>
          <strong>{pick({ en: 'Display currency', ar: 'عملة العرض' })}</strong>
          <p>
            {pick({
              en: 'Saved locally and synchronized with your account when online.',
              ar: 'تُحفظ محليًا وتتم مزامنتها مع حسابك عند توفر الاتصال.',
            })}
          </p>
        </div>
        <CurrencySelector />
        <span role="status" aria-live="polite">
          {statusLabel}
        </span>
      </div>
      <label>
        {pick({ en: 'Preferred size', ar: 'المقاس المفضل' })}
        <input
          value={String(profile.preferredSize || '')}
          onChange={(event) => setProfile({ ...profile, preferredSize: event.target.value })}
        />
      </label>
      <label className="check-row">
        <input
          type="checkbox"
          checked={Boolean(profile.marketingConsent)}
          onChange={(event) =>
            setProfile({ ...profile, marketingConsent: event.target.checked })
          }
        />
        {pick({
          en: 'Receive academy and product updates',
          ar: 'استلام تحديثات الأكاديمية والمنتجات',
        })}
      </label>
      <button className="btn-primary" type="submit">
        {pick({ en: 'Save preferences', ar: 'حفظ التفضيلات' })}
      </button>
      <button
        type="button"
        className="btn-secondary"
        onClick={() => data.clearPersonalization?.()}
      >
        {pick({ en: 'Clear personalization history', ar: 'مسح سجل التخصيص' })}
      </button>
    </form>
  );
}

import type { Dispatch, FormEvent, ReactElement, SetStateAction } from 'react';
import { ORGANIZATION_TYPES } from './accountConstants.ts';
import { errorText } from '../../utils/errors.ts';

type PickFn = (value: unknown) => string;

type Profile = Record<string, unknown> & {
  accountType?: string;
  organizationName?: string;
  organizationType?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  phone?: string;
  avatarUrl?: string;
};

type AuthLike = {
  user?: {
    email?: string;
    email_confirmed_at?: string | null;
    confirmed_at?: string | null;
    [key: string]: unknown;
  } | null;
  cloudConfigured?: boolean;
  resendVerification?: (email?: string) => Promise<unknown>;
  updateMetadata?: (metadata: Record<string, unknown>) => Promise<unknown>;
};

type UserDataLike = {
  saveProfile?: (profile: Profile) => Promise<unknown>;
  [key: string]: unknown;
};

export default function ProfileSection({
  pick,
  lang,
  auth,
  profile,
  setProfile,
  accountEmail,
  setAccountEmail,
  busy,
  setBusy,
  setMsg,
  save,
  clearPhotoPreview,
  data,
}: {
  pick: PickFn;
  lang: string;
  auth: AuthLike;
  profile: Profile;
  setProfile: Dispatch<SetStateAction<Profile>>;
  accountEmail: string;
  setAccountEmail: (value: string) => void;
  busy: boolean;
  setBusy: (value: boolean) => void;
  setMsg: (value: string) => void;
  save: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  clearPhotoPreview: () => void;
  data: UserDataLike;
}): ReactElement {
  const verified = Boolean(auth.user?.email_confirmed_at || auth.user?.confirmed_at);

  return (
    <form
      onSubmit={(event) => {
        void save(event);
      }}
      className="account-form"
    >
      <div className="account-identity-card">
        <label>
          {pick({ en: 'Account email', ar: 'البريد الإلكتروني للحساب' })}
          <input
            type="email"
            value={accountEmail}
            onChange={(event) => setAccountEmail(event.target.value)}
            dir="ltr"
            autoComplete="email"
          />
        </label>
        <div className="verification-row">
          <strong>
            {verified
              ? pick({ en: 'Email verified', ar: 'البريد الإلكتروني موثّق' })
              : pick({ en: 'Email not verified', ar: 'البريد الإلكتروني غير موثّق' })}
          </strong>
          {!verified ? (
            <button
              type="button"
              className="btn-secondary"
              disabled={busy || !auth.cloudConfigured}
              onClick={() => {
                void (async () => {
                  setBusy(true);
                  try {
                    const result = await auth.resendVerification?.(auth.user?.email);
                    if (result && typeof result === 'object' && 'error' in result && result.error)
                      throw result.error;
                    setMsg(
                      pick({
                        en: 'Verification email sent. Check your inbox and spam folder.',
                        ar: 'تم إرسال رسالة التحقق. راجع صندوق الوارد والرسائل غير المرغوب فيها.',
                      }),
                    );
                  } catch (error) {
                    setMsg(errorText(error, lang));
                  } finally {
                    setBusy(false);
                  }
                })();
              }}
            >
              {pick({ en: 'Verify email', ar: 'توثيق البريد' })}
            </button>
          ) : null}
        </div>
      </div>
      <fieldset className="account-type-choice account-type-choice--profile">
        <legend>{pick({ en: 'Account type', ar: 'نوع الحساب' })}</legend>
        <div className="account-type-choice-grid">
          <button
            type="button"
            className={profile.accountType !== 'organization' ? 'active' : ''}
            aria-pressed={profile.accountType !== 'organization'}
            onClick={() =>
              setProfile({
                ...profile,
                accountType: 'customer',
                organizationName: '',
                organizationType: '',
              })
            }
          >
            <strong>{pick({ en: 'Personal', ar: 'فردي' })}</strong>
          </button>
          <button
            type="button"
            className={profile.accountType === 'organization' ? 'active' : ''}
            aria-pressed={profile.accountType === 'organization'}
            onClick={() =>
              setProfile({
                ...profile,
                accountType: 'organization',
                organizationType: profile.organizationType || 'club',
              })
            }
          >
            <strong>{pick({ en: 'Team / Business', ar: 'فريق / مؤسسة' })}</strong>
          </button>
        </div>
      </fieldset>
      {profile.accountType === 'organization' ? (
        <div className="organization-signup-fields">
          <label>
            {pick({ en: 'Organization name', ar: 'اسم المؤسسة' })}
            <input
              required
              autoComplete="organization"
              value={String(profile.organizationName || '')}
              onChange={(event) =>
                setProfile({ ...profile, organizationName: event.target.value })
              }
            />
          </label>
          <label>
            {pick({ en: 'Organization type', ar: 'نوع المؤسسة' })}
            <select
              value={String(profile.organizationType || 'club')}
              onChange={(event) =>
                setProfile({ ...profile, organizationType: event.target.value })
              }
            >
              {ORGANIZATION_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {pick({ en: item.en, ar: item.ar })}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}
      <label>
        {pick({ en: 'First name', ar: 'الاسم الأول' })}
        <input
          value={String(profile.firstName || '')}
          onChange={(event) => setProfile({ ...profile, firstName: event.target.value })}
        />
      </label>
      <label>
        {pick({ en: 'Last name', ar: 'اسم العائلة' })}
        <input
          value={String(profile.lastName || '')}
          onChange={(event) => setProfile({ ...profile, lastName: event.target.value })}
        />
      </label>
      <label>
        {pick({ en: 'Display name', ar: 'الاسم الظاهر' })}
        <input
          value={String(profile.displayName || '')}
          onChange={(event) => setProfile({ ...profile, displayName: event.target.value })}
        />
      </label>
      <label>
        {pick({ en: 'Phone number', ar: 'رقم الهاتف' })}
        <input
          type="tel"
          dir="ltr"
          autoComplete="tel"
          value={String(profile.phone || '')}
          onChange={(event) => setProfile({ ...profile, phone: event.target.value })}
        />
      </label>
      {profile.avatarUrl ? (
        <button
          type="button"
          className="btn-secondary"
          disabled={busy}
          onClick={() => {
            void (async () => {
              setBusy(true);
              try {
                const nextProfile = { ...profile, avatarUrl: '', avatar_url: null };
                const [profileResult, metadataResult] = await Promise.allSettled([
                  data.saveProfile?.(nextProfile) ?? Promise.resolve(),
                  auth.updateMetadata?.({ avatar_url: null }) ?? Promise.resolve(),
                ]);
                if (
                  profileResult.status === 'rejected' &&
                  metadataResult.status === 'rejected'
                ) {
                  throw profileResult.reason || metadataResult.reason;
                }
                if (
                  metadataResult.status === 'fulfilled' &&
                  metadataResult.value &&
                  typeof metadataResult.value === 'object' &&
                  'error' in metadataResult.value &&
                  metadataResult.value.error &&
                  profileResult.status === 'rejected'
                ) {
                  throw metadataResult.value.error;
                }
                clearPhotoPreview();
                setProfile((current) => ({ ...current, avatarUrl: '' }));
                setMsg(
                  pick({
                    en: 'Profile photo removed from your account.',
                    ar: 'تمت إزالة الصورة الشخصية من جميع الأجهزة.',
                  }),
                );
              } catch (error) {
                setMsg(errorText(error, lang));
              } finally {
                setBusy(false);
              }
            })();
          }}
        >
          {pick({ en: 'Remove profile photo', ar: 'إزالة الصورة الشخصية' })}
        </button>
      ) : null}
      <button className="btn-primary" disabled={busy} type="submit">
        {pick({ en: 'Save profile', ar: 'حفظ الملف الشخصي' })}
      </button>
    </form>
  );
}

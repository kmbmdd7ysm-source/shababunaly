import { useEffect, useState, type FormEvent, type ReactElement } from 'react';
import MfaSecurityPanel from '../../components/account/MfaSecurityPanel.tsx';
import {
  downloadPrivacyExport,
  listPrivacyExports,
  requestPrivacyExport,
} from '../../services/privacy.ts';
import { errorText } from '../../utils/errors.ts';

type PickFn = (value: unknown) => string;

type AuthLike = {
  cloudConfigured?: boolean;
  updatePassword?: (password: string) => Promise<unknown>;
  deleteAccount?: () => Promise<unknown>;
  signOut?: (scope?: string) => Promise<unknown> | void;
  user?: unknown;
  [key: string]: unknown;
};

type ExportRow = {
  id: string;
  status?: string;
  created_at?: string;
  export_asset_id?: string;
};

export default function SecuritySection({
  auth,
  pick,
  lang,
}: {
  auth: AuthLike;
  pick: PickFn;
  lang: string;
}): ReactElement {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [exports, setExports] = useState<ExportRow[]>([]);

  useEffect(() => {
    if (!auth.cloudConfigured) return;
    void listPrivacyExports()
      .then((rows) => setExports(Array.isArray(rows) ? (rows as ExportRow[]) : []))
      .catch(() => setExports([]));
  }, [auth.cloudConfigured]);

  const change = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (typeof auth.updatePassword === 'function') await auth.updatePassword(password);
      setPassword('');
      setMsg(pick({ en: 'Password changed.', ar: 'تم تغيير كلمة المرور.' }));
    } catch (error) {
      setMsg(errorText(error, lang));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm(pick({ en: 'Permanently delete this account?', ar: 'حذف هذا الحساب نهائيًا؟' })))
      return;
    try {
      if (typeof auth.deleteAccount === 'function') await auth.deleteAccount();
    } catch (error: unknown) {
      const message =
        error && typeof error === 'object' && 'message' in error
          ? String((error as { message?: unknown }).message || '')
          : String(error || '');
      setMsg(message);
    }
  };

  return (
    <div className="security-stack">
      <form
        onSubmit={(event) => {
          void change(event);
        }}
      >
        <h2>{pick({ en: 'Change password', ar: 'تغيير كلمة المرور' })}</h2>
        <input
          type="password"
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <button className="btn-primary" disabled={busy} type="submit">
          {pick({ en: 'Update password', ar: 'تحديث كلمة المرور' })}
        </button>
      </form>
      <MfaSecurityPanel auth={auth} pick={pick} />
      <section className="privacy-export-panel">
        <h2>{pick({ en: 'Privacy export', ar: 'تصدير بيانات الخصوصية' })}</h2>
        <p>
          {pick({
            en: 'Request a secure export of the personal data linked to your account.',
            ar: 'اطلب نسخة آمنة من البيانات الشخصية المرتبطة بحسابك.',
          })}
        </p>
        <button
          type="button"
          className="btn-secondary"
          disabled={busy || !auth.cloudConfigured}
          onClick={() => {
            void (async () => {
              setBusy(true);
              try {
                await requestPrivacyExport();
                const rows = await listPrivacyExports();
                setExports(Array.isArray(rows) ? (rows as ExportRow[]) : []);
                setMsg(pick({ en: 'Privacy export requested.', ar: 'تم طلب تصدير بياناتك.' }));
              } catch (error) {
                setMsg(errorText(error, lang));
              } finally {
                setBusy(false);
              }
            })();
          }}
        >
          {pick({ en: 'Request data export', ar: 'طلب تصدير البيانات' })}
        </button>
        {exports.length > 0 && (
          <ul className="privacy-export-list">
            {exports.map((item) => (
              <li key={item.id}>
                <span>{item.status}</span>
                <time>
                  {new Date(String(item.created_at || '')).toLocaleDateString(
                    lang === 'ar' ? 'ar-LY' : 'en-US',
                  )}
                </time>
                {item.status === 'ready' && item.export_asset_id ? (
                  <button
                    type="button"
                    className="btn-secondary compact"
                    onClick={() => {
                      void (async () => {
                        try {
                          await downloadPrivacyExport(String(item.export_asset_id));
                        } catch (error) {
                          setMsg(errorText(error, lang));
                        }
                      })();
                    }}
                  >
                    {pick({ en: 'Download', ar: 'تحميل' })}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
      <button
        className="btn-secondary"
        type="button"
        onClick={() => {
          if (typeof auth.signOut === 'function') void auth.signOut('global');
        }}
      >
        {pick({ en: 'Sign out all devices', ar: 'تسجيل الخروج من جميع الأجهزة' })}
      </button>
      <button className="danger-button" type="button" onClick={() => void remove()}>
        {pick({ en: 'Delete account', ar: 'حذف الحساب' })}
      </button>
      {msg ? <p role="status">{msg}</p> : null}
    </div>
  );
}

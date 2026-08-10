import type { FormEvent, ReactElement } from 'react';
import { useCallback, useEffect, useState } from 'react';

type LocalePick = (value: { en?: string; ar?: string } | string) => string;

type MfaAuth = {
  cloudConfigured?: boolean;
  listMfaFactors?: () => Promise<{
    factors?: Array<Record<string, unknown>>;
    aal?: Record<string, unknown> | null;
  }>;
  enrollMfaTotp?: () => Promise<Record<string, unknown>>;
  verifyMfaTotp?: (factorId: string, code: string) => Promise<unknown>;
  unenrollMfaFactor?: (factorId: string) => Promise<unknown>;
  [key: string]: unknown;
};

type Enrollment = Record<string, unknown> & {
  id?: string;
  totp?: { qr_code?: string; secret?: string };
};

function errMsg(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error && 'message' in error) {
    return String((error as { message?: unknown }).message || '');
  }
  return String(error || '');
}

export default function MfaSecurityPanel({
  auth,
  pick,
}: {
  auth: MfaAuth;
  pick: LocalePick;
}): ReactElement {
  const [state, setState] = useState<{
    loading: boolean;
    factors: Array<Record<string, unknown>>;
    aal: Record<string, unknown> | null;
    error: string;
  }>({ loading: true, factors: [], aal: null, error: '' });
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!auth.cloudConfigured) {
      setState({
        loading: false,
        factors: [],
        aal: null,
        error: pick({
          en: 'Secure cloud accounts must be connected before MFA can be enabled.',
          ar: 'يجب ربط الحسابات السحابية الآمنة قبل تفعيل التحقق بخطوتين.',
        }),
      });
      return;
    }
    try {
      const result = await (auth.listMfaFactors?.() ?? Promise.resolve({ factors: [], aal: null }));
      setState({
        loading: false,
        factors: Array.isArray(result.factors)
          ? (result.factors as Array<Record<string, unknown>>)
          : [],
        aal: (result.aal as Record<string, unknown> | null) || null,
        error: '',
      });
    } catch (error) {
      setState({ loading: false, factors: [], aal: null, error: errMsg(error) || String(error) });
    }
  }, [auth, pick]);

  useEffect(() => {
    void load();
  }, [load]);

  const begin = async () => {
    setBusy(true);
    try {
      const result = (await (auth.enrollMfaTotp?.() ??
        Promise.reject(new Error('MFA unavailable')))) as Enrollment;
      setEnrollment(result);
      setCode('');
      setState((current) => ({ ...current, error: '' }));
    } catch (error) {
      setState((current) => ({ ...current, error: errMsg(error) || String(error) }));
    } finally {
      setBusy(false);
    }
  };

  const verify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!enrollment?.id || !/^\d{6}$/.test(code)) return;
    setBusy(true);
    try {
      await auth.verifyMfaTotp?.(String(enrollment.id), code);
      setEnrollment(null);
      setCode('');
      await load();
    } catch (error) {
      setState((current) => ({ ...current, error: errMsg(error) || String(error) }));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (factorId: string) => {
    if (
      !globalThis.confirm?.(
        pick({ en: 'Remove this authenticator factor?', ar: 'إزالة تطبيق المصادقة هذا؟' }),
      )
    )
      return;
    setBusy(true);
    try {
      await auth.unenrollMfaFactor?.(factorId);
      await load();
    } catch (error) {
      setState((current) => ({ ...current, error: errMsg(error) || String(error) }));
    } finally {
      setBusy(false);
    }
  };

  const totp = (enrollment?.totp || {}) as { qr_code?: string; secret?: string };

  return (
    <section className="mfa-security-panel" aria-labelledby="mfa-title">
      <div className="section-heading-row">
        <div>
          <p className="section-label">MULTI-FACTOR AUTHENTICATION</p>
          <h2 id="mfa-title">
            {pick({ en: 'Authenticator protection', ar: 'حماية تطبيق المصادقة' })}
          </h2>
        </div>
        <span className="workspace-status">
          {state.aal?.currentLevel === 'aal2' ? 'AAL2' : 'AAL1'}
        </span>
      </div>
      <p>
        {pick({
          en: 'Staff and administrator access requires AAL2. Use an authenticator app to protect sensitive operations.',
          ar: 'يتطلب دخول الموظفين والإدارة مستوى AAL2. استخدم تطبيق مصادقة لحماية العمليات الحساسة.',
        })}
      </p>
      {state.loading ? (
        <p role="status">{pick({ en: 'Checking security…', ar: 'جاري فحص الأمان…' })}</p>
      ) : null}
      {state.factors.map((factor) => (
        <article className="mfa-factor-row" key={String(factor.id)}>
          <div>
            <strong>{String(factor.friendly_name || 'Authenticator')}</strong>
            <small>{String(factor.status || '')}</small>
          </div>
          <button
            type="button"
            className="btn-secondary compact"
            disabled={busy}
            onClick={() => {
              void remove(String(factor.id || ''));
            }}
          >
            {pick({ en: 'Remove', ar: 'إزالة' })}
          </button>
        </article>
      ))}
      {!enrollment && !state.loading && (
        <button
          type="button"
          className="btn-secondary"
          disabled={busy || !auth.cloudConfigured}
          onClick={() => {
            void begin();
          }}
        >
          {pick({ en: 'Add authenticator', ar: 'إضافة تطبيق مصادقة' })}
        </button>
      )}
      {enrollment ? (
        <form
          className="mfa-enrollment"
          onSubmit={(event) => {
            void verify(event);
          }}
        >
          <h3>{pick({ en: 'Scan and verify', ar: 'امسح الرمز ثم أكّد' })}</h3>
          {totp.qr_code ? (
            <img
              src={String(totp.qr_code)}
              alt={pick({ en: 'Authenticator QR code', ar: 'رمز QR لتطبيق المصادقة' })}
              width={220}
              height={220}
            />
          ) : null}
          <p>
            <code dir="ltr">{String(totp.secret || '')}</code>
          </p>
          <label>
            {pick({ en: 'Six-digit code', ar: 'الرمز المكوّن من 6 أرقام' })}
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              required
            />
          </label>
          <div className="inline-actions">
            <button className="btn-primary" disabled={busy || code.length !== 6}>
              {pick({ en: 'Verify and enable', ar: 'تأكيد وتفعيل' })}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setEnrollment(null)}>
              {pick({ en: 'Cancel', ar: 'إلغاء' })}
            </button>
          </div>
        </form>
      ) : null}
      {state.error ? (
        <p className="form-status" role="alert">
          {state.error}
        </p>
      ) : null}
    </section>
  );
}

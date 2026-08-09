import { useCallback, useEffect, useState } from 'react';

export default function MfaSecurityPanel({ auth, pick }) {
  const [state, setState] = useState({ loading: true, factors: [], aal: null, error: '' });
  const [enrollment, setEnrollment] = useState(null);
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
      const result = await auth.listMfaFactors();
      setState({
        loading: false,
        factors: result.factors || [],
        aal: result.aal || null,
        error: '',
      });
    } catch (error) {
      setState({ loading: false, factors: [], aal: null, error: error?.message || String(error) });
    }
  }, [auth, pick]);

  useEffect(() => {
    void load();
  }, [load]);

  const begin = async () => {
    setBusy(true);
    try {
      const result = await auth.enrollMfaTotp();
      setEnrollment(result);
      setCode('');
      setState((current) => ({ ...current, error: '' }));
    } catch (error) {
      setState((current) => ({ ...current, error: error?.message || String(error) }));
    } finally {
      setBusy(false);
    }
  };

  const verify = async (event) => {
    event.preventDefault();
    if (!enrollment?.id || !/^\d{6}$/.test(code)) return;
    setBusy(true);
    try {
      await auth.verifyMfaTotp(enrollment.id, code);
      setEnrollment(null);
      setCode('');
      await load();
    } catch (error) {
      setState((current) => ({ ...current, error: error?.message || String(error) }));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (factorId) => {
    if (
      !globalThis.confirm?.(
        pick({ en: 'Remove this authenticator factor?', ar: 'إزالة تطبيق المصادقة هذا؟' }),
      )
    )
      return;
    setBusy(true);
    try {
      await auth.unenrollMfaFactor(factorId);
      await load();
    } catch (error) {
      setState((current) => ({ ...current, error: error?.message || String(error) }));
    } finally {
      setBusy(false);
    }
  };

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
        <article className="mfa-factor-row" key={factor.id}>
          <div>
            <strong>{factor.friendly_name || 'Authenticator'}</strong>
            <small>{factor.status}</small>
          </div>
          <button
            type="button"
            className="btn-secondary compact"
            disabled={busy}
            onClick={() => remove(factor.id)}
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
          onClick={begin}
        >
          {pick({ en: 'Add authenticator', ar: 'إضافة تطبيق مصادقة' })}
        </button>
      )}
      {enrollment && (
        <form className="mfa-enrollment" onSubmit={verify}>
          <h3>{pick({ en: 'Scan and verify', ar: 'امسح الرمز ثم أكّد' })}</h3>
          {enrollment.totp?.qr_code && (
            <img
              src={enrollment.totp.qr_code}
              alt={pick({ en: 'Authenticator QR code', ar: 'رمز QR لتطبيق المصادقة' })}
              width="220"
              height="220"
            />
          )}
          <p>
            <code dir="ltr">{enrollment.totp?.secret}</code>
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
      )}
      {state.error && (
        <p className="form-status" role="alert">
          {state.error}
        </p>
      )}
    </section>
  );
}

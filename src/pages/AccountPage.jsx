import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useUserData } from '../context/UserDataContext';
import { useCart } from '../context/CartContext';
import { useCompare } from '../context/CompareContext';
import { useCommerce } from '../context/CommerceContext';
import Seo from '../components/common/Seo';
import '../styles/account.css';
import AddressesSection from '../components/account/AddressesSection';
import CurrencySelector from '../components/common/CurrencySelector';
import Avatar from '../components/common/Avatar';
import { errorText, mapError } from '../utils/errors';
import { createProfileImageDataUrl, validateProfileImage } from '../utils/profileImage';
import { getMyOrders } from '../services/orders';
import { safeInternalReturnPath } from '../utils/safeReturnPath';
import OrderCard from '../components/account/OrderCard';
import OrganizationWorkspace from '../components/account/OrganizationWorkspace';
import ReturnsSection from '../components/account/ReturnsSection';
import SpecialRequestsSection from '../components/account/SpecialRequestsSection';
import MfaSecurityPanel from '../components/account/MfaSecurityPanel';
import {
  downloadPrivacyExport,
  listPrivacyExports,
  requestPrivacyExport,
} from '../services/privacy';

const ACCOUNT_SECTIONS = [
  'overview',
  'orders',
  'workspace',
  'returns',
  'special-requests',
  'profile',
  'saved',
  'addresses',
  'preferences',
  'security',
];
const clean = (s) =>
  String(s || '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, 100);
const ORGANIZATION_TYPES = [
  { value: 'club', en: 'Club', ar: 'نادي' },
  { value: 'academy', en: 'Academy', ar: 'أكاديمية' },
  { value: 'federation', en: 'Federation', ar: 'اتحاد' },
  { value: 'school_university', en: 'School / University', ar: 'مدرسة / جامعة' },
  { value: 'wholesale', en: 'Wholesale buyer', ar: 'عميل جملة' },
  { value: 'distributor', en: 'Distributor', ar: 'موزع' },
];
export default function AccountPage() {
  const { pick, lang } = useLanguage(),
    auth = useAuth(),
    data = useUserData(),
    cart = useCart(),
    compare = useCompare(),
    commerce = useCommerce();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const returnTo = safeInternalReturnPath(params.get('returnTo'), '');
  const requestedSection = params.get('section');
  const initialSection = ACCOUNT_SECTIONS.includes(requestedSection)
    ? requestedSection
    : 'overview';
  const requestedMode = params.get('mode');
  const initialMode = ['signin', 'signup', 'reset', 'reset-password'].includes(requestedMode)
    ? requestedMode
    : 'signin';
  const [mode, setMode] = useState(initialMode),
    [section, setSection] = useState(initialSection),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [fullName, setFullName] = useState(''),
    [accountType, setAccountType] = useState('customer'),
    [organizationName, setOrganizationName] = useState(''),
    [organizationType, setOrganizationType] = useState('club'),
    [confirmPassword, setConfirmPassword] = useState(''),
    [photoPreview, setPhotoPreview] = useState(''),
    [verificationEmail, setVerificationEmail] = useState(''),
    [accountEmail, setAccountEmail] = useState(auth.user?.email || ''),
    [show, setShow] = useState(false),
    [busy, setBusy] = useState(false),
    [msg, setMsg] = useState(''),
    [ordersState, setOrdersState] = useState({ state: 'idle', orders: [], error: null }),
    [profile, setProfile] = useState(() => ({
      firstName:
        data?.profile?.first_name ||
        data?.profile?.firstName ||
        auth.user?.user_metadata?.first_name ||
        '',
      lastName:
        data?.profile?.last_name ||
        data?.profile?.lastName ||
        auth.user?.user_metadata?.last_name ||
        '',
      displayName:
        data?.profile?.display_name ||
        data?.profile?.displayName ||
        auth.user?.user_metadata?.display_name ||
        auth.user?.user_metadata?.fullName ||
        '',
      accountType:
        data?.profile?.account_type ||
        data?.profile?.accountType ||
        auth.user?.user_metadata?.account_type ||
        'customer',
      organizationName:
        data?.profile?.organization_name ||
        data?.profile?.organizationName ||
        auth.user?.user_metadata?.organization_name ||
        '',
      organizationType:
        data?.profile?.organization_type ||
        data?.profile?.organizationType ||
        auth.user?.user_metadata?.organization_type ||
        'club',
      preferredLanguage: data?.profile?.preferred_language || lang,
      preferredSize: data?.profile?.preferred_size || '',
      preferredColors: data?.profile?.preferred_colors || [],
      marketingConsent: Boolean(data?.profile?.marketing_consent),
      phone: auth.user?.user_metadata?.phone || '',
      avatarUrl:
        data?.profile?.avatar_url ||
        data?.profile?.avatarUrl ||
        auth.user?.user_metadata?.avatar_url ||
        '',
    }));
  const nameRef = useRef(null),
    organizationRef = useRef(null),
    emailRef = useRef(null),
    passwordRef = useRef(null),
    confirmRef = useRef(null),
    photoRef = useRef(null);
  const focusField = (ref) =>
    requestAnimationFrame(() => {
      const node = ref?.current;
      if (!node) return;
      node.focus();
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      node.scrollIntoView?.({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
    });
  useEffect(() => {
    const nextSection = ACCOUNT_SECTIONS.includes(params.get('section'))
      ? params.get('section')
      : 'overview';
    setSection(nextSection);
  }, [params]);
  useEffect(() => {
    const nextMode = params.get('mode');
    if (['signin', 'signup', 'reset', 'reset-password'].includes(nextMode)) setMode(nextMode);
  }, [params]);
  useEffect(() => {
    if (auth.loading || params.get('verified') !== '1') return;
    setMode('signin');
    setVerificationEmail(auth.user?.email || '');
    setMsg(
      auth.user
        ? pick({
            en: 'Email verified successfully. Your account is ready on every device.',
            ar: 'تم تأكيد البريد بنجاح. حسابك جاهز لتسجيل الدخول من أي جهاز.',
          })
        : pick({
            en: 'Email verified successfully. Sign in with your email and password on this or any other device.',
            ar: 'تم تأكيد البريد بنجاح. سجّل الدخول ببريدك وكلمة المرور من هذا الجهاز أو أي جهاز آخر.',
          }),
    );
    const nextParams = new URLSearchParams(params);
    nextParams.delete('verified');
    nextParams.delete('mode');
    setParams(nextParams, { replace: true });
  }, [auth.loading, auth.user?.id, params, pick, setParams]);
  useEffect(() => {
    if (!auth.user) return;
    setAccountEmail(auth.user.email || '');
    setProfile((current) => ({
      ...current,
      firstName: current.firstName || auth.user.user_metadata?.first_name || '',
      lastName: current.lastName || auth.user.user_metadata?.last_name || '',
      displayName:
        current.displayName ||
        auth.user.user_metadata?.display_name ||
        auth.user.user_metadata?.fullName ||
        '',
      accountType:
        data?.profile?.account_type ||
        data?.profile?.accountType ||
        auth.user.user_metadata?.account_type ||
        current.accountType ||
        'customer',
      organizationName:
        data?.profile?.organization_name ||
        data?.profile?.organizationName ||
        auth.user.user_metadata?.organization_name ||
        current.organizationName ||
        '',
      organizationType:
        data?.profile?.organization_type ||
        data?.profile?.organizationType ||
        auth.user.user_metadata?.organization_type ||
        current.organizationType ||
        'club',
      phone: auth.user.user_metadata?.phone || current.phone || '',
      avatarUrl:
        current.avatarUrl ||
        data?.profile?.avatar_url ||
        data?.profile?.avatarUrl ||
        auth.user.user_metadata?.avatar_url ||
        '',
    }));
  }, [auth.user?.id, auth.user?.user_metadata, data?.profile]);
  const selectSection = (nextSection) => {
    setSection(nextSection);
    const nextParams = new URLSearchParams(params);
    if (nextSection === 'overview') nextParams.delete('section');
    else nextParams.set('section', nextSection);
    setParams(nextParams, { replace: true });
  };
  useEffect(
    () => () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    },
    [photoPreview],
  );
  const loadOrders = async () => {
    if (!auth.user?.id) return;
    setOrdersState((current) => ({
      ...current,
      state: current.orders.length ? 'retrying' : 'loading',
    }));
    setOrdersState(await getMyOrders(auth.user.id));
  };
  useEffect(() => {
    loadOrders();
  }, [auth.user?.id]);
  const clearPhotoPreview = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview('');
  };
  const t = useMemo(
    () => ({
      overview: pick({ en: 'Overview', ar: 'نظرة عامة' }),
      profile: pick({ en: 'Profile', ar: 'الملف الشخصي' }),
      saved: pick({ en: 'Saved items', ar: 'العناصر المحفوظة' }),
      security: pick({ en: 'Security', ar: 'الأمان' }),
      addresses: pick({ en: 'Addresses', ar: 'العناوين' }),
      preferences: pick({ en: 'Preferences', ar: 'التفضيلات' }),
      orders: pick({ en: 'Orders', ar: 'الطلبات' }),
      workspace: pick({ en: 'Teams & Wholesale', ar: 'الأندية والجملة' }),
      returns: pick({ en: 'Returns', ar: 'الإرجاع' }),
      'special-requests': pick({ en: 'Special Requests', ar: 'طلبات خاصة' }),
    }),
    [pick],
  );
  if (auth.loading)
    return (
      <div className="section container" role="status">
        {pick({ en: 'Restoring your session…', ar: 'جارٍ استعادة جلستك…' })}
      </div>
    );
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const fail = (message, ref) => {
        const error = new Error(message);
        error.fieldRef = ref;
        throw error;
      };
      if (mode === 'signup' && !clean(fullName))
        fail(pick({ en: 'Enter your full name.', ar: 'أدخل الاسم الكامل.' }), nameRef);
      if (mode === 'signup' && accountType === 'organization' && !clean(organizationName))
        fail(
          pick({ en: 'Enter the organization name.', ar: 'أدخل اسم المؤسسة.' }),
          organizationRef,
        );
      if (mode !== 'reset-password' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail))
        fail(
          pick({ en: 'Enter a valid email address.', ar: 'أدخل عنوان بريد إلكتروني صالحًا.' }),
          emailRef,
        );
      if (mode !== 'reset' && password.length < 8)
        fail(
          pick({
            en: 'Password must be at least 8 characters.',
            ar: 'يجب أن تتكون كلمة المرور من 8 أحرف على الأقل.',
          }),
          passwordRef,
        );
      if (mode === 'signup' && password !== confirmPassword)
        fail(
          pick({ en: 'Passwords do not match.', ar: 'كلمتا المرور غير متطابقتين.' }),
          confirmRef,
        );
      let r;
      if (mode === 'signup') {
        const normalizedName = clean(fullName);
        const parts = normalizedName.split(/\s+/).filter(Boolean);
        const firstName = parts.shift() || '';
        const lastName = parts.join(' ');
        // Keep signup metadata deliberately small. Embedding an uploaded image in
        // auth metadata can exceed Supabase request limits and prevent account creation.
        // The user can save the photo immediately after signing in or verifying email.
        r = await auth.signUp(normalizedEmail, password, {
          fullName: normalizedName,
          full_name: normalizedName,
          first_name: firstName,
          last_name: lastName,
          display_name: normalizedName,
          account_type: accountType,
          organization_name: accountType === 'organization' ? clean(organizationName) : '',
          organization_type: accountType === 'organization' ? organizationType : '',
        });
      } else if (mode === 'reset') r = await auth.reset(normalizedEmail);
      else if (mode === 'reset-password') r = await auth.updatePassword(password);
      else r = await auth.signIn(normalizedEmail, password);
      if (r?.error) throw r.error;
      if (mode === 'reset-password') setMode('signin');
      if (mode === 'signup' && !r?.data?.session && auth.cloudConfigured) {
        setVerificationEmail(normalizedEmail);
      } else if (mode !== 'signin') {
        setVerificationEmail('');
      }
      setMsg(
        pick({
          en:
            mode === 'reset'
              ? 'Check your email for a secure reset link.'
              : mode === 'signup'
                ? auth.cloudConfigured
                  ? 'Check your email to verify your account.'
                  : 'Account created successfully on this device.'
                : mode === 'reset-password'
                  ? 'Password updated.'
                  : 'Signed in successfully.',
          ar:
            mode === 'reset'
              ? 'راجع بريدك الإلكتروني لرابط إعادة التعيين الآمن.'
              : mode === 'signup'
                ? auth.cloudConfigured
                  ? 'راجع بريدك لتأكيد الحساب.'
                  : 'تم إنشاء الحساب بنجاح على هذا الجهاز.'
                : mode === 'reset-password'
                  ? 'تم تحديث كلمة المرور.'
                  : 'تم تسجيل الدخول بنجاح.',
        }),
      );
      if (returnTo && mode === 'signin') navigate(returnTo, { replace: true });
      if (returnTo && mode === 'signup' && r?.data?.session) navigate(returnTo, { replace: true });
    } catch (x) {
      const mapped = mapError(x);
      if (mapped.code === 'auth_unverified') setVerificationEmail(email.trim().toLowerCase());
      setMsg(mapped.message[lang] || mapped.message.en);
      focusField(x.fieldRef);
    } finally {
      setBusy(false);
    }
  };
  if (!auth.user || mode === 'reset-password')
    return (
      <>
        <Seo title="Account" path="/account" noindex />
        {/* THE GATE — a two-panel entrance, not a card adrift in a field.
            The previous version floated a small plate in the middle of an empty
            page with the footer crowding in underneath it: the most important
            single-task screen on the site read as the least considered.

            The gate now fills the viewport. A night panel carries the identity
            and states plainly what an account is FOR — read from the same
            capability list the account itself exposes, so it makes no promise
            the product does not keep. The form panel holds nothing but the
            task. */}
        <div className="gw-gatewall">
          <aside className="gw-gatewall-identity">
            <img
              className="gw-gatewall-mark"
              src={pick({
                en: '/brand/shababuna-wordmark-white.png',
                ar: '/brand/shababuna-wordmark-ar-white.png',
              })}
              alt=""
              width="240"
              height="64"
              loading="eager"
              decoding="async"
            />
            <p className="gw-spec">{pick({ en: 'Built different.', ar: 'مختلفون.' })}</p>
            <ol className="gw-gatewall-list">
              {[
                { en: 'Orders, tracking and delivery status', ar: 'الطلبات والتتبع وحالة التسليم' },
                {
                  en: 'Saved designs and approved proofs',
                  ar: 'التصاميم المحفوظة والبروفات المعتمدة',
                },
                {
                  en: 'Returns, refunds and payment status',
                  ar: 'المرتجعات والاستردادات وحالة الدفع',
                },
                { en: 'Team and organization access', ar: 'الوصول إلى الفريق والمؤسسة' },
              ].map((item, position) => (
                <li key={item.en}>
                  <span aria-hidden="true">{String(position + 1).padStart(2, '0')}</span>
                  {pick(item)}
                </li>
              ))}
            </ol>
          </aside>
          <section className="gw-gate">
            <form className="gw-gate-form" onSubmit={submit} noValidate>
              <p className="gw-spec">SHABABUNA ACCOUNT</p>
              <h1 className="gw-gate-title">
                {pick({
                  en:
                    mode === 'signup'
                      ? 'Create account'
                      : mode === 'reset'
                        ? 'Reset password'
                        : mode === 'reset-password'
                          ? 'Choose a new password'
                          : 'Sign in',
                  ar:
                    mode === 'signup'
                      ? 'إنشاء حساب'
                      : mode === 'reset'
                        ? 'إعادة تعيين كلمة المرور'
                        : mode === 'reset-password'
                          ? 'اختر كلمة مرور جديدة'
                          : 'تسجيل الدخول',
                })}
              </h1>
              {!auth.configured && (
                <p className="form-notice">
                  {pick({
                    en: 'Cloud accounts require Supabase configuration. Guest shopping remains available.',
                    ar: 'تحتاج الحسابات السحابية إلى إعداد Supabase. يظل التسوق كضيف متاحًا.',
                  })}
                </p>
              )}
              {mode === 'signup' && (
                <>
                  <fieldset className="account-type-choice">
                    <legend>{pick({ en: 'Choose account type', ar: 'اختر نوع الحساب' })}</legend>
                    <div className="account-type-choice-grid">
                      <button
                        type="button"
                        className={accountType === 'customer' ? 'active' : ''}
                        aria-pressed={accountType === 'customer'}
                        onClick={() => {
                          setAccountType('customer');
                          setMsg('');
                        }}
                      >
                        <strong>{pick({ en: 'Personal account', ar: 'حساب فردي' })}</strong>
                        <span>
                          {pick({
                            en: 'Shop products, save favorites and track orders.',
                            ar: 'تسوق المنتجات واحفظ المفضلة وتابع الطلبات.',
                          })}
                        </span>
                      </button>
                      <button
                        type="button"
                        className={accountType === 'organization' ? 'active' : ''}
                        aria-pressed={accountType === 'organization'}
                        onClick={() => {
                          setAccountType('organization');
                          setMsg('');
                        }}
                      >
                        <strong>
                          {pick({ en: 'Team & business account', ar: 'حساب فريق أو مؤسسة' })}
                        </strong>
                        <span>
                          {pick({
                            en: 'For clubs, academies, federations, wholesale and distributors.',
                            ar: 'للأندية والأكاديميات والاتحادات والجملة والموزعين.',
                          })}
                        </span>
                      </button>
                    </div>
                  </fieldset>
                  {accountType === 'organization' && (
                    <div className="organization-signup-fields">
                      <label>
                        {pick({ en: 'Organization name', ar: 'اسم المؤسسة' })}
                        <input
                          ref={organizationRef}
                          autoComplete="organization"
                          required
                          value={organizationName}
                          onChange={(event) => setOrganizationName(event.target.value)}
                        />
                      </label>
                      <label>
                        {pick({ en: 'Organization type', ar: 'نوع المؤسسة' })}
                        <select
                          value={organizationType}
                          onChange={(event) => setOrganizationType(event.target.value)}
                        >
                          {ORGANIZATION_TYPES.map((item) => (
                            <option key={item.value} value={item.value}>
                              {pick({ en: item.en, ar: item.ar })}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  )}
                  <label>
                    {pick({ en: 'Full name', ar: 'الاسم الكامل' })}
                    <input
                      ref={nameRef}
                      autoComplete="name"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </label>
                  <label>
                    {pick({ en: 'Profile photo (optional)', ar: 'الصورة الشخصية (اختيارية)' })}
                    <input
                      ref={photoRef}
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        const result = await validateProfileImage(f);
                        if (!result.valid) {
                          const message =
                            result.reason === 'signature'
                              ? pick({
                                  en: 'This file is not a valid image.',
                                  ar: 'هذا الملف ليس صورة صالحة.',
                                })
                              : pick({
                                  en: 'Choose a JPG, PNG, or WebP image.',
                                  ar: 'اختر صورة بصيغة JPG أو PNG أو WebP.',
                                });
                          setMsg(message);
                          e.target.value = '';
                          focusField(photoRef);
                          return;
                        }
                        if (photoPreview) URL.revokeObjectURL(photoPreview);
                        setPhotoPreview(URL.createObjectURL(f));
                        setMsg('');
                      }}
                    />
                  </label>
                  {photoPreview && (
                    <div className="profile-photo-preview">
                      <img
                        src={photoPreview}
                        alt={pick({ en: 'Profile preview', ar: 'معاينة الصورة الشخصية' })}
                        width="320"
                        height="320"
                        decoding="async"
                      />
                      <button type="button" onClick={clearPhotoPreview}>
                        {pick({ en: 'Remove', ar: 'إزالة' })}
                      </button>
                    </div>
                  )}
                </>
              )}
              {mode !== 'reset-password' && (
                <label>
                  {pick({ en: 'Email', ar: 'البريد الإلكتروني' })}
                  <input
                    ref={emailRef}
                    type="email"
                    dir="ltr"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
              )}
              {mode !== 'reset' && (
                <label>
                  {pick({ en: 'Password', ar: 'كلمة المرور' })}
                  <span className="password-field">
                    <input
                      ref={passwordRef}
                      type={show ? 'text' : 'password'}
                      dir="ltr"
                      minLength="8"
                      autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShow((v) => !v)}
                      aria-label={pick(
                        show
                          ? { en: 'Hide password', ar: 'إخفاء كلمة المرور' }
                          : { en: 'Show password', ar: 'إظهار كلمة المرور' },
                      )}
                    >
                      {pick(show ? { en: 'Hide', ar: 'إخفاء' } : { en: 'Show', ar: 'إظهار' })}
                    </button>
                  </span>
                </label>
              )}
              {mode === 'signup' && (
                <label>
                  {pick({ en: 'Confirm new password', ar: 'تأكيد كلمة المرور الجديدة' })}
                  <input
                    ref={confirmRef}
                    type={show ? 'text' : 'password'}
                    dir="ltr"
                    autoComplete="new-password"
                    required
                    minLength="8"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </label>
              )}
              <button className="btn-primary" type="submit" disabled={busy || !auth.configured}>
                {busy
                  ? pick({ en: 'Please wait…', ar: 'يرجى الانتظار…' })
                  : pick(
                      mode === 'signup'
                        ? { en: 'Create Account', ar: 'إنشاء الحساب' }
                        : { en: 'Continue', ar: 'متابعة' },
                    )}
              </button>
              {msg && (
                <p id="account-error-summary" role="alert" aria-live="assertive">
                  {msg}
                </p>
              )}
              {verificationEmail && auth.cloudConfigured && !auth.user && (
                <div className="account-verification-panel" role="status" aria-live="polite">
                  <strong>{pick({ en: 'Verify your email', ar: 'أكد بريدك الإلكتروني' })}</strong>
                  <p>
                    {pick({
                      en: `We sent a verification link to ${verificationEmail}. Open it, then you can sign in on any device.`,
                      ar: `أرسلنا رابط التأكيد إلى ${verificationEmail}. افتحه وبعدها تقدر تسجل الدخول من أي جهاز.`,
                    })}
                  </p>
                  <div className="account-verification-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          const result = await auth.resendVerification(verificationEmail);
                          if (result?.error) throw result.error;
                          setMsg(
                            pick({
                              en: 'Verification email sent again. Check your inbox and spam folder.',
                              ar: 'تم إرسال رابط التأكيد من جديد. راجع الوارد والرسائل غير المرغوب فيها.',
                            }),
                          );
                        } catch (error) {
                          setMsg(errorText(error, lang));
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      {pick({ en: 'Resend verification', ar: 'إعادة إرسال التأكيد' })}
                    </button>
                    <button
                      type="button"
                      className="account-verification-signin"
                      onClick={() => {
                        setMode('signin');
                        setEmail(verificationEmail);
                        setPassword('');
                      }}
                    >
                      {pick({ en: 'Go to sign in', ar: 'الذهاب لتسجيل الدخول' })}
                    </button>
                  </div>
                </div>
              )}
              <div className="account-switch">
                {mode !== 'signin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signin');
                      setVerificationEmail('');
                      setMsg('');
                    }}
                  >
                    {pick({ en: 'Sign in', ar: 'تسجيل الدخول' })}
                  </button>
                )}
                {mode !== 'signup' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signup');
                      setVerificationEmail('');
                      setMsg('');
                    }}
                  >
                    {pick({ en: 'Create account', ar: 'إنشاء حساب' })}
                  </button>
                )}
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('reset');
                      setVerificationEmail('');
                      setMsg('');
                    }}
                  >
                    {pick({ en: 'Forgot password?', ar: 'نسيت كلمة المرور؟' })}
                  </button>
                )}
              </div>
            </form>
          </section>
        </div>
      </>
    );
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await data.saveProfile({
        ...profile,
        firstName: clean(profile.firstName),
        lastName: clean(profile.lastName),
        displayName: clean(profile.displayName),
        accountType: profile.accountType === 'organization' ? 'organization' : 'customer',
        organizationName:
          profile.accountType === 'organization' ? clean(profile.organizationName) : '',
        organizationType:
          profile.accountType === 'organization' ? profile.organizationType || 'club' : '',
      });
      const firstName = clean(profile.firstName);
      const lastName = clean(profile.lastName);
      const displayName =
        clean(profile.displayName) || [firstName, lastName].filter(Boolean).join(' ');
      const metadataResult = await auth.updateMetadata({
        first_name: firstName,
        last_name: lastName,
        display_name: displayName,
        fullName: displayName,
        phone: clean(profile.phone),
        account_type: profile.accountType === 'organization' ? 'organization' : 'customer',
        organization_name:
          profile.accountType === 'organization' ? clean(profile.organizationName) : '',
        organization_type:
          profile.accountType === 'organization' ? profile.organizationType || 'club' : '',
        avatar_url: profile.avatarUrl || null,
      });
      if (metadataResult?.error) throw metadataResult.error;
      const normalizedAccountEmail = accountEmail.trim().toLowerCase();
      if (normalizedAccountEmail && normalizedAccountEmail !== auth.user.email) {
        const emailResult = await auth.updateEmail(normalizedAccountEmail);
        if (emailResult?.error) throw emailResult.error;
        setMsg(
          pick({
            en: 'Profile saved. Check both email inboxes to confirm the new address.',
            ar: 'تم حفظ الملف الشخصي. راجع البريدين لتأكيد العنوان الجديد.',
          }),
        );
      } else {
        setMsg(pick({ en: 'Profile saved.', ar: 'تم حفظ الملف الشخصي.' }));
      }
    } catch (x) {
      setMsg(errorText(x, lang));
      focusField(x.fieldRef);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Seo title="Account" path="/account" noindex />
      {/* THE ACCOUNT SHELL — an identity masthead over a numbered section
          register, rather than a heading row above a plain nav column. The
          identity carries the avatar editor, the signed-in address and the
          live sync status as specification, and sign-out sits as the
          masthead's action. */}
      <section className="gw-account">
        <div className="gw-account-inner">
          <div className="gw-account-identity">
            <label className="gw-account-avatar">
              <Avatar
                name={
                  profile.displayName ||
                  `${profile.firstName} ${profile.lastName}` ||
                  auth.user.email
                }
                src={photoPreview || profile.avatarUrl}
                size="large"
              />
              <span>{pick({ en: 'Change photo', ar: 'تغيير الصورة' })}</span>
              <input
                type="file"
                accept="image/*"
                disabled={busy}
                aria-label={pick({ en: 'Choose profile photo', ar: 'اختر صورة شخصية' })}
                onChange={async (event) => {
                  const input = event.currentTarget;
                  const file = input.files?.[0];
                  if (!file) return;

                  const previousAvatar = profile.avatarUrl;
                  const previewUrl = URL.createObjectURL(file);
                  clearPhotoPreview();
                  setPhotoPreview(previewUrl);
                  setBusy(true);
                  setMsg(pick({ en: 'Saving profile photo…', ar: 'جارٍ حفظ الصورة الشخصية…' }));

                  try {
                    const validation = await validateProfileImage(file);
                    if (!validation.valid) throw new Error('invalid_profile_image');
                    const avatarUrl = await createProfileImageDataUrl(file);
                    const nextProfile = {
                      ...profile,
                      avatarUrl,
                      avatar_url: avatarUrl,
                    };

                    // Save to both durable profile storage and auth metadata. Either source can
                    // restore the avatar on another device, and the UI updates immediately.
                    const [profileResult, metadataResult] = await Promise.allSettled([
                      data.saveProfile(nextProfile),
                      auth.updateMetadata({ avatar_url: avatarUrl }),
                    ]);
                    if (
                      profileResult.status === 'rejected' &&
                      metadataResult.status === 'rejected'
                    ) {
                      throw profileResult.reason || metadataResult.reason;
                    }
                    if (metadataResult.status === 'fulfilled' && metadataResult.value?.error) {
                      if (profileResult.status === 'rejected') throw metadataResult.value.error;
                    }

                    setProfile((current) => ({ ...current, avatarUrl }));
                    clearPhotoPreview();
                    setMsg(
                      pick({
                        en: 'Profile photo updated and saved on every device.',
                        ar: 'تم تحديث الصورة الشخصية وحفظها على جميع الأجهزة.',
                      }),
                    );
                  } catch (error) {
                    setProfile((current) => ({ ...current, avatarUrl: previousAvatar }));
                    clearPhotoPreview();
                    setMsg(
                      error?.message === 'invalid_profile_image'
                        ? pick({
                            en: 'Choose a valid photo under 8 MB. JPG, PNG, WebP, HEIC, and HEIF are supported by compatible devices.',
                            ar: 'اختر صورة صالحة أقل من 8 ميجابايت. يدعم الجهاز الصيغ المتوافقة مثل JPG وPNG وWebP وHEIC وHEIF.',
                          })
                        : errorText(error, lang),
                    );
                  } finally {
                    setBusy(false);
                    input.value = '';
                  }
                }}
              />
            </label>
            <div className="gw-account-who">
              <p className="gw-spec">SHABABUNA ACCOUNT</p>
              <h1 className="gw-account-title">{pick({ en: 'Your account', ar: 'حسابك' })}</h1>
              <p className="gw-account-meta">
                <span className="gw-isolate-ltr">{auth.user.email}</span>
                <span className="gw-account-sync" data-status={data.status}>
                  {data.status}
                </span>
              </p>
            </div>
            <button
              className="gw-btn gw-btn--secondary gw-account-signout"
              onClick={async () => {
                try {
                  await data.flush?.();
                } catch {}
                data.clearAuthenticatedState?.();
                await auth.signOut();
              }}
            >
              {pick({ en: 'Sign out', ar: 'تسجيل الخروج' })}
            </button>
          </div>
          <div className="gw-account-body">
            <nav
              className="gw-account-register"
              aria-label={pick({ en: 'Account sections', ar: 'أقسام الحساب' })}
            >
              {Object.entries(t).map(([k, v], position) => (
                <button
                  key={k}
                  type="button"
                  className={`gw-account-tab${section === k ? ' is-active' : ''}`}
                  aria-current={section === k ? 'page' : undefined}
                  onClick={() => selectSection(k)}
                >
                  <span className="gw-account-tab-index" aria-hidden="true">
                    {String(position + 1).padStart(2, '0')}
                  </span>
                  <span>{v}</span>
                </button>
              ))}
            </nav>
            <div className="gw-account-panel">
              {section === 'overview' && (
                <div className="account-grid">
                  <article>
                    <h2>{pick({ en: 'Cart', ar: 'السلة' })}</h2>
                    <strong>{cart.count}</strong>
                  </article>
                  <article>
                    <h2>{pick({ en: 'Wishlist', ar: 'المفضلة' })}</h2>
                    <strong>{data.wishlist.length}</strong>
                  </article>
                  <article>
                    <h2>{pick({ en: 'Comparisons', ar: 'المقارنات' })}</h2>
                    <strong>{compare.count}</strong>
                  </article>
                  <article>
                    <h2>{pick({ en: 'Orders', ar: 'الطلبات' })}</h2>
                    <strong>{ordersState.orders.length}</strong>
                    <Link to="/order-tracking">
                      {pick({ en: 'View My Orders', ar: 'عرض طلباتي' })}
                    </Link>
                  </article>
                </div>
              )}
              {section === 'orders' && (
                <section aria-labelledby="account-orders-title">
                  <div className="section-heading-row">
                    <h2 id="account-orders-title">
                      {pick({ en: 'Recent Orders', ar: 'الطلبات الأخيرة' })}
                    </h2>
                    {['error', 'partial'].includes(ordersState.state) && (
                      <button
                        className="btn-secondary"
                        onClick={loadOrders}
                        disabled={ordersState.state === 'retrying'}
                      >
                        {ordersState.state === 'retrying'
                          ? pick({ en: 'Retrying…', ar: 'جارٍ إعادة المحاولة…' })
                          : pick({ en: 'Retry', ar: 'إعادة المحاولة' })}
                      </button>
                    )}
                  </div>
                  {ordersState.state === 'loading' && (
                    <p role="status">
                      {pick({ en: 'Loading orders…', ar: 'جاري تحميل الطلبات…' })}
                    </p>
                  )}
                  {ordersState.state === 'partial' && (
                    <div className="notice notice--info" role="status">
                      {pick({
                        en: 'Cloud synchronization is temporarily unavailable. Local orders are shown.',
                        ar: 'المزامنة السحابية غير متاحة مؤقتاً. يتم عرض الطلبات المحلية.',
                      })}
                    </div>
                  )}
                  {ordersState.state === 'error' && (
                    <div className="notice notice--info" role="alert">
                      {pick({ en: 'We could not load your orders.', ar: 'تعذر تحميل طلباتك.' })}
                    </div>
                  )}
                  {!['loading', 'error'].includes(ordersState.state) &&
                    (ordersState.orders.length ? (
                      <div className="orders-list">
                        {ordersState.orders.slice(0, 5).map((order) => (
                          <OrderCard key={order.id} order={order} compact />
                        ))}
                      </div>
                    ) : (
                      <div className="notice notice--muted">
                        {pick({ en: 'No orders yet.', ar: 'لا توجد طلبات حتى الآن.' })}
                      </div>
                    ))}
                  <Link className="btn-secondary" to="/order-tracking">
                    {pick({ en: 'View All Orders', ar: 'عرض كل الطلبات' })}
                  </Link>
                </section>
              )}
              {section === 'workspace' && <OrganizationWorkspace />}
              {section === 'returns' && <ReturnsSection orders={ordersState.orders} />}
              {section === 'special-requests' && <SpecialRequestsSection />}
              {section === 'profile' && (
                <form onSubmit={save} className="account-form">
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
                        {auth.user.email_confirmed_at || auth.user.confirmed_at
                          ? pick({ en: 'Email verified', ar: 'البريد الإلكتروني موثّق' })
                          : pick({ en: 'Email not verified', ar: 'البريد الإلكتروني غير موثّق' })}
                      </strong>
                      {!auth.user.email_confirmed_at && !auth.user.confirmed_at && (
                        <button
                          type="button"
                          className="btn-secondary"
                          disabled={busy || !auth.cloudConfigured}
                          onClick={async () => {
                            setBusy(true);
                            try {
                              const result = await auth.resendVerification(auth.user.email);
                              if (result?.error) throw result.error;
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
                          }}
                        >
                          {pick({ en: 'Verify email', ar: 'توثيق البريد' })}
                        </button>
                      )}
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
                  {profile.accountType === 'organization' && (
                    <div className="organization-signup-fields">
                      <label>
                        {pick({ en: 'Organization name', ar: 'اسم المؤسسة' })}
                        <input
                          required
                          autoComplete="organization"
                          value={profile.organizationName}
                          onChange={(event) =>
                            setProfile({ ...profile, organizationName: event.target.value })
                          }
                        />
                      </label>
                      <label>
                        {pick({ en: 'Organization type', ar: 'نوع المؤسسة' })}
                        <select
                          value={profile.organizationType || 'club'}
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
                  )}
                  <label>
                    {pick({ en: 'First name', ar: 'الاسم الأول' })}
                    <input
                      value={profile.firstName}
                      onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                    />
                  </label>
                  <label>
                    {pick({ en: 'Last name', ar: 'اسم العائلة' })}
                    <input
                      value={profile.lastName}
                      onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                    />
                  </label>
                  <label>
                    {pick({ en: 'Display name', ar: 'الاسم الظاهر' })}
                    <input
                      value={profile.displayName}
                      onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                    />
                  </label>
                  <label>
                    {pick({ en: 'Phone number', ar: 'رقم الهاتف' })}
                    <input
                      type="tel"
                      dir="ltr"
                      autoComplete="tel"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    />
                  </label>
                  {profile.avatarUrl && (
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          const nextProfile = { ...profile, avatarUrl: '', avatar_url: null };
                          const [profileResult, metadataResult] = await Promise.allSettled([
                            data.saveProfile(nextProfile),
                            auth.updateMetadata({ avatar_url: null }),
                          ]);
                          if (
                            profileResult.status === 'rejected' &&
                            metadataResult.status === 'rejected'
                          ) {
                            throw profileResult.reason || metadataResult.reason;
                          }
                          if (
                            metadataResult.status === 'fulfilled' &&
                            metadataResult.value?.error &&
                            profileResult.status === 'rejected'
                          ) {
                            throw metadataResult.value.error;
                          }
                          clearPhotoPreview();
                          setProfile((current) => ({ ...current, avatarUrl: '' }));
                          setMsg(
                            pick({
                              en: 'Profile photo removed on every device.',
                              ar: 'تمت إزالة الصورة الشخصية من جميع الأجهزة.',
                            }),
                          );
                        } catch (error) {
                          setMsg(errorText(error, lang));
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      {pick({ en: 'Remove profile photo', ar: 'إزالة الصورة الشخصية' })}
                    </button>
                  )}
                  <button className="btn-primary" disabled={busy}>
                    {pick({ en: 'Save profile', ar: 'حفظ الملف الشخصي' })}
                  </button>
                </form>
              )}
              {section === 'saved' && (
                <div>
                  <h2>{pick({ en: 'Saved activity', ar: 'النشاط المحفوظ' })}</h2>
                  <p>
                    {pick({
                      en: `${data.wishlist.length} wishlist items, ${data.recentlyViewed.length} recently viewed, ${compare.count} compared.`,
                      ar: `${data.wishlist.length} في المفضلة، ${data.recentlyViewed.length} شوهدت مؤخرًا، ${compare.count} في المقارنة.`,
                    })}
                  </p>
                </div>
              )}
              {section === 'addresses' && (
                <AddressesSection userId={auth.user.id} pick={pick} language={lang} />
              )}{' '}
              {section === 'preferences' && (
                <form onSubmit={save} className="account-form">
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
                      {commerce.preferenceStatus === 'synced'
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
                              : pick({ en: 'Saved locally', ar: 'محفوظ محليًا' })}
                    </span>
                  </div>
                  <label>
                    {pick({ en: 'Preferred size', ar: 'المقاس المفضل' })}
                    <input
                      value={profile.preferredSize}
                      onChange={(e) => setProfile({ ...profile, preferredSize: e.target.value })}
                    />
                  </label>
                  <label className="check-row">
                    <input
                      type="checkbox"
                      checked={profile.marketingConsent}
                      onChange={(e) =>
                        setProfile({ ...profile, marketingConsent: e.target.checked })
                      }
                    />
                    {pick({
                      en: 'Receive academy and product updates',
                      ar: 'استلام تحديثات الأكاديمية والمنتجات',
                    })}
                  </label>
                  <button className="btn-primary">
                    {pick({ en: 'Save preferences', ar: 'حفظ التفضيلات' })}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={data.clearPersonalization}
                  >
                    {pick({ en: 'Clear personalization history', ar: 'مسح سجل التخصيص' })}
                  </button>
                </form>
              )}
              {section === 'security' && <Security auth={auth} pick={pick} lang={lang} />}{' '}
              {msg && (
                <p role="status" aria-live="polite">
                  {msg}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
function Security({ auth, pick, lang }) {
  const [p, setP] = useState(''),
    [busy, setBusy] = useState(false),
    [msg, setMsg] = useState(''),
    [exports, setExports] = useState([]);
  useEffect(() => {
    if (!auth.cloudConfigured) return;
    listPrivacyExports()
      .then(setExports)
      .catch(() => setExports([]));
  }, [auth.cloudConfigured]);
  const change = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await auth.updatePassword(p);
      setP('');
      setMsg(pick({ en: 'Password changed.', ar: 'تم تغيير كلمة المرور.' }));
    } catch (x) {
      setMsg(errorText(x, lang));
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!confirm(pick({ en: 'Permanently delete this account?', ar: 'حذف هذا الحساب نهائيًا؟' })))
      return;
    try {
      await auth.deleteAccount();
    } catch (x) {
      setMsg(x.message);
    }
  };
  return (
    <div className="security-stack">
      <form onSubmit={change}>
        <h2>{pick({ en: 'Change password', ar: 'تغيير كلمة المرور' })}</h2>
        <input
          type="password"
          minLength="8"
          autoComplete="new-password"
          value={p}
          onChange={(e) => setP(e.target.value)}
          required
        />
        <button className="btn-primary" disabled={busy}>
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
          onClick={async () => {
            setBusy(true);
            try {
              await requestPrivacyExport();
              setExports(await listPrivacyExports());
              setMsg(pick({ en: 'Privacy export requested.', ar: 'تم طلب تصدير بياناتك.' }));
            } catch (x) {
              setMsg(errorText(x, lang));
            } finally {
              setBusy(false);
            }
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
                  {new Date(item.created_at).toLocaleDateString(lang === 'ar' ? 'ar-LY' : 'en-US')}
                </time>
                {item.status === 'ready' && item.export_asset_id && (
                  <button
                    type="button"
                    className="btn-secondary compact"
                    onClick={async () => {
                      try {
                        await downloadPrivacyExport(item.export_asset_id);
                      } catch (error) {
                        setMsg(errorText(error, lang));
                      }
                    }}
                  >
                    {pick({ en: 'Download', ar: 'تحميل' })}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      <button className="btn-secondary" onClick={() => auth.signOut('global')}>
        {pick({ en: 'Sign out all devices', ar: 'تسجيل الخروج من جميع الأجهزة' })}
      </button>
      <button className="danger-button" onClick={remove}>
        {pick({ en: 'Delete account', ar: 'حذف الحساب' })}
      </button>
      {msg && <p role="status">{msg}</p>}
    </div>
  );
}

import type { FormEvent, ReactElement, RefObject } from 'react';
import { lazy, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useUserData } from '../context/UserDataContext';
import { useCart } from '../context/CartContext';
import { useCompare } from '../context/CompareContext';
import { useCommerce } from '../context/CommerceContext';
import Seo from '../components/common/Seo';
import '../styles/domain-account.css';
import '../styles/account.css';
import AddressesSection from '../components/account/AddressesSection';
import Avatar from '../components/common/Avatar';
import { errorText, mapError } from '../utils/errors';
import { createProfileImageDataUrl, validateProfileImage } from '../utils/profileImage';
import { getMyOrders } from '../services/orders';
import { safeInternalReturnPath } from '../utils/safeReturnPath';
import AccountRegister from '../components/account/AccountRegister';
import AccountOverview from '../components/account/AccountOverview';
import Icon from '../components/icons/Icon';
import {
  LazyAccountSection,
  SecuritySection,
  OrdersSection,
  ProfileSection,
  PreferencesSection,
  SavedSection,
} from './account/AccountShell';
import { ORGANIZATION_TYPES } from './account/accountConstants';
import '../styles/transact.css';
import '../styles/account-sync.css';
import '../styles/workspace.css';
import '../styles/domain-misc.css';
import '../styles/domain-forms.css';
import '../styles/consumer-commerce.css';

const OrganizationWorkspace = lazy(() => import('../components/account/OrganizationWorkspace'));
const ReturnsSection = lazy(() => import('../components/account/ReturnsSection'));
const SpecialRequestsSection = lazy(() => import('../components/account/SpecialRequestsSection'));

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
const clean = (s: unknown) =>
  String(s || '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, 100);
export default function AccountPage(): ReactElement {
  const { pick, lang } = useLanguage();
  const pickLoose = pick as (value: unknown) => string;
  type AuthLike = {
    user:
      | (Record<string, unknown> & {
          id?: string;
          email?: string;
          user_metadata?: Record<string, unknown>;
        })
      | null;
    session?: { access_token?: string } | null;
    loading?: boolean;
    configured?: boolean;
    signIn: (email: string, password: string) => Promise<unknown>;
    signUp: (email: string, password: string, meta?: Record<string, unknown>) => Promise<unknown>;
    reset: (email: string) => Promise<unknown>;
    updatePassword: (password: string) => Promise<unknown>;
    updateEmail: (email: string) => Promise<unknown>;
    updateMetadata: (meta: Record<string, unknown>) => Promise<unknown>;
    resendVerification: (email?: string) => Promise<unknown>;
    signOut: () => Promise<unknown>;
    cloudConfigured?: boolean;
    [key: string]: unknown;
  };
  type AuthResult = { error?: unknown; data?: { session?: unknown } | null };
  const auth = useAuth() as unknown as AuthLike;
  const data = useUserData() as {
    profile?: Record<string, unknown>;
    wishlist?: unknown[];
    recentlyViewed?: unknown[];
    saveProfile?: (p: Record<string, unknown>) => Promise<unknown>;
    clearPersonalization?: () => void;
    [key: string]: unknown;
  };
  const cart = useCart();
  const compare = useCompare();
  const commerce = useCommerce();
  const profileData = (data.profile || {}) as Record<string, unknown>;
  const meta = (auth.user?.user_metadata || {}) as Record<string, unknown>;
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const returnTo = safeInternalReturnPath(params.get('returnTo'), '');
  const requestedSection = params.get('section') || '';
  const initialSection = ACCOUNT_SECTIONS.includes(requestedSection)
    ? requestedSection
    : 'overview';
  const requestedMode = params.get('mode') || '';
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
    [accountEmail, setAccountEmail] = useState(String(auth.user?.email || '')),
    [show, setShow] = useState(false),
    [busy, setBusy] = useState(false),
    [msg, setMsg] = useState(''),
    [ordersState, setOrdersState] = useState<{
      state: string;
      orders: Array<Record<string, unknown>>;
      error: unknown;
    }>({ state: 'idle', orders: [], error: null }),
    [profile, setProfile] = useState<Record<string, unknown>>(() => ({
      firstName: profileData.first_name || profileData.firstName || meta.first_name || '',
      lastName: profileData.last_name || profileData.lastName || meta.last_name || '',
      displayName:
        profileData.display_name ||
        profileData.displayName ||
        meta.display_name ||
        meta.fullName ||
        '',
      accountType:
        profileData.account_type || profileData.accountType || meta.account_type || 'customer',
      organizationName:
        profileData.organization_name ||
        profileData.organizationName ||
        meta.organization_name ||
        '',
      organizationType:
        profileData.organization_type ||
        profileData.organizationType ||
        meta.organization_type ||
        'club',
      preferredLanguage: profileData.preferred_language || lang,
      preferredSize: profileData.preferred_size || '',
      preferredColors: profileData.preferred_colors || [],
      marketingConsent: Boolean(profileData.marketing_consent),
      phone: meta.phone || '',
      avatarUrl: profileData.avatar_url || profileData.avatarUrl || meta.avatar_url || '',
    }));
  const nameRef = useRef<HTMLInputElement | null>(null),
    organizationRef = useRef<HTMLInputElement | null>(null),
    emailRef = useRef<HTMLInputElement | null>(null),
    passwordRef = useRef<HTMLInputElement | null>(null),
    confirmRef = useRef<HTMLInputElement | null>(null),
    photoRef = useRef<HTMLInputElement | null>(null);
  const focusField = (ref: RefObject<HTMLInputElement | null> | null | undefined) =>
    requestAnimationFrame(() => {
      const node = ref?.current;
      if (!node) return;
      node.focus();
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      node.scrollIntoView?.({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
    });
  useEffect(() => {
    const sectionParam = params.get('section') || '';
    const nextSection = ACCOUNT_SECTIONS.includes(sectionParam) ? sectionParam : 'overview';
    setSection(nextSection);
  }, [params]);
  useEffect(() => {
    const nextMode = params.get('mode') || '';
    if (['signin', 'signup', 'reset', 'reset-password'].includes(nextMode)) setMode(nextMode);
  }, [params]);
  useEffect(() => {
    if (auth.loading || params.get('verified') !== '1') return;
    setMode('signin');
    setVerificationEmail(String(auth.user?.email || ''));
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
    setParams(nextParams);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional dependency scope
  }, [auth.loading, auth.user?.id, params, pick, setParams]);
  useEffect(() => {
    const user = auth.user;
    if (!user) return;
    const userMeta = (user.user_metadata || {}) as Record<string, unknown>;
    setAccountEmail(String(user.email || ''));
    setProfile((current) => ({
      ...current,
      firstName: current.firstName || userMeta.first_name || '',
      lastName: current.lastName || userMeta.last_name || '',
      displayName: current.displayName || userMeta.display_name || userMeta.fullName || '',
      accountType:
        profileData.account_type ||
        profileData.accountType ||
        userMeta.account_type ||
        current.accountType ||
        'customer',
      organizationName:
        profileData.organization_name ||
        profileData.organizationName ||
        userMeta.organization_name ||
        current.organizationName ||
        '',
      organizationType:
        profileData.organization_type ||
        profileData.organizationType ||
        userMeta.organization_type ||
        current.organizationType ||
        'club',
      phone: userMeta.phone || current.phone || '',
      avatarUrl:
        current.avatarUrl ||
        profileData.avatar_url ||
        profileData.avatarUrl ||
        userMeta.avatar_url ||
        '',
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional dependency scope
  }, [auth.user?.id, auth.user?.user_metadata, data?.profile]);
  const selectSection = (nextSection: string) => {
    setSection(nextSection);
    const nextParams = new URLSearchParams(params);
    if (nextSection === 'overview') nextParams.delete('section');
    else nextParams.set('section', nextSection);
    setParams(nextParams);
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
    const ordersResult = await getMyOrders(String(auth.user.id));
    setOrdersState({
      state: String(ordersResult.state || 'error'),
      orders: Array.isArray(ordersResult.orders)
        ? (ordersResult.orders as Array<Record<string, unknown>>)
        : [],
      error: ordersResult.error ?? null,
    });
  };
  useEffect(() => {
    void loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional dependency scope
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
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const fail = (message: string, ref: RefObject<HTMLInputElement | null>) => {
        const error = new Error(message) as Error & {
          fieldRef?: RefObject<HTMLInputElement | null>;
        };
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
      const authResult = (r || {}) as AuthResult;
      if (authResult.error) throw authResult.error;
      if (mode === 'reset-password') setMode('signin');
      if (mode === 'signup' && !authResult.data?.session && auth.cloudConfigured) {
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
      if (returnTo && mode === 'signup' && authResult.data?.session)
        navigate(returnTo, { replace: true });
    } catch (x) {
      const mapped = mapError(x);
      if (mapped.code === 'auth_unverified') setVerificationEmail(email.trim().toLowerCase());
      setMsg(mapped.message[lang] || mapped.message.en);
      const fieldRef = (x as { fieldRef?: RefObject<HTMLInputElement | null> }).fieldRef;
      if (fieldRef) focusField(fieldRef);
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
            <p className="gw-kicker">{pick({ en: 'Built different.', ar: 'مختلفون.' })}</p>
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
            <form
              className="gw-gate-form"
              onSubmit={(event) => {
                void submit(event);
              }}
              noValidate
            >
              <p className="gw-kicker">SHABABUNA ACCOUNT</p>
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
                      onChange={(e) => {
                        void (async () => {
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
                        })();
                      }}
                    />
                  </label>
                  {photoPreview && (
                    <div className="profile-photo-preview">
                      <img
                        src={photoPreview}
                        alt={pick({ en: 'Profile preview', ar: 'معاينة الصورة الشخصية' })}
                        width={320}
                        height={320}
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
                      minLength={8}
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
                      <Icon name={show ? 'eyeOff' : 'eye'} size={20} />
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
                    minLength={8}
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
                      onClick={() => {
                        void (async () => {
                          setBusy(true);
                          try {
                            const result = (await auth.resendVerification(
                              verificationEmail,
                            )) as AuthResult;
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
                        })();
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
  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    try {
      await data.saveProfile?.({
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
      const metadataResult = (await auth.updateMetadata({
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
      })) as AuthResult;
      if (metadataResult?.error) throw metadataResult.error;
      const normalizedAccountEmail = accountEmail.trim().toLowerCase();
      if (normalizedAccountEmail && normalizedAccountEmail !== String(auth.user?.email || '')) {
        const emailResult = (await auth.updateEmail(normalizedAccountEmail)) as AuthResult;
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
      const fieldRef = (x as { fieldRef?: RefObject<HTMLInputElement | null> }).fieldRef;
      if (fieldRef) focusField(fieldRef);
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
                name={String(
                  profile.displayName ||
                    `${String(profile.firstName || '')} ${String(profile.lastName || '')}`.trim() ||
                    auth.user?.email ||
                    '',
                )}
                src={String(photoPreview || profile.avatarUrl || '')}
                size="large"
              />
              <span>{pick({ en: 'Change photo', ar: 'تغيير الصورة' })}</span>
              <input
                type="file"
                accept="image/*"
                disabled={busy}
                aria-label={pick({ en: 'Choose profile photo', ar: 'اختر صورة شخصية' })}
                onChange={(event) => {
                  void (async () => {
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
                    const saveProfile = data.saveProfile;
                    if (!saveProfile) throw new Error('profile_save_unavailable');
                    const [profileResult, metadataResult] = await Promise.allSettled([
                      saveProfile(nextProfile),
                      auth.updateMetadata({ avatar_url: avatarUrl }),
                    ]);
                    if (
                      profileResult.status === 'rejected' &&
                      metadataResult.status === 'rejected'
                    ) {
                      throw profileResult.reason || metadataResult.reason;
                    }
                    if (metadataResult.status === 'fulfilled') {
                      const metaValue = metadataResult.value as AuthResult;
                      if (metaValue?.error && profileResult.status === 'rejected') {
                        throw metaValue.error;
                      }
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
                      error instanceof Error && error.message === 'invalid_profile_image'
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
                  })();
                }}
              />
            </label>
            <div className="gw-account-who">
              <p className="gw-kicker">SHABABUNA ACCOUNT</p>
              <h1 className="gw-account-title">{pick({ en: 'Your account', ar: 'حسابك' })}</h1>
              <p className="gw-account-meta">
                <span className="gw-isolate-ltr">{String(auth.user?.email || '')}</span>
                <span className="gw-account-sync" data-status={String(data.status || '')}>
                  {String(data.status || '')}
                </span>
              </p>
            </div>
            <button
              className="gw-btn gw-btn--secondary gw-account-signout"
              onClick={() => {
                void (async () => {
                  try {
                    const flush = data.flush as (() => Promise<unknown>) | undefined;
                    if (flush) await flush();
                  } catch {
                    /* ignore */
                  }
                  const clear = data.clearAuthenticatedState as (() => void) | undefined;
                  clear?.();
                  await auth.signOut();
                })();
              }}
            >
              {pick({ en: 'Sign out', ar: 'تسجيل الخروج' })}
            </button>
          </div>
          <div className="gw-account-body">
            <AccountRegister sections={t} section={section} selectSection={selectSection} />
            <div className="gw-account-panel">
              {section === 'overview' && (
                <AccountOverview
                  cartCount={Number(cart.count) || 0}
                  wishlistCount={(data.wishlist || []).length}
                  compareCount={Number(compare.count) || 0}
                  ordersCount={ordersState.orders.length}
                />
              )}
              {section === 'orders' && (
                <LazyAccountSection>
                  <OrdersSection
                    pick={pickLoose}
                    ordersState={ordersState}
                    loadOrders={() => {
                      void loadOrders();
                    }}
                  />
                </LazyAccountSection>
              )}
              {section === 'workspace' && (
                <LazyAccountSection>
                  <OrganizationWorkspace />
                </LazyAccountSection>
              )}
              {section === 'returns' && (
                <LazyAccountSection>
                  <ReturnsSection orders={ordersState.orders} />
                </LazyAccountSection>
              )}
              {section === 'special-requests' && (
                <LazyAccountSection>
                  <SpecialRequestsSection />
                </LazyAccountSection>
              )}
              {section === 'profile' && (
                <LazyAccountSection>
                  <ProfileSection
                    pick={pickLoose}
                    lang={lang}
                    auth={auth}
                    profile={profile}
                    setProfile={setProfile}
                    accountEmail={accountEmail}
                    setAccountEmail={setAccountEmail}
                    busy={busy}
                    setBusy={setBusy}
                    setMsg={setMsg}
                    save={save}
                    clearPhotoPreview={clearPhotoPreview}
                    data={data}
                  />
                </LazyAccountSection>
              )}
              {section === 'saved' && (
                <LazyAccountSection>
                  <SavedSection
                    pick={pickLoose}
                    wishlistCount={(data.wishlist || []).length}
                    recentlyViewedCount={(data.recentlyViewed || []).length}
                    compareCount={Number(compare.count) || 0}
                  />
                </LazyAccountSection>
              )}
              {section === 'addresses' && (
                <AddressesSection
                  userId={String(auth.user?.id || '')}
                  pick={pickLoose}
                  language={lang}
                />
              )}{' '}
              {section === 'preferences' && (
                <LazyAccountSection>
                  <PreferencesSection
                    pick={pickLoose}
                    profile={profile}
                    setProfile={setProfile}
                    save={save}
                    commerce={commerce}
                    data={data}
                  />
                </LazyAccountSection>
              )}
              {section === 'security' && (
                <LazyAccountSection>
                  <SecuritySection auth={auth} pick={pickLoose} lang={lang} />
                </LazyAccountSection>
              )}
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

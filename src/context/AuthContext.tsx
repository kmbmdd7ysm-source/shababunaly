import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import {
  authRedirectUrl,
  completeAuthRedirect,
  getSupabase,
  getSupabaseConfigStatus,
} from '../services/supabase.ts';
import { reportClientError } from '../services/telemetry.ts';

export type AuthUser = User | (Record<string, unknown> & { id: string; email?: string });
export type AuthContextValue = {
  user: AuthUser | null;
  session: Session | Record<string, unknown> | null;
  loading: boolean;
  cloudConfigured: boolean;
  configStatus: ReturnType<typeof getSupabaseConfigStatus>;
  [key: string]: unknown;
};

const C = createContext<AuthContextValue | null>(null);
const LOCAL_SESSION_KEY = 'shababuna-local-session-v1';
// Keep account creation/sign-in usable even when the optional cloud identity
// backend is not configured. Cloud auth remains preferred whenever available.
const allowLocalAuth = true;

const readJson = (key: string, fallback: unknown = null): unknown => {
  try {
    return JSON.parse(localStorage.getItem(key) || '') || fallback;
  } catch {
    return fallback;
  }
};
const normalizeEmail = (email: unknown): string =>
  String(email || '')
    .trim()
    .toLowerCase();
const cloudError = () =>
  new Error('Account service is temporarily unavailable. Please try again shortly.');
const isTransientAuthError = (error: unknown): boolean => {
  const message = String(
    (error && typeof error === 'object' && 'message' in error
      ? (error as { message?: unknown }).message
      : error) || '',
  ).toLowerCase();
  return (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('timeout') ||
    message.includes('temporarily unavailable')
  );
};

export function AuthProvider({ children }: { children?: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [cloudConfigured, setCloudConfigured] = useState(false);
  const [configStatus, setConfigStatus] = useState(getSupabaseConfigStatus());

  useEffect(() => {
    let sub: { unsubscribe: () => void } | undefined;
    let alive = true;
    let started = false;

    const onBootstrapEvent = () => {
      void startBootstrap();
    };

    const removeBootstrapListeners = () => {
      globalThis.removeEventListener?.('pointerdown', onBootstrapEvent);
      globalThis.removeEventListener?.('touchstart', onBootstrapEvent);
      globalThis.removeEventListener?.('keydown', onBootstrapEvent);
      globalThis.removeEventListener?.('lha:auth-needed', onBootstrapEvent);
    };

    async function startBootstrap() {
      if (started || !alive) return;
      started = true;
      removeBootstrapListeners();
      try {
        const s = await getSupabase();
        if (!alive) return;
        setCloudConfigured(Boolean(s));
        setConfigStatus(getSupabaseConfigStatus());

        if (!s) {
          try {
            const response = await fetch('/api/customer-auth', {
              method: 'GET',
              credentials: 'same-origin',
              headers: { Accept: 'application/json' },
              cache: 'no-store',
            });
            const payload = (await response.json().catch(() => ({}))) as {
              ok?: boolean;
              user?: AuthUser | null;
              session?: Record<string, unknown> | null;
            };
            if (response.ok && payload.ok) {
              setCloudConfigured(true);
              setSession(payload.session || null);
              setUser(payload.user || null);
              return;
            }
          } catch {
            // A previous local development account can still open while the
            // native account service is temporarily unreachable.
          }
          if (allowLocalAuth) {
            const saved = readJson(LOCAL_SESSION_KEY, null) as { user?: AuthUser } | null;
            if (saved?.user) {
              setSession(saved);
              setUser(saved.user);
            }
          }
          return;
        }

        try {
          const callback = await completeAuthRedirect(s);
          if (callback.error) throw callback.error;
        } catch (error) {
          reportClientError(error, { source: 'auth_callback' });
        }

        const { data, error } = await s.auth.getSession();
        if (error) reportClientError(error, { source: 'auth_session' });
        if (!alive) return;
        setSession(data.session || null);
        setUser(data.session?.user || null);

        sub = s.auth.onAuthStateChange((_event, next) => {
          setSession(next);
          setUser(next?.user || null);
          setLoading(false);
        }).data.subscription;
      } finally {
        if (alive) setLoading(false);
      }
    }

    const location = globalThis.location;
    const path = location?.pathname || '/';
    const directAuthRoute = /^\/(account|checkout|orders|order-tracking)(?:\/|$)/.test(path);
    const authCallback = Boolean(
      location &&
      (/[#?](?:access_token|refresh_token|code|token_hash|error)=/.test(
        `${location.search}${location.hash}`,
      ) ||
        new URLSearchParams(location.search).has('verified')),
    );
    let storedCloudSession = false;
    try {
      storedCloudSession = Boolean(globalThis.localStorage?.getItem('shababuna-auth-session-v1'));
    } catch {
      storedCloudSession = false;
    }

    if (directAuthRoute || authCallback || storedCloudSession) {
      void startBootstrap();
    } else {
      // Anonymous visitors do not need the authentication SDK or its network
      // requests for the first home-page paint. The first real interaction
      // starts it before any account navigation can complete.
      setLoading(false);
      const options = { once: true, passive: true };
      globalThis.addEventListener?.('pointerdown', onBootstrapEvent, options);
      globalThis.addEventListener?.('touchstart', onBootstrapEvent, options);
      globalThis.addEventListener?.('keydown', onBootstrapEvent, { once: true });
      globalThis.addEventListener?.('lha:auth-needed', onBootstrapEvent, { once: true });
    }

    return () => {
      alive = false;
      removeBootstrapListeners();
      sub?.unsubscribe();
    };
  }, []);

  const client = useCallback(async () => await getSupabase(), []);

  const nativeAuth = useCallback(
    async (body?: Record<string, unknown>) => {
      const response = await fetch('/api/customer-auth', {
        method: body ? 'POST' : 'GET',
        credentials: 'same-origin',
        headers: body
          ? { 'Content-Type': 'application/json', Accept: 'application/json' }
          : { Accept: 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}),
        cache: 'no-store',
      });
      const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (!response.ok) {
        const code = String(payload.error || `account_api_${response.status}`);
        const messages: Record<string, string> = {
          invalid_credentials: 'Invalid email or password.',
          email_exists: 'An account with this email already exists.',
          invalid_signup: 'Check your email and choose a password with at least 8 characters.',
          weak_password: 'Choose a stronger password with at least 8 characters.',
          invalid_email: 'Enter a valid email address.',
          authentication_required: 'Sign in first.',
        };
        throw new Error(messages[code] || 'Account service is temporarily unavailable. Please try again shortly.');
      }
      return payload;
    },
    [],
  );

  const localSignUp = useCallback(
    async (email: string, password: string, metadata: Record<string, unknown> = {}) => {
      try {
        const payload = await nativeAuth({
          action: 'signup',
          email: normalizeEmail(email),
          password,
          metadata,
        });
        const result = (payload.data || {}) as {
          user?: AuthUser;
          session?: Record<string, unknown>;
        };
        setCloudConfigured(true);
        setUser(result.user || null);
        setSession(result.session || null);
        localStorage.removeItem(LOCAL_SESSION_KEY);
        return { data: result, error: null };
      } catch (error) {
        return { data: null, error };
      }
    },
    [nativeAuth],
  );

  const localSignIn = useCallback(
    async (email: string, password: string) => {
      try {
        const payload = await nativeAuth({
          action: 'signin',
          email: normalizeEmail(email),
          password,
        });
        const result = (payload.data || {}) as {
          user?: AuthUser;
          session?: Record<string, unknown>;
        };
        setCloudConfigured(true);
        setUser(result.user || null);
        setSession(result.session || null);
        localStorage.removeItem(LOCAL_SESSION_KEY);
        return { data: result, error: null };
      } catch (error) {
        return { data: null, error };
      }
    },
    [nativeAuth],
  );

  const api = useMemo(
    () => ({
      user,
      session,
      loading,
      configured: cloudConfigured || allowLocalAuth,
      cloudConfigured,
      configStatus,
      signIn: async (email: string, password: string) => {
        const s = await client();
        if (!s && !allowLocalAuth) return { data: null, error: cloudError() };
        return s
          ? s.auth.signInWithPassword({ email: normalizeEmail(email), password })
          : localSignIn(email, password);
      },
      signUp: async (email: string, password: string, metadata: Record<string, unknown> = {}) => {
        const s = await client();
        if (!s && !allowLocalAuth) return { data: null, error: cloudError() };
        if (!s) return localSignUp(email, password, metadata);

        const normalizedEmail = normalizeEmail(email);
        const normalizedName = String(
          metadata.full_name || metadata.fullName || metadata.display_name || metadata.name || '',
        )
          .trim()
          .slice(0, 100);
        const requestedAccountType =
          String(metadata.account_type || '').trim() === 'organization'
            ? 'organization'
            : 'customer';
        const allowedOrganizationTypes = new Set([
          'club',
          'academy',
          'federation',
          'school_university',
          'wholesale',
          'distributor',
        ]);
        const requestedOrganizationType = String(metadata.organization_type || '').trim();
        const safeMetadata = {
          first_name: String(metadata.first_name || '')
            .trim()
            .slice(0, 80),
          last_name: String(metadata.last_name || '')
            .trim()
            .slice(0, 80),
          display_name: normalizedName,
          fullName: normalizedName,
          account_type: requestedAccountType,
          organization_name:
            requestedAccountType === 'organization'
              ? String(metadata.organization_name || '')
                  .trim()
                  .slice(0, 160)
              : '',
          organization_type:
            requestedAccountType === 'organization' &&
            allowedOrganizationTypes.has(requestedOrganizationType)
              ? requestedOrganizationType
              : '',
        };
        let lastResult;

        for (let attempt = 0; attempt < 3; attempt += 1) {
          lastResult = await s.auth.signUp({
            email: normalizedEmail,
            password,
            options: {
              data: safeMetadata,
              emailRedirectTo: authRedirectUrl('confirm'),
            },
          });

          if (!lastResult?.error) {
            const identities = lastResult?.data?.user?.identities;
            if (Array.isArray(identities) && identities.length === 0) {
              return {
                data: lastResult.data,
                error: new Error('An account with this email already exists.'),
              };
            }
            return lastResult;
          }

          if (!isTransientAuthError(lastResult.error) || attempt === 2) return lastResult;
          await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
        }
        return lastResult;
      },
      resendVerification: async (email: string) => {
        const s = await client();
        if (!s) return { data: {}, error: null };
        return s.auth.resend({
          type: 'signup',
          email: normalizeEmail(email),
          options: { emailRedirectTo: authRedirectUrl('confirm') },
        });
      },
      updateMetadata: async (metadata: Record<string, unknown> = {}) => {
        const s = await client();
        if (s) return s.auth.updateUser({ data: metadata });
        try {
          const payload = await nativeAuth({ action: 'metadata', metadata });
          const data = (payload.data || {}) as { user?: AuthUser };
          if (data.user) setUser(data.user);
          setCloudConfigured(true);
          return { data, error: null };
        } catch (error) {
          return { data: null, error };
        }
      },
      reset: async (email: string) => {
        const s = await client();
        if (s) {
          return s.auth.resetPasswordForEmail(normalizeEmail(email), {
            redirectTo: authRedirectUrl('recovery'),
          });
        }
        try {
          await nativeAuth({ action: 'reset', email: normalizeEmail(email) });
          return { data: { manual: true }, error: null };
        } catch (error) {
          return { data: null, error };
        }
      },
      updatePassword: async (password: string) => {
        const s = await client();
        if (s) return s.auth.updateUser({ password });
        try {
          const payload = await nativeAuth({ action: 'password', password });
          return { data: payload.data || { user }, error: null };
        } catch (error) {
          return { data: null, error };
        }
      },
      updateEmail: async (email: string) => {
        const s = await client();
        if (s) return s.auth.updateUser({ email: normalizeEmail(email) });
        try {
          const payload = await nativeAuth({ action: 'email', email: normalizeEmail(email) });
          const data = (payload.data || {}) as { user?: AuthUser };
          if (data.user) setUser(data.user);
          setCloudConfigured(true);
          return { data, error: null };
        } catch (error) {
          return { data: null, error };
        }
      },
      signOut: async (scope?: string) => {
        const s = await client();
        if (s)
          return s.auth.signOut(
            scope ? ({ scope } as { scope: 'global' | 'local' | 'others' }) : undefined,
          );
        try {
          await nativeAuth({ action: 'signout' });
        } catch {
          // Clear the browser state even if the server is temporarily unreachable.
        }
        localStorage.removeItem(LOCAL_SESSION_KEY);
        setUser(null);
        setSession(null);
        return { error: null };
      },
      deleteAccount: async () => {
        const s = await client();
        if (s) {
          const { error } = await s.rpc('delete_own_account');
          if (error) throw error;
          await s.auth.signOut();
          return;
        }
        await nativeAuth({ action: 'delete' });
        localStorage.removeItem(LOCAL_SESSION_KEY);
        setUser(null);
        setSession(null);
      },
      refresh: async () => {
        const s = await client();
        if (s) {
          const { data, error } = await s.auth.refreshSession();
          if (error) throw error;
          return data;
        }
        const payload = await nativeAuth();
        const nextUser = (payload.user || null) as AuthUser | null;
        const nextSession = (payload.session || null) as Record<string, unknown> | null;
        setUser(nextUser);
        setSession(nextSession);
        setCloudConfigured(true);
        return { session: nextSession, user: nextUser };
      },
      listMfaFactors: async () => {
        const s = await client();
        if (!s) throw cloudError();
        const [{ data: factors, error: factorsError }, { data: aal, error: aalError }] =
          await Promise.all([
            s.auth.mfa.listFactors(),
            s.auth.mfa.getAuthenticatorAssuranceLevel(),
          ]);
        if (factorsError) throw factorsError;
        if (aalError) throw aalError;
        return { factors: factors?.totp || [], aal };
      },
      enrollMfaTotp: async (friendlyName = 'SHABABUNA Authenticator') => {
        const s = await client();
        if (!s) throw cloudError();
        const { data, error } = await s.auth.mfa.enroll({ factorType: 'totp', friendlyName });
        if (error) throw error;
        return data;
      },
      verifyMfaTotp: async (factorId: string, code: string) => {
        const s = await client();
        if (!s) throw cloudError();
        const { data, error } = await s.auth.mfa.challengeAndVerify({
          factorId,
          code: String(code || '')
            .replace(/\D/g, '')
            .slice(0, 6),
        });
        if (error) throw error;
        const refreshed = await s.auth.refreshSession();
        if (refreshed.error) throw refreshed.error;
        setSession(refreshed.data.session || null);
        setUser(refreshed.data.user || refreshed.data.session?.user || null);
        return data;
      },
      unenrollMfaFactor: async (factorId: string) => {
        const s = await client();
        if (!s) throw cloudError();
        const { data, error } = await s.auth.mfa.unenroll({ factorId });
        if (error) throw error;
        return data;
      },
    }) as AuthContextValue,
    [user, session, loading, cloudConfigured, configStatus, client, localSignIn, localSignUp, nativeAuth],
  );

  return <C.Provider value={api}>{children}</C.Provider>;
}

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(C);
  if (!ctx) {
    return {
      user: null,
      session: null,
      loading: true,
      cloudConfigured: false,
      configStatus: getSupabaseConfigStatus(),
    };
  }
  return ctx;
};

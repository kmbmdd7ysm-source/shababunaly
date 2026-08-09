import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  authRedirectUrl,
  completeAuthRedirect,
  getSupabase,
  getSupabaseConfigStatus,
} from '../services/supabase';
import { reportClientError } from '../services/telemetry';

const C = createContext(null);
const LOCAL_ACCOUNTS_KEY = 'shababuna-local-accounts-v1';
const LOCAL_SESSION_KEY = 'shababuna-local-session-v1';
const allowLocalAuth =
  import.meta.env.DEV || ['localhost', '127.0.0.1'].includes(globalThis.location?.hostname || '');

const readJson = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key) || '') || fallback;
  } catch {
    return fallback;
  }
};
const writeJson = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const localUser = (record) => ({
  id: record.id,
  email: record.email,
  email_confirmed_at: record.emailConfirmedAt || null,
  confirmed_at: record.emailConfirmedAt || null,
  user_metadata: record.metadata || {},
  app_metadata: { provider: 'local' },
});
const normalizeEmail = (email) =>
  String(email || '')
    .trim()
    .toLowerCase();
const cloudError = () =>
  new Error(
    'Account service is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel Environment Variables.',
  );
const isTransientAuthError = (error) => {
  const message = String(error?.message || error || '').toLowerCase();
  return (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('timeout') ||
    message.includes('temporarily unavailable')
  );
};

async function hashPassword(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cloudConfigured, setCloudConfigured] = useState(false);
  const [configStatus, setConfigStatus] = useState(getSupabaseConfigStatus());

  useEffect(() => {
    let sub;
    let alive = true;
    let started = false;

    const removeBootstrapListeners = () => {
      globalThis.removeEventListener?.('pointerdown', startBootstrap);
      globalThis.removeEventListener?.('touchstart', startBootstrap);
      globalThis.removeEventListener?.('keydown', startBootstrap);
      globalThis.removeEventListener?.('lha:auth-needed', startBootstrap);
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
          if (allowLocalAuth) {
            const saved = readJson(LOCAL_SESSION_KEY, null);
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
      globalThis.addEventListener?.('pointerdown', startBootstrap, options);
      globalThis.addEventListener?.('touchstart', startBootstrap, options);
      globalThis.addEventListener?.('keydown', startBootstrap, { once: true });
      globalThis.addEventListener?.('lha:auth-needed', startBootstrap, { once: true });
    }

    return () => {
      alive = false;
      removeBootstrapListeners();
      sub?.unsubscribe();
    };
  }, []);

  const client = useCallback(async () => await getSupabase(), []);

  const localSignUp = useCallback(async (email, password, metadata = {}) => {
    const normalized = normalizeEmail(email);
    const accounts = readJson(LOCAL_ACCOUNTS_KEY, []);
    if (accounts.some((item) => item.email === normalized)) {
      return { data: null, error: new Error('An account with this email already exists.') };
    }
    const record = {
      id: crypto.randomUUID?.() || `local-${Date.now()}`,
      email: normalized,
      passwordHash: await hashPassword(password),
      metadata,
      createdAt: new Date().toISOString(),
    };
    writeJson(LOCAL_ACCOUNTS_KEY, [...accounts, record]);
    const nextUser = localUser(record);
    const nextSession = { user: nextUser, access_token: `local-${record.id}` };
    writeJson(LOCAL_SESSION_KEY, nextSession);
    setUser(nextUser);
    setSession(nextSession);
    return { data: { user: nextUser, session: nextSession }, error: null };
  }, []);

  const localSignIn = useCallback(async (email, password) => {
    const normalized = normalizeEmail(email);
    const accounts = readJson(LOCAL_ACCOUNTS_KEY, []);
    const record = accounts.find((item) => item.email === normalized);
    if (!record || record.passwordHash !== (await hashPassword(password))) {
      return { data: null, error: new Error('Invalid email or password.') };
    }
    const nextUser = localUser(record);
    const nextSession = { user: nextUser, access_token: `local-${record.id}` };
    writeJson(LOCAL_SESSION_KEY, nextSession);
    setUser(nextUser);
    setSession(nextSession);
    return { data: { user: nextUser, session: nextSession }, error: null };
  }, []);

  const api = useMemo(
    () => ({
      user,
      session,
      loading,
      configured: cloudConfigured || allowLocalAuth,
      cloudConfigured,
      configStatus,
      signIn: async (email, password) => {
        const s = await client();
        if (!s && !allowLocalAuth) return { data: null, error: cloudError() };
        return s
          ? s.auth.signInWithPassword({ email: normalizeEmail(email), password })
          : localSignIn(email, password);
      },
      signUp: async (email, password, metadata = {}) => {
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
      resendVerification: async (email) => {
        const s = await client();
        if (!s) {
          return allowLocalAuth ? { data: {}, error: null } : { data: null, error: cloudError() };
        }
        return s.auth.resend({
          type: 'signup',
          email: normalizeEmail(email),
          options: { emailRedirectTo: authRedirectUrl('confirm') },
        });
      },
      updateMetadata: async (metadata = {}) => {
        const s = await client();
        if (s) return s.auth.updateUser({ data: metadata });
        if (!allowLocalAuth) return { data: null, error: cloudError() };
        if (!user?.email) return { data: null, error: new Error('Sign in first.') };
        const accounts = readJson(LOCAL_ACCOUNTS_KEY, []);
        let updatedRecord = null;
        const updated = accounts.map((item) => {
          if (item.email !== user.email) return item;
          updatedRecord = { ...item, metadata: { ...(item.metadata || {}), ...metadata } };
          return updatedRecord;
        });
        writeJson(LOCAL_ACCOUNTS_KEY, updated);
        const nextUser = localUser(updatedRecord || { email: user.email, metadata });
        const nextSession = { ...(session || {}), user: nextUser };
        writeJson(LOCAL_SESSION_KEY, nextSession);
        setUser(nextUser);
        setSession(nextSession);
        return { data: { user: nextUser }, error: null };
      },
      reset: async (email) => {
        const s = await client();
        if (s) {
          return s.auth.resetPasswordForEmail(normalizeEmail(email), {
            redirectTo: authRedirectUrl('recovery'),
          });
        }
        if (!allowLocalAuth) return { data: null, error: cloudError() };
        const exists = readJson(LOCAL_ACCOUNTS_KEY, []).some(
          (item) => item.email === normalizeEmail(email),
        );
        return exists
          ? { data: {}, error: null }
          : { data: null, error: new Error('No account was found for this email.') };
      },
      updatePassword: async (password) => {
        const s = await client();
        if (s) return s.auth.updateUser({ password });
        if (!allowLocalAuth) return { data: null, error: cloudError() };
        if (!user?.email) return { data: null, error: new Error('Sign in first.') };
        const accounts = readJson(LOCAL_ACCOUNTS_KEY, []);
        const updated = await Promise.all(
          accounts.map(async (item) =>
            item.email === user.email
              ? { ...item, passwordHash: await hashPassword(password) }
              : item,
          ),
        );
        writeJson(LOCAL_ACCOUNTS_KEY, updated);
        return { data: { user }, error: null };
      },
      updateEmail: async (email) => {
        const s = await client();
        if (s) return s.auth.updateUser({ email: normalizeEmail(email) });
        if (!allowLocalAuth) return { data: null, error: cloudError() };
        if (!user?.email) return { data: null, error: new Error('Sign in first.') };
        const normalized = normalizeEmail(email);
        const accounts = readJson(LOCAL_ACCOUNTS_KEY, []);
        if (accounts.some((item) => item.email === normalized && item.email !== user.email)) {
          return { data: null, error: new Error('An account with this email already exists.') };
        }
        let updatedRecord = null;
        const updated = accounts.map((item) => {
          if (item.email !== user.email) return item;
          updatedRecord = { ...item, email: normalized, emailConfirmedAt: null };
          return updatedRecord;
        });
        writeJson(LOCAL_ACCOUNTS_KEY, updated);
        const nextUser = localUser(updatedRecord);
        const nextSession = { ...(session || {}), user: nextUser };
        writeJson(LOCAL_SESSION_KEY, nextSession);
        setUser(nextUser);
        setSession(nextSession);
        return { data: { user: nextUser }, error: null };
      },
      signOut: async (scope) => {
        const s = await client();
        if (s) return s.auth.signOut(scope ? { scope } : undefined);
        if (!allowLocalAuth) return { error: cloudError() };
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
        if (!allowLocalAuth) throw cloudError();
        writeJson(
          LOCAL_ACCOUNTS_KEY,
          readJson(LOCAL_ACCOUNTS_KEY, []).filter((item) => item.email !== user?.email),
        );
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
        if (!allowLocalAuth) throw cloudError();
        return { session, user };
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
      verifyMfaTotp: async (factorId, code) => {
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
      unenrollMfaFactor: async (factorId) => {
        const s = await client();
        if (!s) throw cloudError();
        const { data, error } = await s.auth.mfa.unenroll({ factorId });
        if (error) throw error;
        return data;
      },
    }),
    [user, session, loading, cloudConfigured, configStatus, client, localSignIn, localSignUp],
  );

  return <C.Provider value={api}>{children}</C.Provider>;
}

export const useAuth = () => useContext(C);

import type { SupabaseClient } from '@supabase/supabase-js';

type RuntimeConfig = { url: string; key: string };
type ConfigStatus = {
  checked: boolean;
  configured: boolean;
  source: 'none' | 'runtime' | 'build' | 'timeout' | 'error';
};

let clientPromise: Promise<SupabaseClient> | undefined;
let configPromise: Promise<RuntimeConfig | null> | undefined;
const defaultClientFactory = () => import('@supabase/supabase-js');
let clientFactory: () => Promise<typeof import('@supabase/supabase-js')> = defaultClientFactory;
let buildEnvOverride: Record<string, string> | undefined;
let configStatus: ConfigStatus = { checked: false, configured: false, source: 'none' };

const CLIENT_OPTIONS = Object.freeze({
  auth: Object.freeze({
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: 'implicit' as const,
    storageKey: 'shababuna-auth-session-v1',
  }),
  global: Object.freeze({ headers: Object.freeze({ 'X-Client-Info': 'shababuna-web/1.0.0' }) }),
});

const clean = (value: unknown): string => String(value ?? '').trim();
const first = (...values: unknown[]): string => values.map(clean).find(Boolean) ?? '';

function validConfig(url: string, key: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'https:' &&
      /\.supabase\.(co|in)$/.test(parsed.hostname) &&
      key.length > 20
    );
  } catch {
    return false;
  }
}

async function readRuntimeConfig(): Promise<RuntimeConfig | null> {
  const init: RequestInit = {
    cache: 'no-store',
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  };
  if (typeof AbortSignal?.timeout === 'function') init.signal = AbortSignal.timeout(6000);
  const response = await fetch(`/api/public-config?t=${Date.now()}`, init);
  if (!response.ok) return null;
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) return null;
  const data = (await response.json()) as Record<string, unknown>;
  const url = first(data?.supabaseUrl, data?.url);
  const key = first(
    data?.supabaseAnonKey,
    data?.supabasePublishableKey,
    data?.publishableKey,
    data?.anonKey,
  );
  return validConfig(url, key) ? { url, key } : null;
}

async function resolveRuntimeConfig(): Promise<RuntimeConfig | null> {
  try {
    const config = await readRuntimeConfig();
    configStatus = {
      checked: true,
      configured: Boolean(config),
      source: config ? 'runtime' : 'none',
    };
    return config;
  } catch (error) {
    const name =
      error && typeof error === 'object' && 'name' in error
        ? String((error as { name?: unknown }).name)
        : '';
    configStatus = {
      checked: true,
      configured: false,
      source: name === 'AbortError' || name === 'TimeoutError' ? 'timeout' : 'error',
    };
    return null;
  }
}

async function resolveConfig(): Promise<RuntimeConfig | null> {
  const env = (buildEnvOverride ??
    (import.meta as ImportMeta & { env?: Record<string, string> }).env ??
    {}) as Record<string, string>;
  const buildUrl = first(
    env.VITE_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.PUBLIC_SUPABASE_URL,
  );
  const buildKey = first(
    env.VITE_SUPABASE_ANON_KEY,
    env.VITE_SUPABASE_PUBLISHABLE_KEY,
    env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    env.PUBLIC_SUPABASE_ANON_KEY,
    env.PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  if (validConfig(buildUrl, buildKey)) {
    configStatus = { checked: true, configured: true, source: 'build' };
    return { url: buildUrl, key: buildKey };
  }
  if (!configPromise) configPromise = resolveRuntimeConfig();
  return configPromise;
}

async function createConfiguredClient(config: RuntimeConfig): Promise<SupabaseClient> {
  const module = await clientFactory();
  return module.createClient(config.url, config.key, CLIENT_OPTIONS);
}

export function getSupabaseConfigStatus(): ConfigStatus {
  return { ...configStatus };
}

export async function getSupabase(): Promise<SupabaseClient | null> {
  const config = await resolveConfig();
  if (!config) return null;
  if (!clientPromise) clientPromise = createConfiguredClient(config);
  return clientPromise;
}

export function authRedirectUrl(mode = 'confirm'): string {
  const url = new URL('/account', globalThis.location?.origin ?? 'https://shababuna.ly');
  if (mode === 'recovery') url.searchParams.set('mode', 'reset-password');
  else url.searchParams.set('verified', '1');
  return url.toString();
}

function cleanAuthRedirectUrl(url: URL): void {
  for (const key of [
    'code',
    'token_hash',
    'type',
    'error',
    'error_code',
    'error_description',
    'access_token',
    'refresh_token',
    'expires_in',
    'expires_at',
  ])
    url.searchParams.delete(key);
  url.hash = '';
  globalThis.history?.replaceState(
    {},
    globalThis.document?.title ?? '',
    `${url.pathname}${url.search}`,
  );
}

export async function completeAuthRedirect(client: SupabaseClient | null | undefined): Promise<{
  handled: boolean;
  data: unknown;
  error: Error | null;
}> {
  if (!client || !globalThis.location) return { handled: false, data: null, error: null };
  const url = new URL(globalThis.location.href);
  const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
  const callbackError =
    url.searchParams.get('error_description') ??
    url.searchParams.get('error') ??
    hash.get('error_description') ??
    hash.get('error');
  if (callbackError) {
    cleanAuthRedirectUrl(url);
    return { handled: true, data: null, error: new Error(callbackError) };
  }
  const accessToken = hash.get('access_token');
  const refreshToken = hash.get('refresh_token');
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const rawType = url.searchParams.get('type');
  const type = rawType === 'signup' || rawType === 'magiclink' ? 'email' : rawType;
  let result: { handled: boolean; data: unknown; error: Error | null } = {
    handled: false,
    data: null,
    error: null,
  };
  if (accessToken && refreshToken) {
    const response = await client.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    result = {
      handled: true,
      data: response.data ?? null,
      error: (response.error as Error | null) ?? null,
    };
  } else if (code) {
    const response = await client.auth.exchangeCodeForSession(code);
    result = {
      handled: true,
      data: response.data ?? null,
      error: (response.error as Error | null) ?? null,
    };
  } else if (tokenHash && type) {
    const response = await client.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as 'email' | 'sms' | 'phone_change' | 'recovery' | 'invite' | 'magiclink',
    });
    result = {
      handled: true,
      data: response.data ?? null,
      error: (response.error as Error | null) ?? null,
    };
  }
  if (result.handled) cleanAuthRedirectUrl(url);
  return result;
}

export function __setSupabaseBuildEnvForTests(
  env: Record<string, string> | null | undefined,
): void {
  buildEnvOverride = env ?? undefined;
  clientPromise = undefined;
  configPromise = undefined;
  configStatus = { checked: false, configured: false, source: 'none' };
}

export function __setSupabaseClientFactoryForTests(
  factory: (() => Promise<typeof import('@supabase/supabase-js')>) | null | undefined,
): void {
  clientFactory = factory ?? defaultClientFactory;
  clientPromise = undefined;
}

export function __resetSupabaseForTests(): void {
  clientPromise = undefined;
  configPromise = undefined;
  clientFactory = defaultClientFactory;
  buildEnvOverride = undefined;
  configStatus = { checked: false, configured: false, source: 'none' };
}

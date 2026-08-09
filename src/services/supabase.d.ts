/** Ambient types for supabase.js until full migration. No broad any. */
export interface SupabaseQueryBuilder {
  select: (columns?: string) => SupabaseQueryBuilder;
  insert: (row: unknown) => SupabaseQueryBuilder;
  update: (row: unknown) => SupabaseQueryBuilder;
  delete: () => SupabaseQueryBuilder;
  eq: (column: string, value: unknown) => SupabaseQueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => SupabaseQueryBuilder;
  abortSignal?: (signal: AbortSignal) => SupabaseQueryBuilder;
  maybeSingle: () => Promise<{ data: { content_value?: unknown } | null; error: Error | null }>;
  single: () => Promise<{ data: Record<string, unknown> | null; error: Error | null }>;
  then?: (
    resolve: (value: { data: unknown; error: Error | null }) => unknown,
  ) => Promise<unknown>;
}

export interface SupabaseClientLike {
  from: (table: string) => SupabaseQueryBuilder;
  auth: Record<string, unknown>;
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: Error | null }>;
}

export function getSupabase(): Promise<null | SupabaseClientLike>;
export function getSupabaseConfigStatus(): {
  checked: boolean;
  configured: boolean;
  source: string;
};
export function authRedirectUrl(mode?: string): string;
export function completeAuthRedirect(client: unknown): Promise<{
  handled: boolean;
  data: unknown;
  error: Error | null;
}>;
export function __setSupabaseBuildEnvForTests(env: Record<string, string> | null | undefined): void;
export function __setSupabaseClientFactoryForTests(factory: unknown): void;
export function __resetSupabaseForTests(): void;

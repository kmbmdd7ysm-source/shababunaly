/** Ambient types for supabase.js until full migration. */
export interface SupabaseQueryBuilder {
  select: (columns: string) => SupabaseQueryBuilder;
  eq: (column: string, value: unknown) => SupabaseQueryBuilder;
  maybeSingle: () => Promise<{ data: { content_value?: unknown } | null; error: Error | null }>;
  insert?: (row: unknown) => Promise<{ data: unknown; error: Error | null }>;
  update?: (row: unknown) => SupabaseQueryBuilder;
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

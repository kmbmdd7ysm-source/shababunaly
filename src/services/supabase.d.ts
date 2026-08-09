/** Ambient types for supabase.js until full migration. */
export function getSupabase(): Promise<null | {
  from: (table: string) => any;
  auth: Record<string, any>;
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<any>;
}>;
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

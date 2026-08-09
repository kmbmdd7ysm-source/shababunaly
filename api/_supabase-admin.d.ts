export function resolveSupabaseUser(authorization: string): Promise<{
  id?: string;
  email?: string;
  app_metadata?: { role?: string; [key: string]: unknown };
  [key: string]: unknown;
} | null>;

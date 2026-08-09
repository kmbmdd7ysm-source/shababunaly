export type AuthUser = { id?: string; email?: string; [key: string]: unknown };

export type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  session: unknown;
  cloudConfigured?: boolean;
  configStatus?: Record<string, unknown>;
  [key: string]: unknown;
};

export function useAuth(): AuthContextValue;
export function AuthProvider(props: {
  children?: import('react').ReactNode;
}): import('react').ReactNode;

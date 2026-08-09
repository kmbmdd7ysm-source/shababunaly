export function useAuth(): {
  user: { id?: string; email?: string; [key: string]: unknown } | null;
  loading: boolean;
  session: unknown;
  [key: string]: unknown;
};

export function AuthProvider(props: { children?: import('react').ReactNode }): import('react').ReactNode;

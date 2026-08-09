export type UserDataContextValue = {
  wishlist?: string[];
  recentlyViewed?: string[];
  compare?: string[];
  profile?: Record<string, unknown> | null;
  loading?: boolean;
  [key: string]: unknown;
};

export function useUserData(): UserDataContextValue;
export function UserDataProvider(props: {
  children?: import('react').ReactNode;
}): import('react').ReactNode;

export type UserDataContextValue = Record<string, unknown>;
export function useUserData(): UserDataContextValue;
export function UserDataProvider(props: {
  children?: import('react').ReactNode;
}): import('react').ReactNode;

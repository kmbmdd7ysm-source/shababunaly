import { useUserData } from '../context/UserDataContext';
export function useWishlist() {
  const d = useUserData();
  return {
    ids: d?.wishlist || [],
    toggle: d?.toggleWishlist || (() => {}),
    has: d?.hasWishlist || (() => false),
  };
}

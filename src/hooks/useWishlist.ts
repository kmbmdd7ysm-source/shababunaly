import { useUserData } from '../context/UserDataContext';

export function useWishlist(): {
  ids: string[];
  toggle: (id: string) => void;
  has: (id: string) => boolean;
} {
  const d = useUserData();
  const ids = Array.isArray(d.wishlist) ? (d.wishlist as string[]) : [];
  const toggle =
    typeof d.toggleWishlist === 'function'
      ? (d.toggleWishlist as (id: string) => void)
      : () => undefined;
  const has =
    typeof d.hasWishlist === 'function'
      ? (d.hasWishlist as (id: string) => boolean)
      : () => false;
  return { ids, toggle, has };
}

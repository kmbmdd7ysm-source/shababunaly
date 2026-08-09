export function useUserData(): {
  wishlist: string[];
  recentlyViewed: string[];
  toggleWishlist: (id: string) => void;
  hasWishlist: (id: string) => boolean;
  recordViewed: (id: string) => void;
  status?: string;
} | null;

import { useUserData } from '../context/UserDataContext';
export function useRecentlyViewed() {
  const d = useUserData();
  return { ids: d?.recentlyViewed || [], record: d?.recordViewed || (() => {}) };
}

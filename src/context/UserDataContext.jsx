import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { STORAGE_KEYS } from '../config';
import { useAuth } from './AuthContext';
import { useCart } from './CartContext';
import { useCompare } from './CompareContext';
import { readScoped, writeScoped, createChannel, clearUserScope } from '../services/sync/storage';
import {
  fetchCloudState,
  upsertCloudState,
  fetchProfile,
  upsertProfile,
} from '../services/sync/cloudState';
import {
  MAX_COMPARE,
  MAX_RECENT,
  normalizeIds,
  reconcileState,
  mutationId,
} from '../services/sync/protocol';
import { enqueueMutation, replayQueue } from '../services/sync/offlineQueue';
const C = createContext(null),
  BASES = [
    STORAGE_KEYS.cart,
    STORAGE_KEYS.wishlist,
    STORAGE_KEYS.compare,
    STORAGE_KEYS.recentlyViewed,
  ];
const ids = (x) => (x || []).map((v) => (typeof v === 'string' ? v : v.id)).filter(Boolean);
export function UserDataProvider({ children }) {
  const auth = useAuth(),
    cart = useCart(),
    compare = useCompare(),
    uid = auth.user?.id || null;
  const [wishlist, setWishlist] = useState([]),
    [recent, setRecent] = useState([]),
    [profile, setProfile] = useState({}),
    [status, setStatus] = useState('local'),
    [notices, setNotices] = useState([]);
  const hydrated = useRef(false),
    timer = useRef(),
    abort = useRef(),
    channel = useRef(null),
    version = useRef(0);
  const snapshot = useCallback(
    () => {
      // The avatar is stored in public.profiles and auth metadata. Keeping the base64
      // image out of user_state prevents large repeat sync payloads on every cart or
      // wishlist change while preserving all normal preferences.
      const { avatarUrl: _avatarUrl, avatar_url: _avatar_url, ...syncPreferences } = profile;
      return {
        cart: cart.items,
        wishlist,
        compare: normalizeIds(compare.ids),
        recentlyViewed: recent,
        preferences: syncPreferences,
        version: version.current,
      };
    },
    [cart.items, wishlist, compare.ids, recent, profile],
  );
  const apply = useCallback(
    (s) => {
      cart.replaceItems(s.cart || []);
      compare.replace(ids(s.compare).slice(0, MAX_COMPARE));
      setWishlist(normalizeIds(s.wishlist || []));
      setRecent(normalizeIds(s.recentlyViewed || s.recently_viewed || []).slice(0, MAX_RECENT));
      if (s.profile) setProfile(s.profile);
      version.current = Number(s.version || version.current || 0);
    },
    [cart.replaceItems, compare.replace],
  );
  useEffect(() => {
    channel.current?.close();
    channel.current = createChannel('shababuna-user-data-channel', (m) => {
      if (m.scope !== (uid || 'guest')) return;
      if (m.type === 'wishlist') setWishlist(normalizeIds(m.payload));
      if (m.type === 'recent') setRecent(normalizeIds(m.payload).slice(0, MAX_RECENT));
      if (m.type === 'auth-signout' && uid) auth.signOut();
    });
    return () => channel.current?.close();
  }, [uid]);
  useEffect(() => {
    if (auth.loading) return undefined;
    hydrated.current = false;
    abort.current?.abort();
    abort.current = new AbortController();
    const local = {
      wishlist: readScoped(STORAGE_KEYS.wishlist, uid, []),
      recentlyViewed: readScoped(STORAGE_KEYS.recentlyViewed, uid, []),
      cart: cart.items,
      compare: compare.ids,
      preferences: {},
      version: 0,
    };
    setWishlist(normalizeIds(local.wishlist));
    setRecent(normalizeIds(local.recentlyViewed));
    if (!uid) {
      setProfile({});
      setStatus('local');
      hydrated.current = true;
      return undefined;
    }
    setStatus('syncing');
    (async () => {
      try {
        const [cloudResult, profileResult] = await Promise.allSettled([
          fetchCloudState(uid),
          fetchProfile(uid),
        ]);
        if (cloudResult.status === 'rejected') throw cloudResult.reason;
        if (abort.current.signal.aborted) return;
        const cloud = cloudResult.value || {};
        const profileResultValue =
          profileResult.status === 'fulfilled' ? profileResult.value || {} : {};
        const { state, notices: nextNotices } = reconcileState(local, cloud);
        apply({ ...state, profile: profileResultValue });
        setNotices(nextNotices);
        await upsertCloudState(uid, { ...state, version: state.version });
        version.current = state.version;
        hydrated.current = true;
        setStatus('synced');
      } catch {
        if (abort.current.signal.aborted) return;
        hydrated.current = true;
        setStatus(navigator.onLine ? 'error' : 'offline');
      }
    })();
    return () => abort.current?.abort();
  }, [uid, auth.loading]);
  useEffect(() => {
    if (!hydrated.current) return;
    writeScoped(STORAGE_KEYS.wishlist, uid, wishlist);
    writeScoped(STORAGE_KEYS.recentlyViewed, uid, recent);
    channel.current?.post('wishlist', wishlist, {
      scope: uid || 'guest',
      version: version.current,
    });
    channel.current?.post('recent', recent, { scope: uid || 'guest', version: version.current });
  }, [wishlist, recent, uid]);
  const persist = useCallback(
    async (state = snapshot()) => {
      if (!uid) return;
      const next = {
        ...state,
        version: Math.max(version.current, Number(state.version || 0)) + 1,
        mutationId: mutationId(),
      };
      if (!navigator.onLine) {
        enqueueMutation(uid, { id: next.mutationId, type: 'state', payload: next });
        setStatus('offline');
        return;
      }
      setStatus('syncing');
      const saved = await upsertCloudState(uid, next);
      version.current = Number(saved?.version || next.version);
      setStatus('synced');
    },
    [uid, snapshot],
  );
  useEffect(() => {
    if (!uid || !hydrated.current) return undefined;
    clearTimeout(timer.current);
    timer.current = setTimeout(
      () =>
        persist().catch(() => {
          enqueueMutation(uid, { id: mutationId(), type: 'state', payload: snapshot() });
          setStatus(navigator.onLine ? 'error' : 'offline');
        }),
      750,
    );
    return () => clearTimeout(timer.current);
  }, [uid, cart.items, wishlist, compare.ids, recent, profile, persist, snapshot]);
  useEffect(() => {
    const online = async () => {
        if (!uid) return;
        setStatus('syncing');
        try {
          await replayQueue(uid, async (m) => {
            if (m.type === 'state') await upsertCloudState(uid, m.payload);
          });
          const cloud = await fetchCloudState(uid);
          const { state, notices: nextNotices } = reconcileState(snapshot(), cloud || {});
          apply(state);
          setNotices(nextNotices);
          await persist(state);
        } catch {
          setStatus('error');
        }
      },
      offline = () => uid && setStatus('offline');
    addEventListener('online', online);
    addEventListener('offline', offline);
    return () => {
      removeEventListener('online', online);
      removeEventListener('offline', offline);
    };
  }, [uid, persist, snapshot, apply]);
  const retrySync = useCallback(async () => {
    if (!uid) {
      setStatus('local');
      return undefined;
    }
    setStatus('syncing');
    try {
      await replayQueue(uid, async (m) => {
        if (m.type === 'state') await upsertCloudState(uid, m.payload);
      });
      const cloud = await fetchCloudState(uid);
      const { state, notices: nextNotices } = reconcileState(snapshot(), cloud || {});
      apply(state);
      setNotices(nextNotices);
      await persist(state);
    } catch (error) {
      setStatus(navigator.onLine ? 'error' : 'offline');
      throw error;
    }
  }, [uid, snapshot, apply, persist]);

  const toggleWishlist = useCallback(
      (id) =>
        setWishlist((s) =>
          s.some((x) => x.id === id)
            ? s.filter((x) => x.id !== id)
            : [{ id, updatedAt: new Date().toISOString() }, ...s],
        ),
      [],
    ),
    recordViewed = useCallback(
      (id) =>
        setRecent((s) =>
          [{ id, viewedAt: new Date().toISOString() }, ...s.filter((x) => x.id !== id)].slice(
            0,
            MAX_RECENT,
          ),
        ),
      [],
    ),
    saveProfile = useCallback(
      async (p) => {
        const clean = { ...profile, ...p };
        setProfile(clean);
        if (uid) await upsertProfile(uid, clean);
        return clean;
      },
      [uid, profile],
    ),
    clearPersonalization = useCallback(() => {
      setRecent([]);
      setWishlist([]);
    }, []),
    clearAuthenticatedState = useCallback(() => {
      if (uid) clearUserScope(BASES, uid);
      setProfile({});
      setWishlist([]);
      setRecent([]);
      cart.replaceItems([]);
      compare.replace([]);
      hydrated.current = false;
    }, [uid, cart.replaceItems, compare.replace]);
  return (
    <C.Provider
      value={useMemo(
        () => ({
          wishlist: ids(wishlist),
          recentlyViewed: ids(recent),
          toggleWishlist,
          hasWishlist: (id) => wishlist.some((x) => x.id === id),
          recordViewed,
          profile,
          saveProfile,
          status,
          notices,
          clearNotices: () => setNotices([]),
          clearPersonalization,
          clearAuthenticatedState,
          flush: () => persist(),
          retrySync,
        }),
        [
          wishlist,
          recent,
          toggleWishlist,
          recordViewed,
          profile,
          saveProfile,
          status,
          notices,
          clearPersonalization,
          clearAuthenticatedState,
          persist,
          retrySync,
        ],
      )}
    >
      {children}
    </C.Provider>
  );
}
export const useUserData = () => useContext(C);

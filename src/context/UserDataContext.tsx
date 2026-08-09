import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { STORAGE_KEYS } from '../config.ts';
import { useAuth } from './AuthContext';
import { useCart } from './CartContext';
import { useCompare } from './CompareContext';
import { readScoped, writeScoped, createChannel, clearUserScope } from '../services/sync/storage.ts';
import {
  fetchCloudState,
  upsertCloudState,
  fetchProfile,
  upsertProfile,
} from '../services/sync/cloudState.ts';
import {
  MAX_COMPARE,
  MAX_RECENT,
  normalizeIds,
  reconcileState,
  mutationId,
} from '../services/sync/protocol.ts';
import { enqueueMutation, replayQueue } from '../services/sync/offlineQueue.ts';

type IdItem = { id: string; updatedAt?: string; viewedAt?: string };

export type UserDataContextValue = {
  wishlist: string[];
  recentlyViewed: string[];
  toggleWishlist: (id: string) => void;
  hasWishlist: (id: string) => boolean;
  recordViewed: (id: string) => void;
  profile: Record<string, unknown>;
  saveProfile: (p: Record<string, unknown>) => Promise<Record<string, unknown>>;
  status: string;
  notices: Array<Record<string, unknown>>;
  clearNotices: () => void;
  clearPersonalization: () => void;
  clearAuthenticatedState: () => void;
  flush: () => Promise<void>;
  retrySync: () => Promise<void | undefined>;
  [key: string]: unknown;
};

const C = createContext<UserDataContextValue | null>(null);
const BASES = [
    STORAGE_KEYS.cart,
    STORAGE_KEYS.wishlist,
    STORAGE_KEYS.compare,
    STORAGE_KEYS.recentlyViewed,
  ];
const ids = (x: Array<string | IdItem> | null | undefined): string[] =>
  (x || [])
    .map((v) => (typeof v === 'string' ? v : v.id))
    .filter((v): v is string => Boolean(v));
export function UserDataProvider({ children }: { children?: ReactNode }) {
  const auth = useAuth(),
    cart = useCart(),
    compare = useCompare(),
    uid = auth.user?.id || null;
  const [wishlist, setWishlist] = useState<IdItem[]>([]);
  const [recent, setRecent] = useState<IdItem[]>([]);
  const [profile, setProfile] = useState<Record<string, unknown>>({});
  const [status, setStatus] = useState('local');
  const [notices, setNotices] = useState<Array<Record<string, unknown>>>([]);
  const hydrated = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const abort = useRef<AbortController | undefined>(undefined);
  const channel = useRef<ReturnType<typeof createChannel> | null>(null);
  const version = useRef(0);
  const snapshot = useCallback(() => {
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
  }, [cart.items, wishlist, compare.ids, recent, profile]);
  const apply = useCallback(
    (s: Record<string, unknown>) => {
      cart.replaceItems((s.cart as never) || []);
      compare.replace(ids(s.compare as Array<string | IdItem>).slice(0, MAX_COMPARE));
      setWishlist(normalizeIds((s.wishlist as Array<string | IdItem>) || []) as IdItem[]);
      setRecent(
        normalizeIds(
          ((s.recentlyViewed || s.recently_viewed) as Array<string | IdItem>) || [],
        ).slice(0, MAX_RECENT) as IdItem[],
      );
      if (s.profile) setProfile(s.profile as Record<string, unknown>);
      version.current = Number(s.version || version.current || 0);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional dependency scope
    [cart.replaceItems, compare.replace],
  );
  useEffect(() => {
    channel.current?.close();
    channel.current = createChannel('shababuna-user-data-channel', (m) => {
      if (m.scope !== (uid || 'guest')) return;
      if (m.type === 'wishlist') setWishlist(normalizeIds(m.payload as Array<string | IdItem>) as IdItem[]);
      if (m.type === 'recent') setRecent(normalizeIds(m.payload as Array<string | IdItem>).slice(0, MAX_RECENT) as IdItem[]);
      if (m.type === 'auth-signout' && uid && typeof auth.signOut === 'function') void auth.signOut();
    });
    return () => channel.current?.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional dependency scope
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
    setWishlist(normalizeIds(local.wishlist as Array<string | IdItem>) as IdItem[]);
    setRecent(normalizeIds(local.recentlyViewed as Array<string | IdItem>) as IdItem[]);
    if (!uid) {
      setProfile({});
      setStatus('local');
      hydrated.current = true;
      return undefined;
    }
    setStatus('syncing');
    void (async () => {
      try {
        const [cloudResult, profileResult] = await Promise.allSettled([
          fetchCloudState(uid),
          fetchProfile(uid),
        ]);
        if (cloudResult.status === 'rejected') throw cloudResult.reason;
        if (abort.current?.signal.aborted) return;
        const cloud = cloudResult.value || {};
        const profileResultValue =
          profileResult.status === 'fulfilled' ? profileResult.value || {} : {};
        const { state, notices: nextNotices } = reconcileState(local as Record<string, unknown>, cloud as Record<string, unknown>);
        apply({ ...state, profile: profileResultValue });
        setNotices(nextNotices);
        await upsertCloudState(uid, { ...state, version: state.version } as Record<string, unknown>);
        version.current = Number(state.version || 0);
        hydrated.current = true;
        setStatus('synced');
      } catch {
        if (abort.current?.signal.aborted) return;
        hydrated.current = true;
        setStatus(navigator.onLine ? 'error' : 'offline');
      }
    })();
    return () => abort.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional dependency scope
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
    async (state: Record<string, unknown> = snapshot() as Record<string, unknown>) => {
      if (!uid) return;
      const next = {
        ...state,
        version: Math.max(version.current, Number(state.version || 0)) + 1,
        mutationId: mutationId(),
      };
      if (!navigator.onLine) {
        enqueueMutation(uid, { id: String(next.mutationId), type: 'state', payload: next });
        setStatus('offline');
        return;
      }
      setStatus('syncing');
      const saved = (await upsertCloudState(uid, next)) as { version?: number } | null;
      version.current = Number(saved?.version || next.version);
      setStatus('synced');
    },
    [uid, snapshot],
  );
  useEffect(() => {
    if (!uid || !hydrated.current) return undefined;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void persist().catch(() => {
        enqueueMutation(uid, { id: mutationId(), type: 'state', payload: snapshot() });
        setStatus(navigator.onLine ? 'error' : 'offline');
      });
    }, 750);
    return () => clearTimeout(timer.current);
  }, [uid, cart.items, wishlist, compare.ids, recent, profile, persist, snapshot]);
  useEffect(() => {
    const online = () => {
      void (async () => {
        if (!uid) return;
        setStatus('syncing');
        try {
          await replayQueue(uid, async (m) => {
            if (m.type === 'state')
              await upsertCloudState(uid, m.payload as Record<string, unknown>);
          });
          const cloud = await fetchCloudState(uid);
          const { state, notices: nextNotices } = reconcileState(
            snapshot() as Record<string, unknown>,
            (cloud || {}) as Record<string, unknown>,
          );
          apply(state);
          setNotices(nextNotices);
          await persist(state as Record<string, unknown>);
        } catch {
          setStatus('error');
        }
      })();
    };
    const offline = () => {
      if (uid) setStatus('offline');
    };
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
        if (m.type === 'state') await upsertCloudState(uid, m.payload as Record<string, unknown>);
      });
      const cloud = await fetchCloudState(uid);
      const { state, notices: nextNotices } = reconcileState(snapshot() as Record<string, unknown>, (cloud || {}) as Record<string, unknown>);
      apply(state);
      setNotices(nextNotices);
      await persist(state as Record<string, unknown>);
    } catch (error) {
      setStatus(navigator.onLine ? 'error' : 'offline');
      throw error;
    }
  }, [uid, snapshot, apply, persist]);

  const toggleWishlist = useCallback(
      (id: string) =>
        setWishlist((s) =>
          s.some((x) => x.id === id)
            ? s.filter((x) => x.id !== id)
            : [{ id, updatedAt: new Date().toISOString() }, ...s],
        ),
      [],
    ),
    recordViewed = useCallback(
      (id: string) =>
        setRecent((s) =>
          [{ id, viewedAt: new Date().toISOString() }, ...s.filter((x) => x.id !== id)].slice(
            0,
            MAX_RECENT,
          ),
        ),
      [],
    ),
    saveProfile = useCallback(
      async (p: Record<string, unknown>) => {
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
      // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional dependency scope
    }, [uid, cart.replaceItems, compare.replace]);
  return (
    <C.Provider
      value={useMemo<UserDataContextValue>(
        () => ({
          wishlist: ids(wishlist),
          recentlyViewed: ids(recent),
          toggleWishlist,
          hasWishlist: (id: string) => wishlist.some((x) => x.id === id),
          recordViewed,
          profile,
          saveProfile,
          status,
          notices,
          clearNotices: () => setNotices([]),
          clearPersonalization,
          clearAuthenticatedState,
          flush: () => persist() as Promise<void>,
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
export const useUserData = (): UserDataContextValue => {
  const ctx = useContext(C);
  if (!ctx) {
    return {
      wishlist: [],
      recentlyViewed: [],
      toggleWishlist: () => undefined,
      hasWishlist: () => false,
      recordViewed: () => undefined,
      profile: {},
      saveProfile: async (p) => p,
      status: 'local',
      notices: [],
      clearNotices: () => undefined,
      clearPersonalization: () => undefined,
      clearAuthenticatedState: () => undefined,
      flush: async () => undefined,
      retrySync: async () => undefined,
    };
  }
  return ctx;
};

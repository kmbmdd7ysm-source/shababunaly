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
import { trackEvent } from '../utils/analytics.ts';
import { useAuth } from './AuthContext';
import { STORAGE_KEYS } from '../config.ts';
import { readScoped, writeScoped, createChannel } from '../services/sync/storage.ts';

export type CompareContextValue = {
  ids: string[];
  count: number;
  has: (id: string) => boolean;
  toggle: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  replace: (next: string[]) => void;
  max: number;
};

const CompareContext = createContext<CompareContextValue | null>(null);
const MAX = 4;

export function CompareProvider({ children }: { children?: ReactNode }) {
  const auth = useAuth();
  const scope = auth.user?.id || null;
  const [ids, setIds] = useState<string[]>([]);
  const ready = useRef(false);
  const channel = useRef<ReturnType<typeof createChannel> | null>(null);

  useEffect(() => {
    if (auth.loading) return;
    ready.current = false;
    setIds(readScoped<string[]>(STORAGE_KEYS.compare, scope, []).slice(0, MAX));
    ready.current = true;
  }, [scope, auth.loading]);

  useEffect(() => {
    channel.current?.close();
    channel.current = createChannel('shababuna-compare-channel', (m) => {
      if (m.type === 'compare' && m.scope === (scope || 'guest'))
        setIds((Array.isArray(m.payload) ? (m.payload as string[]) : []).slice(0, MAX));
    });
    return () => channel.current?.close();
  }, [scope]);

  useEffect(() => {
    if (!ready.current) return;
    writeScoped(STORAGE_KEYS.compare, scope, ids);
    channel.current?.post('compare', ids, { scope: scope || 'guest', version: Date.now() });
  }, [ids, scope]);

  const toggle = useCallback((id: string) => {
    setIds((s) => {
      const has = s.includes(id);
      const next = has ? s.filter((x) => x !== id) : s.length < MAX ? [...s, id] : s;
      trackEvent(has ? 'comparison_remove' : 'comparison_add', { item_id: id });
      return next;
    });
  }, []);
  const remove = useCallback((id: string) => setIds((s) => s.filter((x) => x !== id)), []);
  const clear = useCallback(() => setIds([]), []);
  const replace = useCallback(
    (next: string[]) => setIds(Array.isArray(next) ? next.slice(0, MAX) : []),
    [],
  );

  const value = useMemo<CompareContextValue>(
    () => ({
      ids,
      count: ids.length,
      has: (id: string) => ids.includes(id),
      toggle,
      remove,
      clear,
      replace,
      max: MAX,
    }),
    [ids, toggle, remove, clear, replace],
  );

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}

export const useCompare = (): CompareContextValue => {
  const ctx = useContext(CompareContext);
  if (!ctx) {
    return {
      ids: [],
      count: 0,
      has: () => false,
      toggle: () => undefined,
      remove: () => undefined,
      clear: () => undefined,
      replace: () => undefined,
      max: MAX,
    };
  }
  return ctx;
};

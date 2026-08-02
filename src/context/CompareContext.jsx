import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { trackEvent } from '../utils/analytics';
import { useAuth } from './AuthContext';
import { STORAGE_KEYS } from '../config';
import { readScoped, writeScoped, createChannel } from '../services/sync/storage';
const CompareContext = createContext(null),
  MAX = 4;
export function CompareProvider({ children }) {
  const auth = useAuth(),
    scope = auth.user?.id || null,
    [ids, setIds] = useState([]),
    ready = useRef(false),
    channel = useRef(null);
  useEffect(() => {
    if (auth.loading) return;
    ready.current = false;
    setIds(readScoped(STORAGE_KEYS.compare, scope, []).slice(0, MAX));
    ready.current = true;
  }, [scope, auth.loading]);
  useEffect(() => {
    channel.current?.close();
    channel.current = createChannel('shababuna-compare-channel', (m) => {
      if (m.type === 'compare' && m.scope === (scope || 'guest'))
        setIds((m.payload || []).slice(0, MAX));
    });
    return () => channel.current?.close();
  }, [scope]);
  useEffect(() => {
    if (!ready.current) return;
    writeScoped(STORAGE_KEYS.compare, scope, ids);
    channel.current?.post('compare', ids, { scope: scope || 'guest', version: Date.now() });
  }, [ids, scope]);
  const toggle = useCallback(
      (id) =>
        setIds((s) => {
          const has = s.includes(id),
            next = has ? s.filter((x) => x !== id) : s.length < MAX ? [...s, id] : s;
          trackEvent(has ? 'comparison_remove' : 'comparison_add', { item_id: id });
          return next;
        }),
      [],
    ),
    remove = useCallback((id) => setIds((s) => s.filter((x) => x !== id)), []),
    clear = useCallback(() => setIds([]), []),
    replace = useCallback((next) => setIds(Array.isArray(next) ? next.slice(0, MAX) : []), []);
  return (
    <CompareContext.Provider
      value={useMemo(
        () => ({
          ids,
          count: ids.length,
          has: (id) => ids.includes(id),
          toggle,
          remove,
          clear,
          replace,
          max: MAX,
        }),
        [ids, toggle, remove, clear, replace],
      )}
    >
      {children}
    </CompareContext.Provider>
  );
}
export const useCompare = () => useContext(CompareContext);

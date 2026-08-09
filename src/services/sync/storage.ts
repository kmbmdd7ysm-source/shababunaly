const GUEST = 'guest';

export const safeRead = <T>(key: string, fallback: T): T => {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    if (raw == null) return fallback;
    const v = JSON.parse(raw) as T;
    return v ?? fallback;
  } catch {
    return fallback;
  }
};

export const safeWrite = (key: string, value: unknown): boolean => {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

export const safeRemove = (key: string): boolean => {
  try {
    globalThis.localStorage?.removeItem(key);
    return true;
  } catch {
    return false;
  }
};

export const scopeKey = (base: string, userId?: string | null): string =>
  `${base}:${userId ? `user:${userId}` : GUEST}`;

export const readScoped = <T>(base: string, userId: string | null | undefined, fallback: T): T =>
  safeRead(scopeKey(base, userId), fallback);

export const writeScoped = (
  base: string,
  userId: string | null | undefined,
  value: unknown,
): boolean => safeWrite(scopeKey(base, userId), value);

export const clearUserScope = (bases: string[], userId: string | null | undefined): void => {
  if (!userId) return;
  bases.forEach((base) => safeRemove(scopeKey(base, userId)));
};

export const createTabId = (): string =>
  globalThis.crypto?.randomUUID?.() || `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`;

interface ChannelMessage {
  messageId: string;
  originTabId: string;
  timestamp: number;
  type: string;
  payload: unknown;
  [key: string]: unknown;
}

export function createChannel(
  name: string,
  onMessage?: (msg: ChannelMessage) => void,
): {
  tabId: string;
  post: (type: string, payload: unknown, extra?: Record<string, unknown>) => ChannelMessage;
  close: () => void;
} {
  const tabId = createTabId();
  const seen = new Set<string>();
  let bc: BroadcastChannel | null = null;
  const dispatch = (msg: ChannelMessage | null | undefined) => {
    if (!msg || msg.originTabId === tabId || seen.has(msg.messageId)) return;
    seen.add(msg.messageId);
    if (seen.size > 250) {
      const first = seen.values().next().value;
      if (first !== undefined) seen.delete(first);
    }
    onMessage?.(msg);
  };
  if (typeof BroadcastChannel !== 'undefined') {
    bc = new BroadcastChannel(name);
    bc.onmessage = (e) => dispatch(e.data as ChannelMessage);
  }
  const storageListener = (e: StorageEvent) => {
    if (e.key !== `__bc__:${name}` || !e.newValue) return;
    try {
      dispatch(JSON.parse(e.newValue) as ChannelMessage);
    } catch {
      /* ignore */
    }
  };
  globalThis.addEventListener?.('storage', storageListener);
  return {
    tabId,
    post(type, payload, extra = {}) {
      const msg: ChannelMessage = {
        messageId: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
        originTabId: tabId,
        timestamp: Date.now(),
        type,
        payload,
        ...extra,
      };
      seen.add(msg.messageId);
      bc?.postMessage(msg);
      try {
        localStorage.setItem(`__bc__:${name}`, JSON.stringify(msg));
        localStorage.removeItem(`__bc__:${name}`);
      } catch {
        /* ignore */
      }
      return msg;
    },
    close() {
      bc?.close();
      globalThis.removeEventListener?.('storage', storageListener);
    },
  };
}

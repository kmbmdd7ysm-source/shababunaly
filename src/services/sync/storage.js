const GUEST = 'guest';
export const safeRead = (key, fallback) => {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    if (raw == null) return fallback;
    const v = JSON.parse(raw);
    return v ?? fallback;
  } catch {
    return fallback;
  }
};
export const safeWrite = (key, value) => {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};
export const safeRemove = (key) => {
  try {
    globalThis.localStorage?.removeItem(key);
    return true;
  } catch {
    return false;
  }
};
export const scopeKey = (base, userId) => `${base}:${userId ? `user:${userId}` : GUEST}`;
export const readScoped = (base, userId, fallback) => safeRead(scopeKey(base, userId), fallback);
export const writeScoped = (base, userId, value) => safeWrite(scopeKey(base, userId), value);
export const clearUserScope = (bases, userId) => {
  if (!userId) return;
  bases.forEach((base) => safeRemove(scopeKey(base, userId)));
};
export const createTabId = () =>
  globalThis.crypto?.randomUUID?.() || `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export function createChannel(name, onMessage) {
  const tabId = createTabId();
  const seen = new Set();
  let bc = null;
  const dispatch = (msg) => {
    if (!msg || msg.originTabId === tabId || seen.has(msg.messageId)) return;
    seen.add(msg.messageId);
    if (seen.size > 250) seen.delete(seen.values().next().value);
    onMessage?.(msg);
  };
  if (typeof BroadcastChannel !== 'undefined') {
    bc = new BroadcastChannel(name);
    bc.onmessage = (e) => dispatch(e.data);
  }
  const storageListener = (e) => {
    if (e.key !== `__bc__:${name}` || !e.newValue) return;
    try {
      dispatch(JSON.parse(e.newValue));
    } catch {
      /* ignore */
    }
  };
  globalThis.addEventListener?.('storage', storageListener);
  return {
    tabId,
    post(type, payload, extra = {}) {
      const msg = {
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

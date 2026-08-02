export const MAX_COMPARE = 4,
  MAX_RECENT = 24,
  RECENT_RETENTION_MS = 1000 * 60 * 60 * 24 * 90;
const stamp = (x) => Number(new Date(x?.updatedAt || x?.viewedAt || x?.timestamp || 0)) || 0;
export const mutationId = () =>
  globalThis.crypto?.randomUUID?.() || `m-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export function normalizeIds(list = []) {
  return list
    .map((x) => (typeof x === 'string' ? { id: x, updatedAt: new Date().toISOString() } : x))
    .filter((x) => x?.id);
}
export function mergeIdLists(local = [], cloud = [], limit = Infinity) {
  const map = new Map();
  [...cloud, ...local].forEach((item) => {
    const x = typeof item === 'string' ? { id: item, updatedAt: new Date(0).toISOString() } : item;
    if (!x?.id) return;
    const prev = map.get(x.id);
    if (!prev || stamp(x) >= stamp(prev)) map.set(x.id, x);
  });
  return [...map.values()].sort((a, b) => stamp(b) - stamp(a)).slice(0, limit);
}
export function mergeRecent(local = [], cloud = [], now = Date.now()) {
  return mergeIdLists(local, cloud, Infinity)
    .filter((x) => now - stamp(x) <= RECENT_RETENTION_MS)
    .slice(0, MAX_RECENT);
}
export function mergeCart(local = [], cloud = [], catalogById) {
  const map = new Map(),
    notices = [];
  for (const raw of [...cloud, ...local]) {
    if (!raw?.key || !raw?.id) continue;
    const product = catalogById?.get?.(raw.id);
    if (catalogById && !product) {
      notices.push({ code: 'removed_product', id: raw.id });
      continue;
    }
    const currentPrice = product?.price ?? raw.price;
    const max = Math.max(1, Number(product?.stock ?? raw.maxStock ?? 999));
    const next = {
      ...raw,
      price: currentPrice,
      maxStock: max,
      updatedAt: raw.updatedAt || new Date().toISOString(),
    };
    if (product && Number(raw.price) !== Number(currentPrice))
      notices.push({ code: 'price_changed', id: raw.id, from: raw.price, to: currentPrice });
    const prev = map.get(raw.key);
    if (!prev)
      map.set(raw.key, {
        ...next,
        quantity: Math.min(max, Math.max(1, Number(raw.quantity) || 1)),
      });
    else
      map.set(raw.key, {
        ...prev,
        ...next,
        quantity: Math.min(max, (Number(prev.quantity) || 1) + (Number(raw.quantity) || 1)),
        updatedAt: new Date(Math.max(stamp(prev), stamp(next), Date.now())).toISOString(),
      });
  }
  return { items: [...map.values()], notices };
}
export function reconcileState(local, cloud, options = {}) {
  const cart = mergeCart(local.cart || [], cloud.cart || [], options.catalogById);
  return {
    state: {
      cart: cart.items,
      wishlist: mergeIdLists(local.wishlist, cloud.wishlist),
      compare: mergeIdLists(local.compare, cloud.compare, MAX_COMPARE),
      recentlyViewed: mergeRecent(
        local.recentlyViewed,
        cloud.recentlyViewed || cloud.recently_viewed,
      ),
      preferences: { ...(cloud.preferences || {}), ...(local.preferences || {}) },
      version: Math.max(Number(local.version || 0), Number(cloud.version || 0)) + 1,
    },
    notices: cart.notices,
  };
}

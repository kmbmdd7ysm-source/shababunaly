export const MAX_COMPARE = 4;
export const MAX_RECENT = 24;
export const RECENT_RETENTION_MS = 1000 * 60 * 60 * 24 * 90;

type Timed = { updatedAt?: string; viewedAt?: string; timestamp?: string | number };
type IdItem = { id: string; updatedAt?: string } & Record<string, unknown>;
type CartLike = {
  key?: string;
  id?: string;
  price?: number;
  maxStock?: number;
  quantity?: number;
  updatedAt?: string;
} & Record<string, unknown>;

const stamp = (x: Timed | null | undefined): number =>
  Number(new Date(x?.updatedAt || x?.viewedAt || x?.timestamp || 0)) || 0;

export const mutationId = (): string =>
  globalThis.crypto?.randomUUID?.() || `m-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function normalizeIds(list: Array<string | IdItem> = []): IdItem[] {
  return list
    .map((x) =>
      typeof x === 'string' ? ({ id: x, updatedAt: new Date().toISOString() } as IdItem) : x,
    )
    .filter((x): x is IdItem => Boolean(x?.id));
}

export function mergeIdLists(
  local: Array<string | IdItem> = [],
  cloud: Array<string | IdItem> = [],
  limit = Infinity,
): IdItem[] {
  const map = new Map<string, IdItem>();
  [...cloud, ...local].forEach((item) => {
    const x =
      typeof item === 'string'
        ? ({ id: item, updatedAt: new Date(0).toISOString() } as IdItem)
        : item;
    if (!x?.id) return;
    const prev = map.get(x.id);
    if (!prev || stamp(x) >= stamp(prev)) map.set(x.id, x);
  });
  return [...map.values()].sort((a, b) => stamp(b) - stamp(a)).slice(0, limit);
}

export function mergeRecent(
  local: Array<string | IdItem> = [],
  cloud: Array<string | IdItem> = [],
  now = Date.now(),
): IdItem[] {
  return mergeIdLists(local, cloud, Infinity)
    .filter((x) => now - stamp(x) <= RECENT_RETENTION_MS)
    .slice(0, MAX_RECENT);
}

export function mergeCart(
  local: CartLike[] = [],
  cloud: CartLike[] = [],
  catalogById?: Map<string, { price?: number; stock?: number }>,
): { items: CartLike[]; notices: Array<Record<string, unknown>> } {
  const map = new Map<string, CartLike>();
  const notices: Array<Record<string, unknown>> = [];
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
      } as CartLike);
    else
      map.set(raw.key, {
        ...prev,
        ...next,
        quantity: Math.min(max, (Number(prev.quantity) || 1) + (Number(raw.quantity) || 1)),
        updatedAt: new Date(Math.max(stamp(prev), stamp(next), Date.now())).toISOString(),
      } as CartLike);
  }
  return { items: [...map.values()], notices };
}

export function reconcileState(
  local: Record<string, unknown>,
  cloud: Record<string, unknown>,
  options: { catalogById?: Map<string, { price?: number; stock?: number }> } = {},
): { state: Record<string, unknown>; notices: Array<Record<string, unknown>> } {
  const cart = mergeCart(
    (local.cart as CartLike[]) || [],
    (cloud.cart as CartLike[]) || [],
    options.catalogById,
  );
  return {
    state: {
      cart: cart.items,
      wishlist: mergeIdLists(
        (local.wishlist as Array<string | IdItem>) || [],
        (cloud.wishlist as Array<string | IdItem>) || [],
      ),
      compare: mergeIdLists(
        (local.compare as Array<string | IdItem>) || [],
        (cloud.compare as Array<string | IdItem>) || [],
        MAX_COMPARE,
      ),
      recentlyViewed: mergeRecent(
        (local.recentlyViewed as Array<string | IdItem>) || [],
        ((cloud.recentlyViewed || cloud.recently_viewed) as Array<string | IdItem>) || [],
      ),
      preferences: {
        ...((cloud.preferences as Record<string, unknown>) || {}),
        ...((local.preferences as Record<string, unknown>) || {}),
      },
      version: Math.max(Number(local.version || 0), Number(cloud.version || 0)) + 1,
    },
    notices: cart.notices,
  };
}

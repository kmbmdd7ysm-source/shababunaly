export type InventoryPoolItem = {
  key: string;
  id: string;
  type: string;
  quantity: number;
  maxStock?: number | null;
  minQuantity?: number;
  inventoryPoolKey?: string;
  inventoryPoolStock?: number;
  unavailable?: boolean;
};

export function getInventoryPoolLimit(item: InventoryPoolItem): number {
  const limit = Number(item.inventoryPoolStock);
  return item.inventoryPoolKey && Number.isFinite(limit) && limit >= 0
    ? limit
    : Number.POSITIVE_INFINITY;
}

export function getInventoryPoolUsage<T extends InventoryPoolItem>(
  state: T[],
  item: InventoryPoolItem,
  excludeKey?: string,
): number {
  if (!item.inventoryPoolKey) return 0;
  return state.reduce((sum, candidate) => {
    if (candidate.key === excludeKey) return sum;
    if (candidate.type !== 'product' || candidate.id !== item.id) return sum;
    if (candidate.inventoryPoolKey !== item.inventoryPoolKey) return sum;
    return sum + Math.max(0, Number(candidate.quantity) || 0);
  }, 0);
}

export function getMaxInventoryPoolQuantity<T extends InventoryPoolItem>(
  state: T[],
  item: InventoryPoolItem,
  excludeKey?: string,
): number {
  const rawVariantLimit = Number(item.maxStock);
  const variantLimit = Number.isFinite(rawVariantLimit)
    ? Math.max(0, rawVariantLimit)
    : Number.POSITIVE_INFINITY;
  const sharedLimit = getInventoryPoolLimit(item);
  const remainingPool = Number.isFinite(sharedLimit)
    ? Math.max(0, sharedLimit - getInventoryPoolUsage(state, item, excludeKey))
    : Number.POSITIVE_INFINITY;
  return Math.min(variantLimit, remainingPool);
}

/**
 * Applies shared inventory pools in cart order. If stock falls below what is
 * already in the cart, later pool entries are clamped or removed rather than
 * allowing the combined quantity to exceed verified inventory.
 */
export function enforceInventoryPools<T extends InventoryPoolItem>(items: T[]): T[] {
  const consumed = new Map<string, number>();
  const output: T[] = [];

  for (const item of items) {
    if (
      item.type !== 'product' ||
      !item.inventoryPoolKey ||
      !Number.isFinite(Number(item.inventoryPoolStock))
    ) {
      output.push(item);
      continue;
    }

    const pool = `${item.id}:${item.inventoryPoolKey}`;
    const used = consumed.get(pool) || 0;
    const limit = Math.max(0, Number(item.inventoryPoolStock) || 0);
    const available = Math.max(0, limit - used);
    const requested = Math.max(0, Number(item.quantity) || 0);
    const minimum = Math.max(1, Number(item.minQuantity) || 1);
    const nextQuantity = Math.min(Math.max(minimum, requested), available);

    if (nextQuantity <= 0) {
      consumed.set(pool, used);
      continue;
    }

    consumed.set(pool, used + nextQuantity);
    output.push({
      ...item,
      quantity: nextQuantity,
      maxStock: Math.min(Number(item.maxStock ?? limit), available),
      unavailable: false,
    });
  }

  return output;
}

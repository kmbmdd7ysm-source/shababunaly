export function createIdempotencyKey(): string;
export function normalizeOrder(order?: unknown): Record<string, unknown>;
export function readLocalOrders(): unknown[];
export function writeLocalOrders(orders: unknown[]): void;
export function createOrder(input: unknown, options?: Record<string, unknown>): Promise<unknown>;
export function getMyOrders(userId: string): Promise<unknown[]>;
export function lookupGuestOrder(
  orderNumber: string,
  email: string,
  options?: Record<string, unknown>,
): Promise<Record<string, unknown> | null>;
export function getOrderDetails(input: Record<string, unknown>): Promise<Record<string, unknown> | null>;

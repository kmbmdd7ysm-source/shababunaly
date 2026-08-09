export function createIdempotencyKey(): string;
export function normalizeOrder(order?: unknown): Record<string, unknown>;
export function readLocalOrders(): { orders: unknown[]; error?: unknown };
export function writeLocalOrders(orders: unknown[]): void;
export function createOrder(
  input: unknown,
  options?: Record<string, unknown>,
): Promise<Record<string, unknown>>;
export function getMyOrders(userId: string): Promise<{
  state: string;
  orders: Array<Record<string, unknown>>;
  error?: unknown;
}>;
export function lookupGuestOrder(
  orderNumber: string,
  email: string,
  turnstileToken?: string,
  accessToken?: string,
): Promise<Record<string, unknown>>;
export function getOrderDetails(input: {
  orderNumber?: string;
  userId?: string | null;
  email?: string;
  turnstileToken?: string;
  accessToken?: string;
}): Promise<Record<string, unknown>>;

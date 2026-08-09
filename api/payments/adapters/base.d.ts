export type PaymentAdapter = {
  id: string;
  configured: () => boolean;
  [key: string]: unknown;
};
export function createHttpAdapter(config: Record<string, unknown>): PaymentAdapter;

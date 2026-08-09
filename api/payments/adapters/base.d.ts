export type PaymentAdapter = {
  id: string;
  configured: () => boolean;
  createSession?: (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
  mapError?: (error: unknown) => { status?: number; error?: string; [key: string]: unknown };
  [key: string]: unknown;
};
export function createHttpAdapter(config: Record<string, unknown>): PaymentAdapter;
export function clean(value: unknown, max?: number): string;

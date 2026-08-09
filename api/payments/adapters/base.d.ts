export type PaymentAdapter = {
  id: string;
  configured: () => boolean;
  createSession?: (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
  refund?: (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
  verifyWebhook?: (
    raw: Buffer,
    headers: Record<string, string | string[] | undefined>,
  ) => boolean;
  normalizeEvent?: (payload: unknown) => Record<string, unknown>;
  capabilities?: () => { refund?: boolean; [key: string]: unknown };
  mapError?: (error: unknown) => {
    status?: number;
    error?: string;
    code?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};
export function createHttpAdapter(config: Record<string, unknown>): PaymentAdapter;
export function clean(value: unknown, max?: number): string;

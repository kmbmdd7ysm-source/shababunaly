export function getSignatureProviderConfig(): Record<string, unknown> | null;
export function createSignatureEnvelope(
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>>;
export function verifySignatureWebhook(
  rawBody: string | Buffer,
  headers: Record<string, string | string[] | undefined>,
): boolean;
export function normalizeSignatureEvent(
  payload: unknown,
): Record<string, unknown> | null;

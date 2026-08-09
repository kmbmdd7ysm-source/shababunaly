export function createSignatureEnvelope(input: Record<string, unknown>): Promise<Record<string, unknown>>;
export function getSignatureProvider(): { id: string; [key: string]: unknown } | null;

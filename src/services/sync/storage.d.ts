export function safeRead<T>(key: string, fallback: T): T;
export function safeWrite(key: string, value: unknown): boolean;
export function safeRemove(key: string): boolean;
export function scopeKey(base: string, userId?: string | null): string;

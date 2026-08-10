import { safeRead, safeRemove, safeWrite } from './storage.ts';

const PREFIX = 'shababuna-sync-queue-v2';
const MAX_ATTEMPTS = 8;
const MAX_BACKOFF_MS = 30 * 1000;

type QueueMutation = {
  id: string;
  userId?: string | null;
  attempts?: number;
  createdAt?: number;
  nextRetryAt?: number;
  lastError?: string;
  lastAttemptAt?: number;
  status?: string;
  [key: string]: unknown;
};

export const queueKey = (userId: string | null | undefined): string =>
  `${PREFIX}:${userId || 'guest'}`;

export const queueRead = (userId: string | null | undefined): QueueMutation[] =>
  safeRead(queueKey(userId), []) as QueueMutation[];

export function queueClear(userId: string | null | undefined): boolean {
  return safeRemove(queueKey(userId));
}

export function enqueueMutation(
  userIdOrMutation: string | null | QueueMutation,
  maybeMutation?: QueueMutation,
): QueueMutation[] {
  const legacy = maybeMutation === undefined && typeof userIdOrMutation === 'object';
  const userId = legacy ? null : (userIdOrMutation as string | null);
  const mutation = (legacy ? userIdOrMutation : maybeMutation) as QueueMutation | undefined;
  if (!mutation?.id) return queueRead(userId);
  const queue = queueRead(userId);
  if (queue.some((item) => item.id === mutation.id)) return queue;

  const now = Date.now();
  const next = [
    ...queue,
    {
      attempts: 0,
      createdAt: now,
      nextRetryAt: now,
      userId,
      ...mutation,
    },
  ];
  safeWrite(queueKey(userId), next);
  return next;
}

export function removeMutation(
  userIdOrId: string | null,
  maybeId?: string,
): QueueMutation[] {
  const legacy = maybeId === undefined;
  const userId = legacy ? null : userIdOrId;
  const id = legacy ? userIdOrId : maybeId;
  const next = queueRead(userId).filter((item) => item.id !== id);
  safeWrite(queueKey(userId), next);
  return next;
}

export function updateMutation(
  userId: string | null | undefined,
  id: string,
  patch: Partial<QueueMutation>,
): QueueMutation[] {
  const next = queueRead(userId).map((item) => (item.id === id ? { ...item, ...patch } : item));
  safeWrite(queueKey(userId), next);
  return next;
}

export const backoffMs = (attempt: unknown): number =>
  Math.min(MAX_BACKOFF_MS, 500 * 2 ** Math.max(0, Number(attempt) || 0));

export async function replayQueue(
  userId: string | null | undefined,
  handler: (mutation: QueueMutation) => Promise<void>,
  options: {
    signal?: AbortSignal;
    now?: () => number;
    stopOnError?: boolean;
  } = {},
): Promise<{ processed: number; failed: number; remaining: number }> {
  if (!userId) return { processed: 0, failed: 0, remaining: 0 };

  const { signal, now = () => Date.now(), stopOnError = false } = options;
  let processed = 0;
  let failed = 0;

  for (const mutation of queueRead(userId)) {
    if (signal?.aborted) break;
    if (mutation.userId !== userId) continue;
    if (Number(mutation.nextRetryAt || 0) > now()) continue;
    if (Number(mutation.attempts || 0) >= MAX_ATTEMPTS) continue;

    try {
      await handler(mutation);
      removeMutation(userId, mutation.id);
      processed += 1;
    } catch (error) {
      failed += 1;
      const attempts = Number(mutation.attempts || 0) + 1;
      updateMutation(userId, mutation.id, {
        attempts,
        lastError: String(
          error && typeof error === 'object' && 'message' in error
            ? (error as { message?: unknown }).message
            : error,
        ),
        lastAttemptAt: now(),
        nextRetryAt: now() + backoffMs(attempts),
        status: attempts >= MAX_ATTEMPTS ? 'failed' : 'pending',
      });
      if (stopOnError) break;
    }
  }

  return {
    processed,
    failed,
    remaining: queueRead(userId).length,
  };
}

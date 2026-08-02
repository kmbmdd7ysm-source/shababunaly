import { safeRead, safeRemove, safeWrite } from './storage';

const PREFIX = 'shababuna-sync-queue-v2';
const MAX_ATTEMPTS = 8;
const MAX_BACKOFF_MS = 30 * 1000;

export const queueKey = (userId) => `${PREFIX}:${userId || 'guest'}`;

export const queueRead = (userId) => safeRead(queueKey(userId), []);

export function queueClear(userId) {
  return safeRemove(queueKey(userId));
}

export function enqueueMutation(userIdOrMutation, maybeMutation) {
  const legacy = maybeMutation === undefined && typeof userIdOrMutation === 'object';
  const userId = legacy ? null : userIdOrMutation;
  const mutation = legacy ? userIdOrMutation : maybeMutation;
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

export function removeMutation(userIdOrId, maybeId) {
  const legacy = maybeId === undefined;
  const userId = legacy ? null : userIdOrId;
  const id = legacy ? userIdOrId : maybeId;
  const next = queueRead(userId).filter((item) => item.id !== id);
  safeWrite(queueKey(userId), next);
  return next;
}

export function updateMutation(userId, id, patch) {
  const next = queueRead(userId).map((item) => (item.id === id ? { ...item, ...patch } : item));
  safeWrite(queueKey(userId), next);
  return next;
}

export const backoffMs = (attempt) =>
  Math.min(MAX_BACKOFF_MS, 500 * 2 ** Math.max(0, Number(attempt) || 0));

export async function replayQueue(userId, handler, options = {}) {
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
        lastError: String(error?.message || error),
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

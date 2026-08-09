/** Ambient types for designStudio.js until full migration. No broad any. */
export function normalizeStudio(input: unknown): Record<string, unknown>;
export function createDefaultStudio(input?: unknown): Record<string, unknown>;
export function autosaveDesignStudio(
  id: string,
  design: unknown,
  studio: unknown,
): Promise<{ id: string }>;
export function createSecureDesignShare(
  designId: string,
  mode: string,
  version: number,
): Promise<string>;
export function loadSharedDesign(token: string): Promise<{ studio: unknown }>;
export function addDesignLayer(
  studio: unknown,
  layer: unknown,
  design?: unknown,
): Record<string, unknown>;
export function duplicateDesignLayer(
  studio: unknown,
  id: string,
  design?: unknown,
): Record<string, unknown>;
export function moveDesignLayer(
  studio: unknown,
  id: string,
  direction: string,
  design?: unknown,
): Record<string, unknown>;
export function addDesignComment(
  studio: unknown,
  comment: unknown,
  design?: unknown,
): Record<string, unknown>;
export function resolveDesignComment(
  studio: unknown,
  id: string,
  design?: unknown,
): Record<string, unknown>;
export function createHistory<T>(present: T): {
  past: T[];
  present: T;
  future: T[];
};
export function undoHistory<T>(history: {
  past: T[];
  present: T;
  future: T[];
}): { past: T[]; present: T; future: T[] };
export function redoHistory<T>(history: {
  past: T[];
  present: T;
  future: T[];
}): { past: T[]; present: T; future: T[] };
export function buildProductionMetadata(
  meta: unknown,
  studio: unknown,
): Record<string, unknown>;

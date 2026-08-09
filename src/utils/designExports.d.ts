export const escapeXml: (value: unknown) => string;
export const safeHex: (value: unknown, fallback: string) => string;
export function productShape(
  preview: string,
  fill: string,
  stroke: string,
  accent: string,
  view: string,
): string;
export function buildDesignViewSvg(input?: Record<string, unknown>): string;
export function crc32(bytes: Uint8Array | number[]): number;
export function u16(value: number): Uint8Array;
export function u32(value: number): Uint8Array;
export function createStoreZip(
  files: Array<{ name: string; data: Uint8Array | string }>,
): Blob;
export function buildProductionPackage(input?: Record<string, unknown>): Blob;

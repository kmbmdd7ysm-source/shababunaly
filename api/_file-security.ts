import { createHash } from 'node:crypto';

const TYPES = Object.freeze({
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  pdf: 'application/pdf',
  csv: 'text/csv',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
});
const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_TOTAL_BYTES = 3 * 1024 * 1024;
const MAX_FILES = 5;

const safeName = (value: unknown) =>
  String(value)
    .normalize('NFKC')
    // Strip C0 controls deliberately — required for upload filename hygiene.
    // eslint-disable-next-line no-control-regex -- intentional control-character removal
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[^A-Za-z0-9._ -]/g, '_')
    .slice(0, 180);
const extensionOf = (name: unknown): string =>
  (safeName(name).split('.').pop() || '').toLowerCase();
const starts = (buffer: Uint8Array, bytes: number[]) =>
  bytes.every((value, index) => buffer[index] === value);
const asAscii = (buffer: Uint8Array, start: number, end: number): string =>
  Buffer.from(buffer.subarray(start, end)).toString('ascii');
const asUtf8 = (buffer: Uint8Array, start: number, end: number): string =>
  Buffer.from(buffer.subarray(start, end)).toString('utf8');

function detectMime(buffer: Uint8Array, extension: string): string {
  if (starts(buffer, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (starts(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (buffer.length >= 12 && asAscii(buffer, 0, 4) === 'RIFF' && asAscii(buffer, 8, 12) === 'WEBP')
    return 'image/webp';
  if (asAscii(buffer, 0, 5) === '%PDF-') return 'application/pdf';
  if (extension === 'xlsx' && starts(buffer, [0x50, 0x4b, 0x03, 0x04])) return TYPES.xlsx;
  if (extension === 'csv' && !buffer.includes(0x00)) {
    const text = asUtf8(buffer, 0, Math.min(buffer.length, 4096));
    if (!text.includes('\ufffd')) return 'text/csv';
  }
  return '';
}

export function validateEncodedFiles(inputFiles: unknown) {
  const files = Array.isArray(inputFiles) ? inputFiles : [];
  if (files.length > MAX_FILES) throw new Error('too_many_files');
  let total = 0;
  return files.map((raw, index) => {
    const file = (raw && typeof raw === 'object' ? raw : {}) as {
      name?: unknown;
      base64?: unknown;
      mime?: unknown;
      role?: unknown;
    };
    const name = safeName(file.name || `file-${index + 1}`);
    const extension = extensionOf(name);
    const expectedMime = (TYPES as Record<string, string>)[extension];
    if (!expectedMime || extension === 'svg') throw new Error('unsupported_file_type');
    const value = String(file.base64 || '').replace(/^data:[^;]+;base64,/, '');
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(value) || value.length % 4 !== 0)
      throw new Error('invalid_file_encoding');
    const buffer = Buffer.from(value, 'base64');
    if (!buffer.length || buffer.length > MAX_FILE_BYTES) throw new Error('invalid_file_size');
    total += buffer.length;
    if (total > MAX_TOTAL_BYTES) throw new Error('files_too_large');
    if (
      starts(buffer, [0x4d, 0x5a]) ||
      starts(buffer, [0x7f, 0x45, 0x4c, 0x46]) ||
      asAscii(buffer, 0, 2) === '#!'
    )
      throw new Error('executable_file_rejected');
    const detectedMime = detectMime(buffer, extension);
    if (!detectedMime || detectedMime !== expectedMime) throw new Error('file_signature_mismatch');
    const declaredMime = String(file.mime || '')
      .toLowerCase()
      .slice(0, 160);
    if (
      declaredMime &&
      declaredMime !== detectedMime &&
      !(extension === 'jpg' && declaredMime === 'image/jpg')
    )
      throw new Error('file_mime_mismatch');
    const role = file?.role === 'product_image' ? 'product_image' : 'additional_file';
    if (role === 'product_image' && !IMAGE_EXTENSIONS.has(extension))
      throw new Error('product_image_must_be_image');
    return {
      name,
      extension,
      declaredMime: declaredMime || detectedMime,
      detectedMime,
      buffer,
      role,
      byteSize: buffer.length,
      sha256: createHash('sha256').update(buffer).digest('hex'),
    };
  });
}

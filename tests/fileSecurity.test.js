import { describe, expect, it } from './test-api.js';
import { validateEncodedFiles } from '../api/_file-security.js';
const file = (name, mime, bytes, role = 'additional_file') => ({
  name,
  mime,
  role,
  base64: Buffer.from(bytes).toString('base64'),
});
const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0];
describe('special-request upload validation', () => {
  it('accepts supported signatures and normalizes names', () => {
    expect(
      validateEncodedFiles([file('product.png', 'image/png', png, 'product_image')])[0],
    ).toMatchObject({ extension: 'png', detectedMime: 'image/png', role: 'product_image' });
    expect(
      validateEncodedFiles([file('photo.jpg', 'image/jpg', [0xff, 0xd8, 0xff, 0])])[0].detectedMime,
    ).toBe('image/jpeg');
    expect(
      validateEncodedFiles([file('x.webp', 'image/webp', Buffer.from('RIFFxxxxWEBP'))])[0]
        .detectedMime,
    ).toBe('image/webp');
    expect(
      validateEncodedFiles([file('x.pdf', 'application/pdf', Buffer.from('%PDF-1.4'))])[0]
        .detectedMime,
    ).toBe('application/pdf');
    expect(
      validateEncodedFiles([
        file(
          'x.xlsx',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          [0x50, 0x4b, 0x03, 0x04],
        ),
      ])[0].detectedMime,
    ).toContain('spreadsheetml');
    expect(
      validateEncodedFiles([file('x.csv', 'text/csv', Buffer.from('name,size\nA,M'))])[0]
        .detectedMime,
    ).toBe('text/csv');
  });
  it('rejects SVG and executable payloads', () => {
    expect(() =>
      validateEncodedFiles([file('image.svg', 'image/svg+xml', Buffer.from('<svg/>'))]),
    ).toThrow('unsupported_file_type');
    expect(() =>
      validateEncodedFiles([file('image.png', 'image/png', [0x4d, 0x5a, 0, 0])]),
    ).toThrow('executable_file_rejected');
    expect(() =>
      validateEncodedFiles([file('image.png', 'image/png', [0x7f, 0x45, 0x4c, 0x46])]),
    ).toThrow('executable_file_rejected');
    expect(() =>
      validateEncodedFiles([file('x.csv', 'text/csv', Buffer.from('#!/bin/sh'))]),
    ).toThrow('executable_file_rejected');
  });
  it('rejects encoding, extension, signature, declared MIME and role mismatch', () => {
    expect(() =>
      validateEncodedFiles([{ name: 'x.png', mime: 'image/png', base64: '***' }]),
    ).toThrow('invalid_file_encoding');
    expect(() =>
      validateEncodedFiles([file('x.exe', 'application/octet-stream', [1, 2, 3])]),
    ).toThrow('unsupported_file_type');
    expect(() => validateEncodedFiles([file('document.pdf', 'application/pdf', png)])).toThrow(
      'file_signature_mismatch',
    );
    expect(() => validateEncodedFiles([file('image.png', 'image/jpeg', png)])).toThrow(
      'file_mime_mismatch',
    );
    expect(() =>
      validateEncodedFiles([
        file('document.pdf', 'application/pdf', Buffer.from('%PDF-1.4'), 'product_image'),
      ]),
    ).toThrow('product_image_must_be_image');
  });
  it('enforces individual, count and aggregate limits', () => {
    expect(() => validateEncodedFiles([{ name: 'x.png', mime: 'image/png', base64: '' }])).toThrow(
      'invalid_file_size',
    );
    const big = Buffer.alloc(2 * 1024 * 1024 + 1);
    big.set(png);
    expect(() => validateEncodedFiles([file('big.png', 'image/png', big)])).toThrow(
      'invalid_file_size',
    );
    const small = file('x.png', 'image/png', png);
    expect(() =>
      validateEncodedFiles(Array.from({ length: 6 }, (_, i) => ({ ...small, name: `${i}.png` }))),
    ).toThrow('too_many_files');
    const medium = Buffer.alloc(1024 * 1024 + 100);
    medium.set(png);
    expect(() =>
      validateEncodedFiles([0, 1, 2].map((i) => file(`${i}.png`, 'image/png', medium))),
    ).toThrow('files_too_large');
  });
});

describe('upload validator edge coverage', () => {
  it('uses safe names and default roles while rejecting extensionless uploads', () => {
    const result = validateEncodedFiles([
      { name: '../x.png', mime: 'image/png', base64: Buffer.from(png).toString('base64') },
    ])[0];
    expect(result.name).toContain('x.png');
    expect(result.role).toBe('additional_file');
    expect(result.sha256).toHaveLength(64);
    expect(() =>
      validateEncodedFiles([{ mime: 'image/png', base64: Buffer.from(png).toString('base64') }]),
    ).toThrow('unsupported_file_type');
  });
  it('rejects supported extensions with unknown or corrupt signatures', () => {
    expect(() => validateEncodedFiles([file('bad.png', 'image/png', [1, 2, 3, 4])])).toThrow(
      'file_signature_mismatch',
    );
    expect(() => validateEncodedFiles([file('bad.csv', 'text/csv', [65, 0, 66])])).toThrow(
      'file_signature_mismatch',
    );
    expect(() => validateEncodedFiles([file('bad.csv', 'text/csv', [0xff, 0xfe, 0xfd])])).toThrow(
      'file_signature_mismatch',
    );
  });
  it('accepts a data URL and sanitizes unsafe names', () => {
    const result = validateEncodedFiles([
      {
        name: '../球\u0000.png',
        mime: 'image/png',
        role: 'unknown',
        base64: `data:image/png;base64,${Buffer.from(png).toString('base64')}`,
      },
    ])[0];
    expect(result.name).toContain('_.png');
    expect(result.role).toBe('additional_file');
  });
  it('rejects base64 whose length is not divisible by four', () => {
    expect(() =>
      validateEncodedFiles([{ name: 'x.png', mime: 'image/png', base64: 'AAA' }]),
    ).toThrow('invalid_file_encoding');
  });
});

describe('upload validator complete input variants', () => {
  it('handles non-array inputs and empty declared MIME safely', () => {
    expect(validateEncodedFiles(null)).toEqual([]);
    const result = validateEncodedFiles([file('PHOTO.PNG', '', png)])[0];
    expect(result.extension).toBe('png');
    expect(result.declaredMime).toBe('image/png');
  });
  it('rejects null base64 and mismatched jpg aliases only when invalid', () => {
    expect(() =>
      validateEncodedFiles([{ name: 'x.png', mime: 'image/png', base64: null }]),
    ).toThrow('invalid_file_size');
    expect(
      validateEncodedFiles([file('x.jpg', 'image/jpg', [0xff, 0xd8, 0xff])])[0].declaredMime,
    ).toBe('image/jpg');
  });
});

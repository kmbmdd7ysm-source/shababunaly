import { normalizeRoster, parseRosterCsv } from '../data/customization.js';

const MAX_SPREADSHEET_BYTES = 8 * 1024 * 1024;
const textDecoder = new TextDecoder('utf-8');

function readU16(view, offset) {
  return view.getUint16(offset, true);
}
function readU32(view, offset) {
  return view.getUint32(offset, true);
}

export function decodeXml(value = '') {
  return String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

export async function inflateRaw(bytes) {
  if (typeof DecompressionStream !== 'function') throw new Error('xlsx_deflate_unsupported');
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function unzipEntries(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let offset = Math.max(0, bytes.length - 65_557); offset <= bytes.length - 22; offset += 1) {
    if (readU32(view, offset) === 0x06054b50) eocd = offset;
  }
  if (eocd < 0) throw new Error('xlsx_zip_directory_missing');
  const totalEntries = readU16(view, eocd + 10);
  let cursor = readU32(view, eocd + 16);
  const entries = new Map();
  for (let index = 0; index < totalEntries; index += 1) {
    if (readU32(view, cursor) !== 0x02014b50) throw new Error('xlsx_zip_entry_invalid');
    const method = readU16(view, cursor + 10);
    const compressedSize = readU32(view, cursor + 20);
    const uncompressedSize = readU32(view, cursor + 24);
    const nameLength = readU16(view, cursor + 28);
    const extraLength = readU16(view, cursor + 30);
    const commentLength = readU16(view, cursor + 32);
    const localOffset = readU32(view, cursor + 42);
    const name = textDecoder
      .decode(bytes.slice(cursor + 46, cursor + 46 + nameLength))
      .replace(/^\/+/, '');
    if (readU32(view, localOffset) !== 0x04034b50) throw new Error('xlsx_zip_local_entry_invalid');
    const localNameLength = readU16(view, localOffset + 26);
    const localExtraLength = readU16(view, localOffset + 28);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.slice(dataOffset, dataOffset + compressedSize);
    let data;
    if (method === 0) data = compressed;
    else if (method === 8) data = await inflateRaw(compressed);
    else throw new Error('xlsx_zip_compression_unsupported');
    if (uncompressedSize && data.byteLength !== uncompressedSize)
      throw new Error('xlsx_zip_size_mismatch');
    entries.set(name, data);
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

export function parseSharedStrings(xml = '') {
  const values = [];
  for (const item of String(xml).matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/gi)) {
    const text = [...item[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/gi)]
      .map((match) => decodeXml(match[1]))
      .join('');
    values.push(text);
  }
  return values;
}

export function columnIndex(reference = '') {
  const letters =
    String(reference)
      .match(/^[A-Z]+/i)?.[0]
      ?.toUpperCase() || 'A';
  let result = 0;
  for (const letter of letters) result = result * 26 + letter.charCodeAt(0) - 64;
  return Math.max(0, result - 1);
}

export function parseWorksheet(xml = '', sharedStrings = []) {
  const rows = [];
  for (const rowMatch of String(xml).matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/gi)) {
    const row = [];
    for (const cellMatch of rowMatch[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/gi)) {
      const attrs = cellMatch[1];
      const body = cellMatch[2];
      const ref = attrs.match(/\br="([^"]+)"/i)?.[1] || `A${rows.length + 1}`;
      const type = attrs.match(/\bt="([^"]+)"/i)?.[1] || '';
      const inline = body.match(/<is\b[^>]*>([\s\S]*?)<\/is>/i)?.[1] || '';
      const raw =
        body.match(/<v\b[^>]*>([\s\S]*?)<\/v>/i)?.[1] ??
        [...inline.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/gi)].map((match) => match[1]).join('');
      const decoded = decodeXml(raw);
      const value = type === 's' ? (sharedStrings[Number(decoded)] ?? '') : decoded;
      row[columnIndex(ref)] = value;
    }
    rows.push(Array.from({ length: row.length }, (_, index) => row[index] ?? ''));
  }
  return rows;
}

export function matrixToCsv(rows) {
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  return rows.map((row) => row.map(escape).join(',')).join('\n');
}

export function resolveFirstWorksheet(entries) {
  const workbookBytes = entries.get('xl/workbook.xml');
  const relationsBytes = entries.get('xl/_rels/workbook.xml.rels');
  if (workbookBytes && relationsBytes) {
    const workbook = textDecoder.decode(workbookBytes);
    const relations = textDecoder.decode(relationsBytes);
    const relationId = workbook.match(/<sheet\b[^>]*\br:id="([^"]+)"/i)?.[1];
    if (relationId) {
      const relationRegex = new RegExp(
        `<Relationship\\b[^>]*\\bId="${relationId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*\\bTarget="([^"]+)"`,
        'i',
      );
      const target = relations.match(relationRegex)?.[1];
      if (target) {
        const path = target.startsWith('/')
          ? target.slice(1)
          : `xl/${target.replace(/^\.\//, '')}`.replace(/\/[^/]+\/\.\.\//g, '/');
        if (entries.has(path)) return path;
      }
    }
  }
  return [...entries.keys()].find((name) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(name)) || null;
}

export async function parseRosterXlsxBuffer(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (!bytes.byteLength || bytes.byteLength > MAX_SPREADSHEET_BYTES)
    throw new Error('xlsx_size_invalid');
  const entries = await unzipEntries(bytes);
  const worksheetPath = resolveFirstWorksheet(entries);
  if (!worksheetPath) throw new Error('xlsx_worksheet_missing');
  const shared = entries.get('xl/sharedStrings.xml');
  const sharedStrings = shared ? parseSharedStrings(textDecoder.decode(shared)) : [];
  const matrix = parseWorksheet(textDecoder.decode(entries.get(worksheetPath)), sharedStrings);
  return normalizeRoster(parseRosterCsv(matrixToCsv(matrix)));
}

export async function parseRosterFile(file) {
  if (!file) return [];
  if (Number(file.size || 0) > MAX_SPREADSHEET_BYTES) throw new Error('roster_file_too_large');
  const name = String(file.name || '').toLowerCase();
  const type = String(file.type || '').toLowerCase();
  if (name.endsWith('.csv') || type.includes('csv') || type === 'text/plain')
    return parseRosterCsv(await file.text());
  if (name.endsWith('.xlsx') || type.includes('spreadsheetml'))
    return parseRosterXlsxBuffer(await file.arrayBuffer());
  throw new Error('roster_file_type_unsupported');
}

export const ROSTER_FILE_ACCEPT =
  '.csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

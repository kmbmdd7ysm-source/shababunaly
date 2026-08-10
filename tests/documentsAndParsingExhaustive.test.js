import './setup.js';
import { deflateRawSync } from 'node:zlib';
import { afterEach, describe, expect, it, vi } from './test-api.js';
import {
  decodeXml,
  inflateRaw,
  unzipEntries,
  parseSharedStrings,
  columnIndex,
  parseWorksheet,
  matrixToCsv,
  resolveFirstWorksheet,
  parseRosterXlsxBuffer,
  parseRosterFile,
  ROSTER_FILE_ACCEPT,
} from '../src/utils/rosterSpreadsheet.ts';
import { createStoreZip } from '../src/utils/designExports.js';
import { createTextPdf, downloadBlob, downloadDesignDocuments } from '../src/utils/simplePdf.ts';
import { createDefaultStudio } from '../src/services/designStudio.ts';
import { safeInternalReturnPath } from '../src/utils/safeReturnPath.ts';
import {
  getSearchSuggestions,
  searchSite,
  getSearchFacets,
  normalizeSearchText,
  SEARCH_PAGES,
  POPULAR_SEARCHES,
} from '../src/utils/search.ts';

const originalDocument = globalThis.document;
const originalUrl = globalThis.URL;
const originalDecompression = globalThis.DecompressionStream;
afterEach(() => {
  vi.restoreAllMocks();
  if (originalDocument === undefined) delete globalThis.document;
  else globalThis.document = originalDocument;
  if (originalUrl === undefined) delete globalThis.URL;
  else globalThis.URL = originalUrl;
  if (originalDecompression === undefined) delete globalThis.DecompressionStream;
  else globalThis.DecompressionStream = originalDecompression;
});

const u16 = (n) => [n & 255, (n >>> 8) & 255];
const u32 = (n) => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];
function findSig(bytes, sig) {
  outer: for (let i = 0; i <= bytes.length - sig.length; i += 1) {
    for (let j = 0; j < sig.length; j += 1) if (bytes[i + j] !== sig[j]) continue outer;
    return i;
  }
  return -1;
}
function deflatedZip(name, text) {
  const nameBytes = new TextEncoder().encode(name);
  const data = new TextEncoder().encode(text);
  const compressed = deflateRawSync(data);
  const local = new Uint8Array([
    80,
    75,
    3,
    4,
    20,
    0,
    0,
    0,
    8,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    ...u32(compressed.length),
    ...u32(data.length),
    ...u16(nameBytes.length),
    0,
    0,
    ...nameBytes,
    ...compressed,
  ]);
  const central = new Uint8Array([
    80,
    75,
    1,
    2,
    20,
    0,
    20,
    0,
    0,
    0,
    8,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    ...u32(compressed.length),
    ...u32(data.length),
    ...u16(nameBytes.length),
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    ...u32(0),
    ...nameBytes,
  ]);
  const end = new Uint8Array([
    80,
    75,
    5,
    6,
    0,
    0,
    0,
    0,
    1,
    0,
    1,
    0,
    ...u32(central.length),
    ...u32(local.length),
    0,
    0,
  ]);
  return new Uint8Array([...local, ...central, ...end]);
}

async function workbookZip({ shared = false, relationship = true, absolute = false } = {}) {
  const worksheet = shared
    ? '<?xml version="1.0"?><worksheet><sheetData><row><c r="A1" t="s"><v>0</v></c><c r="B1" t="inlineStr"><is><t>Number</t></is></c><c r="C1"><v>7</v></c><c><is><t>Size</t></is></c></row><row><c r="A2" t="s"><v>1</v></c><c r="B2"><v>8</v></c><c r="C2" t="inlineStr"><is><t>L</t></is></c></row></sheetData></worksheet>'
    : '<?xml version="1.0"?><worksheet><sheetData><row><c r="A1" t="inlineStr"><is><t>Player Name</t></is></c><c r="B1" t="inlineStr"><is><t>Number</t></is></c><c r="C1" t="inlineStr"><is><t>Jersey Size</t></is></c></row><row><c r="A2" t="inlineStr"><is><t>One</t></is></c><c r="B2"><v>7</v></c><c r="C2"><v>L</v></c></row></sheetData></worksheet>';
  const files = [{ name: 'xl/worksheets/sheet1.xml', data: worksheet }];
  if (relationship) {
    files.push(
      {
        name: 'xl/workbook.xml',
        data: '<workbook xmlns:r="x"><sheets><sheet r:id="rId.1"/></sheets></workbook>',
      },
      {
        name: 'xl/_rels/workbook.xml.rels',
        data: `<Relationships><Relationship Id="rId.1" Target="${absolute ? '/xl/worksheets/sheet1.xml' : './worksheets/sheet1.xml'}"/></Relationships>`,
      },
    );
  }
  if (shared)
    files.push({
      name: 'xl/sharedStrings.xml',
      data: '<sst><si><t>Player &amp; Name</t></si><si><r><t>A&#108;</t></r><r><t>&#x69;ce</t></r></si></sst>',
    });
  return new Uint8Array(await createStoreZip(files).arrayBuffer());
}

describe('XLSX parser internals exhaustive', { concurrency: false }, () => {
  it('decodes XML entities, columns, rows and CSV escaping', () => {
    expect(decodeXml('&#65;&#x42;&lt;&gt;&quot;&apos;&amp;')).toBe('AB<>"\'&');
    expect(parseSharedStrings('<sst><si><t>A&amp;</t><t>B</t></si></sst>')).toEqual(['A&B']);
    expect(parseSharedStrings()).toEqual([]);
    expect(columnIndex('A1')).toBe(0);
    expect(columnIndex('Z9')).toBe(25);
    expect(columnIndex('AA3')).toBe(26);
    expect(columnIndex('')).toBe(0);
    const rows = parseWorksheet(
      '<worksheet><row><c r="B1" t="s"><v>0</v></c><c><is><t>A&amp;B</t></is></c></row><row><c r="A2"><v>5</v></c></row></worksheet>',
      ['Shared'],
    );
    expect(rows).toEqual([['A&B', 'Shared'], ['5']]);
    expect(parseWorksheet()).toEqual([]);
    expect(matrixToCsv([['a"b', null]])).toBe('"a""b",""');
  });

  it('inflates deflate streams and fails when the runtime does not support them', async () => {
    const compressed = deflateRawSync(Buffer.from('hello'));
    const output = await inflateRaw(compressed);
    expect(new TextDecoder().decode(output)).toBe('hello');
    vi.stubGlobal('DecompressionStream', undefined);
    let error;
    try {
      await inflateRaw(compressed);
    } catch (e) {
      error = e;
    }
    expect(error.message).toBe('xlsx_deflate_unsupported');
  });

  it('reads stored and deflated ZIP entries and rejects every corrupt structure', async () => {
    const stored = new Uint8Array(
      await createStoreZip([{ name: '/a.txt', data: 'A' }]).arrayBuffer(),
    );
    const entries = await unzipEntries(stored.buffer);
    expect(new TextDecoder().decode(entries.get('a.txt'))).toBe('A');
    const deflated = deflatedZip('b.txt', 'B');
    const deflatedEntries = await unzipEntries(deflated);
    expect(new TextDecoder().decode(deflatedEntries.get('b.txt'))).toBe('B');
    let error;
    try {
      await unzipEntries(new Uint8Array([1, 2, 3]));
    } catch (e) {
      error = e;
    }
    expect(error.message).toBe('xlsx_zip_directory_missing');
    const badCentral = stored.slice();
    const central = findSig(badCentral, [80, 75, 1, 2]);
    badCentral[central] = 0;
    try {
      await unzipEntries(badCentral);
    } catch (e) {
      error = e;
    }
    expect(error.message).toBe('xlsx_zip_entry_invalid');
    const badLocal = stored.slice();
    badLocal[0] = 0;
    try {
      await unzipEntries(badLocal);
    } catch (e) {
      error = e;
    }
    expect(error.message).toBe('xlsx_zip_local_entry_invalid');
    const unsupported = stored.slice();
    const c = findSig(unsupported, [80, 75, 1, 2]);
    unsupported[c + 10] = 99;
    unsupported[8] = 99;
    try {
      await unzipEntries(unsupported);
    } catch (e) {
      error = e;
    }
    expect(error.message).toBe('xlsx_zip_compression_unsupported');
    const mismatch = stored.slice();
    const mc = findSig(mismatch, [80, 75, 1, 2]);
    mismatch[mc + 24] = 9;
    try {
      await unzipEntries(mismatch);
    } catch (e) {
      error = e;
    }
    expect(error.message).toBe('xlsx_zip_size_mismatch');
  });

  it('resolves workbook relationships and worksheet fallback paths', async () => {
    const related = await unzipEntries(await workbookZip());
    expect(resolveFirstWorksheet(related)).toBe('xl/worksheets/sheet1.xml');
    const absolute = await unzipEntries(await workbookZip({ absolute: true }));
    expect(resolveFirstWorksheet(absolute)).toBe('xl/worksheets/sheet1.xml');
    const fallback = await unzipEntries(await workbookZip({ relationship: false }));
    expect(resolveFirstWorksheet(fallback)).toBe('xl/worksheets/sheet1.xml');
    expect(resolveFirstWorksheet(new Map())).toBe(null);
    const broken = new Map([
      ['xl/workbook.xml', new TextEncoder().encode('<workbook><sheet r:id="missing"/></workbook>')],
      ['xl/_rels/workbook.xml.rels', new TextEncoder().encode('<Relationships/>')],
    ]);
    expect(resolveFirstWorksheet(broken)).toBe(null);
  });

  it('parses shared-string and inline XLSX files and rejects invalid workbooks', async () => {
    const inline = await parseRosterXlsxBuffer((await workbookZip()).buffer);
    expect(inline[0]).toMatchObject({ name: 'One', number: '7', jerseySize: 'L' });
    const shared = await parseRosterXlsxBuffer(await workbookZip({ shared: true }));
    expect(shared[0].name).toBe('Alice');
    let error;
    try {
      await parseRosterXlsxBuffer(new Uint8Array());
    } catch (e) {
      error = e;
    }
    expect(error.message).toBe('xlsx_size_invalid');
    const tooLarge = new Uint8Array(8 * 1024 * 1024 + 1);
    try {
      await parseRosterXlsxBuffer(tooLarge);
    } catch (e) {
      error = e;
    }
    expect(error.message).toBe('xlsx_size_invalid');
    const noSheet = new Uint8Array(
      await createStoreZip([{ name: 'xl/workbook.xml', data: '<workbook/>' }]).arrayBuffer(),
    );
    try {
      await parseRosterXlsxBuffer(noSheet);
    } catch (e) {
      error = e;
    }
    expect(error.message).toBe('xlsx_worksheet_missing');
  });

  it('routes CSV/XLSX file types and applies size/type protection', async () => {
    expect(await parseRosterFile(null)).toEqual([]);
    expect(ROSTER_FILE_ACCEPT).toContain('.xlsx');
    const csv = {
      name: 'ROSTER.CSV',
      type: '',
      size: 10,
      text: async () => 'Player Name,Number,Jersey Size\nOne,1,M',
    };
    expect((await parseRosterFile(csv))[0].number).toBe('1');
    const text = { name: 'roster', type: 'text/plain', size: 10, text: async () => 'One,2,L' };
    expect((await parseRosterFile(text))[0].number).toBe('2');
    const byMime = {
      name: 'roster.data',
      type: 'text/csv;charset=utf-8',
      size: 10,
      text: async () => 'One,3,S',
    };
    expect((await parseRosterFile(byMime))[0].number).toBe('3');
    const xlsxBytes = await workbookZip();
    const xlsx = {
      name: 'roster.xlsx',
      type: '',
      size: xlsxBytes.length,
      arrayBuffer: async () => xlsxBytes.buffer,
    };
    expect((await parseRosterFile(xlsx))[0].name).toBe('One');
    const xlsxMime = {
      name: 'data',
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: xlsxBytes.length,
      arrayBuffer: async () => xlsxBytes,
    };
    expect((await parseRosterFile(xlsxMime))[0].name).toBe('One');
    let error;
    try {
      await parseRosterFile({ name: 'big.csv', type: 'text/csv', size: 9 * 1024 * 1024 });
    } catch (e) {
      error = e;
    }
    expect(error.message).toBe('roster_file_too_large');
    try {
      await parseRosterFile({ name: 'bad.xls', type: 'application/vnd.ms-excel', size: 1 });
    } catch (e) {
      error = e;
    }
    expect(error.message).toBe('roster_file_type_unsupported');
  });
});

describe('PDF/document generation exhaustive', () => {
  it('creates multi-page text PDFs with escaped metadata, strings and table rows', async () => {
    const rows = Array.from({ length: 120 }, (_, i) =>
      i % 2 ? [`K(${i})`, `V\\${i}`] : `Row ${i}\nnext`,
    );
    const blob = createTextPdf({
      title: 'T(é)\\',
      subtitle: 'Sub',
      sections: [
        { heading: 'First', rows },
        { heading: '', rows: [] },
      ],
    });
    expect(blob.type).toBe('application/pdf');
    const text = new TextDecoder().decode(await blob.arrayBuffer());
    expect(text).toContain('%PDF-1.4');
    expect(text).toContain('/Count 3');
    expect(text).toContain('T\\(e?\\)\\\\');
    expect(text).toContain('First');
    const defaults = createTextPdf();
    expect(new TextDecoder().decode(await defaults.arrayBuffer())).toContain('SHABABUNA');
  });

  it('creates complete proof and tech documents for no-roster, artwork and long-roster cases', async () => {
    const design = {
      productType: 'game-set',
      variant: 'away',
      quantity: 20,
      primary: 'bad',
      secondary: '#ffffff',
      accent: '#abcdef',
      pattern: 'geometric',
      neckline: 'crew',
      font: 'block',
      notes: '',
      teamName: 'TEAM',
      number: '10',
    };
    const studio = createDefaultStudio({ ...design, logoPreview: 'data:image/png;base64,AA==' });
    studio.layers.push({
      id: 'hidden',
      type: 'text',
      view: 'front',
      label: 'Hidden',
      content: 'NO',
      x: 1,
      y: 1,
      width: 1,
      rotation: 0,
      color: '#fff',
      font: 'Inter',
      visible: false,
      locked: false,
      zIndex: 1,
    });
    studio.layers.push({
      id: 'data',
      type: 'logo',
      view: 'side',
      label: 'Embedded',
      content: 'data:image/png;base64,AA==',
      x: 50,
      y: 50,
      width: 10,
      rotation: 45,
      color: '#fff',
      font: 'Inter',
      visible: true,
      locked: false,
      zIndex: 99,
    });
    const none = downloadDesignDocuments({
      design,
      studio,
      productLabel: 'Set',
      reference: 'R(1)',
    });
    let proof = new TextDecoder().decode(await none.proof.arrayBuffer());
    let tech = new TextDecoder().decode(await none.tech.arrayBuffer());
    expect(proof).toContain('No roster attached');
    expect(tech).toContain('[embedded artwork]');
    expect(tech).toContain('No production notes supplied');
    expect(proof).toContain('Editable vector artwork');
    const roster = Array.from({ length: 80 }, (_, i) => ({
      name: `Player ${i}`,
      jerseyName: `P${i}`,
      number: String(i % 99),
      jerseySize: 'L',
      shortsSize: 'M',
    }));
    const many = downloadDesignDocuments({
      design,
      studio: { layers: [] },
      productLabel: 'Set',
      roster,
      reference: 'LONG',
    });
    proof = new TextDecoder().decode(await many.proof.arrayBuffer());
    tech = new TextDecoder().decode(await many.tech.arrayBuffer());
    expect(proof).toContain('\\(continued\\)');
    expect(tech).toContain('No visible layers');
  });

  it('downloads blobs through a temporary safe anchor', () => {
    const events = [];
    const anchor = {
      href: '',
      download: '',
      click() {
        events.push('click');
      },
      remove() {
        events.push('remove');
      },
    };
    vi.stubGlobal('document', {
      createElement: (name) => {
        expect(name).toBe('a');
        return anchor;
      },
      body: {
        appendChild: (node) => {
          expect(node).toBe(anchor);
          events.push('append');
        },
      },
    });
    vi.stubGlobal('URL', {
      createObjectURL: () => 'blob:test',
      revokeObjectURL: (url) => events.push(`revoke:${url}`),
    });
    downloadBlob(new Blob(['x']), 'file.pdf');
    expect(anchor.href).toBe('blob:test');
    expect(anchor.download).toBe('file.pdf');
    expect(events).toEqual(['append', 'click', 'remove', 'revoke:blob:test']);
  });
});

describe('navigation/search edge coverage', () => {
  const catalog = [
    {
      id: '1',
      slug: 'exact',
      name: { en: 'Alpha', ar: 'الفا' },
      brand: 'Brand',
      productType: 'Shoe',
      category: 'Footwear',
      subcategory: 'Court',
      collection: 'Core',
      tags: ['tag'],
      keywords: ['keyword'],
      description: { en: 'A long special description', ar: 'وصف' },
      colors: [{ name: { en: 'Black', ar: 'أسود' } }],
    },
    {
      id: '2',
      slug: 'word',
      name: { en: 'The Alpha Pro', ar: 'Alpha' },
      brand: 'Brand',
      productType: null,
      category: null,
      subcategory: null,
      collection: null,
      tags: null,
      keywords: null,
      description: null,
      colors: null,
    },
    {
      id: '3',
      slug: 'substring',
      name: { en: 'Supercalpha item', ar: '' },
      brand: 'Other',
      colors: [],
    },
  ];
  it('accepts every allowed prefix shape and rejects every unsafe path class', () => {
    for (const path of [
      '/',
      '/checkout',
      '/checkout/x',
      '/checkout?q=1',
      '/products/a',
      '/products/a#x',
      '/order-tracking/SHB',
      '/events',
      '/online-training',
    ])
      expect(safeInternalReturnPath(path, '/safe')).toBe(path);
    for (const value of [
      undefined,
      123,
      ' /shop',
      '/shop ',
      '//evil',
      '/\\evil',
      'https://evil.example',
      '/%5cevil',
      '/shop%00bad',
      '/admin',
      '/operations',
      '/shop%ZZ',
    ])
      expect(safeInternalReturnPath(value, '/safe')).toBe('/safe');
  });
  it('scores exact, full-prefix, word-prefix and substring candidates and reuses cached candidates', () => {
    expect(normalizeSearchText()).toBe('');
    const exact = getSearchSuggestions('alpha', 20, catalog);
    expect(exact[0].to).toBe('/products/exact');
    expect(exact.some((x) => x.to === '/products/word')).toBe(true);
    expect(exact.some((x) => x.to === '/products/substring')).toBe(true);
    expect(getSearchSuggestions('alpha', 20, catalog)).toEqual(exact);
    expect(getSearchSuggestions('not found', 20, catalog)).toEqual([]);
    expect(getSearchSuggestions('', 20, catalog)).toEqual([]);
    expect(SEARCH_PAGES.length).toBeGreaterThan(5);
    expect(POPULAR_SEARCHES.length).toBeGreaterThan(5);
  });
  it('supports every type/color/brand filter branch and limits pages/products independently', () => {
    expect(searchSite('', 1, {}, catalog)).toMatchObject({ products: [catalog[0]], total: 2 });
    expect(searchSite('', 5, { types: ['pages'] }, catalog).products).toEqual([]);
    expect(searchSite('', 5, { types: ['products'] }, catalog).pages).toEqual([]);
    expect(
      searchSite('', 5, { types: ['products'], colors: ['Black'], brands: ['Brand'] }, catalog)
        .products,
    ).toHaveLength(1);
    expect(
      searchSite('', 5, { types: ['products'], colors: ['Orange'] }, catalog).products,
    ).toHaveLength(0);
    expect(
      searchSite('', 5, { types: ['products'], brands: ['Missing'] }, catalog).products,
    ).toHaveLength(0);
    expect(searchSite('contact', 1, { types: ['pages'] }, catalog).pages).toHaveLength(1);
    expect(getSearchFacets(catalog)).toEqual({
      types: ['products', 'pages'],
      colors: ['Black'],
      brands: ['Brand', 'Other'],
    });
  });
});

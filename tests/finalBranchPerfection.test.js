import './setup.js';
import { afterEach, describe, expect, it, vi } from './test-api.js';
import specialRequest from '../api/special-request.ts';
import {
  createDefaultStudio,
  normalizeStudio,
  addDesignLayer,
  updateDesignLayer,
  removeDesignLayer,
  duplicateDesignLayer,
  moveDesignLayer,
  addDesignComment,
  resolveDesignComment,
  createHistory,
  pushHistory,
  undoHistory,
  redoHistory,
  buildProductionMetadata,
  autosaveDesignStudio,
  createSecureDesignShare,
  loadSharedDesign,
} from '../src/services/designStudio.ts';
import {
  __resetSupabaseForTests,
  __setSupabaseBuildEnvForTests,
  __setSupabaseClientFactoryForTests,
} from '../src/services/supabase.ts';
import { productShape, buildDesignViewSvg, createStoreZip } from '../src/utils/designExports.js';
import {
  parseWorksheet,
  resolveFirstWorksheet,
  parseRosterXlsxBuffer,
  parseRosterFile,
} from '../src/utils/rosterSpreadsheet.ts';

const ENV = [
  'NODE_ENV',
  'SITE_URL',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'TURNSTILE_TEST_MODE',
  'TURNSTILE_SECRET_KEY',
  'EDGE_RATE_LIMIT_SALT',
  'MALWARE_SCAN_API_URL',
  'MALWARE_SCAN_API_KEY',
  'MALWARE_SCAN_TEST_MODE',
];
afterEach(() => {
  vi.restoreAllMocks();
  __resetSupabaseForTests();
  for (const key of ENV) delete process.env[key];
});

/** @returns {any} */
function resMock() {
  return {
    statusCode: 0,
    body: null,
    headers: {},
    setHeader(k, v) {
      this.headers[k] = v;
    },
    status(c) {
      this.statusCode = c;
      return this;
    },
    json(b) {
      this.body = b;
      return this;
    },
  };
}
/** @returns {any} */
function req(body = {}, headers = {}) {
  return {
    method: 'POST',
    body,
    headers: {
      origin: 'http://localhost:5173',
      'user-agent': 'perfect-branches',
      'x-forwarded-for': '127.0.0.1',
      ...headers,
    },
    socket: { remoteAddress: '127.0.0.2' },
  };
}
function reply(value, status = 200) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    text: async () => text,
    json: async () => value,
  };
}
function configure() {
  process.env.NODE_ENV = 'test';
  process.env.SITE_URL = 'https://shababuna.ly';
  process.env.SUPABASE_URL = 'https://db.example';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
  process.env.TURNSTILE_TEST_MODE = 'true';
  process.env.TURNSTILE_SECRET_KEY = 'turnstile';
  process.env.EDGE_RATE_LIMIT_SALT = 'e'.repeat(64);
}
function body(overrides = {}) {
  return {
    customerName: 'Branch Customer',
    email: 'branch@example.com',
    phone: '+218920000000',
    whatsapp: '+218920000000',
    country: 'LY',
    productUrl: 'https://example.com/item',
    description: 'A complete professional product sourcing request for branch coverage.',
    preferredBrand: 'Nike',
    desiredQuantity: 2,
    size: 'XL',
    color: 'Black',
    targetBudget: '',
    requiredDate: '',
    preferredContactMethod: 'email',
    consent: true,
    locale: '',
    turnstileToken: 'test-pass',
    files: [],
    ...overrides,
  };
}
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]).toString(
  'base64',
);

async function expectReject(promise) {
  let failed = false;
  try {
    await promise;
  } catch {
    failed = true;
  }
  expect(failed).toBe(true);
}

describe('remaining special-request branches', { concurrency: false }, () => {
  it('covers object inserts, generated idempotency, authenticated user and object file rows', async () => {
    configure();
    let fileRowObject = true;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (url) => {
        const target = String(url);
        if (target.includes('consume_edge_rate_limit')) return reply(true);
        if (target.includes('/auth/v1/user')) return reply({ id: 'user-id' });
        if (target.includes('create_special_request_api'))
          return reply({
            id: 'request-id',
            request_number: 'SR-1',
            status: 'submitted',
            created_at: 'now',
          });
        if (target.includes('/storage/v1/object/'))
          return { ok: true, status: 200, text: async () => '' };
        if (target.includes('/rest/v1/special_request_files'))
          return reply(fileRowObject ? { id: 'file-id' } : [{ id: 'file-array' }], 201);
        throw new Error(`unexpected:${target}`);
      }),
    );
    const image = { name: 'product.png', mime: 'image/png', role: 'product_image', base64: png };
    let res = resMock();
    await specialRequest(
      req(body({ productUrl: '', files: [image] }), { authorization: 'Bearer token' }),
      res,
    );
    expect(res.statusCode).toBe(201);
    expect(res.body.filesReceived).toBe(1);
    fileRowObject = false;
    res = resMock();
    await specialRequest(
      req(body({ productUrl: '', idempotencyKey: 'invalid', files: [image] })),
      res,
    );
    expect(res.statusCode).toBe(201);
  });

  it('covers scanner failure, duplicate image, captcha and create-row rejection paths', async () => {
    configure();
    process.env.NODE_ENV = 'production';
    const image = { name: 'product.png', mime: 'image/png', role: 'product_image', base64: png };
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementation(async (url) =>
          String(url).includes('consume_edge_rate_limit') ? reply(true) : reply([]),
        ),
    );
    let res = resMock();
    await specialRequest(req(body({ productUrl: '', files: [image] })), res);
    expect(res.statusCode).toBe(503);
    process.env.MALWARE_SCAN_API_URL = 'https://scanner.example';
    process.env.MALWARE_SCAN_API_KEY = 'x'.repeat(20);
    process.env.NODE_ENV = 'test';
    res = resMock();
    await specialRequest(req(body({ files: [image, { ...image, name: 'second.png' }] })), res);
    expect(res.statusCode).toBe(400);
    process.env.TURNSTILE_TEST_MODE = 'false';
    delete process.env.TURNSTILE_SECRET_KEY;
    res = resMock();
    await specialRequest(req(body()), res);
    expect(res.statusCode).toBe(400);
    process.env.TURNSTILE_TEST_MODE = 'true';
    res = resMock();
    await specialRequest(req(body()), res);
    expect(res.statusCode).toBe(503);
  });
});

describe('remaining design-studio branches', { concurrency: false }, () => {
  it('covers every fallback and successful/no-op history branch', () => {
    const defaulted = createDefaultStudio({
      teamName: '',
      number: '',
      playerName: '',
      secondary: '',
      font: '',
      sponsorName: 'SPONSOR',
      accent: '',
      logoPreview: 'data:image/png;base64,AA==',
    });
    expect(defaulted.layers.length).toBe(6);
    let studio = addDesignLayer(defaulted, {}, {});
    expect(studio.layers.at(-1).type).toBe('text');
    expect(studio.layers.at(-1).color).toBe('#ffffff');
    expect(studio.layers.at(-1).font).toBe('block');
    studio = addDesignLayer(
      studio,
      { type: 'number', view: 'back', color: 'bad', font: 'bad' },
      { secondary: '#112233', font: 'condensed' },
    );
    expect(studio.layers.at(-1).content).toBe('00');
    expect(studio.layers.at(-1).color).toBe('#112233');
    expect(studio.layers.at(-1).font).toBe('condensed');
    const id = studio.layers.at(-1).id;
    expect(duplicateDesignLayer(studio, 'missing').layers.length).toBe(studio.layers.length);
    expect(duplicateDesignLayer(studio, id).layers.length).toBe(studio.layers.length + 1);
    expect(moveDesignLayer(studio, 'missing', 'up').layers.length).toBe(studio.layers.length);
    expect(addDesignComment(studio, { text: '   ' }).comments.length).toBe(studio.comments.length);
    const withComment = addDesignComment(studio, {
      text: 'Review this',
      view: 'invalid',
      x: null,
      y: null,
    });
    expect(withComment.comments).toHaveLength(1);
    const emptyHistory = createHistory({ x: 1 });
    expect(undoHistory(emptyHistory)).toBe(emptyHistory);
    expect(redoHistory(emptyHistory)).toBe(emptyHistory);
    const full = { ...emptyHistory, past: [{ x: 0 }], future: [{ x: 2 }] };
    expect(undoHistory(full).present.x).toBe(0);
    expect(redoHistory(full).present.x).toBe(2);
    expect(buildProductionMetadata({ notes: null }, studio).notes).toBe('');
  });

  it('covers normalization, mutation and request edge branches exhaustively', async () => {
    const originalCrypto = globalThis.crypto;
    vi.stubGlobal('crypto', undefined);
    const fallback = createDefaultStudio({
      teamName: 'TEAM',
      number: '12',
      playerName: 'PLAYER',
      secondary: '#123456',
      font: 'modern',
    });
    expect(fallback.layers).toHaveLength(4);
    vi.restoreAllMocks();
    if (originalCrypto) vi.stubGlobal('crypto', originalCrypto);
    const normalized = normalizeStudio(
      {
        activeView: 'bad',
        showSafeArea: false,
        showBleedArea: 1,
        layers: [
          {
            id: '',
            type: 'bad',
            view: 'bad',
            label: '',
            content: null,
            x: -10,
            y: 200,
            width: 0,
            rotation: 999,
            color: 'bad',
            font: 'bad',
            visible: false,
            locked: true,
            zIndex: null,
          },
          {
            id: 'logo',
            type: 'logo',
            view: 'side',
            label: 'Logo',
            content: 'data:image/png;base64,AA==',
            x: 50,
            y: 50,
            width: 20,
            rotation: -30,
            color: '#112233',
            font: 'modern',
            visible: true,
            locked: false,
            zIndex: 2,
          },
        ],
        comments: [
          { id: '', view: 'bad', x: -1, y: 101, text: ' ', resolved: true, createdAt: null },
          { id: 'c', view: 'back', x: 25, y: 75, text: 'Keep', resolved: true, createdAt: 'date' },
        ],
      },
      {},
    );
    expect(normalized.activeView).toBe('front');
    expect(normalized.showSafeArea).toBe(false);
    expect(normalized.showBleedArea).toBe(true);
    expect(normalized.layers[0].type).toBe('text');
    expect(normalized.comments).toHaveLength(1);
    const updated = updateDesignLayer(normalized, normalized.layers[0].id, { content: 'UPDATED' });
    expect(updated.layers[0].content).toBe('UPDATED');
    expect(updateDesignLayer(updated, 'missing', { content: 'X' }).layers[0].content).toBe(
      'UPDATED',
    );
    expect(removeDesignLayer(updated, updated.layers[0].id).layers.length).toBe(1);
    expect(removeDesignLayer(updated, 'missing').layers.length).toBe(2);
    const resolved = resolveDesignComment(normalized, 'c');
    expect(resolved.comments[0].resolved).toBe(true);
    expect(resolveDesignComment(normalized, 'missing').comments).toHaveLength(1);
    let history = createHistory({ a: 1 }, 2);
    expect(pushHistory(history, { a: 1 })).toBe(history);
    history = pushHistory(history, { a: 2 });
    history = pushHistory(history, { a: 3 });
    history = pushHistory(history, { a: 4 });
    expect(history.past).toHaveLength(2);
    expect(moveDesignLayer(normalized, normalized.layers[0].id, 'up').layers.length).toBe(2);
    expect(moveDesignLayer(normalized, normalized.layers[1].id, 'down').layers.length).toBe(2);
    await expectReject(loadSharedDesign(null));
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, design: { id: 'd', productType: 'jersey' } }),
      }),
    );
    const noData = await loadSharedDesign('T'.repeat(40));
    expect(noData.design.productType).toBe('jersey');
  });

  it('covers cloud autosave, share and shared-design fallbacks', async () => {
    __setSupabaseBuildEnvForTests({
      VITE_SUPABASE_URL: 'https://x.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'k'.repeat(30),
    });
    /** @type {any} */
    let singleResult = { data: { id: 'saved' }, error: null };
    /** @type {any} */
    let rpcResult = { data: 'TOKEN', error: null };
    __setSupabaseClientFactoryForTests(async () => ({
      createClient: () => ({
        from: () => ({
          update: () => ({ eq: () => ({ select: () => ({ single: async () => singleResult }) }) }),
        }),
        rpc: async () => rpcResult,
      }),
    }));
    expect(
      (
        await autosaveDesignStudio(
          'd',
          { primary: '#000000', secondary: '#ffffff', accent: '#aaaaaa' },
          {},
        )
      ).id,
    ).toBe('saved');
    singleResult = { data: null, error: new Error('save') };
    await expectReject(autosaveDesignStudio('d', {}, {}));
    vi.stubGlobal('window', { location: { origin: 'https://shop.example' } });
    expect(await createSecureDesignShare('d', 'view', 0)).toContain('TOKEN');
    rpcResult = { data: { token: 'OBJECT' }, error: null };
    expect(await createSecureDesignShare('d', 'view', 1)).toContain('OBJECT');
    rpcResult = { data: {}, error: null };
    await expectReject(createSecureDesignShare('d'));
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          design: { id: 'd', productType: 'game-set', designData: { studio: { layers: [] } } },
        }),
      }),
    );
    expect((await loadSharedDesign('T'.repeat(40))).design.productType).toBe('game-set');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          design: { id: 'd', productType: null, designData: { productType: 'jersey' } },
        }),
      }),
    );
    expect((await loadSharedDesign('T'.repeat(40))).design.productType).toBe('jersey');
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, design: {} }) }),
    );
    await expectReject(loadSharedDesign('T'.repeat(40)));
  });
});

describe('remaining production-artwork branches', () => {
  it('renders every shape in front and side orientations plus every layer type', () => {
    const previews = [
      'uniform',
      'jersey',
      'shirt',
      'shorts',
      'hoodie',
      'pants',
      'tracksuit',
      'bag',
      'sleeve',
      'ball',
      'padding',
      'unknown',
    ];
    for (const preview of previews) {
      expect(productShape(preview, '#000000', '#ffffff', '#cccccc', 'front')).toContain('<');
      expect(productShape(preview, '#000000', '#ffffff', '#cccccc', 'side')).toContain('<');
    }
    const studio = {
      showSafeArea: true,
      showBleedArea: true,
      layers: [
        {
          id: 'logo',
          type: 'logo',
          view: 'front',
          content: 'data:image/png;base64,AA==',
          x: 50,
          y: 50,
          width: 20,
          rotation: 0,
          color: '#ffffff',
          font: 'block',
          visible: true,
          zIndex: 1,
        },
        {
          id: 'bad-logo',
          type: 'logo',
          view: 'front',
          content: 'not-an-image',
          x: 50,
          y: 40,
          width: 20,
          rotation: 0,
          color: '#ffffff',
          font: 'block',
          visible: true,
          zIndex: 2,
        },
        {
          id: 'number',
          type: 'number',
          view: 'front',
          content: '7',
          x: 50,
          y: 60,
          width: 20,
          rotation: 0,
          color: '#ffffff',
          font: 'block',
          visible: true,
          zIndex: 3,
        },
        {
          id: 'empty',
          type: 'text',
          view: 'front',
          content: '',
          x: 50,
          y: 70,
          width: 20,
          rotation: 0,
          color: 'bad',
          font: 'block',
          visible: true,
          zIndex: 4,
        },
      ],
      comments: [],
    };
    const svg = buildDesignViewSvg({
      design: {
        productType: 'game-set',
        primary: '#000000',
        secondary: '#ffffff',
        accent: '#cccccc',
      },
      studio,
      view: 'front',
      productLabel: '',
    });
    expect(svg).toContain('<image');
    expect(svg).toContain('font-size');
    expect(svg).toContain('Full Game Set');
  });
});

describe('remaining spreadsheet branches', () => {
  async function workbook({ shared = false, absolute = false } = {}) {
    const sheet = shared
      ? '<worksheet><row><c r="A1" t="s"><v>0</v></c><c r="B1"><v>Number</v></c></row><row><c r="A2" t="s"><v>99</v></c><c r="B2"><v>7</v></c><c r="D2" t="inlineStr"><is><t>L</t></is></c></row></worksheet>'
      : '<worksheet><row><c r="A1" t="inlineStr"><is><t>Player Name</t></is></c><c r="B1"><v>Number</v></c><c r="C1"><v>Jersey Size</v></c></row><row><c r="A2"><v>One</v></c><c r="B2"><v>7</v></c><c r="C2"><v>L</v></c></row></worksheet>';
    const target = absolute ? '/xl/worksheets/sheet1.xml' : './worksheets/sheet1.xml';
    const files = [
      { name: 'xl/workbook.xml', data: '<workbook><sheet r:id="r1"/></workbook>' },
      {
        name: 'xl/_rels/workbook.xml.rels',
        data: `<Relationships><Relationship Id="r1" Target="${target}"/></Relationships>`,
      },
      { name: 'xl/worksheets/sheet1.xml', data: sheet },
    ];
    if (shared)
      files.push({ name: 'xl/sharedStrings.xml', data: '<sst><si><t>Player Name</t></si></sst>' });
    return new Uint8Array(await createStoreZip(files).arrayBuffer());
  }
  it('covers holes, missing shared strings, absolute relationships and file defaults', async () => {
    const hole = parseWorksheet(
      '<worksheet><row><c r="B1" t="s"><v>9</v></c></row></worksheet>',
      [],
    );
    expect(hole[0].length).toBe(2);
    expect(hole[0][1]).toBe('');
    const absolute = await workbook({ absolute: true });
    const entries = new Map([['xl/workbook.xml', new TextEncoder().encode('<workbook/>')]]);
    expect(resolveFirstWorksheet(entries)).toBe(null);
    expect((await parseRosterXlsxBuffer(absolute))[0].name).toBe('One');
    const shared = await workbook({ shared: true });
    const sharedRows = await parseRosterXlsxBuffer(shared);
    expect(sharedRows).toHaveLength(1);
    expect(sharedRows[0].number).toBe('7');
    expect(
      (await parseRosterFile({ name: 'x.csv', type: null, text: async () => 'One,1,M' }))[0].number,
    ).toBe('1');
    expect(
      (await parseRosterFile({ name: null, type: 'text/plain', text: async () => 'One,2,L' }))[0]
        .number,
    ).toBe('2');
    const xlsxFile = {
      name: null,
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: 0,
      arrayBuffer: async () => absolute.buffer,
    };
    expect((await parseRosterFile(xlsxFile))[0].name).toBe('One');
  });
});

import { getCustomProductType, rosterToCsv } from '../data/customization.js';
import { DESIGN_VIEWS, normalizeStudio } from '../services/designStudio.js';
import {
  buildColorSpecificationsCsv,
  getFactoryTemplateSpec,
  runProductionPreflight,
} from '../services/productionPreflight.js';

const enc = new TextEncoder();
export const escapeXml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
export const safeHex = (value, fallback) =>
  /^#[0-9a-f]{6}$/i.test(String(value || '')) ? value : fallback;

export function productShape(preview, fill, stroke, accent, view) {
  const side = view === 'side';
  const transform = side ? 'translate(165 50) scale(.58 1)' : 'translate(55 38)';
  const top = `<g transform="${transform}"><path d="M126 20L190 60H300L364 20L456 96L416 180L374 152V548H116V152L74 180L34 96Z" fill="${fill}" stroke="${stroke}" stroke-width="7"/><path d="M190 60Q245 132 300 60" fill="none" stroke="${stroke}" stroke-width="14"/></g>`;
  const shorts = `<g transform="${side ? 'translate(220 205) scale(.42 1)' : 'translate(92 42)'}"><path d="M132 360H358L392 655L260 650L245 520L230 650L98 655Z" fill="${fill}" stroke="${stroke}" stroke-width="8"/></g>`;
  if (preview === 'uniform') return top + shorts;
  if (preview === 'jersey' || preview === 'shirt') return top;
  if (preview === 'shorts') return shorts;
  if (preview === 'hoodie')
    return `<g transform="${side ? 'translate(175 60) scale(.55 1)' : 'translate(55 25)'}"><path d="M185 34Q245 -8 305 34L345 80L452 132L405 242L374 220V594H116V220L85 242L38 132L145 80Z" fill="${fill}" stroke="${stroke}" stroke-width="8"/><path d="M185 34Q245 118 305 34" fill="none" stroke="${stroke}" stroke-width="12"/></g>`;
  if (preview === 'pants')
    return `<g transform="${side ? 'translate(225 55) scale(.42 1)' : 'translate(95 22)'}"><path d="M128 52H362L392 674H270L245 318L220 674H98Z" fill="${fill}" stroke="${stroke}" stroke-width="8"/><path d="M245 52V318" stroke="${accent}" stroke-width="7"/></g>`;
  if (preview === 'tracksuit')
    return `<g transform="${side ? 'translate(170 30) scale(.55 .62)' : 'translate(55 15) scale(1 .62)'}"><path d="M185 34Q245 -8 305 34L345 80L452 132L405 242L374 220V594H116V220L85 242L38 132L145 80Z" fill="${fill}" stroke="${stroke}" stroke-width="8"/></g><g transform="${side ? 'translate(225 328) scale(.42 .55)' : 'translate(95 328) scale(1 .55)'}"><path d="M128 52H362L392 674H270L245 318L220 674H98Z" fill="${fill}" stroke="${stroke}" stroke-width="8"/></g>`;
  if (preview === 'bag')
    return `<g transform="${side ? 'translate(155 145) scale(.68 1)' : 'translate(70 135)'}"><path d="M105 160Q245 75 385 160L425 515Q245 580 65 515Z" fill="${fill}" stroke="${stroke}" stroke-width="9"/><path d="M146 172Q155 52 245 52Q335 52 344 172" fill="none" stroke="${stroke}" stroke-width="18"/></g>`;
  if (preview === 'sleeve')
    return `<g transform="${side ? 'translate(215 70) scale(.48 1)' : 'translate(120 70)'}"><path d="M148 30H352L390 650Q250 700 110 650Z" fill="${fill}" stroke="${stroke}" stroke-width="9"/><path d="M132 160H368M120 540H380" stroke="${accent}" stroke-width="8"/></g>`;
  if (preview === 'ball')
    return `<g transform="${side ? 'translate(130 120) scale(.72 1)' : 'translate(40 120)'}"><circle cx="260" cy="260" r="220" fill="${fill}" stroke="${stroke}" stroke-width="10"/><path d="M40 260H480M260 40V480M95 105Q260 260 425 415M425 105Q380 260 95 415" fill="none" stroke="${stroke}" stroke-width="9"/></g>`;
  if (preview === 'padding')
    return `<g transform="${side ? 'translate(200 45) scale(.5 1)' : 'translate(55 35)'}"><rect x="195" y="28" width="100" height="520" rx="24" fill="${fill}" stroke="${stroke}" stroke-width="9"/><rect x="60" y="510" width="370" height="110" rx="25" fill="${fill}" stroke="${stroke}" stroke-width="9"/></g>`;
  return top;
}

/** @param {{design?:any,studio?:any,view?:string,productLabel?:string}} [options] */
export function buildDesignViewSvg({
  design = {},
  studio = {},
  view = 'front',
  productLabel = '',
} = {}) {
  const normalized = normalizeStudio(studio, design);
  const product = getCustomProductType(design.productType);
  const primary = safeHex(design.primary, '#050505');
  const secondary = safeHex(design.secondary, '#ffffff');
  const accent = safeHex(design.accent, '#d6d6d6');
  const visible = normalized.layers
    .filter((layer) => layer.view === view && layer.visible)
    .sort((a, b) => a.zIndex - b.zIndex);
  const layers = visible
    .map((layer) => {
      const x = layer.x * 6;
      const y = layer.y * 7.2;
      const width = layer.width * 6;
      if (layer.type === 'logo' && /^data:image\/(png|jpeg|webp);base64,/i.test(layer.content))
        return `<image href="${escapeXml(layer.content)}" x="${x - width / 2}" y="${y - width / 2}" width="${width}" height="${width}" preserveAspectRatio="xMidYMid meet" transform="rotate(${layer.rotation} ${x} ${y})"/>`;
      const size = Math.max(14, width * (layer.type === 'number' ? 0.72 : 0.28));
      return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" fill="${safeHex(layer.color, secondary)}" font-family="Arial Black,Arial,sans-serif" font-size="${size}" font-weight="900" transform="rotate(${layer.rotation} ${x} ${y})">${escapeXml(layer.content || '')}</text>`;
    })
    .join('');
  const safe = normalized.showSafeArea
    ? '<rect x="48" y="58" width="504" height="604" fill="none" stroke="#00b45a" stroke-width="2" stroke-dasharray="10 8" opacity=".8"/>'
    : '';
  const bleed = normalized.showBleedArea
    ? '<rect x="20" y="20" width="560" height="680" fill="none" stroke="#d94141" stroke-width="2" stroke-dasharray="8 7" opacity=".8"/>'
    : '';
  return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 600 720" width="600" height="720"><title>${escapeXml(productLabel || product.label.en)} — ${escapeXml(view)}</title><rect width="600" height="720" fill="#111111"/>${productShape(product.preview, primary, secondary, accent, view)}${bleed}${safe}${layers}<text x="300" y="700" text-anchor="middle" fill="#ffffff" opacity=".55" font-family="Arial,sans-serif" font-size="12" letter-spacing="2">SHABABUNA · ${escapeXml(view.toUpperCase())} · PRODUCTION ARTWORK</text></svg>`;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();
export function crc32(bytes) {
  let c = 0xffffffff;
  for (const byte of bytes) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
export function u16(value) {
  return [value & 255, (value >>> 8) & 255];
}
export function u32(value) {
  return [value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255];
}

export function createStoreZip(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const file of files) {
    const name = enc.encode(String(file.name).replace(/^\/+/, ''));
    const data = typeof file.data === 'string' ? enc.encode(file.data) : new Uint8Array(file.data);
    const crc = crc32(data);
    const local = new Uint8Array([
      80,
      75,
      3,
      4,
      20,
      0,
      0,
      8,
      0,
      0,
      0,
      0,
      33,
      0,
      ...u32(crc),
      ...u32(data.length),
      ...u32(data.length),
      ...u16(name.length),
      0,
      0,
      ...name,
      ...data,
    ]);
    localParts.push(local);
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
      8,
      0,
      0,
      0,
      0,
      33,
      0,
      ...u32(crc),
      ...u32(data.length),
      ...u32(data.length),
      ...u16(name.length),
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
      ...u32(offset),
      ...name,
    ]);
    centralParts.push(central);
    offset += local.length;
  }
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array([
    80,
    75,
    5,
    6,
    0,
    0,
    0,
    0,
    ...u16(files.length),
    ...u16(files.length),
    ...u32(centralSize),
    ...u32(offset),
    0,
    0,
  ]);
  return new Blob([...localParts, ...centralParts, end], { type: 'application/zip' });
}

/** @param {{design?:any,studio?:any,roster?:any[],reference?:string,productLabel?:string}} [options] */
export function buildProductionPackage({
  design = {},
  studio = {},
  roster = [],
  reference = 'DRAFT',
  productLabel = '',
} = {}) {
  const normalized = normalizeStudio(studio, design);
  const factorySpecification = getFactoryTemplateSpec(design.productType);
  const preflight = runProductionPreflight({ design, studio: normalized, roster });
  const manifest = {
    schemaVersion: 2,
    reference,
    brand: 'SHABABUNA',
    tagline: 'BUILT DIFFERENT',
    product: productLabel || getCustomProductType(design.productType).label.en,
    design: {
      productType: design.productType,
      variant: design.variant,
      quantity: design.quantity,
      primary: design.primary,
      secondary: design.secondary,
      accent: design.accent,
      pattern: design.pattern,
      neckline: design.neckline,
      font: design.font,
      notes: design.notes || '',
    },
    production: {
      safeAreaPercent: 8,
      bleedAreaPercent: 3,
      layers: normalized.layers,
      comments: normalized.comments,
      factorySpecification,
      preflightStatus: preflight.status,
    },
    rosterCount: roster.length,
    generatedAt: new Date().toISOString(),
  };
  const files = DESIGN_VIEWS.map((view) => ({
    name: `artwork/${view}.svg`,
    data: buildDesignViewSvg({ design, studio: normalized, view, productLabel }),
  }));
  files.push({ name: 'manifest.json', data: JSON.stringify(manifest, null, 2) });
  files.push({ name: 'preflight.json', data: JSON.stringify(preflight, null, 2) });
  files.push({
    name: 'factory-specification.json',
    data: JSON.stringify(factorySpecification, null, 2),
  });
  files.push({ name: 'color-specifications.csv', data: buildColorSpecificationsCsv(design) });
  files.push({ name: 'roster.csv', data: rosterToCsv(roster) });
  files.push({
    name: 'README.txt',
    data: 'SHABABUNA production artwork package.\nReview every view, layer, color, preflight note and roster entry before manufacturing.\nThe included template is a generic manufacturing specification and must be validated against the selected factory pattern.\nThis package becomes production-authorized only after the factory proof, manufacturing claim evidence and commercial quote are approved.\n',
  });
  return createStoreZip(files);
}

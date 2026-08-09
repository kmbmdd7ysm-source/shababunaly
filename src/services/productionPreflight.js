import {
  CUSTOM_PRODUCT_TYPES,
  getCustomProductType,
  normalizeRoster,
} from '../data/customization.ts';
import { normalizeStudio } from './designStudio.ts';

const MM_PER_INCH = 25.4;
const HEX = /^#[0-9a-f]{6}$/i;

const TEMPLATE_BASE = Object.freeze({
  templateVersion: 'generic-production-v2',
  approvalStatus: 'pending_factory_validation',
  units: 'mm',
  colorProfile: 'CMYK',
  minimumRasterDpi: 300,
  bleedMm: 5,
  safeInsetMm: 12,
  seamAllowanceMm: 10,
  manufacturerApprovalRequired: true,
});

const PRODUCT_DIMENSIONS = Object.freeze({
  'game-set': {
    widthMm: 620,
    heightMm: 780,
    views: ['front', 'back', 'side'],
    panels: ['jersey-front', 'jersey-back', 'shorts-front', 'shorts-back'],
  },
  'game-jersey': {
    widthMm: 620,
    heightMm: 780,
    views: ['front', 'back', 'side'],
    panels: ['jersey-front', 'jersey-back'],
  },
  'game-shorts': {
    widthMm: 620,
    heightMm: 520,
    views: ['front', 'back', 'side'],
    panels: ['shorts-front', 'shorts-back'],
  },
  'practice-set': {
    widthMm: 620,
    heightMm: 780,
    views: ['front', 'back', 'side'],
    panels: ['top-front', 'top-back', 'shorts-front', 'shorts-back'],
  },
  'shooting-shirt': {
    widthMm: 680,
    heightMm: 800,
    views: ['front', 'back', 'side'],
    panels: ['shirt-front', 'shirt-back', 'sleeves'],
  },
  hoodie: {
    widthMm: 760,
    heightMm: 860,
    views: ['front', 'back', 'side'],
    panels: ['body-front', 'body-back', 'sleeves', 'hood'],
  },
  'team-pants': {
    widthMm: 520,
    heightMm: 1040,
    views: ['front', 'back', 'side'],
    panels: ['left-leg', 'right-leg', 'waistband'],
  },
  tracksuit: {
    widthMm: 760,
    heightMm: 1040,
    views: ['front', 'back', 'side'],
    panels: ['jacket-front', 'jacket-back', 'sleeves', 'pants-left', 'pants-right'],
  },
  'team-bag': {
    widthMm: 680,
    heightMm: 420,
    views: ['front', 'back', 'side'],
    panels: ['front-panel', 'back-panel', 'gusset'],
  },
  sleeve: {
    widthMm: 190,
    heightMm: 520,
    views: ['front', 'back', 'side'],
    panels: ['sleeve-panel'],
  },
  basketball: {
    widthMm: 750,
    heightMm: 750,
    views: ['front', 'back', 'side'],
    panels: ['ball-panel-layout'],
  },
  'hoop-padding': {
    widthMm: 1100,
    heightMm: 650,
    views: ['front', 'back', 'side'],
    panels: ['post-pad', 'base-pad'],
  },
});

export const FACTORY_TEMPLATE_SPECS = Object.freeze(
  Object.fromEntries(
    CUSTOM_PRODUCT_TYPES.map((product) => [
      product.key,
      Object.freeze({
        ...TEMPLATE_BASE,
        productType: product.key,
        productLabel: product.label.en,
        ...PRODUCT_DIMENSIONS[product.key],
      }),
    ]),
  ),
);

export function getFactoryTemplateSpec(productType) {
  return FACTORY_TEMPLATE_SPECS[productType] || FACTORY_TEMPLATE_SPECS['game-set'];
}

export function hexToRgb(value) {
  const hex = String(value || '');
  if (!HEX.test(hex)) return null;
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  };
}

export function rgbToCmyk(rgb) {
  if (
    !rgb ||
    ![rgb.r, rgb.g, rgb.b].every((value) => Number.isFinite(value) && value >= 0 && value <= 255)
  )
    return null;
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const k = 1 - Math.max(r, g, b);
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
  return {
    c: Math.round(((1 - r - k) / (1 - k)) * 100),
    m: Math.round(((1 - g - k) / (1 - k)) * 100),
    y: Math.round(((1 - b - k) / (1 - k)) * 100),
    k: Math.round(k * 100),
  };
}

export function hexToCmyk(value) {
  return rgbToCmyk(hexToRgb(value));
}

function srgbChannelToLinear(value) {
  const channel = value / 255;
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

export function rgbToLab(rgb) {
  if (
    !rgb ||
    ![rgb.r, rgb.g, rgb.b].every((value) => Number.isFinite(value) && value >= 0 && value <= 255)
  )
    return null;
  const r = srgbChannelToLinear(rgb.r);
  const g = srgbChannelToLinear(rgb.g);
  const b = srgbChannelToLinear(rgb.b);
  const x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047;
  const y = r * 0.2126729 + g * 0.7151522 + b * 0.072175;
  const z = (r * 0.0193339 + g * 0.119192 + b * 0.9503041) / 1.08883;
  const f = (value) => (value > 216 / 24389 ? Math.cbrt(value) : ((24389 / 27) * value + 16) / 116);
  return {
    l: Number((116 * f(y) - 16).toFixed(3)),
    a: Number((500 * (f(x) - f(y))).toFixed(3)),
    b: Number((200 * (f(y) - f(z))).toFixed(3)),
  };
}

export function deltaE76(first, second) {
  if (
    !first ||
    !second ||
    !['l', 'a', 'b'].every(
      (key) => Number.isFinite(Number(first[key])) && Number.isFinite(Number(second[key])),
    )
  )
    return null;
  return Number(
    Math.sqrt(
      (Number(first.l) - Number(second.l)) ** 2 +
        (Number(first.a) - Number(second.a)) ** 2 +
        (Number(first.b) - Number(second.b)) ** 2,
    ).toFixed(3),
  );
}

function decodeImageDataUri(value) {
  const match = String(value || '').match(
    /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]*)$/i,
  );
  if (!match || !match[2]) return null;
  try {
    const binary = globalThis.atob(match[2]);
    return {
      format: match[1].toLowerCase(),
      buffer: Uint8Array.from(binary, (character) => character.charCodeAt(0)),
    };
  } catch {
    return null;
  }
}

export function readRasterDimensions(value) {
  const decoded = decodeImageDataUri(value);
  if (!decoded) return null;
  const { format, buffer } = decoded;
  const ascii = (start, end) => String.fromCharCode(...buffer.slice(start, end));
  const u16be = (offset) => (buffer[offset] << 8) | buffer[offset + 1];
  const u32be = (offset) =>
    (buffer[offset] * 0x1000000 +
      (buffer[offset + 1] << 16) +
      (buffer[offset + 2] << 8) +
      buffer[offset + 3]) >>>
    0;
  const u24le = (offset) => buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16);
  if (format === 'png' && buffer.length >= 24 && ascii(1, 4) === 'PNG') {
    return { pixelWidth: u32be(16), pixelHeight: u32be(20), format, source: 'embedded_header' };
  }
  if (format === 'jpeg' && buffer.length > 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = buffer[offset + 1];
      const length = u16be(offset + 2);
      if (
        [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(
          marker,
        )
      ) {
        return {
          pixelWidth: u16be(offset + 7),
          pixelHeight: u16be(offset + 5),
          format,
          source: 'embedded_header',
        };
      }
      if (length < 2) break;
      offset += 2 + length;
    }
  }
  if (
    format === 'webp' &&
    buffer.length >= 30 &&
    ascii(0, 4) === 'RIFF' &&
    ascii(8, 12) === 'WEBP' &&
    ascii(12, 16) === 'VP8X'
  ) {
    return {
      pixelWidth: 1 + u24le(24),
      pixelHeight: 1 + u24le(27),
      format,
      source: 'embedded_header',
    };
  }
  return null;
}

/** @param {any} [design] */
export function buildColorSpecifications(design = {}) {
  return ['primary', 'secondary', 'accent'].map((role) => {
    const hex = HEX.test(String(design[role] || '')) ? String(design[role]).toUpperCase() : null;
    return {
      role,
      hex,
      rgb: hexToRgb(hex),
      cmyk: hexToCmyk(hex),
      spotColor: null,
      spotColorStatus: 'manual_factory_match_required',
    };
  });
}

/** @param {any} [design] */
export function buildColorSpecificationsCsv(design = {}) {
  const rows = buildColorSpecifications(design).map((color) => {
    const rgb = color.rgb || { r: '', g: '', b: '' };
    const cmyk = color.cmyk || { c: '', m: '', y: '', k: '' };
    return [
      color.role,
      color.hex || '',
      rgb.r,
      rgb.g,
      rgb.b,
      cmyk.c,
      cmyk.m,
      cmyk.y,
      cmyk.k,
      color.spotColorStatus,
    ]
      .map((value) => `"${String(value).replace(/"/g, '""')}"`)
      .join(',');
  });
  return ['"Role","HEX","R","G","B","C","M","Y","K","Spot color status"', ...rows].join('\n');
}

function layerOutsideSafeArea(layer, safePercent) {
  const halfWidth = Number(layer.width) / 2;
  return (
    layer.x - halfWidth < safePercent ||
    layer.x + halfWidth > 100 - safePercent ||
    layer.y < safePercent ||
    layer.y > 100 - safePercent
  );
}

function inspectRasterLayer(layer, template) {
  if (layer.type !== 'logo' || !/^data:image\/(png|jpeg|webp);base64,/i.test(String(layer.content)))
    return null;
  const intendedWidthMm = Math.max(10, (Number(layer.width) / 100) * Number(template.widthMm));
  const parsedDimensions = readRasterDimensions(layer.content);
  const pixelWidth = Math.max(0, Number(parsedDimensions?.pixelWidth || layer.pixelWidth) || 0);
  const pixelHeight = Math.max(0, Number(parsedDimensions?.pixelHeight || layer.pixelHeight) || 0);
  const actualDpi = pixelWidth > 0 ? Math.round(pixelWidth / (intendedWidthMm / MM_PER_INCH)) : 0;
  const encodedPayload = String(layer.content).split(',')[1];
  const approximateBytes = Math.floor(encodedPayload.length * 0.75);
  const requiredPixels = Math.ceil((intendedWidthMm / MM_PER_INCH) * template.minimumRasterDpi);
  return {
    pixelWidth,
    pixelHeight,
    approximateBytes,
    requiredPixels,
    intendedWidthMm: Number(intendedWidthMm.toFixed(2)),
    actualDpi,
    minimumDpi: template.minimumRasterDpi,
    sourceFileName: String(layer.sourceFileName || ''),
    sourceSha256: String(layer.sourceSha256 || ''),
    dimensionSource:
      parsedDimensions?.source || (pixelWidth && pixelHeight ? 'declared_metadata' : 'missing'),
    status:
      !pixelWidth || !pixelHeight
        ? 'missing_pixel_dimensions'
        : actualDpi < template.minimumRasterDpi
          ? 'below_minimum_dpi'
          : 'passed',
  };
}

function inspectVectorLayer(layer) {
  if (layer.type !== 'logo') return null;
  const content = String(layer.content || '');
  const fileName = String(layer.sourceFileName || '').toLowerCase();
  const format =
    fileName.split('.').pop() || (content.startsWith('data:image/svg+xml') ? 'svg' : '');
  if (!['ai', 'eps', 'svg'].includes(format)) return null;
  return {
    format,
    sourceFileName: String(layer.sourceFileName || ''),
    sourceSha256: String(layer.sourceSha256 || ''),
    validated: Boolean(layer.vectorSourceValidated),
    status:
      layer.vectorSourceValidated && /^[a-f0-9]{64}$/i.test(String(layer.sourceSha256 || ''))
        ? 'passed'
        : 'unverified_vector_source',
  };
}

function validateFactoryApproval(factoryApproval, template, productType, colors) {
  const errors = [];
  if (!(factoryApproval?.approved && factoryApproval?.approvalStatus === 'approved'))
    errors.push('approval_missing');
  if (!factoryApproval?.manufacturer || !factoryApproval?.manufacturerLegalId)
    errors.push('manufacturer_identity_missing');
  if (
    !factoryApproval?.certificateReference ||
    !/^[a-f0-9]{64}$/i.test(String(factoryApproval?.certificateSha256 || ''))
  )
    errors.push('certificate_evidence_missing');
  if (
    factoryApproval?.templateVersion !== template.templateVersion ||
    !factoryApproval?.productTypes?.includes(productType)
  )
    errors.push('product_template_not_approved');
  if (
    !factoryApproval?.iccProfileReference ||
    !/^[a-f0-9]{64}$/i.test(String(factoryApproval?.iccProfileSha256 || ''))
  )
    errors.push('icc_evidence_missing');
  if (
    !factoryApproval?.pantoneLibrary ||
    !factoryApproval?.pantoneLibraryVersion ||
    !/^[a-f0-9]{64}$/i.test(String(factoryApproval?.pantoneLibrarySha256 || ''))
  )
    errors.push('pantone_evidence_missing');
  if (!(
    Number(factoryApproval?.deltaETolerance) > 0 && Number(factoryApproval?.deltaETolerance) <= 2
  ))
    errors.push('delta_e_tolerance_invalid');
  if (
    !factoryApproval?.gradedPatternSha256 ||
    !factoryApproval?.materialProfile?.fabricCode ||
    !(Number(factoryApproval?.materialProfile?.stretchPercent) >= 0) ||
    !(Number(factoryApproval?.materialProfile?.shrinkagePercent) >= 0)
  )
    errors.push('pattern_or_material_evidence_missing');
  const measurements = Array.isArray(factoryApproval?.colorMeasurements)
    ? factoryApproval.colorMeasurements
    : [];
  for (const color of colors.filter((row) => row.hex)) {
    const measurement = measurements.find((row) => row.role === color.role);
    const target = measurement?.targetLab || rgbToLab(color.rgb);
    const measured = measurement?.measuredLab;
    const difference = deltaE76(target, measured);
    if (difference === null || difference > Number(factoryApproval?.deltaETolerance))
      errors.push(`color_measurement_failed:${color.role}`);
  }
  return { approved: errors.length === 0, errors };
}

/** @param {{design?:any,studio?:any,roster?:any[],factoryApproval?:any}} [options] */
export function runProductionPreflight({
  design = {},
  studio = {},
  roster = [],
  factoryApproval = null,
} = {}) {
  const product = getCustomProductType(design.productType);
  const template = getFactoryTemplateSpec(product.key);
  const normalizedStudio = normalizeStudio(studio, design);
  const normalizedRoster = normalizeRoster(roster);
  const blockers = [];
  const warnings = [];
  const quantity = Number(design.quantity || 0);

  if (quantity < product.minimum)
    blockers.push({ code: 'minimum_quantity', detail: `Minimum ${product.minimum}` });
  for (const role of ['primary', 'secondary', 'accent'])
    if (!HEX.test(String(design[role] || '')))
      blockers.push({ code: 'invalid_color', detail: role });
  if (!normalizedStudio.layers.some((layer) => layer.visible))
    blockers.push({ code: 'no_visible_artwork', detail: product.key });
  if (product.supportsRoster && normalizedRoster.some((row) => row.errors.length))
    blockers.push({ code: 'roster_validation', detail: 'Resolve every roster error' });

  const safePercent = Math.max(
    3,
    Math.round((template.safeInsetMm / Math.max(template.widthMm, 1)) * 100),
  );
  const rasterAssets = [];
  const vectorAssets = [];
  for (const layer of normalizedStudio.layers.filter((item) => item.visible)) {
    if (layerOutsideSafeArea(layer, safePercent))
      warnings.push({ code: 'layer_outside_safe_area', detail: layer.id });
    const raster = inspectRasterLayer(layer, template);
    const vector = inspectVectorLayer(layer);
    if (vector) {
      vectorAssets.push({ layerId: layer.id, ...vector });
      if (vector.status !== 'passed')
        blockers.push({ code: 'vector_source_unverified', detail: layer.id });
    }
    if (raster) {
      rasterAssets.push({ layerId: layer.id, ...raster });
      if (raster.status === 'missing_pixel_dimensions')
        blockers.push({ code: 'raster_dimensions_missing', detail: layer.id });
      if (raster.status === 'below_minimum_dpi')
        blockers.push({
          code: 'raster_below_minimum_dpi',
          detail: `${layer.id}:${raster.actualDpi}`,
        });
      if (!raster.sourceSha256)
        blockers.push({ code: 'source_checksum_missing', detail: layer.id });
    }
    if (layer.type !== 'logo' && layer.fontLicenseStatus !== 'built_in_licensed')
      blockers.push({ code: 'font_license_unverified', detail: layer.id });
    if (layer.type !== 'logo' && !String(layer.content || '').trim())
      blockers.push({ code: 'empty_text_layer', detail: layer.id });
  }
  if (rasterAssets.some((asset) => asset.status !== 'passed'))
    warnings.push({
      code: 'raster_preflight_failed',
      detail: `${rasterAssets.filter((asset) => asset.status !== 'passed').length} asset(s)`,
    });
  const unresolvedComments = normalizedStudio.comments.filter(
    (comment) => !comment.resolved,
  ).length;
  if (unresolvedComments)
    warnings.push({ code: 'unresolved_comments', detail: String(unresolvedComments) });
  const factoryValidation = validateFactoryApproval(
    factoryApproval,
    template,
    product.key,
    buildColorSpecifications(design),
  );
  const approvedFactory = factoryValidation.approved;
  if (!approvedFactory)
    warnings.push({ code: 'factory_approval_required', detail: template.templateVersion });
  if (factoryApproval?.approved && factoryValidation.errors.length)
    blockers.push(
      ...factoryValidation.errors.map((detail) => ({ code: 'factory_evidence_invalid', detail })),
    );
  if (!String(design.notes || '').trim())
    warnings.push({ code: 'production_notes_recommended', detail: product.key });

  return {
    schemaVersion: 1,
    productType: product.key,
    template,
    colors: buildColorSpecifications(design),
    rasterAssets,
    vectorAssets,
    factoryValidation,
    rosterCount: normalizedRoster.length,
    unresolvedComments,
    blockers,
    warnings,
    readyForQuote: blockers.length === 0,
    readyForManufacturing: blockers.length === 0 && approvedFactory,
    status: blockers.length
      ? 'blocked'
      : approvedFactory
        ? 'factory_approved'
        : 'preflight_passed_pending_factory_proof',
    checkedAt: new Date().toISOString(),
  };
}

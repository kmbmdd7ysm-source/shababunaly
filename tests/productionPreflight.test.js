import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  FACTORY_TEMPLATE_SPECS,
  buildColorSpecifications,
  buildColorSpecificationsCsv,
  getFactoryTemplateSpec,
  hexToCmyk,
  hexToRgb,
  rgbToCmyk,
  rgbToLab,
  deltaE76,
  readRasterDimensions,
  runProductionPreflight,
} from '../src/services/productionPreflight.js';
import { CUSTOM_PRODUCT_TYPES, DEFAULT_CUSTOM_DESIGN } from '../src/data/customization.ts';
import { createDefaultStudio } from '../src/services/designStudio.ts';

const completeDesign = {
  ...DEFAULT_CUSTOM_DESIGN,
  notes: 'Use factory-approved sublimation fabric and confirm all print swatches.',
};

/** @param {any} [design] */
function completeStudio(design = completeDesign) {
  const studio = createDefaultStudio(design);
  return {
    ...studio,
    layers: studio.layers.map((layer) => ({
      ...layer,
      x: 50,
      y: 50,
      width: 10,
      content: layer.content || 'TEXT',
    })),
    comments: [],
  };
}

describe('production preflight and manufacturing specifications', () => {
  test('provides a complete immutable generic template for every custom product', () => {
    assert.equal(Object.keys(FACTORY_TEMPLATE_SPECS).length, CUSTOM_PRODUCT_TYPES.length);
    for (const product of CUSTOM_PRODUCT_TYPES) {
      const spec = getFactoryTemplateSpec(product.key);
      assert.equal(spec.productType, product.key);
      assert.equal(spec.units, 'mm');
      assert.equal(spec.manufacturerApprovalRequired, true);
      assert.ok(spec.widthMm > 0 && spec.heightMm > 0);
      assert.ok(spec.views.includes('front'));
      assert.ok(spec.panels.length > 0);
    }
    assert.equal(getFactoryTemplateSpec('unknown').productType, 'game-set');
  });

  test('converts validated print colors to RGB, CMYK and CSV without inventing a spot color', () => {
    assert.deepEqual(hexToRgb('#000000'), { r: 0, g: 0, b: 0 });
    assert.deepEqual(hexToRgb('#FFFFFF'), { r: 255, g: 255, b: 255 });
    assert.equal(hexToRgb('bad'), null);
    assert.deepEqual(rgbToCmyk({ r: 0, g: 0, b: 0 }), { c: 0, m: 0, y: 0, k: 100 });
    assert.deepEqual(rgbToCmyk({ r: 255, g: 0, b: 0 }), { c: 0, m: 100, y: 100, k: 0 });
    assert.equal(rgbToCmyk(null), null);
    assert.equal(rgbToCmyk({ r: -1, g: 0, b: 0 }), null);
    assert.equal(rgbToCmyk({ r: 0, g: 0, b: 256 }), null);
    assert.equal(hexToCmyk('invalid'), null);
    assert.equal(rgbToLab(null), null);
    const whiteLab = rgbToLab({ r: 255, g: 255, b: 255 });
    assert.ok(whiteLab.l > 99);
    assert.equal(deltaE76(whiteLab, whiteLab), 0);
    assert.equal(deltaE76(null, whiteLab), null);
    const png =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAADCAIAAADZSiLoAAAAA3NCSVQICAjb4U/gAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC';
    assert.deepEqual(readRasterDimensions(png), {
      pixelWidth: 2,
      pixelHeight: 3,
      format: 'png',
      source: 'embedded_header',
    });
    assert.equal(readRasterDimensions('bad'), null);
    const colors = buildColorSpecifications(completeDesign);
    assert.equal(colors.length, 3);
    assert.equal(colors[0].spotColor, null);
    assert.equal(colors[0].spotColorStatus, 'manual_factory_match_required');
    const invalid = buildColorSpecifications({ primary: 'bad', secondary: '', accent: null });
    assert.equal(
      invalid.every((item) => item.hex === null && item.rgb === null && item.cmyk === null),
      true,
    );
    const csv = buildColorSpecificationsCsv({ ...completeDesign, primary: '#00"0000' });
    assert.match(csv, /Spot color status/);
    assert.match(csv, /manual_factory_match_required/);
  });

  test('passes quote preflight while requiring real factory proof before manufacturing', () => {
    const preflight = runProductionPreflight({
      design: completeDesign,
      studio: completeStudio(),
      roster: [],
    });
    assert.equal(preflight.readyForQuote, true);
    assert.equal(preflight.readyForManufacturing, false);
    assert.equal(preflight.status, 'preflight_passed_pending_factory_proof');
    assert.equal(preflight.blockers.length, 0);
    assert.ok(preflight.warnings.some((item) => item.code === 'factory_approval_required'));
    const colors = buildColorSpecifications(completeDesign);
    const approved = runProductionPreflight({
      design: completeDesign,
      studio: completeStudio(),
      factoryApproval: {
        approved: true,
        approvalStatus: 'approved',
        profileId: 'factory-approved-v1',
        manufacturer: 'Approved Factory',
        manufacturerLegalId: 'LY-FACTORY-001',
        certificateReference: 'CERT-001',
        certificateSha256: 'a'.repeat(64),
        templateVersion: 'generic-production-v2',
        productTypes: ['game-set'],
        iccProfileReference: 'ICC-001',
        iccProfileSha256: 'b'.repeat(64),
        pantoneLibrary: 'Pantone Solid Coated',
        pantoneLibraryVersion: '2026',
        pantoneLibrarySha256: 'c'.repeat(64),
        deltaETolerance: 2,
        gradedPatternSha256: 'd'.repeat(64),
        materialProfile: { fabricCode: 'SUB-220', stretchPercent: 4, shrinkagePercent: 1 },
        colorMeasurements: colors.map((color) => ({
          role: color.role,
          targetLab: rgbToLab(color.rgb),
          measuredLab: rgbToLab(color.rgb),
        })),
      },
    });
    assert.equal(approved.readyForManufacturing, true);
    assert.equal(approved.status, 'factory_approved');
    assert.equal(
      approved.warnings.some((item) => item.code === 'factory_approval_required'),
      false,
    );
  });

  test('blocks invalid quantity, colors, artwork, roster and empty text layers', () => {
    const design = {
      ...completeDesign,
      quantity: 1,
      primary: 'bad',
      secondary: '',
      accent: '#12345g',
      notes: '',
    };
    const studio = {
      ...completeStudio(design),
      layers: [
        {
          id: 'blank',
          type: 'text',
          view: 'front',
          label: 'Blank',
          content: '',
          x: 50,
          y: 50,
          width: 10,
          rotation: 0,
          color: '#fff000',
          font: 'block',
          visible: true,
          locked: false,
          zIndex: 1,
        },
      ],
      comments: [
        {
          id: 'c1',
          view: 'front',
          x: 2,
          y: 2,
          text: 'Resolve me',
          resolved: false,
          createdAt: '2026-01-01',
        },
      ],
    };
    const roster = [{ name: 'One', number: '', jerseySize: '', shortsSize: '' }];
    const preflight = runProductionPreflight({ design, studio, roster });
    assert.equal(preflight.readyForQuote, false);
    assert.equal(preflight.status, 'blocked');
    assert.ok(preflight.blockers.some((item) => item.code === 'minimum_quantity'));
    assert.equal(preflight.blockers.filter((item) => item.code === 'invalid_color').length, 3);
    assert.ok(preflight.blockers.some((item) => item.code === 'roster_validation'));
    assert.ok(preflight.blockers.some((item) => item.code === 'empty_text_layer'));
    assert.ok(preflight.warnings.some((item) => item.code === 'unresolved_comments'));
    assert.ok(preflight.warnings.some((item) => item.code === 'production_notes_recommended'));

    const noArtwork = runProductionPreflight({
      design: completeDesign,
      studio: {
        ...completeStudio(),
        layers: completeStudio().layers.map((layer) => ({ ...layer, visible: false })),
      },
    });
    assert.ok(noArtwork.blockers.some((item) => item.code === 'no_visible_artwork'));
  });

  test('flags unsafe placement and raster assets with measurable print requirements', () => {
    const studio = {
      ...completeStudio(),
      layers: [
        {
          id: 'raster',
          type: 'logo',
          view: 'front',
          label: 'Logo',
          content: 'data:image/png;base64,QUJDRA==',
          x: 2,
          y: 99,
          width: 90,
          rotation: 0,
          color: '#ffffff',
          font: 'block',
          visible: true,
          locked: false,
          zIndex: 1,
        },
        {
          id: 'empty-raster',
          type: 'logo',
          view: 'front',
          label: 'Empty raster payload',
          content: 'data:image/png;base64,',
          x: 50,
          y: 50,
          width: 20,
          rotation: 0,
          color: '#ffffff',
          font: 'block',
          visible: true,
          locked: false,
          zIndex: 2,
        },
        {
          id: 'hidden',
          type: 'logo',
          view: 'front',
          label: 'Hidden',
          content: 'data:image/png;base64,QUJDRA==',
          x: 50,
          y: 50,
          width: 20,
          rotation: 0,
          color: '#ffffff',
          font: 'block',
          visible: false,
          locked: false,
          zIndex: 3,
        },
        {
          id: 'external',
          type: 'logo',
          view: 'back',
          label: 'External',
          content: 'https://example.com/logo.png',
          x: 50,
          y: 50,
          width: 20,
          rotation: 0,
          color: '#ffffff',
          font: 'block',
          visible: true,
          locked: false,
          zIndex: 4,
        },
      ],
    };
    const preflight = runProductionPreflight({ design: completeDesign, studio });
    assert.equal(preflight.rasterAssets.length, 2);
    assert.equal(
      preflight.rasterAssets.some((item) => item.approximateBytes === 0),
      true,
    );
    assert.ok(preflight.rasterAssets[0].requiredPixels > 0);
    assert.ok(preflight.warnings.some((item) => item.code === 'layer_outside_safe_area'));
    assert.ok(preflight.warnings.some((item) => item.code === 'raster_preflight_failed'));
    assert.ok(preflight.blockers.some((item) => item.code === 'raster_dimensions_missing'));
    assert.ok(preflight.blockers.some((item) => item.code === 'source_checksum_missing'));
  });

  test('handles accessory products without applying roster blockers and uses defaults safely', () => {
    const design = { ...completeDesign, productType: 'team-bag', quantity: 10 };
    const preflight = runProductionPreflight({
      design,
      studio: completeStudio(design),
      roster: [{ name: '', number: '', jerseySize: '' }],
    });
    assert.equal(
      preflight.blockers.some((item) => item.code === 'roster_validation'),
      false,
    );
    const defaults = runProductionPreflight();
    assert.equal(defaults.productType, 'game-set');
    assert.equal(defaults.status, 'blocked');
  });
});

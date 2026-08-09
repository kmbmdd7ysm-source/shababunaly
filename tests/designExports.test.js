import './setup.js';
import { describe, expect, it } from './test-api.js';
import { CUSTOM_PRODUCT_TYPES, DEFAULT_CUSTOM_DESIGN } from '../src/data/customization.ts';
import { createDefaultStudio } from '../src/services/designStudio.ts';
import {
  buildDesignViewSvg,
  buildProductionPackage,
  productShape,
} from '../src/utils/designExports.js';
import { downloadDesignDocuments } from '../src/utils/simplePdf.js';

describe('production artwork exports', () => {
  it('creates dedicated vector artwork for every custom product and view', () => {
    for (const product of CUSTOM_PRODUCT_TYPES) {
      const design = { ...DEFAULT_CUSTOM_DESIGN, productType: product.key };
      const studio = createDefaultStudio(design);
      for (const view of ['front', 'back', 'side']) {
        const svg = buildDesignViewSvg({ design, studio, view, productLabel: product.label.en });
        expect(svg).toContain('<svg');
        expect(svg).toContain('PRODUCTION ARTWORK');
        expect(svg).toContain(view.toUpperCase());
      }
    }
  });

  it('uses a safe jersey fallback for an unknown production preview', () => {
    expect(productShape('unknown', '#000000', '#ffffff', '#cccccc', 'front')).toContain('M126 20');
    expect(productShape('unknown', '#000000', '#ffffff', '#cccccc', 'side')).toContain(
      'scale(.58 1)',
    );
  });

  it('packages SVG views, manifest and roster into a valid ZIP', async () => {
    const design = { ...DEFAULT_CUSTOM_DESIGN, productType: 'game-set' };
    const blob = buildProductionPackage({
      design,
      studio: createDefaultStudio(design),
      roster: [{ name: 'One', number: '7', jerseySize: 'L', shortsSize: 'L' }],
      reference: 'D-100',
    });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(Array.from(bytes.slice(0, 4))).toEqual([80, 75, 3, 4]);
    expect(new TextDecoder().decode(bytes)).toContain('manifest.json');
    expect(new TextDecoder().decode(bytes)).toContain('artwork/front.svg');
  });

  it('creates multi-page proof and tech-pack PDFs', async () => {
    const design = { ...DEFAULT_CUSTOM_DESIGN, productType: 'game-set' };
    const docs = downloadDesignDocuments({
      design,
      studio: createDefaultStudio(design),
      productLabel: 'Full Game Set',
      reference: 'D-100',
    });
    for (const document of [docs.proof, docs.tech]) {
      const bytes = new Uint8Array(await document.arrayBuffer());
      expect(new TextDecoder().decode(bytes.slice(0, 8))).toContain('%PDF-1.4');
      expect(bytes.length).toBeGreaterThan(3000);
    }
  });
});

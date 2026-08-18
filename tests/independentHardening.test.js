import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from './test-api.js';
import { products as lhaSourceProducts } from '../src/data/lhaProducts.ts';
import { catalogProducts, products, lhaStoreProducts } from '../src/data/products.ts';
import { hasRealProductMedia, isProductPurchasable } from '../src/utils/productEligibility.ts';
import { getSiteRateStorePrice } from '../src/utils/siteRatePricing.ts';

const read = (path) => readFileSync(path, 'utf8');
const variantCount = (catalog) => catalog.reduce((sum, product) => sum + (product.variants?.length || 0), 0);

describe('independent final hardening invariants', () => {
  it('removes stale per-variant LHA stock declarations from the owner source', () => {
    expect(read('src/data/lhaProducts.ts').includes('stockPerVariant:')).toBe(false);
  });

  it('keeps every LHA colour pool at exactly five shared physical pieces', () => {
    const lha = lhaStoreProducts();
    expect(lha).toHaveLength(lhaSourceProducts.length);
    for (const product of lha) {
      expect(product.stockPerColor).toBe(5);
      const colors = new Set(product.variants.map((variant) => variant.inventoryPoolKey));
      expect(colors.size).toBeGreaterThan(0);
      for (const color of colors) {
        const variants = product.variants.filter((variant) => variant.inventoryPoolKey === color);
        expect(variants.every((variant) => variant.inventoryPoolStock === 5)).toBe(true);
      }
    }
  });

  it('keeps all fifty Kobe masters at 1200 LYD with a maximum men size of US 12', () => {
    const kobe = catalogProducts.filter((product) => product.pricingRateSource === 'site_exchange_rate');
    expect(kobe).toHaveLength(50);
    for (const product of kobe) {
      expect(product.priceLydSource).toBe(1200);
      const numericSizes = product.variants.map((variant) => Number(variant.size)).filter(Number.isFinite);
      expect(Math.max(...numericSizes) <= 12).toBe(true);
    }
  });

  it('derives clean Kobe USD prices from the editable site rate instead of a fixed USD number', () => {
    expect(getSiteRateStorePrice(1200, 9)).toBe(135);
    expect(getSiteRateStorePrice(1200, 8)).toBe(150);
    expect(getSiteRateStorePrice(1200, 10)).toBe(120);
    expect(getSiteRateStorePrice(1200, 7.5) % 5).toBe(0);
  });

  it('publishes only production-media products and leaves 44 incomplete masters hidden', () => {
    expect(catalogProducts).toHaveLength(119);
    expect(products).toHaveLength(75);
    expect(catalogProducts.length - products.length).toBe(44);
    expect(products.every(hasRealProductMedia)).toBe(true);
  });

  it('never exposes a zero-price product as a direct checkout item', () => {
    const zeroPrice = products.filter((product) => Number(product.price) <= 0);
    expect(zeroPrice.length).toBeGreaterThan(0);
    for (const product of zeroPrice) {
      expect(product.quoteOnly).toBe(true);
      expect(product.retailAvailable).toBe(false);
      expect(product.wholesaleAvailable).toBe(false);
      expect(isProductPurchasable(product)).toBe(false);
    }
    const productPage = read('src/pages/ProductPage.tsx');
    expect(productPage).toContain('Price on request');
    expect(productPage).toContain('Request a quote');
    expect(read('src/components/layout/SearchOverlay.tsx')).toContain('Price on request');
    expect(read('src/pages/ComparePage.tsx')).toContain('Price on request');
    expect(read('src/components/shop/QuickAddSheet.tsx')).toContain('product.quoteOnly === true');
    expect(read('src/pages/ShopPage.tsx')).toContain('product.quoteOnly === true && (min != null || max != null)');
    const trustedSql = read('supabase/generated/product_catalog.sql');
    expect(trustedSql).toContain('\"quoteOnly\":true');
    expect(trustedSql).toContain('\"retailAvailable\":false');
    expect(read('supabase/migrations/20260818050000_quote_only_checkout_guard.sql')).toContain('v_catalog.unit_price <= 0');
  });

  it('generates only trusted variants for the 75 published products', () => {
    expect(variantCount(catalogProducts)).toBe(1482);
    expect(variantCount(products)).toBe(786);
    const generatedSql = read('supabase/generated/product_catalog.sql');
    const sqlRows = generatedSql.split('\n').filter((line) => line.startsWith("('")).length;
    expect(sqlRows).toBe(786);
    expect(generatedSql).toContain('with pool_floor as');
    expect(generatedSql).toContain("variant_data->>'inventorySource'='owner_confirmed_lha_color_stock'");
  });

  it('never lets the browser post customer forms straight to Formspree', () => {
    const source = read('src/services/formspree.ts');
    expect(source.includes("fetch(FORMSPREE_ENDPOINT")).toBe(false);
    expect(source.includes("fetch('/api/formspree'")).toBe(true);
    expect(read('src/context/ReadinessContext.tsx').includes('https://formspree.io/')).toBe(false);
  });

  it('keeps quote persistence and email fallback entirely on the same-origin API', () => {
    const source = read('src/services/publicQuotes.ts');
    expect(source.includes('sendFormspree')).toBe(false);
    expect(source.includes("fetch('/api/public-quote-request'")).toBe(true);
    expect(source.includes('direct_formspree_fallback')).toBe(false);
  });

  it('keeps special-request persistence and attachment fallback entirely on the same-origin API', () => {
    const source = read('src/services/specialRequests.ts');
    expect(source.includes('sendFormspree')).toBe(false);
    expect(source.includes("fetch('/api/special-request'")).toBe(true);
    expect(source.includes('direct_formspree_fallback')).toBe(false);
  });

  it('labels server email-only quote and special-request fallbacks explicitly', () => {
    expect(read('api/public-quote-request.ts')).toContain("status: 'email_only'");
    expect(read('api/special-request.ts')).toContain("status: 'email_only'");
  });

  it('does not load the 3D model-viewer engine until the customer explicitly opens 3D', () => {
    const source = read('src/components/custom/CustomJerseyShowcase.tsx');
    expect(source.startsWith("import '../product/engines/loadModelViewer.ts'")).toBe(false);
    expect(source.includes("import(" + "'../product/engines/loadModelViewer.ts')")).toBe(true);
    expect(source.includes('modelRequested')).toBe(true);
    expect(source.includes('Open 3D preview')).toBe(true);
  });

  it('treats a successful cloud catalogue response as authoritative instead of resurrecting static archived products', () => {
    const source = read('src/context/CatalogContext.tsx');
    expect(source.includes('{ authoritative: true }')).toBe(true);
    expect(source.includes('return authoritative ? [] : baseProducts')).toBe(true);
  });

  it('keeps LHA current stock sourced from cloud pool quantities rather than resetting sold stock to five', () => {
    const source = read('src/context/CatalogContext.tsx');
    expect(source.includes('inventoryPoolStock: ownerConfirmedLhaStock')).toBe(true);
    expect(source.includes('Number(row.inventory_quantity)')).toBe(true);
    expect(source.includes('stockByColor')).toBe(true);
    expect(source.includes('owner_confirmed_lha_color_stock')).toBe(true);
  });

  it('locks staff LHA inventory edits to the whole colour pool and reprices site-rate products atomically', () => {
    const sql = read('supabase/migrations/20260818030000_independent_catalog_hardening.sql');
    expect(sql).toContain('pg_advisory_xact_lock');
    expect(sql).toContain("variant_data->>'inventoryPoolKey'");
    expect(sql).toContain('site_rate_price_locked');
    expect(sql).toContain("variant_data->>'pricingRateSource'='site_exchange_rate'");
    expect(sql).toContain("variant_data->>'priceLydSource'");
    const reconcile = read('supabase/migrations/20260818040000_lha_pool_reconciliation.sql');
    expect(reconcile).toContain('with pool_floor as');
    expect(reconcile).toContain('min(inventory_quantity) as available');
  });

  it('keeps every published primary product image local, present and byte-unique', () => {
    const hashes = new Set();
    for (const product of products) {
      const image = String(product.image || '');
      expect(image.startsWith('/')).toBe(true);
      expect(/^https?:/i.test(image)).toBe(false);
      const file = `public${image}`;
      expect(existsSync(file)).toBe(true);
      const hash = createHash('sha256').update(readFileSync(file)).digest('hex');
      expect(hashes.has(hash)).toBe(false);
      hashes.add(hash);
    }
    expect(hashes.size).toBe(75);
    expect(read('src/services/operations.ts')).toContain('product_image_must_be_local');
  });
});

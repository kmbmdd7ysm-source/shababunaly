import { readFile } from 'node:fs/promises';
import { describe, expect, it } from './test-api.js';
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

describe('enterprise production completion', () => {
  it('uses provider adapters for quotes and special requests', async () => {
    const quote = await read('api/create-quote-session.ts');
    const special = await read('api/create-special-request-session.ts');
    expect(quote).toContain('getPaymentAdapter');
    expect(quote).toContain('adapter.createSession');
    expect(special).toContain("status !== 'awaiting_payment'");
    expect(special).toContain('customer_decision');
  });
  it('enforces quote total as subtotal plus shipping plus tax less discount', async () => {
    const service = await read('src/services/operations.ts');
    const sql = await read(
      'supabase/migrations/20260801010000_shababuna_production_completion.sql',
    );
    expect(service).toContain('parsedSubtotal + parsedShipping + parsedTax - parsedDiscount');
    expect(service).toContain('p_tax_total');
    expect(service).toContain('p_discount_total');
    expect(sql).toContain('v_sub+v_ship+v_tax-v_discount');
  });
  it('generates quote and invoice PDFs in the customer workspace', async () => {
    const workspace = await read('src/components/account/OrganizationWorkspace.tsx');
    expect(workspace).toContain('SHABABUNA QUOTE');
    expect(workspace).toContain('SHABABUNA INVOICE');
    expect(workspace).toContain('Download Quote PDF');
  });
  it('quarantines staff media and scans it before use', async () => {
    const upload = await read('api/admin-media-upload.ts');
    const scan = await read('api/media-scan-worker.ts');
    expect(upload).toContain("scan_status: 'quarantined'");
    expect(upload).toContain('requireStaffSession');
    expect(scan).toMatch(/scan_status:\s*infected\s*\?\s*'infected'\s*:\s*'clean'/s);
    expect(scan).toContain('MALWARE_SCAN_API_URL');
  });
  it('provides privacy export and retention workers', async () => {
    const privacy = await read('api/privacy-worker.ts');
    const retention = await read('api/retention-worker.ts');
    const vercel = await read('vercel.json');
    expect(privacy).toContain('privacy_export_requests');
    expect(privacy).toContain('PRIVACY_EXPORT_BUCKET');
    expect(retention).toContain('design_share_links');
    expect(vercel).toContain('/api/privacy-worker');
    expect(vercel).toContain('/api/retention-worker');
  });
  it('removes all inline stylesheet permissions with CSP-safe UI primitives', async () => {
    const vercel = await read('vercel.json');
    expect(vercel).not.toContain("style-src 'self' 'unsafe-inline'");
    expect(vercel).toContain("style-src-attr 'none'");
    expect(vercel).toContain("script-src-attr 'none'");
  });
});

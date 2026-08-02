import { readFile } from 'node:fs/promises';
import { describe, expect, it } from './test-api.js';
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

describe('secure design sharing', () => {
  it('exposes a real expiring share route and page', async () => {
    const app = await read('src/App.jsx');
    const page = await read('src/pages/DesignSharePage.jsx');
    expect(app).toContain('/design-share/:token');
    expect(page).toContain('loadSharedDesign');
    expect(page).toContain('respondToSharedDesign');
    expect(page).toContain('addSharedDesignComment');
  });

  it('hashes tokens and gives anon only guarded RPC access', async () => {
    const sql = await read('supabase/migrations/20260801025000_secure_design_sharing.sql');
    expect(sql).toContain("digest(p_token,'sha256')");
    expect(sql).toContain('expires_at>now()');
    expect(sql).toContain('grant execute on function public.get_shared_design(text) to anon');
    expect(sql).toContain("permissions<>'approve'");
  });
});

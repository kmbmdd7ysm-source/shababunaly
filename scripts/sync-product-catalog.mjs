import fs from 'node:fs/promises';
import { buildCatalog } from './catalog/build-catalog.mjs';
const out = process.argv[2] || 'supabase/generated/product_catalog.sql';
const records = buildCatalog();
const q = (v) => (v == null ? 'null' : `'${String(v).replaceAll("'", "''")}'`);
const rows = records
  .map(
    (r) =>
      `(${q(r.variant_id)},${q(r.product_id)},${q(r.canonical_slug)},${q(r.sku)},${q(r.product_name)},${q(r.product_status)},${r.active},${q(r.color)},${q(r.size)},${q(r.currency)},${r.unit_price},${r.compare_at_price ?? 'null'},${q(r.availability_state)},${r.inventory_tracking},${r.inventory_quantity ?? 'null'},${q(JSON.stringify(r.variant_data))}::jsonb)`,
  )
  .join(',\n');
const sql = `begin;\ncreate temporary table incoming_catalog (like public.product_catalog including defaults) on commit drop;\ninsert into incoming_catalog(variant_id,product_id,canonical_slug,sku,product_name,product_status,active,color,size,currency,unit_price,compare_at_price,availability_state,inventory_tracking,inventory_quantity,variant_data) values\n${rows};\ninsert into public.product_catalog as pc(variant_id,product_id,canonical_slug,sku,product_name,product_status,active,color,size,currency,unit_price,compare_at_price,availability_state,inventory_tracking,inventory_quantity,variant_data) select variant_id,product_id,canonical_slug,sku,product_name,product_status,active,color,size,currency,unit_price,compare_at_price,availability_state,inventory_tracking,inventory_quantity,variant_data from incoming_catalog on conflict(variant_id) do update set product_id=excluded.product_id,canonical_slug=excluded.canonical_slug,sku=excluded.sku,product_name=excluded.product_name,product_status=excluded.product_status,active=excluded.active,color=excluded.color,size=excluded.size,currency=excluded.currency,unit_price=excluded.unit_price,compare_at_price=excluded.compare_at_price,availability_state=excluded.availability_state,inventory_tracking=excluded.inventory_tracking,inventory_quantity=excluded.inventory_quantity,variant_data=excluded.variant_data,updated_at=now();\nupdate public.product_catalog set active=false,product_status='archived',availability_state='unavailable',updated_at=now() where variant_id not in (select variant_id from incoming_catalog);\ncommit;\n`;
await fs.mkdir(out.split('/').slice(0, -1).join('/'), { recursive: true });
await fs.writeFile(out, sql);
console.info(`Generated ${records.length} deterministic catalog variants at ${out}`);

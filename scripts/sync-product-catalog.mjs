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
// Existing tracked stock is never replenished by a catalogue deploy. A row that was previously untracked can be initialized once from the new trusted catalogue, then subsequent deploys preserve its live quantity.
const sql = `begin;
create temporary table incoming_catalog (like public.product_catalog including defaults) on commit drop;
insert into incoming_catalog(variant_id,product_id,canonical_slug,sku,product_name,product_status,active,color,size,currency,unit_price,compare_at_price,availability_state,inventory_tracking,inventory_quantity,variant_data) values
${rows};

-- Products whose source price is LYD (currently Kobe) must use the editable
-- site exchange rate at deployment time too. A deploy must never reset them to
-- the code fallback price after staff has changed the live rate.
do $$
declare v_rate numeric;
begin
  select numeric_value into v_rate from public.commerce_settings where setting_key='usd_to_lyd_rate';
  if exists(select 1 from incoming_catalog where variant_data->>'pricingRateSource'='site_exchange_rate') then
    if v_rate is null or v_rate <= 0 then raise exception 'invalid_exchange_rate'; end if;
    update incoming_catalog
    set unit_price = ceil((((variant_data->>'priceLydSource')::numeric / v_rate) / 5.0)) * 5.0
    where variant_data->>'pricingRateSource'='site_exchange_rate'
      and coalesce((variant_data->>'priceLydSource')::numeric,0) > 0;
  end if;
end $$;

insert into public.product_catalog as pc(variant_id,product_id,canonical_slug,sku,product_name,product_status,active,color,size,currency,unit_price,compare_at_price,availability_state,inventory_tracking,inventory_quantity,variant_data)
select variant_id,product_id,canonical_slug,sku,product_name,product_status,active,color,size,currency,unit_price,compare_at_price,availability_state,inventory_tracking,inventory_quantity,variant_data from incoming_catalog
on conflict(variant_id) do update set
  product_id=excluded.product_id,
  canonical_slug=excluded.canonical_slug,
  sku=excluded.sku,
  product_name=excluded.product_name,
  product_status=excluded.product_status,
  active=excluded.active,
  color=excluded.color,
  size=excluded.size,
  currency=excluded.currency,
  unit_price=excluded.unit_price,
  compare_at_price=excluded.compare_at_price,
  availability_state=case
    when pc.inventory_tracking=true and pc.inventory_quantity is not null then
      case when pc.inventory_quantity=0 then 'out_of_stock'
           when pc.inventory_quantity<=6 then 'low_stock'
           else 'in_stock' end
    else excluded.availability_state
  end,
  inventory_tracking=excluded.inventory_tracking,
  -- Tracked inventory is operational truth. Catalogue generation seeds it once
  -- but can never replenish quantities already decremented by real orders.
  inventory_quantity=case
    when pc.inventory_tracking=true and pc.inventory_quantity is not null then pc.inventory_quantity
    else excluded.inventory_quantity
  end,
  variant_data=excluded.variant_data,
  updated_at=now();

-- A newly introduced size in an already-sold shared colour pool must inherit
-- the pool's current remaining quantity, not the bootstrap five. Reconcile to
-- the minimum current quantity after every catalogue upsert; this can only
-- decrease divergent rows, never replenish sold stock.
with pool_floor as (
  select
    product_id,
    variant_data->>'inventoryPoolKey' as pool_key,
    min(inventory_quantity) as available
  from public.product_catalog
  where inventory_tracking=true
    and variant_data->>'inventorySource'='owner_confirmed_lha_color_stock'
    and nullif(variant_data->>'inventoryPoolKey','') is not null
    and inventory_quantity is not null
  group by product_id, variant_data->>'inventoryPoolKey'
)
update public.product_catalog pc
set inventory_quantity=pf.available,
    availability_state=case
      when not pc.active then 'unavailable'
      when pf.available=0 then 'out_of_stock'
      when pf.available<=6 then 'low_stock'
      else 'in_stock'
    end,
    variant_data=jsonb_set(
      jsonb_set(coalesce(pc.variant_data,'{}'::jsonb),'{inventoryPoolStock}',to_jsonb(pf.available),true),
      '{readyToShip}',to_jsonb(pf.available>0),true
    ),
    updated_at=now()
from pool_floor pf
where pc.product_id=pf.product_id
  and pc.variant_data->>'inventoryPoolKey'=pf.pool_key
  and pc.variant_data->>'inventorySource'='owner_confirmed_lha_color_stock'
  and pc.inventory_tracking=true
  and (
    pc.inventory_quantity is distinct from pf.available
    or coalesce(pc.variant_data->>'inventoryPoolStock','') is distinct from pf.available::text
    or coalesce(pc.variant_data->>'readyToShip','') is distinct from (pf.available>0)::text
  );

update public.product_catalog
set active=false,product_status='archived',availability_state='unavailable',updated_at=now()
where variant_id not in (select variant_id from incoming_catalog);
commit;
`;
await fs.mkdir(out.split('/').slice(0, -1).join('/'), { recursive: true });
await fs.writeFile(out, sql);
console.info(`Generated ${records.length} deterministic catalog variants at ${out}`);

-- Reconcile any pre-existing shared colour-pool divergence without ever replenishing sold stock.
-- This is intentionally a downward-only repair: every size row adopts the minimum
-- remaining quantity already present in its product/colour pool.

begin;

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
    inventory_verified_at=coalesce(pc.inventory_verified_at,now()),
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

commit;

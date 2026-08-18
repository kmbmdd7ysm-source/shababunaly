-- Independent final audit hardening.
-- 1) LHA inventory is a shared colour pool: five pieces initially, then the
--    database remaining quantity is authoritative across every size.
-- 2) Kobe's 1200 LYD business price is converted with the editable site rate;
--    staff cannot bypass that rule by typing a variant USD price manually.
-- 3) Staff pool edits update the whole colour pool atomically.

begin;

create or replace function public.staff_update_catalog_variant(
  p_variant_id text,
  p_unit_price numeric default null,
  p_wholesale_price numeric default null,
  p_inventory_quantity integer default null,
  p_active boolean default null,
  p_ready_to_ship boolean default null
) returns public.product_catalog
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  before_row public.product_catalog;
  after_row public.product_catalog;
  v_data jsonb;
  v_effective_retail numeric(12,2);
  v_effective_wholesale numeric(12,2);
  v_pool_key text;
  v_is_site_rate_price boolean;
  v_is_owner_lha_pool boolean;
begin
  if not public.is_shababuna_staff() then raise exception 'staff_required'; end if;

  select * into before_row
  from public.product_catalog
  where variant_id=p_variant_id
  for update;
  if not found then raise exception 'catalog_variant_not_found'; end if;

  v_pool_key := nullif(before_row.variant_data->>'inventoryPoolKey','');
  v_is_site_rate_price := coalesce(before_row.variant_data->>'pricingRateSource','')='site_exchange_rate';
  v_is_owner_lha_pool := coalesce(before_row.variant_data->>'inventorySource','')='owner_confirmed_lha_color_stock';

  -- The source LYD price + site rate own the USD retail value. The only way to
  -- change this product price is to change the site exchange rate.
  if v_is_site_rate_price and p_unit_price is not null then
    raise exception 'site_rate_price_locked';
  end if;
  if p_unit_price is not null and p_unit_price<0 then raise exception 'invalid_unit_price'; end if;
  if p_inventory_quantity is not null and p_inventory_quantity<0 then raise exception 'invalid_inventory_quantity'; end if;

  v_effective_retail=coalesce(round(p_unit_price,2),before_row.unit_price);
  v_effective_wholesale=coalesce(
    round(p_wholesale_price,2),
    nullif(before_row.variant_data->>'wholesalePrice','')::numeric
  );
  if v_effective_wholesale is not null and
     (v_effective_wholesale<0 or v_effective_wholesale>=v_effective_retail) then
    raise exception 'invalid_wholesale_price';
  end if;
  if coalesce(p_ready_to_ship,false) and not coalesce(p_active,before_row.active) then
    raise exception 'ready_variant_must_be_active';
  end if;
  if coalesce(p_ready_to_ship,false) and coalesce(p_inventory_quantity,before_row.inventory_quantity,0)<=0 then
    raise exception 'ready_variant_requires_positive_inventory';
  end if;

  -- A colour pool is one physical inventory unit shared by all its sizes.
  -- Serialize and edit every row in the pool so the operations UI cannot create
  -- impossible states such as S=5 and M=2 for the same five black pieces.
  if v_pool_key is not null and p_inventory_quantity is not null then
    perform pg_advisory_xact_lock(hashtextextended(before_row.product_id || ':' || v_pool_key,0));
    perform 1
    from public.product_catalog
    where product_id=before_row.product_id
      and variant_data->>'inventoryPoolKey'=v_pool_key
      and inventory_tracking=true
    order by variant_id
    for update;

    update public.product_catalog
    set inventory_quantity=p_inventory_quantity,
        inventory_tracking=true,
        inventory_verified_at=now(),
        availability_state=case
          when not active then 'unavailable'
          when p_inventory_quantity=0 then 'out_of_stock'
          when p_inventory_quantity<=6 then 'low_stock'
          else 'in_stock'
        end,
        variant_data=(
          case
            when v_is_owner_lha_pool then
              jsonb_set(
                jsonb_set(coalesce(variant_data,'{}'::jsonb),'{inventoryPoolStock}',to_jsonb(p_inventory_quantity),true),
                '{readyToShip}',to_jsonb(p_inventory_quantity>0),true
              )
            else
              jsonb_set(coalesce(variant_data,'{}'::jsonb),'{inventoryPoolStock}',to_jsonb(p_inventory_quantity),true)
          end
        ),
        updated_at=now()
    where product_id=before_row.product_id
      and variant_data->>'inventoryPoolKey'=v_pool_key
      and inventory_tracking=true;
  end if;

  -- Price, activation and an explicit ready flag remain variant-admin fields.
  -- For a pool, inventory itself has already been updated above.
  select * into before_row
  from public.product_catalog
  where variant_id=p_variant_id
  for update;

  v_data=coalesce(before_row.variant_data,'{}'::jsonb);
  if p_wholesale_price is not null then
    v_data=jsonb_set(v_data,'{wholesalePrice}',to_jsonb(round(p_wholesale_price,2)),true);
  end if;
  if p_ready_to_ship is not null then
    v_data=jsonb_set(v_data,'{readyToShip}',to_jsonb(p_ready_to_ship),true);
  end if;

  update public.product_catalog
  set unit_price=v_effective_retail,
      inventory_quantity=case
        when v_pool_key is not null and p_inventory_quantity is not null then inventory_quantity
        when p_inventory_quantity is null then inventory_quantity
        else p_inventory_quantity
      end,
      inventory_tracking=case
        when p_inventory_quantity is not null or coalesce(p_ready_to_ship,false) then true
        else inventory_tracking
      end,
      inventory_verified_at=case when p_inventory_quantity is not null then now() else inventory_verified_at end,
      active=coalesce(p_active,active),
      product_status=case when coalesce(p_active,active) then 'active' else 'archived' end,
      availability_state=case
        when not coalesce(p_active,active) then 'unavailable'
        when coalesce(p_inventory_quantity,inventory_quantity) is null then availability_state
        when coalesce(p_inventory_quantity,inventory_quantity)=0 then 'out_of_stock'
        when coalesce(p_inventory_quantity,inventory_quantity)<=6 then 'low_stock'
        else 'in_stock'
      end,
      variant_data=v_data,
      updated_at=now()
  where variant_id=p_variant_id
  returning * into after_row;

  insert into public.operations_audit_log(actor_id,action,entity_type,entity_id,before_data,after_data)
  values(
    auth.uid(),
    case when v_pool_key is not null and p_inventory_quantity is not null
      then 'update_catalog_inventory_pool'
      else 'update_catalog_variant' end,
    'catalog_variant',
    p_variant_id,
    to_jsonb(before_row),
    to_jsonb(after_row) || jsonb_build_object('inventoryPoolKey',v_pool_key)
  );
  return after_row;
end;
$$;
revoke all on function public.staff_update_catalog_variant(text,numeric,numeric,integer,boolean,boolean) from public;
grant execute on function public.staff_update_catalog_variant(text,numeric,numeric,integer,boolean,boolean) to authenticated,service_role;

create or replace function public.staff_set_exchange_rate(p_rate numeric)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_updated integer := 0;
begin
  if not public.is_shababuna_staff() then raise exception 'staff_required'; end if;
  if p_rate is null or p_rate <= 0 then raise exception 'invalid_exchange_rate'; end if;

  insert into public.commerce_settings(setting_key,numeric_value,updated_at)
  values('usd_to_lyd_rate',p_rate,now())
  on conflict(setting_key) do update
  set numeric_value=excluded.numeric_value,updated_at=now();

  -- Reprice all source-LYD products in the same transaction. The formula is
  -- identical to roundStorePrice(): round UP to the next clean five-dollar
  -- store step, e.g. 1200/9 => 133.33 => 135.
  update public.product_catalog
  set unit_price = ceil((((variant_data->>'priceLydSource')::numeric / p_rate) / 5.0)) * 5.0,
      updated_at=now()
  where variant_data->>'pricingRateSource'='site_exchange_rate'
    and coalesce((variant_data->>'priceLydSource')::numeric,0)>0;
  get diagnostics v_updated = row_count;

  insert into public.operations_audit_log(actor_id,action,entity_type,entity_id,after_data)
  values(
    auth.uid(),'set_exchange_rate','commerce_setting','usd_to_lyd_rate',
    jsonb_build_object('rate',p_rate,'site_rate_variants_repriced',v_updated)
  );
  return jsonb_build_object('usd_to_lyd_rate',p_rate,'site_rate_variants_repriced',v_updated);
end;
$$;
revoke all on function public.staff_set_exchange_rate(numeric) from public;
grant execute on function public.staff_set_exchange_rate(numeric) to authenticated,service_role;

commit;

-- Independent hardening: fail closed on quote-only/zero-price checkout lines.
-- This migration intentionally redefines the latest transactional order function
-- so API callers cannot bypass the storefront's Price-on-request workflow.

begin;

create or replace function public.create_order_transactional(
  p_user_id uuid,
  p_customer_email text,
  p_currency text,
  p_payment_method text,
  p_idempotency_key uuid,
  p_shipping jsonb,
  p_items jsonb
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_existing public.orders%rowtype;
  v_order public.orders%rowtype;
  v_requested record;
  v_catalog public.product_catalog%rowtype;
  v_subtotal numeric(12,2) := 0;
  v_line numeric(12,2);
  v_unit_price numeric(12,2);
  v_order_number text;
  v_items jsonb := '[]'::jsonb;
  v_pool_key text;
  v_shipping_total numeric(12,2) := 0;
  v_shipping_country text;
  v_shipping_summary jsonb;
  v_usd_to_lyd_rate numeric;
  v_requires_shipping_quote boolean := false;
  v_has_large_equipment boolean := false;
  v_is_staged boolean := false;
  v_payment_plan text := 'full';
  v_amount_due_now numeric(12,2) := 0;
  v_remaining_balance numeric(12,2) := 0;
  v_order_status text := 'received';
  v_payment_status text := 'pending';
  v_fulfillment_status text := 'unfulfilled';
  v_delivery_profile text := 'standard';
  v_wholesale_available boolean;
  v_wholesale_min integer;
  v_minimum_order integer;
  v_country_shipping_rate numeric(12,2);
  v_all_ready_to_ship boolean := true;
begin
  if p_idempotency_key is null
    or p_currency <> 'USD'
    or p_payment_method not in ('cash_on_delivery','cash','online','online_card','libyan_bank_card') then
    raise exception using errcode='22023', message='invalid_order_request';
  end if;

  p_customer_email := lower(btrim(coalesce(p_customer_email,'')));
  if p_customer_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception using errcode='22023', message='invalid_email';
  end if;
  if jsonb_typeof(p_items) <> 'array'
    or jsonb_array_length(p_items) < 1
    or jsonb_array_length(p_items) > 50 then
    raise exception using errcode='22023', message='invalid_items';
  end if;

  select * into v_existing
  from public.orders
  where idempotency_key = p_idempotency_key
    and user_id is not distinct from p_user_id
  limit 1;

  if found then
    return jsonb_build_object('duplicate', true, 'order', jsonb_build_object(
      'order_number',v_existing.order_number,'currency',v_existing.currency,'subtotal',v_existing.subtotal,
      'shipping_total',v_existing.shipping_total,'tax_total',v_existing.tax_total,'discount_total',v_existing.discount_total,
      'total',v_existing.total,'payment_method',v_existing.payment_method,'payment_plan',v_existing.payment_plan,
      'amount_due_now',v_existing.amount_due_now,'remaining_balance',v_existing.remaining_balance,
      'shipping_quote_required',v_existing.shipping_quote_required,'delivery_profile',v_existing.delivery_profile,
      'payment_status',v_existing.payment_status,'order_status',v_existing.order_status,
      'fulfillment_status',v_existing.fulfillment_status,'created_at',v_existing.created_at));
  end if;

  v_shipping_country := upper(btrim(coalesce(p_shipping->>'country','')));
  if v_shipping_country !~ '^[A-Z]{2}$' then
    raise exception using errcode='22023', message='invalid_shipping_country';
  end if;
  if v_shipping_country <> 'LY' and p_payment_method in ('cash','cash_on_delivery') then
    raise exception using errcode='22023', message='cash_available_only_in_libya';
  end if;

  -- Aggregate equal lines while retaining retail/wholesale/custom mode.
  for v_requested in
    with raw_items as (
      select
        nullif(value->>'variantId','') as variant_id,
        nullif(value->>'productId','') as product_id,
        case
          when lower(coalesce(value->>'purchaseMode','retail')) in ('retail','wholesale','custom')
            then lower(coalesce(value->>'purchaseMode','retail'))
          else null
        end as purchase_mode,
        case
          when coalesce(value->>'quantity','') ~ '^[0-9]+$' then (value->>'quantity')::integer
          else null
        end as quantity
      from jsonb_array_elements(p_items)
    ), grouped_items as (
      select variant_id, product_id, purchase_mode, sum(quantity)::integer as quantity
      from raw_items
      group by variant_id, product_id, purchase_mode
    )
    select variant_id, product_id, purchase_mode, quantity,
      sum(quantity) over (partition by product_id, purchase_mode)::integer as product_mode_quantity
    from grouped_items
    order by variant_id, product_id, purchase_mode
  loop
    if v_requested.variant_id is null
      or v_requested.product_id is null
      or v_requested.purchase_mode is null
      or v_requested.quantity is null
      or v_requested.quantity < 1
      or v_requested.quantity > 999 then
      raise exception using errcode='22023', message='invalid_quantity';
    end if;

    -- Read the shared inventory-pool key before taking row locks. For pooled
    -- stock (LHA owner-confirmed five pieces per color), serialize every order
    -- touching the same product/color pool with a transaction advisory lock,
    -- then lock all size rows in deterministic order. This prevents two
    -- concurrent checkouts on different sizes from overselling one color pool.
    select nullif(variant_data->>'inventoryPoolKey','') into v_pool_key
    from public.product_catalog
    where variant_id = v_requested.variant_id
      and product_id = v_requested.product_id
      and active = true
      and product_status = 'active'
      and availability_state not in ('out_of_stock','unavailable')
      and currency = 'USD'
      and fulfillment_type = 'physical';
    if not found then
      raise no_data_found;
    end if;

    if v_pool_key is not null then
      perform pg_advisory_xact_lock(hashtextextended(v_requested.product_id || ':' || v_pool_key, 0));
      perform 1
      from public.product_catalog
      where product_id = v_requested.product_id
        and variant_data->>'inventoryPoolKey' = v_pool_key
        and inventory_tracking = true
      order by variant_id
      for update;
    end if;

    select * into strict v_catalog
    from public.product_catalog
    where variant_id = v_requested.variant_id
      and product_id = v_requested.product_id
      and active = true
      and product_status = 'active'
      and availability_state not in ('out_of_stock','unavailable')
      and currency = 'USD'
      and fulfillment_type = 'physical'
    for update;

    v_wholesale_available := coalesce((v_catalog.variant_data->>'wholesaleAvailable')::boolean, false);
    v_wholesale_min := greatest(1, coalesce((v_catalog.variant_data->>'wholesaleMin')::integer, 1));
    v_minimum_order := greatest(1, coalesce((v_catalog.variant_data->>'minimumOrder')::integer, 1));

    -- Quote-only / unknown-price products are never order-intake items. Stock can
    -- remain visible for truthful availability, but the customer must use the
    -- quote workflow until a positive approved price exists. The numeric guard
    -- protects older catalogue rows that predate the quoteOnly metadata too.
    if coalesce((v_catalog.variant_data->>'quoteOnly')::boolean, false)
      or v_catalog.unit_price is null
      or v_catalog.unit_price <= 0 then
      raise exception using errcode='22023', message='retail_unavailable';
    end if;

    if v_requested.purchase_mode = 'wholesale' then
      if not v_wholesale_available or v_requested.product_mode_quantity < v_wholesale_min then
        raise exception using errcode='22023', message='invalid_wholesale_quantity';
      end if;
      v_unit_price := nullif(v_catalog.variant_data->>'wholesalePrice','')::numeric;
      if v_unit_price is null or v_unit_price <= 0 then
        raise exception using errcode='22023', message='invalid_wholesale_price';
      end if;
      v_is_staged := true;
    elsif v_requested.purchase_mode = 'custom' then
      if not coalesce((v_catalog.variant_data->>'customizable')::boolean, false)
        or v_requested.product_mode_quantity < v_minimum_order then
        raise exception using errcode='22023', message='invalid_custom_quantity';
      end if;
      v_unit_price := v_catalog.unit_price;
      v_is_staged := true;
    else
      if not coalesce((v_catalog.variant_data->>'retailAvailable')::boolean, true) then
        raise exception using errcode='22023', message='retail_unavailable';
      end if;
      v_unit_price := v_catalog.unit_price;
    end if;

    if coalesce((v_catalog.variant_data->>'largeEquipment')::boolean, false) then
      v_has_large_equipment := true;
    end if;
    if not coalesce((v_catalog.variant_data->>'readyToShip')::boolean, false) then
      v_all_ready_to_ship := false;
    end if;

    if v_catalog.inventory_tracking
      and v_catalog.inventory_quantity < v_requested.quantity then
      raise exception using errcode='22023', message='insufficient_inventory';
    end if;

    v_line := round(v_unit_price * v_requested.quantity, 2);
    v_subtotal := v_subtotal + v_line;
    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'variant_id',v_catalog.variant_id,'product_id',v_catalog.product_id,'sku',v_catalog.sku,
      'product_name',v_catalog.product_name,
      'variant_snapshot',v_catalog.variant_data || jsonb_build_object('purchaseMode',v_requested.purchase_mode),
      'purchase_mode',v_requested.purchase_mode,
      'quantity',v_requested.quantity,'fulfillment_type','physical',
      'unit_price',v_unit_price,'line_total',v_line));
  end loop;

  if v_shipping_country <> 'LY' then
    select rate_usd into v_country_shipping_rate
    from public.shipping_country_rates
    where country_code=v_shipping_country and active=true;
  end if;

  v_requires_shipping_quote := v_has_large_equipment
    or v_is_staged
    or (v_shipping_country <> 'LY' and v_country_shipping_rate is null);

  if v_requires_shipping_quote then
    v_shipping_total := 0;
    v_shipping_summary := coalesce(p_shipping,'{}'::jsonb) || jsonb_build_object(
      'country',v_shipping_country,
      'pendingQuote',true,
      'canonical_shipping_total',0,
      'canonical_currency','USD',
      'shipping_reason',case
        when v_has_large_equipment then 'equipment_shipping_quote_required'
        when v_is_staged then 'custom_or_wholesale_shipping_quote_required'
        else 'international_shipping_quote_required'
      end,
      'inventory_reserved',false
    );
  else
    if v_shipping_country='LY' then
      select numeric_value into v_usd_to_lyd_rate
      from public.commerce_settings where setting_key='usd_to_lyd_rate';
      if v_usd_to_lyd_rate is null or v_usd_to_lyd_rate <= 0 then
        raise exception using errcode='22023', message='invalid_exchange_rate';
      end if;

      v_shipping_total := case
        when round(v_subtotal * v_usd_to_lyd_rate, 2) >= 500.00 then 0
        else round(20.00 / v_usd_to_lyd_rate, 2)
      end;
      v_shipping_summary := coalesce(p_shipping,'{}'::jsonb) || jsonb_build_object(
        'country','LY',
        'rate_amount',20.00,
        'rate_currency','LYD',
        'canonical_shipping_total',v_shipping_total,
        'canonical_currency','USD',
        'free_shipping_threshold_amount',500.00,
        'free_shipping_threshold_currency','LYD',
        'shipping_reason',case when v_shipping_total = 0 then 'libya_free_shipping_500_lyd' else 'libya_standard_shipping_20_lyd' end,
        'exchange_rate_setting','usd_to_lyd_rate',
        'inventory_reserved',true
      );
    else
      v_shipping_total := round(v_country_shipping_rate,2);
      v_shipping_summary := coalesce(p_shipping,'{}'::jsonb) || jsonb_build_object(
        'country',v_shipping_country,
        'rate_amount',v_shipping_total,
        'rate_currency','USD',
        'canonical_shipping_total',v_shipping_total,
        'canonical_currency','USD',
        'pendingQuote',false,
        'shipping_reason','international_configured_country_rate',
        'inventory_reserved',true
      );
    end if;

    -- Validate and reserve shared color pools as one inventory unit. Multiple
    -- sizes in the same color are summed before stock is touched. The advisory
    -- locks acquired above keep concurrent orders for that pool serialized.
    if exists (
      with requested_pools as (
        select
          x->>'product_id' as product_id,
          x->'variant_snapshot'->>'inventoryPoolKey' as pool_key,
          sum((x->>'quantity')::integer)::integer as quantity
        from jsonb_array_elements(v_items) x
        where nullif(x->'variant_snapshot'->>'inventoryPoolKey','') is not null
        group by x->>'product_id', x->'variant_snapshot'->>'inventoryPoolKey'
      ), pool_state as (
        select rp.product_id, rp.pool_key, rp.quantity, min(pc.inventory_quantity) as available
        from requested_pools rp
        left join public.product_catalog pc
          on pc.product_id = rp.product_id
         and pc.variant_data->>'inventoryPoolKey' = rp.pool_key
         and pc.inventory_tracking = true
        group by rp.product_id, rp.pool_key, rp.quantity
      )
      select 1 from pool_state
      where available is null or available < quantity
    ) then
      raise exception using errcode='22023', message='insufficient_inventory';
    end if;

    -- Non-pooled variants keep the ordinary per-variant inventory rule.
    if exists (
      with requested_variants as (
        select x->>'variant_id' as variant_id, sum((x->>'quantity')::integer)::integer as quantity
        from jsonb_array_elements(v_items) x
        where nullif(x->'variant_snapshot'->>'inventoryPoolKey','') is null
        group by x->>'variant_id'
      )
      select 1
      from requested_variants rv
      join public.product_catalog pc on pc.variant_id = rv.variant_id
      where pc.inventory_tracking = true
        and pc.inventory_quantity < rv.quantity
    ) then
      raise exception using errcode='22023', message='insufficient_inventory';
    end if;

    -- Decrement every size row in a shared pool to the same remaining color
    -- quantity, so all subsequent storefront/cloud reads see one true stock.
    with requested_pools as (
      select
        x->>'product_id' as product_id,
        x->'variant_snapshot'->>'inventoryPoolKey' as pool_key,
        sum((x->>'quantity')::integer)::integer as quantity
      from jsonb_array_elements(v_items) x
      where nullif(x->'variant_snapshot'->>'inventoryPoolKey','') is not null
      group by x->>'product_id', x->'variant_snapshot'->>'inventoryPoolKey'
    )
    update public.product_catalog pc
    set inventory_quantity = pc.inventory_quantity - rp.quantity,
        availability_state = case
          when pc.inventory_quantity - rp.quantity = 0 then 'out_of_stock'
          when pc.inventory_quantity - rp.quantity <= 6 then 'low_stock'
          else pc.availability_state
        end,
        updated_at = now()
    from requested_pools rp
    where pc.product_id = rp.product_id
      and pc.variant_data->>'inventoryPoolKey' = rp.pool_key
      and pc.inventory_tracking = true;

    -- Reserve ordinary tracked variants independently.
    with requested_variants as (
      select x->>'variant_id' as variant_id, sum((x->>'quantity')::integer)::integer as quantity
      from jsonb_array_elements(v_items) x
      where nullif(x->'variant_snapshot'->>'inventoryPoolKey','') is null
      group by x->>'variant_id'
    )
    update public.product_catalog pc
    set inventory_quantity = pc.inventory_quantity - rv.quantity,
        availability_state = case
          when pc.inventory_quantity - rv.quantity = 0 then 'out_of_stock'
          when pc.inventory_quantity - rv.quantity <= 6 then 'low_stock'
          else pc.availability_state
        end,
        updated_at = now()
    from requested_variants rv
    where pc.variant_id = rv.variant_id
      and pc.inventory_tracking = true;
  end if;

  if v_requires_shipping_quote then
    v_payment_plan := 'pending_shipping_quote';
    v_amount_due_now := 0;
    v_remaining_balance := v_subtotal;
    v_order_status := 'pending_shipping_quote';
    v_payment_status := 'shipping_quote_pending';
    v_fulfillment_status := 'quote_pending';
    v_delivery_profile := case
      when v_has_large_equipment then 'equipment_quote'
      when v_is_staged then 'custom'
      else 'international_pending'
    end;
  else
    if p_payment_method in ('cash','cash_on_delivery') then
      v_payment_plan := case when lower(coalesce(p_shipping->>'paymentPlan','half')) = 'full' then 'full' else 'half' end;
    else
      v_payment_plan := 'full';
    end if;
    v_delivery_profile := case
      when v_shipping_country='LY' and v_all_ready_to_ship then 'ready'
      when v_shipping_country='LY' then 'standard'
      else 'international'
    end;

    v_amount_due_now := case when v_payment_plan = 'half' then round((v_subtotal + v_shipping_total) * 0.5, 2) else v_subtotal + v_shipping_total end;
    v_remaining_balance := (v_subtotal + v_shipping_total) - v_amount_due_now;
    v_order_status := case when p_payment_method in ('cash','cash_on_delivery') then 'awaiting_cash_confirmation' else 'awaiting_payment' end;
  end if;

  v_order_number := 'SHB-' || to_char(clock_timestamp(),'YYYYMMDD') || '-' || lpad(nextval('public.order_number_seq')::text, 7, '0');
  insert into public.orders(
    order_number,user_id,customer_email,currency,subtotal,shipping_total,tax_total,discount_total,total,
    payment_method,payment_plan,amount_due_now,remaining_balance,shipping_quote_required,delivery_profile,
    payment_status,order_status,fulfillment_status,shipping_summary,items_snapshot,idempotency_key
  ) values (
    v_order_number,p_user_id,p_customer_email,'USD',v_subtotal,v_shipping_total,0,0,v_subtotal + v_shipping_total,
    p_payment_method,v_payment_plan,v_amount_due_now,v_remaining_balance,v_requires_shipping_quote,v_delivery_profile,
    v_payment_status,v_order_status,v_fulfillment_status,v_shipping_summary,v_items,p_idempotency_key
  ) returning * into v_order;

  insert into public.order_items(
    order_id,variant_id,product_id,sku,product_name,variant_snapshot,quantity,unit_price,line_total
  )
  select v_order.id, x->>'variant_id', x->>'product_id', x->>'sku', x->>'product_name', x->'variant_snapshot',
    (x->>'quantity')::integer,(x->>'unit_price')::numeric,(x->>'line_total')::numeric
  from jsonb_array_elements(v_items) x;

  return jsonb_build_object('duplicate', false, 'order', jsonb_build_object(
    'order_number',v_order.order_number,'currency',v_order.currency,'subtotal',v_order.subtotal,
    'shipping_total',v_order.shipping_total,'tax_total',v_order.tax_total,'discount_total',v_order.discount_total,
    'total',v_order.total,'payment_method',v_order.payment_method,'payment_plan',v_order.payment_plan,
    'amount_due_now',v_order.amount_due_now,'remaining_balance',v_order.remaining_balance,
    'shipping_quote_required',v_order.shipping_quote_required,'delivery_profile',v_order.delivery_profile,
    'payment_status',v_order.payment_status,'order_status',v_order.order_status,
    'fulfillment_status',v_order.fulfillment_status,'shipping_summary',v_order.shipping_summary,
    'created_at',v_order.created_at,'order_items',v_items));
exception
  when no_data_found then
    raise exception using errcode='22023', message='invalid_or_inactive_catalog_item';
  when unique_violation then
    select * into v_existing
    from public.orders
    where idempotency_key=p_idempotency_key
      and user_id is not distinct from p_user_id
    limit 1;
    if found then
      return jsonb_build_object('duplicate',true,'order',jsonb_build_object(
        'order_number',v_existing.order_number,'currency',v_existing.currency,'total',v_existing.total,
        'payment_method',v_existing.payment_method,'payment_plan',v_existing.payment_plan,
        'amount_due_now',v_existing.amount_due_now,'remaining_balance',v_existing.remaining_balance,
        'shipping_quote_required',v_existing.shipping_quote_required,'delivery_profile',v_existing.delivery_profile,
        'payment_status',v_existing.payment_status,'order_status',v_existing.order_status,
        'fulfillment_status',v_existing.fulfillment_status,'created_at',v_existing.created_at));
    end if;
    raise;
end; $$;

revoke all on function public.create_order_transactional(uuid,text,text,text,uuid,jsonb,jsonb)
  from public,anon,authenticated;
grant execute on function public.create_order_transactional(uuid,text,text,text,uuid,jsonb,jsonb)
  to service_role;

commit;

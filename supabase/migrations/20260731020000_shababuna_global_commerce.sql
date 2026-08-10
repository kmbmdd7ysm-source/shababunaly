begin;

-- SHABABUNA production commerce model.
insert into public.commerce_settings(setting_key, numeric_value)
values ('usd_to_lyd_rate', 9)
on conflict (setting_key) do nothing;

-- The Shababuna site is retail/custom/wholesale only. Preserve historical rows
-- without allowing obsolete academy programmes or events to be purchased.
update public.product_catalog
set active = false,
    product_status = 'archived',
    availability_state = 'unavailable'
where fulfillment_type in ('digital_training', 'event_registration');

alter table public.orders
  add column if not exists payment_plan text not null default 'full',
  add column if not exists amount_due_now numeric(12,2) not null default 0,
  add column if not exists remaining_balance numeric(12,2) not null default 0,
  add column if not exists shipping_quote_required boolean not null default false,
  add column if not exists delivery_profile text not null default 'standard';

alter table public.orders drop constraint if exists orders_payment_method_check;
alter table public.orders add constraint orders_payment_method_check
  check (payment_method in ('cash_on_delivery','cash','online','online_card','libyan_bank_card')) not valid;

alter table public.orders drop constraint if exists orders_payment_status_check;
alter table public.orders add constraint orders_payment_status_check
  check (payment_status in ('pending','shipping_quote_pending','paid','failed','refunded','cancelled')) not valid;

alter table public.orders drop constraint if exists orders_order_status_check;
alter table public.orders add constraint orders_order_status_check
  check (order_status in (
    'received','pending_shipping_quote','awaiting_cash_confirmation','awaiting_payment',
    'confirmed','processing','design_in_progress','awaiting_design_approval','design_approved',
    'in_production','quality_control','ready_to_ship','shipped','out_for_delivery',
    'completed','delivered','cancelled'
  )) not valid;

alter table public.orders drop constraint if exists orders_fulfillment_status_check;
alter table public.orders add constraint orders_fulfillment_status_check
  check (fulfillment_status in ('unfulfilled','quote_pending','processing','in_production','fulfilled','cancelled')) not valid;

alter table public.orders drop constraint if exists orders_payment_plan_check;
alter table public.orders add constraint orders_payment_plan_check
  check (payment_plan in ('full','half','pending_shipping_quote')) not valid;

alter table public.orders drop constraint if exists orders_delivery_profile_check;
alter table public.orders add constraint orders_delivery_profile_check
  check (delivery_profile in ('ready','standard','custom','international_pending','equipment_quote')) not valid;

alter table public.orders drop constraint if exists orders_balance_check;
alter table public.orders add constraint orders_balance_check
  check (amount_due_now >= 0 and remaining_balance >= 0 and amount_due_now + remaining_balance = total) not valid;

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
  v_tracked_count integer := 0;
  v_updated_count integer := 0;
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

    if v_requested.purchase_mode = 'wholesale' then
      if not v_wholesale_available or v_requested.product_mode_quantity < v_wholesale_min then
        raise exception using errcode='22023', message='invalid_wholesale_quantity';
      end if;
      v_unit_price := nullif(v_catalog.variant_data->>'wholesalePrice','')::numeric;
      if v_unit_price is null or v_unit_price < 0 then
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

  v_requires_shipping_quote := v_shipping_country <> 'LY' or v_has_large_equipment;

  if v_requires_shipping_quote then
    v_shipping_total := 0;
    v_shipping_summary := coalesce(p_shipping,'{}'::jsonb) || jsonb_build_object(
      'country',v_shipping_country,
      'pendingQuote',true,
      'canonical_shipping_total',0,
      'canonical_currency','USD',
      'shipping_reason',case when v_has_large_equipment then 'equipment_shipping_quote_required' else 'international_shipping_quote_required' end,
      'inventory_reserved',false
    );
  else
    select numeric_value into v_usd_to_lyd_rate
    from public.commerce_settings where setting_key='usd_to_lyd_rate';
    if v_usd_to_lyd_rate is null or v_usd_to_lyd_rate <= 0 then
      raise exception using errcode='22023', message='invalid_exchange_rate';
    end if;

    v_shipping_total := case
      when v_subtotal >= round(500.00 / v_usd_to_lyd_rate, 2) then 0
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

    -- Reserve tracked inventory only after all lines and trusted prices pass validation.
    update public.product_catalog pc
    set inventory_quantity = pc.inventory_quantity - requested.quantity,
        availability_state = case
          when pc.inventory_quantity - requested.quantity = 0 then 'out_of_stock'
          when pc.inventory_quantity - requested.quantity <= 6 then 'low_stock'
          else pc.availability_state
        end
    from (
      select x->>'variant_id' as variant_id, sum((x->>'quantity')::integer)::integer as quantity
      from jsonb_array_elements(v_items) x
      group by x->>'variant_id'
    ) requested
    where pc.variant_id = requested.variant_id
      and pc.inventory_tracking = true
      and pc.inventory_quantity >= requested.quantity;

    get diagnostics v_updated_count = row_count;
    select count(distinct x->>'variant_id') into v_tracked_count
    from jsonb_array_elements(v_items) x
    join public.product_catalog pc on pc.variant_id = x->>'variant_id'
    where pc.inventory_tracking = true;
    if v_updated_count <> v_tracked_count then
      raise exception using errcode='22023', message='insufficient_inventory';
    end if;
  end if;

  if v_requires_shipping_quote then
    v_payment_plan := 'pending_shipping_quote';
    v_amount_due_now := 0;
    v_remaining_balance := v_subtotal;
    v_order_status := 'pending_shipping_quote';
    v_payment_status := 'shipping_quote_pending';
    v_fulfillment_status := 'quote_pending';
    v_delivery_profile := case when v_has_large_equipment then 'equipment_quote' else 'international_pending' end;
  else
    if v_is_staged then
      v_payment_plan := 'half';
      v_delivery_profile := 'custom';
    elsif p_payment_method in ('cash','cash_on_delivery') then
      v_payment_plan := case when lower(coalesce(p_shipping->>'paymentPlan','half')) = 'full' then 'full' else 'half' end;
      v_delivery_profile := case when coalesce((p_shipping->>'allReadyToShip')::boolean,false) then 'ready' else 'standard' end;
    else
      v_payment_plan := 'full';
      v_delivery_profile := case when coalesce((p_shipping->>'allReadyToShip')::boolean,false) then 'ready' else 'standard' end;
    end if;

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
  from public, anon, authenticated;
grant execute on function public.create_order_transactional(uuid,text,text,text,uuid,jsonb,jsonb)
  to service_role;

commit;

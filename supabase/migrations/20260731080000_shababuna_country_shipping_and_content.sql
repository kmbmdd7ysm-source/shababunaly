begin;

-- Country shipping is ready for every destination. A normal retail checkout
-- uses a configured flat USD rate; countries without a rate remain pending for
-- a staff quote. Custom, wholesale and large-equipment orders always require a
-- per-order shipping quote.
create table if not exists public.shipping_country_rates (
  country_code text primary key check (country_code ~ '^[A-Z]{2}$'),
  rate_usd numeric(12,2) check (rate_usd is null or rate_usd>=0),
  active boolean not null default false,
  note text,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.shipping_country_rates enable row level security;
revoke all on public.shipping_country_rates from anon,authenticated;
grant select on public.shipping_country_rates to anon,authenticated,service_role;
grant insert,update,delete on public.shipping_country_rates to service_role;
drop policy if exists "public read active shipping rates" on public.shipping_country_rates;
create policy "public read active shipping rates" on public.shipping_country_rates
for select to anon,authenticated using (active=true and rate_usd is not null);
drop policy if exists "staff read all shipping rates" on public.shipping_country_rates;
create policy "staff read all shipping rates" on public.shipping_country_rates
for select to authenticated using (public.is_shababuna_staff());

create or replace function public.staff_set_country_shipping_rate(
  p_country_code text,
  p_rate_usd numeric default null,
  p_active boolean default true,
  p_note text default ''
) returns public.shipping_country_rates
language plpgsql security definer set search_path=public,pg_temp as $$
declare before_row public.shipping_country_rates; after_row public.shipping_country_rates; v_code text;
begin
  if not public.is_shababuna_staff() then raise exception 'staff_required'; end if;
  v_code=upper(btrim(coalesce(p_country_code,'')));
  if v_code !~ '^[A-Z]{2}$' or v_code='LY' then raise exception 'invalid_country_code'; end if;
  if p_active and (p_rate_usd is null or p_rate_usd<0) then raise exception 'active_rate_required'; end if;
  select * into before_row from public.shipping_country_rates where country_code=v_code;
  insert into public.shipping_country_rates(country_code,rate_usd,active,note,updated_by)
  values(v_code,case when p_rate_usd is null then null else round(p_rate_usd,2) end,p_active,left(coalesce(p_note,''),500),auth.uid())
  on conflict(country_code) do update set
    rate_usd=excluded.rate_usd,active=excluded.active,note=excluded.note,updated_by=auth.uid(),updated_at=now()
  returning * into after_row;
  insert into public.operations_audit_log(actor_id,action,entity_type,entity_id,before_data,after_data)
  values(auth.uid(),'set_country_shipping_rate','shipping_country_rate',v_code,to_jsonb(before_row),to_jsonb(after_row));
  return after_row;
end; $$;
revoke all on function public.staff_set_country_shipping_rate(text,numeric,boolean,text) from public;
grant execute on function public.staff_set_country_shipping_rate(text,numeric,boolean,text) to authenticated,service_role;

create or replace function public.get_public_shipping_rates() returns jsonb
language sql stable security definer set search_path=public as $$
  select coalesce(jsonb_object_agg(country_code,rate_usd order by country_code),'{}'::jsonb)
  from public.shipping_country_rates where active=true and rate_usd is not null;
$$;
revoke all on function public.get_public_shipping_rates() from public;
grant execute on function public.get_public_shipping_rates() to anon,authenticated,service_role;

-- Controlled site media/content slots. Final video files can be added without
-- rebuilding the storefront, while empty slots keep the approved posters.
create table if not exists public.site_content (
  content_key text primary key check (content_key ~ '^[a-z0-9_:-]{2,80}$'),
  content_value jsonb not null default '{}'::jsonb,
  public_read boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.site_content enable row level security;
revoke all on public.site_content from anon,authenticated;
grant select on public.site_content to anon,authenticated,service_role;
grant insert,update,delete on public.site_content to service_role;
drop policy if exists "public read site content" on public.site_content;
create policy "public read site content" on public.site_content for select to anon,authenticated using (public_read=true);
drop policy if exists "staff read all site content" on public.site_content;
create policy "staff read all site content" on public.site_content for select to authenticated using (public.is_shababuna_staff());
insert into public.site_content(content_key,content_value,public_read)
values('home_hero','{"enabled":true,"desktopVideoUrl":"","mobileVideoUrl":""}'::jsonb,true)
on conflict(content_key) do nothing;

create or replace function public.staff_update_site_content(p_content_key text,p_content_value jsonb,p_public_read boolean default true)
returns public.site_content
language plpgsql security definer set search_path=public,pg_temp as $$
declare before_row public.site_content; after_row public.site_content; v_key text;
begin
  if not public.is_shababuna_staff() then raise exception 'staff_required'; end if;
  v_key=lower(btrim(coalesce(p_content_key,'')));
  if v_key !~ '^[a-z0-9_:-]{2,80}$' or jsonb_typeof(p_content_value)<>'object' then raise exception 'invalid_site_content'; end if;
  select * into before_row from public.site_content where content_key=v_key;
  insert into public.site_content(content_key,content_value,public_read,updated_by)
  values(v_key,p_content_value,coalesce(p_public_read,true),auth.uid())
  on conflict(content_key) do update set content_value=excluded.content_value,public_read=excluded.public_read,updated_by=auth.uid(),updated_at=now()
  returning * into after_row;
  insert into public.operations_audit_log(actor_id,action,entity_type,entity_id,before_data,after_data)
  values(auth.uid(),'update_site_content','site_content',v_key,to_jsonb(before_row),to_jsonb(after_row));
  return after_row;
end; $$;
revoke all on function public.staff_update_site_content(text,jsonb,boolean) from public;
grant execute on function public.staff_update_site_content(text,jsonb,boolean) to authenticated,service_role;

alter table public.orders drop constraint if exists orders_delivery_profile_check;
alter table public.orders add constraint orders_delivery_profile_check
  check (delivery_profile in ('ready','standard','custom','international','international_pending','equipment_quote')) not valid;

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

    -- Reserve trusted tracked inventory only after every line, price and
    -- destination shipping rule has passed validation.
    update public.product_catalog pc
    set inventory_quantity = pc.inventory_quantity - requested.quantity,
        availability_state = case
          when pc.inventory_quantity - requested.quantity = 0 then 'out_of_stock'
          when pc.inventory_quantity - requested.quantity <= 6 then 'low_stock'
          else pc.availability_state
        end,
        updated_at=now()
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


-- Atomically claim queued notifications so overlapping cron invocations cannot
-- deliver the same Formspree message twice. Abandoned sending rows are safely
-- recoverable after fifteen minutes.
create or replace function public.claim_commerce_notifications(p_limit integer default 25)
returns setof public.commerce_notifications
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if auth.role()<>'service_role' then raise exception 'service_role_required'; end if;
  return query
  with candidates as (
    select id from public.commerce_notifications
    where (delivery_status in ('pending','failed') and available_at<=now())
       or (delivery_status='sending' and updated_at<now()-interval '15 minutes')
    order by created_at asc
    for update skip locked
    limit greatest(1,least(coalesce(p_limit,25),100))
  )
  update public.commerce_notifications n
  set delivery_status='sending',attempts=n.attempts+1,last_error=null,updated_at=now()
  from candidates c
  where n.id=c.id
  returning n.*;
end; $$;
revoke all on function public.claim_commerce_notifications(integer) from public;
grant execute on function public.claim_commerce_notifications(integer) to service_role;

commit;

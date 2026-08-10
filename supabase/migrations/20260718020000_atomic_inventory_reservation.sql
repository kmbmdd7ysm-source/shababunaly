begin;

alter table public.product_catalog
  add column if not exists inventory_tracking boolean not null default true,
  add column if not exists fulfillment_type text not null default 'physical'
    check (fulfillment_type in ('physical','digital_training','event_registration'));

create table if not exists public.commerce_settings (
  setting_key text primary key,
  numeric_value numeric not null check (numeric_value > 0),
  updated_at timestamptz not null default now()
);
alter table public.commerce_settings enable row level security;
revoke all on public.commerce_settings from public, anon, authenticated;
grant select, insert, update on public.commerce_settings to service_role;
insert into public.commerce_settings(setting_key, numeric_value) values ('usd_to_lyd_rate', 9)
on conflict (setting_key) do nothing;

insert into public.product_catalog(variant_id,product_id,canonical_slug,sku,product_name,product_status,active,currency,unit_price,availability_state,inventory_quantity,inventory_tracking,fulfillment_type,variant_data) values
('training:ot01','ot01','complete-ball-handling','DIGITAL-OT01','Complete Ball Handling','active',true,'USD',39,'in_stock',null,false,'digital_training','{"fulfillmentType":"digital_training"}'::jsonb),
('training:ot02','ot02','shooting-mechanics','DIGITAL-OT02','Shooting Mechanics','active',true,'USD',44,'in_stock',null,false,'digital_training','{"fulfillmentType":"digital_training"}'::jsonb),
('training:ot03','ot03','finishing-package','DIGITAL-OT03','Finishing Package','active',true,'USD',34,'in_stock',null,false,'digital_training','{"fulfillmentType":"digital_training"}'::jsonb),
('training:ot04','ot04','footwork-fundamentals','DIGITAL-OT04','Footwork Fundamentals','active',true,'USD',29,'in_stock',null,false,'digital_training','{"fulfillmentType":"digital_training"}'::jsonb),
('training:ot05','ot05','basketball-iq','DIGITAL-OT05','Basketball IQ','active',true,'USD',34,'in_stock',null,false,'digital_training','{"fulfillmentType":"digital_training"}'::jsonb),
('training:ot06','ot06','elite-guard-bundle','DIGITAL-OT06','Elite Guard Bundle','active',true,'USD',89,'in_stock',null,false,'digital_training','{"fulfillmentType":"digital_training"}'::jsonb)
on conflict (variant_id) do update set unit_price=excluded.unit_price, fulfillment_type='digital_training', inventory_tracking=false, inventory_quantity=null, variant_data=excluded.variant_data;

insert into public.product_catalog(variant_id,product_id,canonical_slug,sku,product_name,product_status,active,currency,unit_price,availability_state,inventory_quantity,inventory_tracking,fulfillment_type,variant_data) values
('event:ev01','ev01','summer-elite-camp-2026','EVENT-EV01','Summer Elite Camp 2026','active',true,'USD',120,'in_stock',null,false,'event_registration','{"fulfillmentType":"event_registration","capacity":40,"status":"open","remaining":12,"startDate":"2026-08-10","endDate":"2026-08-14","registrationDeadline":"2026-08-05"}'::jsonb),
('event:ev02','ev02','shooting-clinic-august','EVENT-EV02','Shooting Clinic','active',true,'USD',40,'in_stock',null,false,'event_registration','{"fulfillmentType":"event_registration","capacity":30,"status":"open","remaining":18,"startDate":"2026-08-23","endDate":"2026-08-23","registrationDeadline":"2026-08-21"}'::jsonb),
('event:ev03','ev03','academy-tryouts-september','EVENT-EV03','Academy Tryouts','active',true,'USD',0,'out_of_stock',null,false,'event_registration','{"fulfillmentType":"event_registration","capacity":50,"status":"full","remaining":0,"startDate":"2026-09-06","endDate":"2026-09-06","registrationDeadline":"2026-09-03"}'::jsonb),
('event:ev04','ev04','3x3-open-run','EVENT-EV04','3x3 Open Run','active',true,'USD',15,'in_stock',null,false,'event_registration','{"fulfillmentType":"event_registration","capacity":48,"status":"open","remaining":24,"startDate":"2026-09-20","endDate":"2026-09-20","registrationDeadline":"2026-09-19"}'::jsonb)
on conflict (variant_id) do update set unit_price=excluded.unit_price, fulfillment_type='event_registration', inventory_tracking=false, inventory_quantity=null, variant_data=excluded.variant_data;

create table if not exists public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id text not null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  participant_name text not null,
  status text not null check (status in ('pending_payment','confirmed','cancelled')),
  payment_status text not null check (payment_status in ('not_required','pending','paid','failed')),
  trusted_price numeric(12,2) not null check (trusted_price >= 0),
  idempotency_key uuid not null unique,
  order_id uuid references public.orders(id),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);
alter table public.event_registrations enable row level security;
revoke all on public.event_registrations from public, anon, authenticated;
grant select, insert, update on public.event_registrations to service_role;

create or replace function public.get_public_commerce_settings() returns jsonb
language sql stable security definer set search_path=public,pg_temp as $$
  select jsonb_build_object('usd_to_lyd_rate', numeric_value)
  from public.commerce_settings where setting_key='usd_to_lyd_rate' and numeric_value > 0;
$$;
revoke all on function public.get_public_commerce_settings() from public;
grant execute on function public.get_public_commerce_settings() to anon, authenticated, service_role;

create or replace function public.create_event_registration(
  p_event_id text, p_customer_name text, p_customer_email text, p_customer_phone text,
  p_participant_name text, p_idempotency_key uuid
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_event public.product_catalog%rowtype; v_registration public.event_registrations%rowtype; v_confirmed integer;
begin
  if p_idempotency_key is null then raise exception using errcode='22023',message='invalid_idempotency_key'; end if;
  select * into v_registration from public.event_registrations where idempotency_key=p_idempotency_key;
  if found then return jsonb_build_object('registration_id',v_registration.id,'status',v_registration.status,'trusted_price',v_registration.trusted_price,'duplicate',true); end if;
  select * into strict v_event from public.product_catalog where product_id=p_event_id and variant_id='event:'||p_event_id and active=true and product_status='active' and fulfillment_type='event_registration' for update;
  if v_event.availability_state in ('out_of_stock','unavailable')
    or coalesce(v_event.variant_data->>'status','closed') <> 'open'
    or coalesce((v_event.variant_data->>'remaining')::integer,0) <= 0
    or coalesce((v_event.variant_data->>'registrationDeadline')::date,current_date - 1) < current_date then
    raise exception using errcode='22023',message='invalid_or_closed_event';
  end if;
  if btrim(coalesce(p_customer_name,''))='' or lower(btrim(coalesce(p_customer_email,''))) !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception using errcode='22023',message='invalid_registration'; end if;
  if exists(select 1 from public.event_registrations where event_id=p_event_id and lower(customer_email)=lower(btrim(p_customer_email)) and participant_name=btrim(coalesce(nullif(p_participant_name,''),p_customer_name)) and status in ('pending_payment','confirmed')) then raise exception using errcode='23505',message='duplicate_registration'; end if;
  select count(*) into v_confirmed from public.event_registrations where event_id=p_event_id and status='confirmed';
  if coalesce((v_event.variant_data->>'capacity')::integer,2147483647) <= v_confirmed then raise exception using errcode='22023',message='event_full'; end if;
  insert into public.event_registrations(event_id,customer_name,customer_email,customer_phone,participant_name,status,payment_status,trusted_price,idempotency_key,confirmed_at)
  values(p_event_id,btrim(p_customer_name),lower(btrim(p_customer_email)),nullif(btrim(coalesce(p_customer_phone,'')),''),btrim(coalesce(nullif(p_participant_name,''),p_customer_name)),case when v_event.unit_price=0 then 'confirmed' else 'pending_payment' end,case when v_event.unit_price=0 then 'not_required' else 'pending' end,v_event.unit_price,p_idempotency_key,case when v_event.unit_price=0 then now() end)
  returning * into v_registration;
  return jsonb_build_object('registration_id',v_registration.id,'status',v_registration.status,'trusted_price',v_registration.trusted_price,'duplicate',false);
exception when no_data_found then raise exception using errcode='22023',message='invalid_or_closed_event'; end; $$;
revoke all on function public.create_event_registration(text,text,text,text,text,uuid) from public;
grant execute on function public.create_event_registration(text,text,text,text,text,uuid) to anon, authenticated, service_role;


-- Preserve the existing NULL-as-unlimited behavior while making it explicit.
update public.product_catalog
set inventory_tracking = false
where inventory_quantity is null;

alter table public.product_catalog
  drop constraint if exists product_catalog_inventory_tracking_check;
alter table public.product_catalog
  add constraint product_catalog_inventory_tracking_check check (
    (inventory_tracking = false and inventory_quantity is null)
    or
    (inventory_tracking = true and inventory_quantity is not null and inventory_quantity >= 0)
  ) not valid;
alter table public.product_catalog
  validate constraint product_catalog_inventory_tracking_check;

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
  v_order_number text;
  v_items jsonb := '[]'::jsonb;
  v_tracked_count integer := 0;
  v_updated_count integer := 0;
  v_shipping_total numeric(12,2) := 0;
  v_shipping_country text;
  v_shipping_summary jsonb;
  v_has_physical boolean := false;
  v_usd_to_lyd_rate numeric;
begin
  if p_idempotency_key is null
    or p_currency not in ('USD','LYD')
    or p_payment_method not in ('cash_on_delivery','cash','online') then
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
      'total',v_existing.total,'payment_method',v_existing.payment_method,'payment_status',v_existing.payment_status,
      'order_status',v_existing.order_status,'fulfillment_status',v_existing.fulfillment_status,'created_at',v_existing.created_at));
  end if;

  -- Aggregate duplicate cart lines, validate quantities, and lock all affected
  -- catalog rows in a stable order. Locks are retained until this function's
  -- surrounding transaction commits or rolls back.
  for v_requested in
    with raw_items as (
      select
        nullif(value->>'variantId','') as variant_id,
        nullif(value->>'productId','') as product_id,
        nullif(value->>'registrationId','')::uuid as registration_id,
        case
          when coalesce(value->>'quantity','') ~ '^[0-9]+$' then (value->>'quantity')::integer
          else null
        end as quantity
      from jsonb_array_elements(p_items)
    ), grouped_items as (
      select variant_id, product_id, registration_id, sum(quantity)::integer as quantity
      from raw_items
      group by variant_id, product_id, registration_id
    )
    select variant_id, product_id, registration_id, quantity
    from grouped_items
    order by variant_id, product_id
  loop
    if v_requested.variant_id is null
      or v_requested.product_id is null
      or v_requested.quantity is null
      or v_requested.quantity < 1
      or v_requested.quantity > 99 then
      raise exception using errcode='22023', message='invalid_quantity';
    end if;

    select * into strict v_catalog
    from public.product_catalog
    where variant_id = v_requested.variant_id
      and product_id = v_requested.product_id
      and active = true
      and product_status = 'active'
      and availability_state not in ('out_of_stock','unavailable')
      and currency = p_currency
    for update;

    if v_catalog.fulfillment_type = 'physical' then
      v_has_physical := true;
    end if;

    if v_catalog.fulfillment_type <> 'physical' and v_requested.quantity <> 1 then
      raise exception using errcode='22023', message='invalid_nonphysical_quantity';
    end if;
    if v_catalog.fulfillment_type = 'event_registration' then
      if v_requested.registration_id is null or not exists (
        select 1 from public.event_registrations er
        where er.id=v_requested.registration_id and er.event_id=v_catalog.product_id
          and er.status='pending_payment' and er.payment_status='pending'
          and er.trusted_price=v_catalog.unit_price
      ) then raise exception using errcode='22023',message='invalid_event_registration'; end if;
    end if;

    if v_catalog.inventory_tracking then
      v_tracked_count := v_tracked_count + 1;
    end if;

    if v_catalog.inventory_tracking
      and v_catalog.inventory_quantity < v_requested.quantity then
      raise exception using errcode='22023', message='insufficient_inventory';
    end if;

    v_line := round(v_catalog.unit_price * v_requested.quantity, 2);
    v_subtotal := v_subtotal + v_line;
    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'variant_id',v_catalog.variant_id,'product_id',v_catalog.product_id,'sku',v_catalog.sku,
      'product_name',v_catalog.product_name,'variant_snapshot',v_catalog.variant_data,
      'quantity',v_requested.quantity,'registration_id',v_requested.registration_id,'fulfillment_type',v_catalog.fulfillment_type,'unit_price',v_catalog.unit_price,'line_total',v_line));
  end loop;

  -- Every tracked row is already locked and revalidated. This guarded update
  -- prevents negative inventory even if the function is changed incorrectly later.
  update public.product_catalog pc
  set inventory_quantity = pc.inventory_quantity - requested.quantity,
      availability_state = case
        when pc.inventory_quantity - requested.quantity = 0 then 'out_of_stock'
        when pc.inventory_quantity - requested.quantity <= 6 then 'low_stock'
        else pc.availability_state
      end
  from (
    select x->>'variant_id' as variant_id, (x->>'quantity')::integer as quantity
    from jsonb_array_elements(v_items) x
  ) requested
  where pc.variant_id = requested.variant_id
    and pc.inventory_tracking = true
    and pc.inventory_quantity >= requested.quantity;

  get diagnostics v_updated_count = row_count;
  if v_updated_count <> v_tracked_count then
    raise exception using errcode='22023', message='insufficient_inventory';
  end if;

  if not v_has_physical then
    v_shipping_total := 0;
    v_shipping_summary := jsonb_build_object(
      'canonical_shipping_total',0,
      'canonical_currency','USD',
      'shipping_reason','no_physical_shipping',
      'fulfillment_types',(select jsonb_agg(distinct x->>'fulfillment_type') from jsonb_array_elements(v_items) x)
    );
  else
    v_shipping_country := upper(btrim(coalesce(p_shipping->>'country','')));
    if v_shipping_country <> 'LY' then
      raise exception using errcode='22023', message='shipping_quote_required';
    end if;
    select numeric_value into v_usd_to_lyd_rate
    from public.commerce_settings where setting_key='usd_to_lyd_rate';
    if v_usd_to_lyd_rate is null or v_usd_to_lyd_rate <= 0 then
      raise exception using errcode='22023', message='invalid_exchange_rate';
    end if;
    v_shipping_total := case when v_subtotal >= round(500.00 / v_usd_to_lyd_rate, 2) then 0 else round(20.00 / v_usd_to_lyd_rate, 2) end;
    v_shipping_summary := coalesce(p_shipping,'{}'::jsonb) || jsonb_build_object(
      'rate_amount',20.00,
      'rate_currency','LYD',
      'canonical_shipping_total',v_shipping_total,
      'canonical_currency','USD',
      'free_shipping_threshold_amount',500.00,
      'free_shipping_threshold_currency','LYD',
      'shipping_reason',case when v_shipping_total = 0 then 'libya_free_shipping_threshold' else 'libya_standard_shipping' end,
      'exchange_rate_setting','usd_to_lyd_rate'
    );
  end if;

  v_order_number := 'SHB-' || to_char(clock_timestamp(),'YYYYMMDD') || '-' || lpad(nextval('public.order_number_seq')::text, 7, '0');
  insert into public.orders(
    order_number,user_id,customer_email,currency,subtotal,shipping_total,tax_total,discount_total,total,
    payment_method,payment_status,order_status,fulfillment_status,shipping_summary,items_snapshot,idempotency_key
  ) values (
    v_order_number,p_user_id,p_customer_email,p_currency,v_subtotal,v_shipping_total,0,0,v_subtotal + v_shipping_total,
    p_payment_method,'pending','received','unfulfilled',v_shipping_summary,v_items,p_idempotency_key
  ) returning * into v_order;

  update public.event_registrations er set order_id=v_order.id
  where er.id in (select nullif(x->>'registration_id','')::uuid from jsonb_array_elements(v_items) x where x->>'fulfillment_type'='event_registration');

  insert into public.order_items(
    order_id,variant_id,product_id,sku,product_name,variant_snapshot,quantity,unit_price,line_total
  )
  select v_order.id, x->>'variant_id', x->>'product_id', x->>'sku', x->>'product_name', x->'variant_snapshot',
    (x->>'quantity')::integer,(x->>'unit_price')::numeric,(x->>'line_total')::numeric
  from jsonb_array_elements(v_items) x;

  return jsonb_build_object('duplicate', false, 'order', jsonb_build_object(
    'order_number',v_order.order_number,'currency',v_order.currency,'subtotal',v_order.subtotal,
    'shipping_total',v_order.shipping_total,'tax_total',v_order.tax_total,'discount_total',v_order.discount_total,
    'total',v_order.total,'payment_method',v_order.payment_method,'payment_status',v_order.payment_status,
    'order_status',v_order.order_status,'fulfillment_status',v_order.fulfillment_status,'created_at',v_order.created_at,
    'order_items',v_items));
exception
  when no_data_found then
    raise exception using errcode='22023', message='invalid_or_inactive_catalog_item';
  when unique_violation then
    -- PL/pgSQL rolls back every change made inside this block before entering
    -- the handler, including inventory decrements. Return the winning order.
    select * into v_existing
    from public.orders
    where idempotency_key=p_idempotency_key
      and user_id is not distinct from p_user_id
    limit 1;
    if found then
      return jsonb_build_object('duplicate',true,'order',jsonb_build_object(
        'order_number',v_existing.order_number,'currency',v_existing.currency,'total',v_existing.total,
        'payment_method',v_existing.payment_method,'payment_status',v_existing.payment_status,
        'order_status',v_existing.order_status,'fulfillment_status',v_existing.fulfillment_status,
        'created_at',v_existing.created_at));
    end if;
    raise;
end; $$;

revoke all on function public.create_order_transactional(uuid,text,text,text,uuid,jsonb,jsonb)
  from public, anon, authenticated;
grant execute on function public.create_order_transactional(uuid,text,text,text,uuid,jsonb,jsonb)
  to service_role;

create or replace function public.confirm_paid_event_registrations() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if new.payment_status='paid' and old.payment_status is distinct from 'paid' then
    update public.event_registrations set status='confirmed',payment_status='paid',confirmed_at=coalesce(confirmed_at,now()) where order_id=new.id and status='pending_payment';
  elsif new.payment_status='failed' then
    update public.event_registrations set payment_status='failed' where order_id=new.id and status='pending_payment';
  end if;
  return new;
end; $$;
drop trigger if exists orders_confirm_event_registrations on public.orders;
create trigger orders_confirm_event_registrations after update of payment_status on public.orders for each row execute function public.confirm_paid_event_registrations();


commit;

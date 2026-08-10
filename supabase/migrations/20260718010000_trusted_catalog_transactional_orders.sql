begin;
create extension if not exists pgcrypto;

create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

create table if not exists public.product_catalog (
  variant_id text primary key,
  product_id text not null,
  canonical_slug text not null,
  sku text not null,
  product_name text not null,
  product_status text not null default 'active' check (product_status in ('active','draft','archived')),
  active boolean not null default true,
  color text,
  size text,
  currency text not null check (currency in ('USD','LYD')),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  compare_at_price numeric(12,2) check (compare_at_price is null or compare_at_price >= unit_price),
  availability_state text not null default 'in_stock' check (availability_state in ('in_stock','low_stock','out_of_stock','preorder','unavailable')),
  inventory_quantity integer check (inventory_quantity is null or inventory_quantity >= 0),
  variant_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id, sku),
  unique(canonical_slug, sku)
);
create index if not exists product_catalog_product_idx on public.product_catalog(product_id);
create index if not exists product_catalog_active_currency_idx on public.product_catalog(active, currency);
create index if not exists product_catalog_slug_idx on public.product_catalog(canonical_slug);
drop trigger if exists product_catalog_set_updated_at on public.product_catalog;
create trigger product_catalog_set_updated_at before update on public.product_catalog for each row execute function public.set_updated_at();
alter table public.product_catalog enable row level security;
revoke all on public.product_catalog from anon, authenticated;
grant select, insert, update on public.product_catalog to service_role;

update public.orders set idempotency_key = gen_random_uuid() where idempotency_key is null;
alter table public.orders alter column idempotency_key set not null;
alter table public.orders drop constraint if exists orders_payment_method_check;
alter table public.orders add constraint orders_payment_method_check check (payment_method in ('cash_on_delivery','cash','online')) not valid;
alter table public.orders drop constraint if exists orders_customer_email_check;
alter table public.orders add constraint orders_customer_email_check check (customer_email = lower(btrim(customer_email)) and customer_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') not valid;
create unique index if not exists orders_user_idempotency_uidx on public.orders(user_id, idempotency_key) where user_id is not null;
create unique index if not exists orders_guest_idempotency_uidx on public.orders(idempotency_key) where user_id is null;

alter table public.order_items add column if not exists variant_id text;
create index if not exists order_items_variant_idx on public.order_items(variant_id);

create table if not exists public.edge_rate_limits (
  bucket text not null,
  subject_hash text not null,
  window_start timestamptz not null,
  request_count integer not null default 1 check (request_count > 0),
  updated_at timestamptz not null default now(),
  primary key(bucket, subject_hash, window_start)
);
alter table public.edge_rate_limits enable row level security;
revoke all on public.edge_rate_limits from anon, authenticated;
grant select, insert, update, delete on public.edge_rate_limits to service_role;

create or replace function public.consume_edge_rate_limit(
  p_bucket text, p_subject_hash text, p_limit integer, p_window_seconds integer
) returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_window timestamptz;
  v_count integer;
begin
  if p_bucket is null or p_subject_hash is null or p_limit < 1 or p_window_seconds < 1 then return false; end if;
  v_window := to_timestamp(floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds);
  insert into public.edge_rate_limits(bucket, subject_hash, window_start, request_count)
  values (p_bucket, p_subject_hash, v_window, 1)
  on conflict (bucket, subject_hash, window_start)
  do update set request_count = public.edge_rate_limits.request_count + 1, updated_at = now()
  returning request_count into v_count;
  delete from public.edge_rate_limits where window_start < now() - interval '2 days';
  return v_count <= p_limit;
end; $$;
revoke all on function public.consume_edge_rate_limit(text,text,integer,integer) from public, anon, authenticated;
grant execute on function public.consume_edge_rate_limit(text,text,integer,integer) to service_role;

create sequence if not exists public.order_number_seq;

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
  v_item jsonb;
  v_catalog public.product_catalog%rowtype;
  v_qty integer;
  v_subtotal numeric(12,2) := 0;
  v_line numeric(12,2);
  v_order_number text;
  v_items jsonb := '[]'::jsonb;
begin
  if p_idempotency_key is null or p_currency not in ('USD','LYD') or p_payment_method not in ('cash_on_delivery','cash','online') then
    raise exception using errcode='22023', message='invalid_order_request';
  end if;
  p_customer_email := lower(btrim(coalesce(p_customer_email,'')));
  if p_customer_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception using errcode='22023', message='invalid_email'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 50 then
    raise exception using errcode='22023', message='invalid_items';
  end if;

  select * into v_existing from public.orders
  where idempotency_key = p_idempotency_key and user_id is not distinct from p_user_id limit 1;
  if found then
    return jsonb_build_object('duplicate', true, 'order', jsonb_build_object(
      'order_number',v_existing.order_number,'currency',v_existing.currency,'subtotal',v_existing.subtotal,
      'shipping_total',v_existing.shipping_total,'tax_total',v_existing.tax_total,'discount_total',v_existing.discount_total,
      'total',v_existing.total,'payment_method',v_existing.payment_method,'payment_status',v_existing.payment_status,
      'order_status',v_existing.order_status,'fulfillment_status',v_existing.fulfillment_status,'created_at',v_existing.created_at));
  end if;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::integer;
    if v_qty < 1 or v_qty > 99 then raise exception using errcode='22023', message='invalid_quantity'; end if;
    select * into strict v_catalog from public.product_catalog
      where variant_id = nullif(v_item->>'variantId','') and product_id = nullif(v_item->>'productId','')
        and active = true and product_status = 'active'
        and availability_state not in ('out_of_stock','unavailable')
        and currency = p_currency;
    if v_catalog.inventory_quantity is not null and v_catalog.inventory_quantity < v_qty then
      raise exception using errcode='22023', message='insufficient_inventory';
    end if;
    v_line := round(v_catalog.unit_price * v_qty, 2);
    v_subtotal := v_subtotal + v_line;
    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'variant_id',v_catalog.variant_id,'product_id',v_catalog.product_id,'sku',v_catalog.sku,
      'product_name',v_catalog.product_name,'variant_snapshot',v_catalog.variant_data,
      'quantity',v_qty,'unit_price',v_catalog.unit_price,'line_total',v_line));
  end loop;

  v_order_number := 'SHB-' || to_char(clock_timestamp(),'YYYYMMDD') || '-' || lpad(nextval('public.order_number_seq')::text, 7, '0');
  insert into public.orders(order_number,user_id,customer_email,currency,subtotal,shipping_total,tax_total,discount_total,total,
    payment_method,payment_status,order_status,fulfillment_status,shipping_summary,items_snapshot,idempotency_key)
  values(v_order_number,p_user_id,p_customer_email,p_currency,v_subtotal,0,0,0,v_subtotal,p_payment_method,'pending','received','unfulfilled',
    coalesce(p_shipping,'{}'::jsonb),v_items,p_idempotency_key) returning * into v_order;

  insert into public.order_items(order_id,variant_id,product_id,sku,product_name,variant_snapshot,quantity,unit_price,line_total)
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
  when no_data_found then raise exception using errcode='22023', message='invalid_or_inactive_catalog_item';
  when unique_violation then
    select * into v_existing from public.orders where idempotency_key=p_idempotency_key and user_id is not distinct from p_user_id limit 1;
    if found then return jsonb_build_object('duplicate',true,'order',jsonb_build_object('order_number',v_existing.order_number,'currency',v_existing.currency,'total',v_existing.total,'payment_method',v_existing.payment_method,'payment_status',v_existing.payment_status,'order_status',v_existing.order_status,'fulfillment_status',v_existing.fulfillment_status,'created_at',v_existing.created_at)); end if;
    raise;
end; $$;
revoke all on function public.create_order_transactional(uuid,text,text,text,uuid,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.create_order_transactional(uuid,text,text,text,uuid,jsonb,jsonb) to service_role;

-- Keep ownership reads only; no direct authoritative writes.
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
drop policy if exists "Users can read own orders" on public.orders;
create policy "Users can read own orders" on public.orders for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users can read own order items" on public.order_items;
create policy "Users can read own order items" on public.order_items for select to authenticated using (
  exists(select 1 from public.orders o where o.id=order_id and o.user_id=auth.uid())
);
revoke insert, update, delete on public.orders from anon, authenticated;
revoke insert, update, delete on public.order_items from anon, authenticated;
revoke select on public.orders, public.order_items from anon;
grant select on public.orders, public.order_items to authenticated;

commit;

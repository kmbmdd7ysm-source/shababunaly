begin;
create extension if not exists pgcrypto;

alter table public.orders
  add column if not exists idempotency_key uuid,
  add column if not exists subtotal numeric(12,2) not null default 0,
  add column if not exists shipping_total numeric(12,2) not null default 0,
  add column if not exists tax_total numeric(12,2) not null default 0,
  add column if not exists discount_total numeric(12,2) not null default 0;

create unique index if not exists orders_idempotency_key_uidx on public.orders(idempotency_key) where idempotency_key is not null;
create index if not exists orders_user_created_idx on public.orders(user_id, created_at desc);
create index if not exists orders_created_idx on public.orders(created_at desc);
create index if not exists orders_number_idx on public.orders(order_number);
create index if not exists orders_email_lower_idx on public.orders(lower(customer_email));
create index if not exists orders_status_idx on public.orders(order_status, fulfillment_status, payment_status);

alter table public.orders drop constraint if exists orders_currency_check;
alter table public.orders add constraint orders_currency_check check (currency in ('USD','LYD')) not valid;
alter table public.orders drop constraint if exists orders_subtotal_check;
alter table public.orders add constraint orders_subtotal_check check (subtotal >= 0 and shipping_total >= 0 and tax_total >= 0 and discount_total >= 0 and total >= 0) not valid;

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text not null,
  sku text,
  product_name text not null,
  variant_snapshot jsonb,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  line_total numeric(12,2) not null check (line_total >= 0),
  created_at timestamptz not null default now()
);
create index if not exists order_items_order_idx on public.order_items(order_id);
create index if not exists order_items_product_idx on public.order_items(product_id);
alter table public.order_items enable row level security;
drop policy if exists "Users can read own order items" on public.order_items;
create policy "Users can read own order items" on public.order_items for select using (
  exists(select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
);

-- Authoritative writes are performed only by a trusted server/Edge Function.
drop policy if exists "Users can insert own pending orders" on public.orders;
revoke insert, update, delete on public.orders from anon, authenticated;
revoke insert, update, delete on public.order_items from anon, authenticated;

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at before update on public.orders for each row execute function public.set_updated_at();

commit;

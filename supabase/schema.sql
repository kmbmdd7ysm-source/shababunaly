-- Apply this baseline in a new Supabase project, then run files in supabase/migrations.
create table if not exists public.profiles(id uuid primary key references auth.users on delete cascade,display_name text check(char_length(display_name)<=100),first_name text,last_name text,avatar_url text,phone text,account_type text not null default 'customer' check(account_type in ('customer','organization')),organization_name text check(organization_name is null or char_length(organization_name)<=160),organization_type text check(organization_type is null or organization_type in ('club','academy','federation','school_university','wholesale','distributor')),preferred_language text default 'en',preferred_size text,preferred_colors text[] default '{}',preferred_categories text[] default '{}',marketing_consent boolean default false,created_at timestamptz default now(),updated_at timestamptz default now());
create table if not exists public.user_state(user_id uuid primary key references auth.users on delete cascade,cart jsonb not null default '[]',wishlist jsonb not null default '[]',compare jsonb not null default '[]',recently_viewed jsonb not null default '[]',preferences jsonb not null default '{}',version bigint not null default 1,updated_at timestamptz default now());
alter table public.profiles enable row level security;alter table public.user_state enable row level security;drop policy if exists "profile owner" on public.profiles;drop policy if exists "state owner" on public.user_state;create policy "profile owner" on public.profiles for all using(auth.uid()=id) with check(auth.uid()=id);create policy "state owner" on public.user_state for all using(auth.uid()=user_id) with check(auth.uid()=user_id);

alter table public.profiles
  add column if not exists preferred_currency text default 'USD'
    check (preferred_currency in ('USD','LYD')),
  add column if not exists preferred_country text
    check (preferred_country is null or char_length(preferred_country) = 2);


alter table public.profiles
  add column if not exists account_type text not null default 'customer',
  add column if not exists organization_name text,
  add column if not exists organization_type text;

-- Authenticated order history (authoritative writes happen through Edge Functions only)
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  customer_email text not null,
  currency text not null default 'USD' check (currency = 'USD'),
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  shipping_total numeric(12,2) not null default 0 check (shipping_total >= 0),
  tax_total numeric(12,2) not null default 0 check (tax_total >= 0),
  discount_total numeric(12,2) not null default 0 check (discount_total >= 0),
  total numeric(12,2) not null check (total >= 0),
  payment_method text not null check (payment_method in ('cash_on_delivery','cash','online','online_card','libyan_bank_card')),
  payment_plan text not null default 'full' check (payment_plan in ('full','half','pending_shipping_quote')),
  amount_paid numeric(12,2) not null default 0 check (amount_paid >= 0),
  amount_due_now numeric(12,2) not null default 0 check (amount_due_now >= 0),
  remaining_balance numeric(12,2) not null default 0 check (remaining_balance >= 0),
  deposit_required boolean not null default false,
  payment_stage text not null default 'initial' check (payment_stage in ('quote_pending','initial','balance','complete')),
  payment_provider text,
  payment_reference text,
  last_payment_at timestamptz,
  amount_refunded numeric(12,2) not null default 0 check (amount_refunded >= 0 and amount_refunded <= amount_paid),
  last_refund_at timestamptz,
  shipping_quote_expires_at timestamptz,
  payment_expires_at timestamptz,
  delivered_at timestamptz,
  shipping_quote_required boolean not null default false,
  delivery_profile text not null default 'standard' check (delivery_profile in ('ready','standard','custom','international_pending','equipment_quote')),
  payment_status text not null default 'pending' check (payment_status in ('pending','shipping_quote_pending','partially_paid','paid','failed','partially_refunded','refunded','cancelled')),
  order_status text not null default 'received' check (order_status in ('received','pending_shipping_quote','awaiting_cash_confirmation','awaiting_payment','confirmed','processing','design_in_progress','awaiting_design_approval','design_approved','in_production','quality_control','arrived','final_payment_required','ready_to_ship','shipped','out_for_delivery','completed','delivered','cancelled')),
  fulfillment_status text not null default 'unfulfilled' check (fulfillment_status in ('unfulfilled','quote_pending','processing','in_production','fulfilled','cancelled')),
  shipping_summary jsonb,
  items_snapshot jsonb not null default '[]'::jsonb,
  idempotency_key uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (amount_paid + amount_due_now + remaining_balance = total)
);
alter table public.orders enable row level security;
drop policy if exists "Users can read own orders" on public.orders;
create policy "Users can read own orders" on public.orders for select using (auth.uid() = user_id);
revoke insert, update, delete on public.orders from anon, authenticated;


-- Payment events, reliable email-notification outbox, B2B operations, returns,
-- refunds and reservation-expiry functions are created by the ordered migrations
-- through 20260731070000_shababuna_operational_resilience.sql. Migrations are the
-- authoritative production schema and must be applied in filename order.

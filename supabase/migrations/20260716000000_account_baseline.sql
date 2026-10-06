begin;

-- Supabase db reset executes migrations from an empty database. Keep the
-- account foundation in the migration chain so every later migration can be
-- replayed cleanly without relying on supabase/schema.sql being applied first.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) <= 100),
  first_name text,
  last_name text,
  avatar_url text,
  phone text,
  account_type text not null default 'customer'
    check (account_type in ('customer', 'organization')),
  organization_name text
    check (organization_name is null or char_length(organization_name) <= 160),
  organization_type text
    check (
      organization_type is null
      or organization_type in (
        'club',
        'academy',
        'federation',
        'school_university',
        'wholesale',
        'distributor'
      )
    ),
  preferred_language text default 'en'
    check (preferred_language in ('en', 'ar')),
  preferred_size text,
  preferred_colors text[] default '{}',
  preferred_categories text[] default '{}',
  marketing_consent boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  cart jsonb not null default '[]'::jsonb,
  wishlist jsonb not null default '[]'::jsonb,
  compare jsonb not null default '[]'::jsonb,
  recently_viewed jsonb not null default '[]'::jsonb,
  preferences jsonb not null default '{}'::jsonb,
  version bigint not null default 1,
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.user_state enable row level security;

drop policy if exists "profile owner" on public.profiles;
create policy "profile owner"
  on public.profiles
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "state owner" on public.user_state;
create policy "state owner"
  on public.user_state
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- Orders existed in the original baseline schema before the order-hardening
-- migrations. Recreate that foundation here so a clean db reset can replay
-- the full migration history from an empty database.
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  customer_email text not null,
  currency text not null default 'USD' check (currency = 'USD'),
  total numeric(12,2) not null check (total >= 0),
  payment_method text not null
    check (payment_method in ('cash_on_delivery', 'cash', 'online')),
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
  order_status text not null default 'received'
    check (order_status in ('received', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  fulfillment_status text not null default 'unfulfilled'
    check (fulfillment_status in ('unfulfilled', 'processing', 'fulfilled', 'cancelled')),
  shipping_summary jsonb,
  items_snapshot jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orders enable row level security;
drop policy if exists "Users can read own orders" on public.orders;
create policy "Users can read own orders"
  on public.orders
  for select
  using (auth.uid() = user_id);

revoke insert, update, delete on public.orders from anon, authenticated;

commit;

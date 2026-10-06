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

commit;

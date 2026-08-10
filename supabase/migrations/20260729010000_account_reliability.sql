-- LHA account reliability. Safe to run repeatedly in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text check (char_length(first_name) <= 80),
  last_name text check (char_length(last_name) <= 80),
  display_name text check (char_length(display_name) <= 100),
  avatar_url text,
  phone text,
  preferred_language text default 'en' check (preferred_language in ('en','ar')),
  preferred_currency text default 'USD' check (preferred_currency in ('USD','LYD')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists created_at timestamptz default now();
alter table public.profiles add column if not exists updated_at timestamptz default now();
alter table public.profiles enable row level security;
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_select_own on public.profiles for select using (auth.uid() = id);
create policy profiles_insert_own on public.profiles for insert with check (auth.uid() = id);
create policy profiles_update_own on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

grant select, insert, update on public.profiles to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles(id, first_name, last_name, display_name, avatar_url, phone, updated_at)
  values(
    new.id,
    nullif(new.raw_user_meta_data->>'first_name',''),
    nullif(new.raw_user_meta_data->>'last_name',''),
    coalesce(nullif(new.raw_user_meta_data->>'display_name',''), nullif(new.raw_user_meta_data->>'fullName','')),
    nullif(new.raw_user_meta_data->>'avatar_url',''),
    nullif(new.raw_user_meta_data->>'phone',''),
    now()
  )
  on conflict(id) do update set
    first_name = coalesce(excluded.first_name, public.profiles.first_name),
    last_name = coalesce(excluded.last_name, public.profiles.last_name),
    display_name = coalesce(excluded.display_name, public.profiles.display_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    phone = coalesce(excluded.phone, public.profiles.phone),
    updated_at = now();
  return new;
exception when others then
  raise warning 'LHA profile sync failed for user %: %', new.id, sqlerrm;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert or update of raw_user_meta_data on auth.users
for each row execute function public.handle_new_user();

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text,
  first_name text not null,
  last_name text not null,
  line1 text not null,
  line2 text,
  city text not null,
  region text,
  postal_code text,
  country text not null,
  phone text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.addresses enable row level security;
drop policy if exists addresses_select_own on public.addresses;
drop policy if exists addresses_insert_own on public.addresses;
drop policy if exists addresses_update_own on public.addresses;
drop policy if exists addresses_delete_own on public.addresses;
create policy addresses_select_own on public.addresses for select using (auth.uid() = user_id);
create policy addresses_insert_own on public.addresses for insert with check (auth.uid() = user_id);
create policy addresses_update_own on public.addresses for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy addresses_delete_own on public.addresses for delete using (auth.uid() = user_id);
grant select, insert, update, delete on public.addresses to authenticated;

create table if not exists public.addresses(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 label text not null default 'Home' check(char_length(label)<=40), first_name text not null check(char_length(first_name)<=80), last_name text not null check(char_length(last_name)<=80), company text check(char_length(company)<=120),
 address_line_1 text not null check(char_length(address_line_1)<=180), address_line_2 text check(char_length(address_line_2)<=180), city text not null check(char_length(city)<=100), region text not null check(char_length(region)<=100), postal_code text not null check(char_length(postal_code)<=24), country text not null check(char_length(country)=2), phone text check(char_length(phone)<=30), is_default boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists addresses_user_updated_idx on public.addresses(user_id,updated_at desc);
create unique index if not exists addresses_one_default_per_user on public.addresses(user_id) where is_default;
alter table public.addresses enable row level security;
drop policy if exists addresses_select_own on public.addresses; create policy addresses_select_own on public.addresses for select using(auth.uid()=user_id);
drop policy if exists addresses_insert_own on public.addresses; create policy addresses_insert_own on public.addresses for insert with check(auth.uid()=user_id);
drop policy if exists addresses_update_own on public.addresses; create policy addresses_update_own on public.addresses for update using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists addresses_delete_own on public.addresses; create policy addresses_delete_own on public.addresses for delete using(auth.uid()=user_id);
create or replace function public.make_address_default(p_address_id uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$ begin update public.addresses set is_default=false,updated_at=now() where user_id=auth.uid(); update public.addresses set is_default=true,updated_at=now() where id=p_address_id and user_id=auth.uid(); if not found then raise exception 'address_not_found'; end if; end $$;
revoke all on function public.make_address_default(uuid) from public,anon; grant execute on function public.make_address_default(uuid) to authenticated;
create or replace function public.delete_own_account() returns void language plpgsql security definer set search_path=public,auth,pg_temp as $$ declare uid uuid:=auth.uid(); begin if uid is null then raise exception 'not_authenticated'; end if; delete from auth.users where id=uid; if not found then raise exception 'user_not_found'; end if; end $$;
revoke all on function public.delete_own_account() from public,anon; grant execute on function public.delete_own_account() to authenticated;

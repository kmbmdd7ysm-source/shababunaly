-- Shababuna personal and organization account model.
-- Safe to run after the baseline and account reliability migrations.

alter table public.profiles add column if not exists account_type text default 'customer';
alter table public.profiles add column if not exists organization_name text;
alter table public.profiles add column if not exists organization_type text;

update public.profiles
set account_type = 'customer'
where account_type is null or account_type not in ('customer', 'organization');

alter table public.profiles alter column account_type set default 'customer';
alter table public.profiles alter column account_type set not null;

alter table public.profiles drop constraint if exists profiles_account_type_check;
alter table public.profiles add constraint profiles_account_type_check
  check (account_type in ('customer', 'organization'));

alter table public.profiles drop constraint if exists profiles_organization_name_length_check;
alter table public.profiles add constraint profiles_organization_name_length_check
  check (organization_name is null or char_length(organization_name) <= 160);

alter table public.profiles drop constraint if exists profiles_organization_type_check;
alter table public.profiles add constraint profiles_organization_type_check
  check (
    organization_type is null or organization_type in (
      'club', 'academy', 'federation', 'school_university', 'wholesale', 'distributor'
    )
  );

alter table public.profiles drop constraint if exists profiles_organization_fields_check;
alter table public.profiles add constraint profiles_organization_fields_check
  check (
    (account_type = 'customer' and organization_name is null and organization_type is null)
    or
    (account_type = 'organization' and nullif(btrim(organization_name), '') is not null and organization_type is not null)
  );

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  requested_account_type text;
  requested_organization_type text;
  requested_organization_name text;
begin
  requested_account_type := case
    when new.raw_user_meta_data->>'account_type' = 'organization' then 'organization'
    else 'customer'
  end;

  requested_organization_type := case
    when new.raw_user_meta_data->>'organization_type' in (
      'club', 'academy', 'federation', 'school_university', 'wholesale', 'distributor'
    ) then new.raw_user_meta_data->>'organization_type'
    else null
  end;

  requested_organization_name := nullif(btrim(new.raw_user_meta_data->>'organization_name'), '');

  if requested_account_type = 'organization'
     and (requested_organization_name is null or requested_organization_type is null) then
    requested_account_type := 'customer';
    requested_organization_name := null;
    requested_organization_type := null;
  elsif requested_account_type = 'customer' then
    requested_organization_name := null;
    requested_organization_type := null;
  end if;

  insert into public.profiles(
    id,
    first_name,
    last_name,
    display_name,
    avatar_url,
    phone,
    account_type,
    organization_name,
    organization_type,
    updated_at
  )
  values(
    new.id,
    nullif(new.raw_user_meta_data->>'first_name',''),
    nullif(new.raw_user_meta_data->>'last_name',''),
    coalesce(
      nullif(new.raw_user_meta_data->>'display_name',''),
      nullif(new.raw_user_meta_data->>'fullName','')
    ),
    nullif(new.raw_user_meta_data->>'avatar_url',''),
    nullif(new.raw_user_meta_data->>'phone',''),
    requested_account_type,
    requested_organization_name,
    requested_organization_type,
    now()
  )
  on conflict(id) do update set
    first_name = coalesce(excluded.first_name, public.profiles.first_name),
    last_name = coalesce(excluded.last_name, public.profiles.last_name),
    display_name = coalesce(excluded.display_name, public.profiles.display_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    phone = coalesce(excluded.phone, public.profiles.phone),
    account_type = excluded.account_type,
    organization_name = excluded.organization_name,
    organization_type = excluded.organization_type,
    updated_at = now();
  return new;
exception when others then
  raise warning 'Shababuna profile sync failed for user %: %', new.id, sqlerrm;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert or update of raw_user_meta_data on auth.users
for each row execute function public.handle_new_user();

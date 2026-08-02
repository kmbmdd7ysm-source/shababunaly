begin;

alter table public.profiles
  add column if not exists preferred_currency text default 'USD'
    check (preferred_currency in ('USD','LYD')),
  add column if not exists preferred_country text
    check (preferred_country is null or preferred_country ~ '^[A-Z]{2}$');

create index if not exists profiles_preferred_currency_idx
  on public.profiles(preferred_currency);

commit;

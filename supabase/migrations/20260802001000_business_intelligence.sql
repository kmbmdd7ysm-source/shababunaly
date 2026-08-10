begin;

create table if not exists public.commerce_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null check (event_name in (
    'checkout_started','checkout_abandoned','order_created','purchase_completed',
    'payment_failed','payment_recovered','deposit_paid','final_payment_paid',
    'refund_requested','refund_completed','return_requested','return_completed',
    'quote_created','quote_approved','quote_rejected','production_started',
    'shipment_created','shipment_delivered','inventory_stockout','ready_to_ship_conversion'
  )),
  occurred_at timestamptz not null default now(),
  entity_type text,
  entity_reference text,
  organization_id uuid references public.organizations(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  customer_hash text check (customer_hash is null or length(customer_hash)=64),
  value_usd numeric(14,2) check (value_usd is null or value_usd >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  channel text not null default 'web',
  properties jsonb not null default '{}'::jsonb,
  source_event_id text,
  created_at timestamptz not null default now(),
  unique (event_name, source_event_id)
);
create index if not exists commerce_events_occurred_idx on public.commerce_events(occurred_at desc);
create index if not exists commerce_events_name_idx on public.commerce_events(event_name, occurred_at desc);
create index if not exists commerce_events_entity_idx on public.commerce_events(entity_type, entity_reference);
create index if not exists commerce_events_customer_idx on public.commerce_events(customer_hash) where customer_hash is not null;
alter table public.commerce_events enable row level security;

drop policy if exists "staff read commerce analytics" on public.commerce_events;
create policy "staff read commerce analytics" on public.commerce_events
for select to authenticated
using (public.is_shababuna_staff());

create or replace view public.business_intelligence_summary
with (security_invoker=true) as
with event_rollup as (
  select
    count(*) filter (where event_name='checkout_started')::bigint as checkout_started,
    count(*) filter (where event_name='purchase_completed')::bigint as purchases,
    count(*) filter (where event_name='quote_created')::bigint as quotes_created,
    count(*) filter (where event_name='quote_approved')::bigint as quotes_approved,
    count(*) filter (where event_name='refund_completed')::bigint as refunds,
    count(distinct customer_hash) filter (where event_name='purchase_completed' and customer_hash is not null)::bigint as purchasing_customers,
    coalesce(sum(value_usd) filter (where event_name in ('purchase_completed','deposit_paid','final_payment_paid')),0)::numeric(14,2) as recognized_revenue_usd,
    coalesce(avg(value_usd) filter (where event_name='purchase_completed'),0)::numeric(14,2) as average_order_value_usd
  from public.commerce_events
  where occurred_at >= now() - interval '365 days'
), repeat_rollup as (
  select count(*)::bigint as repeat_customers from (
    select customer_hash from public.commerce_events
    where event_name='purchase_completed' and customer_hash is not null and occurred_at >= now()-interval '365 days'
    group by customer_hash having count(*) > 1
  ) x
), inventory_rollup as (
  select
    count(*) filter (where coalesce(inventory_quantity,0)=0)::bigint as stockout_variants,
    count(*) filter (where coalesce(inventory_quantity,0)>0)::bigint as stocked_variants
  from public.product_catalog
)
select
  e.*,
  r.repeat_customers,
  i.stockout_variants,
  i.stocked_variants,
  case when e.checkout_started=0 then 0 else round(e.purchases::numeric/e.checkout_started*100,2) end as checkout_conversion_percent,
  case when e.quotes_created=0 then 0 else round(e.quotes_approved::numeric/e.quotes_created*100,2) end as quote_to_order_percent,
  case when e.purchasing_customers=0 then 0 else round(r.repeat_customers::numeric/e.purchasing_customers*100,2) end as repeat_customer_percent
from event_rollup e cross join repeat_rollup r cross join inventory_rollup i;

grant select on public.business_intelligence_summary to authenticated;

commit;

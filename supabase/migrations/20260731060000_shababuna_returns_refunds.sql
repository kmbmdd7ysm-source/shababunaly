begin;

-- Returns and refunds are isolated from gross payment accounting. amount_paid
-- stays the verified gross amount; amount_refunded tracks money sent back.
alter table public.orders
  add column if not exists amount_refunded numeric(12,2) not null default 0,
  add column if not exists last_refund_at timestamptz;
alter table public.orders drop constraint if exists orders_amount_refunded_check;
alter table public.orders add constraint orders_amount_refunded_check
  check (amount_refunded>=0 and amount_refunded<=amount_paid) not valid;
alter table public.orders drop constraint if exists orders_payment_status_check;
alter table public.orders add constraint orders_payment_status_check
  check (payment_status in (
    'pending','shipping_quote_pending','partially_paid','paid','failed',
    'partially_refunded','refunded','cancelled'
  )) not valid;

create or replace function public.is_valid_payment_status_transition(p_from text,p_to text)
returns boolean
language sql
immutable
as $$
  select p_from=p_to or case p_from
    when 'shipping_quote_pending' then p_to=any(array['pending','cancelled'])
    when 'pending' then p_to=any(array['partially_paid','paid','failed','cancelled'])
    when 'failed' then p_to=any(array['pending','partially_paid','paid','cancelled'])
    when 'partially_paid' then p_to=any(array['paid','partially_refunded','refunded','cancelled'])
    when 'paid' then p_to=any(array['partially_refunded','refunded'])
    when 'partially_refunded' then p_to='refunded'
    else false
  end;
$$;

create sequence if not exists public.return_number_seq;
create table if not exists public.return_requests (
  id uuid primary key default gen_random_uuid(),
  return_number text not null unique,
  order_id uuid not null references public.orders(id) on delete restrict,
  order_number text not null,
  user_id uuid not null references auth.users(id) on delete restrict,
  customer_email text not null,
  status text not null default 'requested' check (status in (
    'requested','under_review','approved','rejected','received',
    'refund_pending','refunded','closed','cancelled'
  )),
  reason text not null check (char_length(reason) between 2 and 120),
  details text check (details is null or char_length(details)<=3000),
  requested_items jsonb not null check (jsonb_typeof(requested_items)='array' and jsonb_array_length(requested_items) between 1 and 30),
  resolution text check (resolution is null or resolution in ('refund','replacement','store_credit','no_action')),
  refund_amount numeric(12,2) check (refund_amount is null or refund_amount>=0),
  staff_note text,
  customer_note text,
  inventory_restocked_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists return_requests_user_idx on public.return_requests(user_id,created_at desc);
create index if not exists return_requests_status_idx on public.return_requests(status,created_at desc);
create unique index if not exists one_active_return_per_order_idx on public.return_requests(order_id)
where status not in ('rejected','refunded','closed','cancelled');
alter table public.return_requests enable row level security;
revoke all on public.return_requests from anon,authenticated;
grant select on public.return_requests to authenticated;
grant select,insert,update on public.return_requests to service_role;
drop policy if exists "customers read own returns" on public.return_requests;
create policy "customers read own returns" on public.return_requests
for select to authenticated using (user_id=auth.uid());
drop policy if exists "staff read all returns" on public.return_requests;
create policy "staff read all returns" on public.return_requests
for select to authenticated using (public.is_shababuna_staff());

create table if not exists public.refund_events (
  id text primary key,
  provider text not null,
  order_id uuid not null references public.orders(id) on delete restrict,
  order_number text not null,
  return_request_id uuid references public.return_requests(id) on delete set null,
  transaction_id text,
  amount numeric(12,2) not null check (amount>0),
  currency text not null default 'USD' check (currency='USD'),
  payload_hash text not null,
  recorded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists refund_events_order_idx on public.refund_events(order_id,created_at desc);
alter table public.refund_events enable row level security;
revoke all on public.refund_events from anon,authenticated;
grant select,insert on public.refund_events to service_role;
drop policy if exists "staff read refund events" on public.refund_events;
create policy "staff read refund events" on public.refund_events
for select to authenticated using (public.is_shababuna_staff());
grant select on public.refund_events to authenticated;

create or replace function public.is_valid_return_status_transition(p_from text,p_to text)
returns boolean
language sql
immutable
as $$
  select p_from=p_to or case p_from
    when 'requested' then p_to=any(array['under_review','approved','rejected','cancelled'])
    when 'under_review' then p_to=any(array['approved','rejected','cancelled'])
    when 'approved' then p_to=any(array['received','cancelled'])
    when 'received' then p_to=any(array['refund_pending','closed'])
    when 'refund_pending' then p_to=any(array['refunded','closed'])
    when 'refunded' then p_to='closed'
    else false
  end;
$$;

create or replace function public.create_return_request(
  p_order_number text,
  p_reason text,
  p_details text,
  p_items jsonb
) returns public.return_requests
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_order public.orders;
  v_item jsonb;
  v_order_item jsonb;
  v_qty integer;
  v_available integer;
  v_return public.return_requests;
  v_number text;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select * into v_order from public.orders
  where order_number=upper(btrim(p_order_number)) and user_id=auth.uid()
  for update;
  if not found then raise exception 'order_not_found'; end if;
  if v_order.order_status<>'delivered' then raise exception 'order_not_delivered'; end if;
  if coalesce(v_order.updated_at,v_order.created_at)<now()-interval '14 days' then raise exception 'return_window_closed'; end if;
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>30 then raise exception 'invalid_return_items'; end if;
  if exists(select 1 from public.return_requests where order_id=v_order.id and status not in ('rejected','refunded','closed','cancelled')) then raise exception 'active_return_exists'; end if;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_qty=coalesce((v_item->>'quantity')::integer,0);
    if v_qty<1 then raise exception 'invalid_return_quantity'; end if;
    select item into v_order_item
    from jsonb_array_elements(coalesce(v_order.items_snapshot,'[]'::jsonb)) item
    where coalesce(item->>'variantId',item->>'variant_id',item->>'sku')=coalesce(v_item->>'variantId',v_item->>'variant_id',v_item->>'sku')
    limit 1;
    if v_order_item is null then raise exception 'return_item_not_in_order'; end if;
    if lower(coalesce(v_order_item->>'purchaseMode',v_order_item->>'purchase_mode','retail'))<>'retail'
       or coalesce((v_order_item->>'customizable')::boolean,false) then
      raise exception 'custom_or_wholesale_item_not_returnable';
    end if;
    v_available=coalesce((v_order_item->>'quantity')::integer,0);
    if v_qty>v_available then raise exception 'return_quantity_exceeds_order'; end if;
  end loop;

  v_number='RET-'||to_char(clock_timestamp(),'YYYYMMDD')||'-'||lpad(nextval('public.return_number_seq')::text,7,'0');
  insert into public.return_requests(return_number,order_id,order_number,user_id,customer_email,reason,details,requested_items)
  values(v_number,v_order.id,v_order.order_number,auth.uid(),v_order.customer_email,left(btrim(p_reason),120),left(coalesce(p_details,''),3000),p_items)
  returning * into v_return;
  perform public.enqueue_commerce_notification(
    'new-return:'||v_return.id::text,'new_return_request','return',v_return.id::text,v_return.customer_email,
    'New Shababuna return request — '||v_return.return_number,
    jsonb_build_object('returnNumber',v_return.return_number,'orderNumber',v_return.order_number,'reason',v_return.reason,'details',v_return.details,'items',v_return.requested_items)
  );
  return v_return;
end;
$$;
revoke all on function public.create_return_request(text,text,text,jsonb) from public;
grant execute on function public.create_return_request(text,text,text,jsonb) to authenticated,service_role;

create or replace function public.staff_update_return_request(
  p_return_id uuid,
  p_status text,
  p_resolution text default null,
  p_refund_amount numeric default null,
  p_staff_note text default '',
  p_restock boolean default false
) returns public.return_requests
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  before_row public.return_requests;
  after_row public.return_requests;
  v_order public.orders;
  v_item jsonb;
  v_qty integer;
  v_variant text;
begin
  if not public.is_shababuna_staff() then raise exception 'staff_required'; end if;
  select * into before_row from public.return_requests where id=p_return_id for update;
  if not found then raise exception 'return_not_found'; end if;
  if not public.is_valid_return_status_transition(before_row.status,p_status) then raise exception 'invalid_return_status_transition'; end if;
  if p_status='refunded' then raise exception 'record_refund_through_financial_function'; end if;
  select * into v_order from public.orders where id=before_row.order_id for update;
  if p_refund_amount is not null and (p_refund_amount<0 or p_refund_amount>v_order.amount_paid-v_order.amount_refunded) then raise exception 'invalid_refund_amount'; end if;
  if p_resolution is not null and p_resolution not in ('refund','replacement','store_credit','no_action') then raise exception 'invalid_return_resolution'; end if;

  if p_status='received' and p_restock and before_row.inventory_restocked_at is null then
    for v_item in select value from jsonb_array_elements(before_row.requested_items) loop
      v_variant=coalesce(v_item->>'variantId',v_item->>'variant_id',v_item->>'sku');
      v_qty=coalesce((v_item->>'quantity')::integer,0);
      update public.product_catalog
      set inventory_quantity=inventory_quantity+v_qty,
          availability_state=case when inventory_quantity+v_qty<=6 then 'low_stock' else 'in_stock' end,
          updated_at=now()
      where variant_id=v_variant and inventory_tracking=true;
    end loop;
  end if;

  update public.return_requests set
    status=p_status,
    resolution=coalesce(p_resolution,resolution),
    refund_amount=coalesce(p_refund_amount,refund_amount),
    staff_note=left(coalesce(p_staff_note,''),3000),
    inventory_restocked_at=case when p_status='received' and p_restock and inventory_restocked_at is null then now() else inventory_restocked_at end,
    resolved_at=case when p_status in ('rejected','refunded','closed','cancelled') then now() else resolved_at end,
    updated_at=now()
  where id=p_return_id returning * into after_row;
  insert into public.operations_audit_log(actor_id,action,entity_type,entity_id,before_data,after_data)
  values(auth.uid(),'update_return_request','return',p_return_id::text,to_jsonb(before_row),to_jsonb(after_row));
  perform public.enqueue_commerce_notification(
    'return-update:'||after_row.id::text||':'||extract(epoch from after_row.updated_at)::bigint,
    'return_update','return',after_row.id::text,after_row.customer_email,
    'Shababuna return update — '||after_row.return_number,
    jsonb_build_object('returnNumber',after_row.return_number,'orderNumber',after_row.order_number,'status',after_row.status,'resolution',after_row.resolution,'refundAmount',after_row.refund_amount,'note',after_row.staff_note)
  );
  return after_row;
end;
$$;
revoke all on function public.staff_update_return_request(uuid,text,text,numeric,text,boolean) from public;
grant execute on function public.staff_update_return_request(uuid,text,text,numeric,text,boolean) to authenticated,service_role;

create or replace function public.apply_verified_refund_event(
  p_provider text,
  p_event_id text,
  p_order_number text,
  p_amount numeric,
  p_currency text,
  p_transaction_id text,
  p_payload_hash text,
  p_return_request_id uuid default null
) returns public.orders
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  before_row public.orders;
  after_row public.orders;
  v_existing public.refund_events;
  v_remaining_refundable numeric(12,2);
  v_total_refunded numeric(12,2);
  v_inserted integer:=0;
begin
  if auth.role()<>'service_role' and not public.is_shababuna_staff() then raise exception 'service_or_staff_required'; end if;
  if coalesce(length(btrim(p_event_id)),0)<4 or coalesce(length(btrim(p_payload_hash)),0)<16 then raise exception 'invalid_refund_event'; end if;
  if upper(coalesce(p_currency,''))<>'USD' then raise exception 'refund_currency_mismatch'; end if;
  select * into before_row from public.orders where order_number=upper(btrim(p_order_number)) for update;
  if not found then raise exception 'order_not_found'; end if;
  v_remaining_refundable=round(before_row.amount_paid-before_row.amount_refunded,2);
  if p_amount is null or p_amount<=0 or p_amount>v_remaining_refundable+0.01 then raise exception 'refund_amount_mismatch'; end if;
  if p_return_request_id is not null and not exists(select 1 from public.return_requests where id=p_return_request_id and order_id=before_row.id) then raise exception 'return_order_mismatch'; end if;

  insert into public.refund_events(id,provider,order_id,order_number,return_request_id,transaction_id,amount,currency,payload_hash,recorded_by)
  values(left(p_event_id,240),left(coalesce(p_provider,'unknown'),80),before_row.id,before_row.order_number,p_return_request_id,left(coalesce(p_transaction_id,''),240),round(p_amount,2),'USD',left(p_payload_hash,128),auth.uid())
  on conflict(id) do nothing;
  get diagnostics v_inserted=row_count;
  if v_inserted=0 then
    select * into v_existing from public.refund_events where id=left(p_event_id,240);
    if not found or v_existing.order_id<>before_row.id or v_existing.payload_hash<>left(p_payload_hash,128) then raise exception 'refund_event_replay_mismatch'; end if;
    return before_row;
  end if;

  v_total_refunded=round(before_row.amount_refunded+p_amount,2);
  update public.orders set
    amount_refunded=v_total_refunded,
    payment_status=case when v_total_refunded>=amount_paid-0.01 then 'refunded' else 'partially_refunded' end,
    last_refund_at=now(),
    updated_at=now()
  where id=before_row.id returning * into after_row;
  if p_return_request_id is not null then
    update public.return_requests set
      status='refunded',resolution='refund',refund_amount=coalesce(refund_amount,0)+round(p_amount,2),resolved_at=now(),updated_at=now()
    where id=p_return_request_id;
  end if;
  insert into public.operations_audit_log(actor_id,action,entity_type,entity_id,before_data,after_data)
  values(auth.uid(),'verified_refund_event','order',before_row.id::text,to_jsonb(before_row),to_jsonb(after_row));
  perform public.enqueue_commerce_notification(
    'refund:'||left(p_event_id,200),'refund_update','order',after_row.id::text,after_row.customer_email,
    'Shababuna refund update — '||after_row.order_number,
    jsonb_build_object('orderNumber',after_row.order_number,'refundAmount',round(p_amount,2),'amountRefunded',after_row.amount_refunded,'paymentStatus',after_row.payment_status,'provider',p_provider,'reference',p_transaction_id)
  );
  return after_row;
end;
$$;
revoke all on function public.apply_verified_refund_event(text,text,text,numeric,text,text,text,uuid) from public;
grant execute on function public.apply_verified_refund_event(text,text,text,numeric,text,text,text,uuid) to service_role;

create or replace function public.staff_record_refund(
  p_order_id uuid,
  p_amount numeric,
  p_method text,
  p_reference text default '',
  p_note text default '',
  p_return_request_id uuid default null
) returns public.orders
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_order public.orders;
  v_event_id text;
  v_reference text;
begin
  if not public.is_shababuna_staff() then raise exception 'staff_required'; end if;
  select * into v_order from public.orders where id=p_order_id;
  if not found then raise exception 'order_not_found'; end if;
  v_event_id='manual-refund-'||p_order_id::text||'-'||gen_random_uuid()::text;
  v_reference=left(coalesce(nullif(btrim(p_reference),''),v_event_id),240);
  return public.apply_verified_refund_event(
    'manual-'||left(coalesce(p_method,'refund'),60),v_event_id,v_order.order_number,p_amount,'USD',v_reference,
    encode(digest(v_event_id||coalesce(p_note,''),'sha256'),'hex'),p_return_request_id
  );
end;
$$;
revoke all on function public.staff_record_refund(uuid,numeric,text,text,text,uuid) from public;
grant execute on function public.staff_record_refund(uuid,numeric,text,text,text,uuid) to authenticated,service_role;

commit;

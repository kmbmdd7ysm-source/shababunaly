begin;

-- Final operational-resilience layer. It closes unpaid inventory reservations,
-- records delivery timestamps for a fair return window, and prevents financial
-- state changes from bypassing verified payment/refund functions.

alter table public.orders
  add column if not exists delivered_at timestamptz,
  add column if not exists payment_expires_at timestamptz;

update public.orders
set delivered_at=coalesce(delivered_at,updated_at,created_at)
where order_status='delivered' and delivered_at is null;

create or replace function public.set_order_operational_timestamps()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  if new.order_status='delivered' then
    if tg_op='INSERT' then
      new.delivered_at:=coalesce(new.delivered_at,now());
    elsif old.order_status is distinct from 'delivered' then
      new.delivered_at:=coalesce(new.delivered_at,now());
    end if;
  end if;

  if new.payment_status in ('paid','refunded','cancelled') or new.order_status in ('delivered','cancelled') then
    new.payment_expires_at:=null;
  elsif new.order_status in ('awaiting_payment','awaiting_cash_confirmation') and new.amount_due_now>0 then
    if new.payment_expires_at is null
       or (tg_op='UPDATE' and (old.amount_due_now is distinct from new.amount_due_now
                              or old.shipping_quote_expires_at is distinct from new.shipping_quote_expires_at
                              or old.payment_method is distinct from new.payment_method)) then
      new.payment_expires_at:=case
        when new.shipping_quote_expires_at is not null then new.shipping_quote_expires_at
        when new.payment_method in ('cash','cash_on_delivery') then now()+interval '48 hours'
        else now()+interval '24 hours'
      end;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists set_order_operational_timestamps_trigger on public.orders;
create trigger set_order_operational_timestamps_trigger
before insert or update of order_status,payment_status,amount_due_now,payment_method,shipping_quote_expires_at
on public.orders for each row execute function public.set_order_operational_timestamps();

create or replace function public.expire_stale_commerce_orders()
returns integer
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_order public.orders;
  v_count integer:=0;
begin
  if auth.role()<>'service_role' and not public.is_shababuna_staff() then
    raise exception 'service_or_staff_required';
  end if;
  for v_order in
    select * from public.orders
    where order_status in ('awaiting_payment','awaiting_cash_confirmation')
      and payment_status in ('pending','failed')
      and amount_paid=0
      and payment_expires_at is not null
      and payment_expires_at<now()
    for update skip locked
  loop
    update public.orders
    set order_status='cancelled',payment_status='cancelled',fulfillment_status='cancelled',
        amount_due_now=0,remaining_balance=greatest(total-amount_paid,0),updated_at=now()
    where id=v_order.id;
    perform public.enqueue_commerce_notification(
      'order-expired:'||v_order.id::text,'order_expired','order',v_order.id::text,v_order.customer_email,
      'Shababuna order expired — '||v_order.order_number,
      jsonb_build_object('orderNumber',v_order.order_number,'reason','payment_window_expired')
    );
    v_count:=v_count+1;
  end loop;
  return v_count;
end;
$$;
revoke all on function public.expire_stale_commerce_orders() from public;
grant execute on function public.expire_stale_commerce_orders() to service_role;

-- A customer can cancel a return only before staff approval/receipt.
create or replace function public.customer_cancel_return_request(p_return_id uuid,p_note text default '')
returns public.return_requests
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  before_row public.return_requests;
  after_row public.return_requests;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select * into before_row from public.return_requests
  where id=p_return_id and user_id=auth.uid() for update;
  if not found then raise exception 'return_not_found'; end if;
  if before_row.status not in ('requested','under_review') then raise exception 'return_cannot_be_cancelled'; end if;
  update public.return_requests
  set status='cancelled',customer_note=left(coalesce(p_note,''),1000),resolved_at=now(),updated_at=now()
  where id=p_return_id returning * into after_row;
  perform public.enqueue_commerce_notification(
    'return-cancelled:'||after_row.id::text,'return_cancelled','return',after_row.id::text,after_row.customer_email,
    'Shababuna return cancelled — '||after_row.return_number,
    jsonb_build_object('returnNumber',after_row.return_number,'orderNumber',after_row.order_number,'note',after_row.customer_note)
  );
  return after_row;
end;
$$;
revoke all on function public.customer_cancel_return_request(uuid,text) from public;
grant execute on function public.customer_cancel_return_request(uuid,text) to authenticated,service_role;

-- Replace customer return creation with delivery-timestamp enforcement and
-- duplicate-variant aggregation.
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
  v_items jsonb;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select * into v_order from public.orders
  where order_number=upper(btrim(p_order_number)) and user_id=auth.uid()
  for update;
  if not found then raise exception 'order_not_found'; end if;
  if v_order.order_status<>'delivered' or v_order.delivered_at is null then raise exception 'order_not_delivered'; end if;
  if v_order.delivered_at<now()-interval '14 days' then raise exception 'return_window_closed'; end if;
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>30 then raise exception 'invalid_return_items'; end if;
  if exists(select 1 from public.return_requests where order_id=v_order.id and status not in ('rejected','refunded','closed','cancelled')) then raise exception 'active_return_exists'; end if;

  select jsonb_agg(jsonb_build_object(
    'variantId',variant_id,'sku',sku,'name',item_name,'quantity',quantity
  ) order by variant_id)
  into v_items
  from (
    select variant_id,max(sku) sku,max(item_name) item_name,sum(quantity)::integer quantity
    from (
      select
        nullif(btrim(coalesce(value->>'variantId',value->>'variant_id',value->>'sku')),'') variant_id,
        left(coalesce(value->>'sku',''),240) sku,
        left(coalesce(value->>'name',''),240) item_name,
        case when coalesce(value->>'quantity','') ~ '^[0-9]{1,4}$' then (value->>'quantity')::integer else 0 end quantity
      from jsonb_array_elements(p_items)
    ) raw_items
    where variant_id is not null
    group by variant_id
  ) normalized;

  if v_items is null or jsonb_array_length(v_items)<1 or jsonb_array_length(v_items)>30 then raise exception 'invalid_return_items'; end if;

  for v_item in select value from jsonb_array_elements(v_items) loop
    v_qty=coalesce((v_item->>'quantity')::integer,0);
    if v_qty<1 then raise exception 'invalid_return_quantity'; end if;
    v_order_item:=null;
    select item into v_order_item
    from jsonb_array_elements(coalesce(v_order.items_snapshot,'[]'::jsonb)) item
    where coalesce(item->>'variantId',item->>'variant_id',item->>'sku')=v_item->>'variantId'
    limit 1;
    if v_order_item is null then raise exception 'return_item_not_in_order'; end if;
    if lower(coalesce(v_order_item->>'purchaseMode',v_order_item->>'purchase_mode','retail'))<>'retail'
       or coalesce((v_order_item->>'customizable')::boolean,false)
       or coalesce((v_order_item->'variant_snapshot'->>'customizable')::boolean,false) then
      raise exception 'custom_or_wholesale_item_not_returnable';
    end if;
    v_available=coalesce((v_order_item->>'quantity')::integer,0);
    if v_qty>v_available then raise exception 'return_quantity_exceeds_order'; end if;
  end loop;

  v_number='RET-'||to_char(clock_timestamp(),'YYYYMMDD')||'-'||lpad(nextval('public.return_number_seq')::text,7,'0');
  insert into public.return_requests(return_number,order_id,order_number,user_id,customer_email,reason,details,requested_items)
  values(v_number,v_order.id,v_order.order_number,auth.uid(),v_order.customer_email,left(btrim(p_reason),120),left(coalesce(p_details,''),3000),v_items)
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

-- Ensure a return-linked refund can only close goods that staff has received.
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
  v_return public.return_requests;
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
  if p_return_request_id is not null then
    select * into v_return from public.return_requests where id=p_return_request_id and order_id=before_row.id for update;
    if not found then raise exception 'return_order_mismatch'; end if;
    if v_return.status not in ('received','refund_pending') then raise exception 'return_not_ready_for_refund'; end if;
  end if;

  insert into public.refund_events(id,provider,order_id,order_number,return_request_id,transaction_id,amount,currency,payload_hash,recorded_by)
  values(left(p_event_id,240),left(coalesce(p_provider,'unknown'),80),before_row.id,before_row.order_number,p_return_request_id,left(coalesce(p_transaction_id,''),240),round(p_amount,2),'USD',left(p_payload_hash,128),auth.uid())
  on conflict(id) do nothing;
  get diagnostics v_inserted=row_count;
  if v_inserted=0 then
    select * into v_existing from public.refund_events where id=left(p_event_id,240);
    if not found or v_existing.order_id<>before_row.id or v_existing.payload_hash<>left(p_payload_hash,128)
       or v_existing.amount<>round(p_amount,2) or v_existing.provider<>left(coalesce(p_provider,'unknown'),80) then
      raise exception 'refund_event_replay_mismatch';
    end if;
    return before_row;
  end if;

  v_total_refunded=round(before_row.amount_refunded+p_amount,2);
  update public.orders set
    amount_refunded=v_total_refunded,
    payment_status=case when v_total_refunded>=amount_paid-0.01 then 'refunded' else 'partially_refunded' end,
    last_refund_at=now(),updated_at=now()
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

-- Tighten catalogue math when retail price changes without an explicit
-- wholesale-price update.
create or replace function public.staff_update_catalog_variant(
  p_variant_id text,
  p_unit_price numeric default null,
  p_wholesale_price numeric default null,
  p_inventory_quantity integer default null,
  p_active boolean default null,
  p_ready_to_ship boolean default null
) returns public.product_catalog
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  before_row public.product_catalog;
  after_row public.product_catalog;
  v_data jsonb;
  v_effective_retail numeric(12,2);
  v_effective_wholesale numeric(12,2);
begin
  if not public.is_shababuna_staff() then raise exception 'staff_required'; end if;
  select * into before_row from public.product_catalog where variant_id=p_variant_id for update;
  if not found then raise exception 'catalog_variant_not_found'; end if;
  if p_unit_price is not null and p_unit_price<0 then raise exception 'invalid_unit_price'; end if;
  if p_inventory_quantity is not null and p_inventory_quantity<0 then raise exception 'invalid_inventory_quantity'; end if;
  v_effective_retail=coalesce(round(p_unit_price,2),before_row.unit_price);
  v_effective_wholesale=coalesce(round(p_wholesale_price,2),nullif(before_row.variant_data->>'wholesalePrice','')::numeric);
  if v_effective_wholesale is not null and (v_effective_wholesale<0 or v_effective_wholesale>=v_effective_retail) then raise exception 'invalid_wholesale_price'; end if;
  if coalesce(p_ready_to_ship,false) and not coalesce(p_active,before_row.active) then raise exception 'ready_variant_must_be_active'; end if;
  if coalesce(p_ready_to_ship,false) and coalesce(p_inventory_quantity,before_row.inventory_quantity,0)<=0 then raise exception 'ready_variant_requires_positive_inventory'; end if;
  v_data=before_row.variant_data;
  if p_wholesale_price is not null then v_data=jsonb_set(v_data,'{wholesalePrice}',to_jsonb(round(p_wholesale_price,2)),true); end if;
  if p_ready_to_ship is not null then v_data=jsonb_set(v_data,'{readyToShip}',to_jsonb(p_ready_to_ship),true); end if;
  update public.product_catalog set
    unit_price=v_effective_retail,
    inventory_quantity=case when p_inventory_quantity is null then inventory_quantity else p_inventory_quantity end,
    inventory_tracking=case when p_inventory_quantity is not null or coalesce(p_ready_to_ship,false) then true else inventory_tracking end,
    active=coalesce(p_active,active),
    product_status=case when coalesce(p_active,active) then 'active' else 'archived' end,
    availability_state=case
      when not coalesce(p_active,active) then 'unavailable'
      when coalesce(p_inventory_quantity,inventory_quantity) is null then availability_state
      when coalesce(p_inventory_quantity,inventory_quantity)=0 then 'out_of_stock'
      when coalesce(p_inventory_quantity,inventory_quantity)<=6 then 'low_stock'
      else 'in_stock'
    end,
    variant_data=v_data,updated_at=now()
  where variant_id=p_variant_id returning * into after_row;
  insert into public.operations_audit_log(actor_id,action,entity_type,entity_id,before_data,after_data)
  values(auth.uid(),'update_catalog_variant','catalog_variant',p_variant_id,to_jsonb(before_row),to_jsonb(after_row));
  return after_row;
end;
$$;
revoke all on function public.staff_update_catalog_variant(text,numeric,numeric,integer,boolean,boolean) from public;
grant execute on function public.staff_update_catalog_variant(text,numeric,numeric,integer,boolean,boolean) to authenticated,service_role;


-- Idempotent provider payments for custom/teams/wholesale quotes.
create table if not exists public.quote_verified_payment_events (
  id text primary key,
  quote_id text not null references public.quote_requests(id) on delete restrict,
  quote_number text not null,
  provider text not null,
  transaction_id text,
  amount numeric(12,2) not null check (amount>0),
  currency text not null default 'USD' check (currency='USD'),
  payload_hash text not null,
  created_at timestamptz not null default now()
);
alter table public.quote_verified_payment_events enable row level security;
revoke all on public.quote_verified_payment_events from anon,authenticated;
grant select,insert on public.quote_verified_payment_events to service_role;
drop policy if exists "staff read verified quote payments" on public.quote_verified_payment_events;
create policy "staff read verified quote payments" on public.quote_verified_payment_events
for select to authenticated using (public.is_shababuna_staff());
grant select on public.quote_verified_payment_events to authenticated;

create or replace function public.apply_verified_quote_payment_event(
  p_provider text,
  p_event_id text,
  p_quote_number text,
  p_event_status text,
  p_amount numeric,
  p_currency text,
  p_transaction_id text,
  p_payload_hash text
) returns public.quote_requests
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  before_row public.quote_requests;
  after_row public.quote_requests;
  v_existing public.quote_verified_payment_events;
  v_new_paid numeric(12,2);
  v_completed boolean;
  v_inserted integer:=0;
begin
  if auth.role()<>'service_role' then raise exception 'service_role_required'; end if;
  if lower(coalesce(p_event_status,'')) not in ('succeeded','paid','completed') then raise exception 'quote_payment_not_successful'; end if;
  if upper(coalesce(p_currency,''))<>'USD' then raise exception 'quote_currency_mismatch'; end if;
  if coalesce(length(btrim(p_event_id)),0)<4 or coalesce(length(btrim(p_payload_hash)),0)<16 then raise exception 'invalid_quote_payment_event'; end if;
  select * into before_row from public.quote_requests where quote_number=upper(btrim(p_quote_number)) for update;
  if not found then raise exception 'quote_not_found'; end if;
  if before_row.status not in ('deposit_required','final_payment_required') or before_row.amount_due_now<=0 then raise exception 'quote_not_payable'; end if;
  if p_amount is null or abs(round(p_amount,2)-round(before_row.amount_due_now,2))>0.01 then raise exception 'quote_payment_amount_mismatch'; end if;

  insert into public.quote_verified_payment_events(id,quote_id,quote_number,provider,transaction_id,amount,currency,payload_hash)
  values(left(p_event_id,240),before_row.id,before_row.quote_number,left(coalesce(p_provider,'unknown'),80),left(coalesce(p_transaction_id,''),240),round(p_amount,2),'USD',left(p_payload_hash,128))
  on conflict(id) do nothing;
  get diagnostics v_inserted=row_count;
  if v_inserted=0 then
    select * into v_existing from public.quote_verified_payment_events where id=left(p_event_id,240);
    if not found or v_existing.quote_id<>before_row.id or v_existing.payload_hash<>left(p_payload_hash,128)
       or v_existing.amount<>round(p_amount,2) or v_existing.provider<>left(coalesce(p_provider,'unknown'),80) then
      raise exception 'quote_payment_event_replay_mismatch';
    end if;
    return before_row;
  end if;

  v_new_paid=round(before_row.amount_paid+p_amount,2);
  v_completed=v_new_paid>=before_row.total-0.01;
  update public.quote_requests set
    amount_paid=v_new_paid,amount_due_now=0,
    payment_status=case when v_completed then 'paid' else 'partially_paid' end,
    status=case when v_completed then 'completed' else 'deposit_paid' end,
    payment_reference=left(coalesce(p_transaction_id,p_event_id),240),last_payment_at=now(),updated_at=now()
  where id=before_row.id returning * into after_row;
  insert into public.operations_audit_log(actor_id,action,entity_type,entity_id,before_data,after_data)
  values(null,'verified_quote_payment','quote',before_row.id,to_jsonb(before_row),to_jsonb(after_row));
  perform public.enqueue_commerce_notification(
    'verified-quote-payment:'||left(p_event_id,200),'quote_payment','quote',after_row.id,
    coalesce(after_row.request_data->>'customerEmail',after_row.request_data->>'email',''),
    'Shababuna quote payment — '||after_row.quote_number,
    jsonb_build_object('quoteNumber',after_row.quote_number,'status',after_row.status,'paymentStatus',after_row.payment_status,'amountPaid',after_row.amount_paid,'amountDueNow',after_row.amount_due_now,'remainingBalance',after_row.remaining_balance,'provider',p_provider,'reference',p_transaction_id)
  );
  return after_row;
end;
$$;
revoke all on function public.apply_verified_quote_payment_event(text,text,text,text,numeric,text,text,text) from public;
grant execute on function public.apply_verified_quote_payment_event(text,text,text,text,numeric,text,text,text) to service_role;

commit;

begin;

-- Final commerce hardening: authoritative balances, payment events, inventory
-- reservation/release, strict workflow transitions, quote arithmetic and a
-- reliable notification outbox.

-- Remove obsolete event-registration and post-payment inventory triggers from
-- the academy-era project. SHABABUNA is physical commerce only and reserves
-- inventory atomically before payment.
drop trigger if exists orders_confirm_event_registrations on public.orders;
drop function if exists public.confirm_paid_event_registrations();
drop trigger if exists orders_commit_inventory on public.orders;
drop function if exists public.commit_inventory_on_confirmed_payment();

alter table public.orders
  add column if not exists amount_paid numeric(12,2) not null default 0,
  add column if not exists deposit_required boolean not null default false,
  add column if not exists payment_stage text not null default 'initial',
  add column if not exists payment_provider text,
  add column if not exists payment_reference text,
  add column if not exists last_payment_at timestamptz,
  add column if not exists shipping_quote_expires_at timestamptz;

alter table public.orders drop constraint if exists orders_balance_check;
alter table public.orders drop constraint if exists orders_amount_paid_check;
alter table public.orders add constraint orders_amount_paid_check
  check (amount_paid >= 0 and amount_paid <= total) not valid;
alter table public.orders drop constraint if exists orders_payment_breakdown_check;
alter table public.orders add constraint orders_payment_breakdown_check
  check (
    amount_due_now >= 0
    and remaining_balance >= 0
    and amount_paid + amount_due_now + remaining_balance = total
  ) not valid;
alter table public.orders drop constraint if exists orders_payment_stage_check;
alter table public.orders add constraint orders_payment_stage_check
  check (payment_stage in ('quote_pending','initial','balance','complete')) not valid;

alter table public.orders drop constraint if exists orders_payment_status_check;
alter table public.orders add constraint orders_payment_status_check
  check (payment_status in ('pending','shipping_quote_pending','partially_paid','paid','failed','refunded','cancelled')) not valid;

alter table public.orders drop constraint if exists orders_order_status_check;
alter table public.orders add constraint orders_order_status_check
  check (order_status in (
    'received','pending_shipping_quote','awaiting_cash_confirmation','awaiting_payment',
    'confirmed','processing','design_in_progress','awaiting_design_approval','design_approved',
    'in_production','quality_control','arrived','final_payment_required','ready_to_ship',
    'shipped','out_for_delivery','completed','delivered','cancelled'
  )) not valid;

-- Normalize existing rows to the authoritative three-part payment equation.
update public.orders
set amount_paid = case when payment_status='paid' then total else greatest(0, total - amount_due_now - remaining_balance) end,
    payment_stage = case
      when payment_status='paid' then 'complete'
      when payment_plan='pending_shipping_quote' then 'quote_pending'
      when payment_plan='half' then 'initial'
      else 'initial'
    end
where amount_paid = 0;

create or replace function public.order_requires_deposit(p_items jsonb, p_delivery_profile text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select coalesce(p_delivery_profile='custom',false)
    or exists (
      select 1
      from jsonb_array_elements(coalesce(p_items,'[]'::jsonb)) item
      where lower(coalesce(item->>'purchase_mode',item->>'purchaseMode','retail')) in ('custom','wholesale')
    );
$$;

create or replace function public.set_order_payment_metadata()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.deposit_required := public.order_requires_deposit(new.items_snapshot,new.delivery_profile);
  if new.payment_plan='pending_shipping_quote' then
    new.payment_stage := 'quote_pending';
  elsif new.payment_status='paid' then
    new.payment_stage := 'complete';
  elsif new.payment_stage is null or new.payment_stage='quote_pending' then
    new.payment_stage := 'initial';
  end if;
  return new;
end;
$$;

drop trigger if exists set_order_payment_metadata_trigger on public.orders;
create trigger set_order_payment_metadata_trigger
before insert or update of items_snapshot,delivery_profile,payment_plan,payment_status
on public.orders for each row execute function public.set_order_payment_metadata();

update public.orders
set deposit_required=public.order_requires_deposit(items_snapshot,delivery_profile);

create table if not exists public.payment_events (
  id text primary key,
  provider text not null,
  event_type text not null,
  order_id uuid references public.orders(id) on delete set null,
  order_number text not null,
  transaction_id text,
  amount numeric(12,2),
  currency text,
  payload_hash text not null,
  processed boolean not null default false,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
alter table public.payment_events enable row level security;
revoke all on public.payment_events from anon, authenticated;
grant select,insert,update on public.payment_events to service_role;
create index if not exists payment_events_order_idx on public.payment_events(order_number,created_at desc);

create table if not exists public.commerce_notifications (
  id bigint generated always as identity primary key,
  event_key text not null unique,
  event_type text not null,
  entity_type text not null,
  entity_id text not null,
  recipient_email text,
  subject text not null,
  payload jsonb not null default '{}'::jsonb,
  delivery_status text not null default 'pending' check (delivery_status in ('pending','sending','sent','failed')),
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  available_at timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.commerce_notifications enable row level security;
revoke all on public.commerce_notifications from anon, authenticated;
grant select,insert,update on public.commerce_notifications to service_role;
create index if not exists commerce_notifications_pending_idx
  on public.commerce_notifications(delivery_status,available_at,created_at);

create or replace function public.enqueue_commerce_notification(
  p_event_key text,
  p_event_type text,
  p_entity_type text,
  p_entity_id text,
  p_recipient_email text,
  p_subject text,
  p_payload jsonb
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.commerce_notifications(event_key,event_type,entity_type,entity_id,recipient_email,subject,payload)
  values(left(p_event_key,240),left(p_event_type,80),left(p_entity_type,80),left(p_entity_id,160),lower(left(coalesce(p_recipient_email,''),320)),left(p_subject,240),coalesce(p_payload,'{}'::jsonb))
  on conflict(event_key) do nothing;
end;
$$;
revoke all on function public.enqueue_commerce_notification(text,text,text,text,text,text,jsonb) from public;
grant execute on function public.enqueue_commerce_notification(text,text,text,text,text,text,jsonb) to service_role;

create or replace function public.is_valid_order_status_transition(p_from text,p_to text)
returns boolean
language sql
immutable
as $$
  select p_from=p_to or case p_from
    when 'received' then p_to=any(array['awaiting_cash_confirmation','awaiting_payment','confirmed','cancelled'])
    when 'pending_shipping_quote' then p_to=any(array['awaiting_payment','cancelled'])
    when 'awaiting_cash_confirmation' then p_to=any(array['confirmed','cancelled'])
    when 'awaiting_payment' then p_to=any(array['confirmed','cancelled'])
    when 'confirmed' then p_to=any(array['processing','design_in_progress','in_production','ready_to_ship','cancelled'])
    when 'processing' then p_to=any(array['design_in_progress','in_production','quality_control','ready_to_ship','cancelled'])
    when 'design_in_progress' then p_to=any(array['awaiting_design_approval','cancelled'])
    when 'awaiting_design_approval' then p_to=any(array['design_approved','design_in_progress','cancelled'])
    when 'design_approved' then p_to=any(array['in_production','cancelled'])
    when 'in_production' then p_to=any(array['quality_control','arrived','cancelled'])
    when 'quality_control' then p_to=any(array['arrived','final_payment_required','ready_to_ship','cancelled'])
    when 'arrived' then p_to=any(array['final_payment_required','ready_to_ship','cancelled'])
    when 'final_payment_required' then p_to=any(array['ready_to_ship','cancelled'])
    when 'ready_to_ship' then p_to=any(array['shipped','out_for_delivery','delivered','cancelled'])
    when 'shipped' then p_to=any(array['out_for_delivery','delivered'])
    when 'out_for_delivery' then p_to='delivered'
    when 'completed' then p_to='delivered'
    else false
  end;
$$;

create or replace function public.is_valid_payment_status_transition(p_from text,p_to text)
returns boolean
language sql
immutable
as $$
  select p_from=p_to or case p_from
    when 'shipping_quote_pending' then p_to=any(array['pending','cancelled'])
    when 'pending' then p_to=any(array['partially_paid','paid','failed','cancelled'])
    when 'failed' then p_to=any(array['pending','partially_paid','paid','cancelled'])
    when 'partially_paid' then p_to=any(array['paid','refunded','cancelled'])
    when 'paid' then p_to='refunded'
    else false
  end;
$$;

create or replace function public.is_valid_fulfillment_transition(p_from text,p_to text)
returns boolean
language sql
immutable
as $$
  select p_from=p_to or case p_from
    when 'quote_pending' then p_to=any(array['unfulfilled','cancelled'])
    when 'unfulfilled' then p_to=any(array['processing','in_production','fulfilled','cancelled'])
    when 'processing' then p_to=any(array['in_production','fulfilled','cancelled'])
    when 'in_production' then p_to=any(array['fulfilled','cancelled'])
    else false
  end;
$$;

create or replace function public.release_reserved_inventory_on_cancel()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.order_status is distinct from 'cancelled'
     and new.order_status='cancelled'
     and coalesce((new.shipping_summary->>'inventory_reserved')::boolean,false)
     and not coalesce((new.shipping_summary->>'inventory_released')::boolean,false) then
    update public.product_catalog pc
    set inventory_quantity=pc.inventory_quantity+requested.quantity,
        availability_state=case
          when pc.inventory_quantity+requested.quantity <= 0 then 'out_of_stock'
          when pc.inventory_quantity+requested.quantity <= 6 then 'low_stock'
          else 'in_stock'
        end,
        updated_at=now()
    from (
      select oi.variant_id,sum(oi.quantity)::integer quantity
      from public.order_items oi
      where oi.order_id=new.id
      group by oi.variant_id
    ) requested
    where pc.variant_id=requested.variant_id and pc.inventory_tracking=true;
    new.shipping_summary=coalesce(new.shipping_summary,'{}'::jsonb) || jsonb_build_object('inventory_released',true,'inventoryReleasedAt',now());
  end if;
  return new;
end;
$$;

drop trigger if exists release_reserved_inventory_on_cancel_trigger on public.orders;
create trigger release_reserved_inventory_on_cancel_trigger
before update of order_status on public.orders
for each row execute function public.release_reserved_inventory_on_cancel();

create or replace function public.staff_set_shipping_quote(p_order_id uuid,p_shipping_total numeric,p_note text default '')
returns public.orders
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  before_row public.orders;
  after_row public.orders;
  v_total numeric(12,2);
  v_plan text;
  v_due numeric(12,2);
  v_updated_count integer:=0;
  v_tracked_count integer:=0;
begin
  if not public.is_shababuna_staff() then raise exception 'staff_required'; end if;
  if p_shipping_total is null or p_shipping_total<0 then raise exception 'invalid_shipping_total'; end if;
  select * into before_row from public.orders where id=p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  if not before_row.shipping_quote_required and before_row.order_status<>'pending_shipping_quote' then raise exception 'shipping_quote_not_required'; end if;

  if not coalesce((before_row.shipping_summary->>'inventory_reserved')::boolean,false) then
    update public.product_catalog pc
    set inventory_quantity=pc.inventory_quantity-requested.quantity,
        availability_state=case
          when pc.inventory_quantity-requested.quantity=0 then 'out_of_stock'
          when pc.inventory_quantity-requested.quantity<=6 then 'low_stock'
          else 'in_stock'
        end,
        updated_at=now()
    from (
      select oi.variant_id,sum(oi.quantity)::integer quantity
      from public.order_items oi
      join public.product_catalog p on p.variant_id=oi.variant_id and p.inventory_tracking=true
      where oi.order_id=p_order_id
      group by oi.variant_id
    ) requested
    where pc.variant_id=requested.variant_id
      and pc.inventory_tracking=true
      and pc.inventory_quantity>=requested.quantity;
    get diagnostics v_updated_count=row_count;
    select count(distinct oi.variant_id) into v_tracked_count
    from public.order_items oi
    join public.product_catalog p on p.variant_id=oi.variant_id and p.inventory_tracking=true
    where oi.order_id=p_order_id;
    if v_updated_count<>v_tracked_count then raise exception 'insufficient_inventory'; end if;
  end if;

  v_total=round(before_row.subtotal+p_shipping_total+before_row.tax_total-before_row.discount_total,2);
  v_plan=case when before_row.deposit_required then 'half' else 'full' end;
  v_due=case when v_plan='half' then round(v_total/2,2) else v_total end;

  update public.orders
  set shipping_total=round(p_shipping_total,2),
      total=v_total,
      amount_paid=0,
      amount_due_now=v_due,
      remaining_balance=v_total-v_due,
      shipping_quote_required=false,
      payment_plan=v_plan,
      payment_stage='initial',
      order_status='awaiting_payment',
      payment_status='pending',
      fulfillment_status='unfulfilled',
      shipping_quote_expires_at=now()+interval '7 days',
      shipping_summary=coalesce(shipping_summary,'{}'::jsonb) || jsonb_build_object(
        'amount',round(p_shipping_total,2),'currency','USD','pendingQuote',false,
        'inventory_reserved',true,'inventory_released',false,
        'staffNote',left(coalesce(p_note,''),500),'quotedAt',now(),'quoteExpiresAt',now()+interval '7 days'
      ),
      updated_at=now()
  where id=p_order_id returning * into after_row;

  insert into public.operations_audit_log(actor_id,action,entity_type,entity_id,before_data,after_data)
  values(auth.uid(),'set_shipping_quote','order',p_order_id::text,to_jsonb(before_row),to_jsonb(after_row));
  perform public.enqueue_commerce_notification(
    'shipping-quote:'||after_row.id::text||':'||extract(epoch from after_row.updated_at)::bigint,
    'shipping_quote_ready','order',after_row.id::text,after_row.customer_email,
    'Shababuna shipping quote ready — '||after_row.order_number,
    jsonb_build_object('orderNumber',after_row.order_number,'shippingTotal',after_row.shipping_total,'total',after_row.total,'amountDueNow',after_row.amount_due_now,'paymentPlan',after_row.payment_plan,'note',left(coalesce(p_note,''),500))
  );
  return after_row;
end;
$$;

create or replace function public.apply_verified_payment_event(
  p_provider text,
  p_event_id text,
  p_order_number text,
  p_event_status text,
  p_amount numeric,
  p_currency text,
  p_transaction_id text,
  p_payload_hash text
) returns public.orders
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  before_row public.orders;
  after_row public.orders;
  v_inserted integer:=0;
  v_success boolean;
  v_new_paid numeric(12,2);
  v_new_remaining numeric(12,2);
  v_existing_event public.payment_events;
begin
  if auth.role()<>'service_role' and not public.is_shababuna_staff() then raise exception 'service_or_staff_required'; end if;
  if coalesce(length(btrim(p_event_id)),0)<4 or coalesce(length(btrim(p_payload_hash)),0)<16 then raise exception 'invalid_payment_event'; end if;
  select * into before_row from public.orders where order_number=upper(btrim(p_order_number)) for update;
  if not found then raise exception 'order_not_found'; end if;

  insert into public.payment_events(id,provider,event_type,order_id,order_number,transaction_id,amount,currency,payload_hash)
  values(left(p_event_id,240),left(coalesce(p_provider,'unknown'),80),left(coalesce(p_event_status,'unknown'),80),before_row.id,before_row.order_number,left(coalesce(p_transaction_id,''),240),p_amount,upper(coalesce(p_currency,'')),left(p_payload_hash,128))
  on conflict(id) do nothing;
  get diagnostics v_inserted=row_count;
  if v_inserted=0 then
    select * into v_existing_event from public.payment_events where id=left(p_event_id,240);
    if not found
       or v_existing_event.order_number<>before_row.order_number
       or v_existing_event.provider<>left(coalesce(p_provider,'unknown'),80)
       or v_existing_event.payload_hash<>left(p_payload_hash,128) then
      raise exception 'payment_event_replay_mismatch';
    end if;
    return before_row;
  end if;

  v_success=lower(coalesce(p_event_status,'')) in ('paid','succeeded','success','completed');
  if v_success then
    if upper(coalesce(p_currency,''))<>'USD' then raise exception 'payment_currency_mismatch'; end if;
    if p_amount is null or abs(round(p_amount,2)-round(before_row.amount_due_now,2))>0.01 then raise exception 'payment_amount_mismatch'; end if;
    if before_row.amount_due_now<=0 then raise exception 'no_amount_due'; end if;
    if before_row.payment_status not in ('pending','failed','partially_paid') then raise exception 'order_not_payable'; end if;

    v_new_paid=round(before_row.amount_paid+p_amount,2);
    v_new_remaining=round(before_row.total-v_new_paid,2);
    update public.orders
    set amount_paid=v_new_paid,
        amount_due_now=0,
        remaining_balance=v_new_remaining,
        payment_status=case when v_new_remaining<=0.01 then 'paid' else 'partially_paid' end,
        payment_stage=case when v_new_remaining<=0.01 then 'complete' else 'balance' end,
        payment_provider=left(coalesce(p_provider,''),120),
        payment_reference=left(coalesce(p_transaction_id,p_event_id),240),
        last_payment_at=now(),
        order_status=case
          when v_new_remaining<=0.01 and before_row.order_status='final_payment_required' then 'ready_to_ship'
          when before_row.order_status in ('awaiting_payment','awaiting_cash_confirmation','received') then 'confirmed'
          else before_row.order_status
        end,
        fulfillment_status=case when before_row.fulfillment_status='quote_pending' then 'unfulfilled' else before_row.fulfillment_status end,
        updated_at=now()
    where id=before_row.id returning * into after_row;
  else
    if before_row.payment_status not in ('pending','failed','partially_paid') then raise exception 'order_not_payable'; end if;
    update public.orders
    set payment_status=case
          when before_row.payment_status='partially_paid' then 'partially_paid'
          when lower(coalesce(p_event_status,'')) in ('cancelled','canceled') then 'cancelled'
          else 'failed'
        end,
        payment_provider=left(coalesce(p_provider,''),120),
        payment_reference=left(coalesce(p_transaction_id,p_event_id),240),
        updated_at=now()
    where id=before_row.id returning * into after_row;
  end if;

  update public.payment_events set processed=true,processed_at=now(),result=jsonb_build_object('paymentStatus',after_row.payment_status,'orderStatus',after_row.order_status,'amountPaid',after_row.amount_paid,'remainingBalance',after_row.remaining_balance) where id=p_event_id;
  insert into public.operations_audit_log(actor_id,action,entity_type,entity_id,before_data,after_data)
  values(auth.uid(),'verified_payment_event','order',before_row.id::text,to_jsonb(before_row),to_jsonb(after_row));
  perform public.enqueue_commerce_notification(
    'payment:'||left(p_event_id,200),'payment_update','order',after_row.id::text,after_row.customer_email,
    'Shababuna payment update — '||after_row.order_number,
    jsonb_build_object('orderNumber',after_row.order_number,'paymentStatus',after_row.payment_status,'amountPaid',after_row.amount_paid,'amountDueNow',after_row.amount_due_now,'remainingBalance',after_row.remaining_balance,'provider',p_provider,'reference',p_transaction_id)
  );
  return after_row;
end;
$$;
revoke all on function public.apply_verified_payment_event(text,text,text,text,numeric,text,text,text) from public;
grant execute on function public.apply_verified_payment_event(text,text,text,text,numeric,text,text,text) to service_role;

create or replace function public.staff_record_payment(p_order_id uuid,p_amount numeric,p_method text,p_reference text default '',p_note text default '')
returns public.orders
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_order public.orders; v_event_id text;
begin
  if not public.is_shababuna_staff() then raise exception 'staff_required'; end if;
  select * into v_order from public.orders where id=p_order_id;
  if not found then raise exception 'order_not_found'; end if;
  if p_amount is null or p_amount<=0 then raise exception 'invalid_payment_amount'; end if;
  v_event_id='manual-'||p_order_id::text||'-'||gen_random_uuid()::text;
  v_order:=public.apply_verified_payment_event('manual-'||left(coalesce(p_method,'cash'),60),v_event_id,v_order.order_number,'paid',p_amount,'USD',left(coalesce(p_reference,''),240),encode(digest(v_event_id||coalesce(p_note,''),'sha256'),'hex'));
  return v_order;
end;
$$;
revoke all on function public.staff_record_payment(uuid,numeric,text,text,text) from public;
grant execute on function public.staff_record_payment(uuid,numeric,text,text,text) to authenticated,service_role;

create or replace function public.staff_update_order_workflow(p_order_id uuid,p_order_status text default null,p_payment_status text default null,p_fulfillment_status text default null)
returns public.orders
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare before_row public.orders; after_row public.orders; v_order_status text; v_payment_status text; v_fulfillment_status text;
begin
  if not public.is_shababuna_staff() then raise exception 'staff_required'; end if;
  select * into before_row from public.orders where id=p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  v_order_status=coalesce(p_order_status,before_row.order_status);
  v_payment_status=coalesce(p_payment_status,before_row.payment_status);
  v_fulfillment_status=coalesce(p_fulfillment_status,before_row.fulfillment_status);
  if not public.is_valid_order_status_transition(before_row.order_status,v_order_status) then raise exception 'invalid_order_status_transition'; end if;
  if not public.is_valid_payment_status_transition(before_row.payment_status,v_payment_status) then raise exception 'invalid_payment_status_transition'; end if;
  if not public.is_valid_fulfillment_transition(before_row.fulfillment_status,v_fulfillment_status) then raise exception 'invalid_fulfillment_transition'; end if;
  if p_payment_status in ('paid','partially_paid','refunded') and p_payment_status is distinct from before_row.payment_status then raise exception 'record_payment_or_refund_through_financial_function'; end if;
  if v_order_status in ('confirmed','processing','design_in_progress','awaiting_design_approval','design_approved','in_production','quality_control','arrived','final_payment_required','ready_to_ship','shipped','out_for_delivery','delivered')
     and before_row.payment_status not in ('partially_paid','paid') then raise exception 'payment_required_before_order_progress'; end if;
  if v_order_status='delivered' and v_payment_status<>'paid' then raise exception 'payment_required_before_delivery'; end if;
  if before_row.deposit_required and v_order_status in ('in_production','quality_control','arrived') and before_row.payment_status not in ('partially_paid','paid') then raise exception 'deposit_required_before_production'; end if;
  if v_order_status='final_payment_required' and before_row.remaining_balance<=0 then raise exception 'no_final_balance_due'; end if;
  if v_fulfillment_status='fulfilled' and v_order_status not in ('ready_to_ship','shipped','out_for_delivery','delivered') then raise exception 'invalid_fulfillment_for_order_status'; end if;

  if v_order_status='final_payment_required' and before_row.remaining_balance>0 then
    update public.orders set
      order_status=v_order_status,
      payment_status=case when amount_paid>0 then 'partially_paid' else 'pending' end,
      payment_stage='balance',
      amount_due_now=remaining_balance,
      remaining_balance=0,
      fulfillment_status=v_fulfillment_status,
      updated_at=now()
    where id=p_order_id returning * into after_row;
  else
    update public.orders set order_status=v_order_status,payment_status=v_payment_status,fulfillment_status=v_fulfillment_status,updated_at=now()
    where id=p_order_id returning * into after_row;
  end if;
  insert into public.operations_audit_log(actor_id,action,entity_type,entity_id,before_data,after_data)
  values(auth.uid(),'update_workflow','order',p_order_id::text,to_jsonb(before_row),to_jsonb(after_row));
  perform public.enqueue_commerce_notification(
    'order-workflow:'||after_row.id::text||':'||extract(epoch from after_row.updated_at)::bigint,
    'order_status_update','order',after_row.id::text,after_row.customer_email,
    'Shababuna order update — '||after_row.order_number,
    jsonb_build_object('orderNumber',after_row.order_number,'orderStatus',after_row.order_status,'paymentStatus',after_row.payment_status,'fulfillmentStatus',after_row.fulfillment_status,'amountDueNow',after_row.amount_due_now,'remainingBalance',after_row.remaining_balance)
  );
  return after_row;
end;
$$;

alter table public.quote_requests
  add column if not exists deposit_amount numeric(12,2),
  add column if not exists amount_paid numeric(12,2) not null default 0,
  add column if not exists amount_due_now numeric(12,2) not null default 0,
  add column if not exists remaining_balance numeric(12,2),
  add column if not exists payment_status text not null default 'pending',
  add column if not exists payment_reference text,
  add column if not exists last_payment_at timestamptz,
  add column if not exists expires_at timestamptz;
alter table public.quote_requests drop constraint if exists quote_requests_total_math_check;
alter table public.quote_requests add constraint quote_requests_total_math_check
  check (
    (subtotal is null and shipping_total is null and total is null)
    or (subtotal is not null and shipping_total is not null and total=round(subtotal+shipping_total,2))
  ) not valid;
alter table public.quote_requests drop constraint if exists quote_requests_deposit_math_check;
alter table public.quote_requests add constraint quote_requests_deposit_math_check
  check (
    total is null
    or (
      deposit_amount is not null and amount_paid>=0 and amount_due_now>=0 and remaining_balance>=0
      and amount_paid+amount_due_now+remaining_balance=total
    )
  ) not valid;
alter table public.quote_requests drop constraint if exists quote_requests_payment_status_check;
alter table public.quote_requests add constraint quote_requests_payment_status_check
  check (payment_status in ('pending','partially_paid','paid','refunded','cancelled')) not valid;

create or replace function public.is_valid_quote_status_transition(p_from text,p_to text)
returns boolean
language sql
immutable
as $$
  select p_from=p_to or case p_from
    when 'under_review' then p_to=any(array['quote_sent','cancelled'])
    when 'quote_sent' then p_to=any(array['awaiting_approval','deposit_required','under_review','cancelled'])
    when 'awaiting_approval' then p_to=any(array['deposit_required','under_review','cancelled'])
    when 'deposit_required' then p_to=any(array['deposit_paid','cancelled'])
    when 'deposit_paid' then p_to=any(array['design_in_progress','in_production','cancelled'])
    when 'design_in_progress' then p_to=any(array['awaiting_design_approval','cancelled'])
    when 'awaiting_design_approval' then p_to=any(array['design_approved','design_in_progress','cancelled'])
    when 'design_approved' then p_to=any(array['in_production','cancelled'])
    when 'in_production' then p_to=any(array['quality_control','arrived','cancelled'])
    when 'quality_control' then p_to=any(array['arrived','final_payment_required','cancelled'])
    when 'arrived' then p_to=any(array['final_payment_required','completed','cancelled'])
    when 'final_payment_required' then p_to=any(array['completed','cancelled'])
    else false
  end;
$$;

create or replace function public.staff_update_quote(p_quote_id text,p_status text,p_subtotal numeric default null,p_shipping_total numeric default null,p_total numeric default null)
returns public.quote_requests
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare before_row public.quote_requests; after_row public.quote_requests; v_subtotal numeric(12,2); v_shipping numeric(12,2); v_total numeric(12,2); v_status text;
begin
  if not public.is_shababuna_staff() then raise exception 'staff_required'; end if;
  select * into before_row from public.quote_requests where id=p_quote_id for update;
  if not found then raise exception 'quote_not_found'; end if;
  v_status=coalesce(p_status,before_row.status);
  if not public.is_valid_quote_status_transition(before_row.status,v_status) then raise exception 'invalid_quote_status_transition'; end if;
  if v_status in ('deposit_paid','completed') and v_status is distinct from before_row.status then raise exception 'record_quote_payment_through_financial_function'; end if;
  v_subtotal=coalesce(p_subtotal,before_row.subtotal);
  v_shipping=coalesce(p_shipping_total,before_row.shipping_total);
  if (v_subtotal is null)<>(v_shipping is null) then raise exception 'quote_prices_incomplete'; end if;
  if v_subtotal is not null and (v_subtotal<0 or v_shipping<0) then raise exception 'invalid_quote_price'; end if;
  v_total=case when v_subtotal is null then null else round(v_subtotal+v_shipping,2) end;
  if before_row.amount_paid>0 and v_total is distinct from before_row.total then raise exception 'quote_price_locked_after_payment'; end if;
  if p_total is not null and v_total is distinct from round(p_total,2) then raise exception 'quote_total_mismatch'; end if;
  if v_status in ('quote_sent','awaiting_approval','deposit_required') and v_total is null then raise exception 'quote_price_required'; end if;
  update public.quote_requests set
    status=v_status,subtotal=v_subtotal,shipping_total=v_shipping,total=v_total,
    deposit_amount=case when v_total is null then null else round(v_total*deposit_percent/100.0,2) end,
    amount_paid=case when v_total is distinct from before_row.total then 0 else amount_paid end,
    amount_due_now=case
      when v_total is null then 0
      when v_status='final_payment_required' and before_row.status is distinct from 'final_payment_required' then coalesce(before_row.remaining_balance,0)
      when v_total is distinct from before_row.total then round(v_total*deposit_percent/100.0,2)
      else amount_due_now
    end,
    remaining_balance=case
      when v_total is null then null
      when v_status='final_payment_required' and before_row.status is distinct from 'final_payment_required' then 0
      when v_total is distinct from before_row.total then v_total-round(v_total*deposit_percent/100.0,2)
      else remaining_balance
    end,
    payment_status=case
      when v_status='final_payment_required' and before_row.amount_paid>0 then 'partially_paid'
      when v_total is distinct from before_row.total then 'pending'
      else payment_status
    end,
    expires_at=case when v_status in ('quote_sent','awaiting_approval') then now()+interval '7 days' else expires_at end,
    updated_at=now()
  where id=p_quote_id returning * into after_row;
  insert into public.operations_audit_log(actor_id,action,entity_type,entity_id,before_data,after_data)
  values(auth.uid(),'update_quote','quote',p_quote_id,to_jsonb(before_row),to_jsonb(after_row));
  perform public.enqueue_commerce_notification(
    'quote:'||after_row.id||':'||extract(epoch from after_row.updated_at)::bigint,
    'quote_update','quote',after_row.id,
    coalesce(after_row.request_data->>'customerEmail',after_row.request_data->>'email',''),
    'Shababuna quote update — '||after_row.quote_number,
    jsonb_build_object('quoteNumber',after_row.quote_number,'status',after_row.status,'subtotal',after_row.subtotal,'shippingTotal',after_row.shipping_total,'total',after_row.total,'depositAmount',after_row.deposit_amount,'remainingBalance',after_row.remaining_balance,'expiresAt',after_row.expires_at)
  );
  return after_row;
end;
$$;


create table if not exists public.quote_payment_events (
  id uuid primary key default gen_random_uuid(),
  quote_id text not null references public.quote_requests(id) on delete cascade,
  amount numeric(12,2) not null check (amount>0),
  currency text not null default 'USD' check (currency='USD'),
  method text not null,
  reference text not null,
  note text,
  recorded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.quote_payment_events enable row level security;
revoke all on public.quote_payment_events from anon,authenticated;
grant select,insert on public.quote_payment_events to service_role;
drop policy if exists "staff can read quote payments" on public.quote_payment_events;
create policy "staff can read quote payments" on public.quote_payment_events
for select to authenticated using (public.is_shababuna_staff());
grant select on public.quote_payment_events to authenticated;
create unique index if not exists quote_payment_reference_uidx
on public.quote_payment_events(quote_id,reference);

create or replace function public.staff_record_quote_payment(
  p_quote_id text,
  p_amount numeric,
  p_method text,
  p_reference text default '',
  p_note text default ''
) returns public.quote_requests
language plpgsql
security definer
set search_path = public,pg_temp
as $$
declare
  before_row public.quote_requests;
  after_row public.quote_requests;
  v_reference text;
  v_new_paid numeric(12,2);
  v_completed boolean;
begin
  if not public.is_shababuna_staff() then raise exception 'staff_required'; end if;
  select * into before_row from public.quote_requests where id=p_quote_id for update;
  if not found then raise exception 'quote_not_found'; end if;
  if before_row.status not in ('deposit_required','final_payment_required') then raise exception 'quote_not_payable'; end if;
  if before_row.amount_due_now<=0 then raise exception 'no_amount_due'; end if;
  if p_amount is null or abs(round(p_amount,2)-round(before_row.amount_due_now,2))>0.01 then raise exception 'quote_payment_amount_mismatch'; end if;
  v_reference=left(coalesce(nullif(btrim(p_reference),''),'manual-'||gen_random_uuid()::text),240);
  if exists(select 1 from public.quote_payment_events where quote_id=p_quote_id and reference=v_reference) then raise exception 'duplicate_quote_payment_reference'; end if;
  v_new_paid=round(before_row.amount_paid+p_amount,2);
  v_completed=v_new_paid>=before_row.total-0.01;
  update public.quote_requests set
    amount_paid=v_new_paid,
    amount_due_now=0,
    payment_status=case when v_completed then 'paid' else 'partially_paid' end,
    status=case when v_completed then 'completed' else 'deposit_paid' end,
    payment_reference=v_reference,
    last_payment_at=now(),
    updated_at=now()
  where id=p_quote_id returning * into after_row;
  insert into public.quote_payment_events(quote_id,amount,method,reference,note,recorded_by)
  values(p_quote_id,round(p_amount,2),left(coalesce(p_method,'manual'),80),v_reference,left(coalesce(p_note,''),1000),auth.uid());
  insert into public.operations_audit_log(actor_id,action,entity_type,entity_id,before_data,after_data)
  values(auth.uid(),'record_quote_payment','quote',p_quote_id,to_jsonb(before_row),to_jsonb(after_row));
  perform public.enqueue_commerce_notification(
    'quote-payment:'||after_row.id||':'||v_reference,
    'quote_payment','quote',after_row.id,
    coalesce(after_row.request_data->>'customerEmail',after_row.request_data->>'email',''),
    'Shababuna quote payment — '||after_row.quote_number,
    jsonb_build_object('quoteNumber',after_row.quote_number,'paymentStatus',after_row.payment_status,'status',after_row.status,'amountPaid',after_row.amount_paid,'amountDueNow',after_row.amount_due_now,'remainingBalance',after_row.remaining_balance,'method',p_method,'reference',v_reference)
  );
  return after_row;
end;
$$;
revoke all on function public.staff_record_quote_payment(text,numeric,text,text,text) from public;
grant execute on function public.staff_record_quote_payment(text,numeric,text,text,text) to authenticated,service_role;

create or replace function public.customer_respond_to_quote(p_quote_id text,p_decision text,p_note text default '')
returns public.quote_requests
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare before_row public.quote_requests; after_row public.quote_requests; v_status text;
begin
  select * into before_row from public.quote_requests where id=p_quote_id for update;
  if not found then raise exception 'quote_not_found'; end if;
  if not (before_row.user_id=auth.uid() or (before_row.organization_id is not null and public.is_organization_member(before_row.organization_id))) then raise exception 'not_authorized'; end if;
  if before_row.status not in ('quote_sent','awaiting_approval') then raise exception 'quote_not_awaiting_response'; end if;
  if before_row.expires_at is not null and before_row.expires_at<now() then raise exception 'quote_expired'; end if;
  if before_row.total is null then raise exception 'quote_price_required'; end if;
  if p_decision='accepted' then v_status='deposit_required';
  elsif p_decision='changes_requested' then v_status='under_review';
  elsif p_decision='cancelled' then v_status='cancelled';
  else raise exception 'invalid_decision'; end if;
  update public.quote_requests set
    status=v_status,
    amount_due_now=case when v_status='deposit_required' then coalesce(deposit_amount,0) else amount_due_now end,
    remaining_balance=case when v_status='deposit_required' then total-coalesce(amount_paid,0)-coalesce(deposit_amount,0) else remaining_balance end,
    response_note=left(coalesce(p_note,''),1000),responded_at=now(),updated_at=now()
  where id=p_quote_id returning * into after_row;
  insert into public.operations_audit_log(actor_id,action,entity_type,entity_id,before_data,after_data)
  values(auth.uid(),'customer_quote_response','quote',p_quote_id,to_jsonb(before_row),to_jsonb(after_row));
  perform public.enqueue_commerce_notification(
    'quote-response:'||after_row.id||':'||extract(epoch from after_row.updated_at)::bigint,
    'quote_customer_response','quote',after_row.id,
    coalesce(after_row.request_data->>'customerEmail',after_row.request_data->>'email',''),
    'Shababuna quote response — '||after_row.quote_number,
    jsonb_build_object('quoteNumber',after_row.quote_number,'status',after_row.status,'note',after_row.response_note)
  );
  return after_row;
end;
$$;

-- Product/inventory administration without exposing service-role credentials in the browser.
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
set search_path = public, pg_temp
as $$
declare before_row public.product_catalog; after_row public.product_catalog; v_data jsonb;
begin
  if not public.is_shababuna_staff() then raise exception 'staff_required'; end if;
  select * into before_row from public.product_catalog where variant_id=p_variant_id for update;
  if not found then raise exception 'catalog_variant_not_found'; end if;
  if p_unit_price is not null and p_unit_price<0 then raise exception 'invalid_unit_price'; end if;
  if p_wholesale_price is not null and (p_wholesale_price<0 or p_wholesale_price>=coalesce(p_unit_price,before_row.unit_price)) then raise exception 'invalid_wholesale_price'; end if;
  if p_inventory_quantity is not null and p_inventory_quantity<0 then raise exception 'invalid_inventory_quantity'; end if;
  if coalesce(p_ready_to_ship,false) and not coalesce(p_active,before_row.active) then raise exception 'ready_variant_must_be_active'; end if;
  if coalesce(p_ready_to_ship,false) and coalesce(p_inventory_quantity,before_row.inventory_quantity,0)<=0 then raise exception 'ready_variant_requires_positive_inventory'; end if;
  v_data=before_row.variant_data;
  if p_wholesale_price is not null then v_data=jsonb_set(v_data,'{wholesalePrice}',to_jsonb(round(p_wholesale_price,2)),true); end if;
  if p_ready_to_ship is not null then v_data=jsonb_set(v_data,'{readyToShip}',to_jsonb(p_ready_to_ship),true); end if;
  update public.product_catalog set
    unit_price=coalesce(round(p_unit_price,2),unit_price),
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
    variant_data=v_data,
    updated_at=now()
  where variant_id=p_variant_id returning * into after_row;
  insert into public.operations_audit_log(actor_id,action,entity_type,entity_id,before_data,after_data)
  values(auth.uid(),'update_catalog_variant','catalog_variant',p_variant_id,to_jsonb(before_row),to_jsonb(after_row));
  return after_row;
end;
$$;
revoke all on function public.staff_update_catalog_variant(text,numeric,numeric,integer,boolean,boolean) from public;
grant execute on function public.staff_update_catalog_variant(text,numeric,numeric,integer,boolean,boolean) to authenticated,service_role;



-- Product-level catalogue content. All variants of a product receive the same
-- public metadata, while per-variant price and inventory stay independent.
create or replace function public.staff_update_catalog_product(
  p_product_id text,
  p_name_en text default null,
  p_name_ar text default null,
  p_description_en text default null,
  p_description_ar text default null,
  p_brand text default null,
  p_category text default null,
  p_subcategory text default null,
  p_product_type text default null,
  p_image_url text default null,
  p_featured boolean default null,
  p_new_arrival boolean default null,
  p_best_seller boolean default null,
  p_coming_soon boolean default null,
  p_quote_only boolean default null
) returns public.product_catalog
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_before jsonb;
  v_after jsonb;
  v_patch jsonb:='{}'::jsonb;
  v_row public.product_catalog;
begin
  if not public.is_shababuna_staff() then raise exception 'staff_required'; end if;
  if coalesce(length(btrim(p_product_id)),0)<1 then raise exception 'product_id_required'; end if;
  if p_name_en is not null and length(btrim(p_name_en))<2 then raise exception 'invalid_product_name'; end if;
  if p_name_ar is not null and length(btrim(p_name_ar))<2 then raise exception 'invalid_product_name'; end if;
  if p_brand is not null and length(btrim(p_brand))<1 then raise exception 'invalid_product_brand'; end if;
  if p_category is not null and length(btrim(p_category))<1 then raise exception 'invalid_product_category'; end if;
  if p_image_url is not null and btrim(p_image_url)<>'' and not (p_image_url like '/%' or p_image_url ~ '^https://') then
    raise exception 'invalid_product_image_url';
  end if;
  perform 1 from public.product_catalog pc where pc.product_id=p_product_id for update;
  if not found then raise exception 'catalog_product_not_found'; end if;
  select jsonb_agg(to_jsonb(pc) order by pc.variant_id) into v_before
  from public.product_catalog pc where pc.product_id=p_product_id;

  if p_name_en is not null then v_patch=v_patch||jsonb_build_object('nameEn',left(btrim(p_name_en),180)); end if;
  if p_name_ar is not null then v_patch=v_patch||jsonb_build_object('nameAr',left(btrim(p_name_ar),180)); end if;
  if p_description_en is not null then v_patch=v_patch||jsonb_build_object('descriptionEn',left(btrim(p_description_en),4000)); end if;
  if p_description_ar is not null then v_patch=v_patch||jsonb_build_object('descriptionAr',left(btrim(p_description_ar),4000)); end if;
  if p_brand is not null then v_patch=v_patch||jsonb_build_object('brand',left(btrim(p_brand),120)); end if;
  if p_category is not null then v_patch=v_patch||jsonb_build_object('category',left(btrim(p_category),120)); end if;
  if p_subcategory is not null then v_patch=v_patch||jsonb_build_object('subcategory',left(btrim(p_subcategory),120)); end if;
  if p_product_type is not null then v_patch=v_patch||jsonb_build_object('productType',left(btrim(p_product_type),160)); end if;
  if p_image_url is not null then v_patch=v_patch||jsonb_build_object('imageUrl',left(btrim(p_image_url),1000)); end if;
  if p_featured is not null then v_patch=v_patch||jsonb_build_object('featured',p_featured); end if;
  if p_new_arrival is not null then v_patch=v_patch||jsonb_build_object('newArrival',p_new_arrival); end if;
  if p_best_seller is not null then v_patch=v_patch||jsonb_build_object('bestSeller',p_best_seller); end if;
  if p_coming_soon is not null then v_patch=v_patch||jsonb_build_object('comingSoon',p_coming_soon); end if;
  if p_quote_only is not null then v_patch=v_patch||jsonb_build_object('quoteOnly',p_quote_only); end if;

  update public.product_catalog
  set product_name=case when p_name_en is null then product_name else left(btrim(p_name_en),180) end,
      variant_data=variant_data||v_patch,
      updated_at=now()
  where product_id=p_product_id;

  select * into v_row from public.product_catalog where product_id=p_product_id order by variant_id limit 1;
  select jsonb_agg(to_jsonb(pc) order by pc.variant_id) into v_after
  from public.product_catalog pc where pc.product_id=p_product_id;
  insert into public.operations_audit_log(actor_id,action,entity_type,entity_id,before_data,after_data)
  values(auth.uid(),'update_catalog_product','catalog_product',p_product_id,v_before,v_after);
  return v_row;
end;
$$;
revoke all on function public.staff_update_catalog_product(text,text,text,text,text,text,text,text,text,text,boolean,boolean,boolean,boolean,boolean) from public;
grant execute on function public.staff_update_catalog_product(text,text,text,text,text,text,text,text,text,text,boolean,boolean,boolean,boolean,boolean) to authenticated,service_role;

-- Safe, read-only public catalogue projection. The base table remains private
-- so inventory writes and internal fields can never be accessed anonymously.
create or replace function public.get_public_product_catalog()
returns table (
  variant_id text,
  product_id text,
  canonical_slug text,
  sku text,
  product_name text,
  color text,
  size text,
  currency text,
  unit_price numeric,
  compare_at_price numeric,
  availability_state text,
  inventory_tracking boolean,
  inventory_quantity integer,
  variant_data jsonb,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    pc.variant_id,pc.product_id,pc.canonical_slug,pc.sku,pc.product_name,
    pc.color,pc.size,pc.currency,pc.unit_price,pc.compare_at_price,
    pc.availability_state,pc.inventory_tracking,pc.inventory_quantity,
    pc.variant_data,pc.updated_at
  from public.product_catalog pc
  where pc.active=true and pc.product_status='active'
  order by pc.product_name,pc.color,pc.size,pc.sku;
$$;
revoke all on function public.get_public_product_catalog() from public;
grant execute on function public.get_public_product_catalog() to anon,authenticated,service_role;

-- Staff may inspect the base catalogue through RLS; writes stay behind audited RPCs.
grant select on public.product_catalog to authenticated;
drop policy if exists "staff can read product catalog" on public.product_catalog;
create policy "staff can read product catalog" on public.product_catalog
for select to authenticated using (public.is_shababuna_staff());

-- Reliable server-side order and quote intake notifications. Client Formspree
-- submission remains an immediate duplicate path; event keys keep retries idempotent.
create or replace function public.enqueue_new_order_notification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.enqueue_commerce_notification(
    'new-order:'||new.id::text,
    'new_order','order',new.id::text,new.customer_email,
    'New Shababuna order — '||new.order_number,
    jsonb_build_object(
      'orderNumber',new.order_number,'customerEmail',new.customer_email,
      'currency',new.currency,'subtotal',new.subtotal,'shippingTotal',new.shipping_total,
      'total',new.total,'amountDueNow',new.amount_due_now,'remainingBalance',new.remaining_balance,
      'paymentMethod',new.payment_method,'paymentPlan',new.payment_plan,
      'paymentStatus',new.payment_status,'orderStatus',new.order_status,
      'deliveryProfile',new.delivery_profile,'shippingQuoteRequired',new.shipping_quote_required,
      'shipping',new.shipping_summary,'items',new.items_snapshot,'createdAt',new.created_at
    )
  );
  return new;
end;
$$;
drop trigger if exists enqueue_new_order_notification_trigger on public.orders;
create trigger enqueue_new_order_notification_trigger
after insert on public.orders for each row execute function public.enqueue_new_order_notification();

create or replace function public.enqueue_new_quote_notification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.enqueue_commerce_notification(
    'new-quote:'||new.id,
    'new_quote_request','quote',new.id,
    coalesce(new.request_data->>'customerEmail',new.request_data->>'email',''),
    'New Shababuna quote request — '||new.quote_number,
    jsonb_build_object('quoteNumber',new.quote_number,'status',new.status,'request',new.request_data,'createdAt',new.created_at)
  );
  return new;
end;
$$;
drop trigger if exists enqueue_new_quote_notification_trigger on public.quote_requests;
create trigger enqueue_new_quote_notification_trigger
after insert on public.quote_requests for each row execute function public.enqueue_new_quote_notification();

-- Re-grant replaced functions.
revoke all on function public.staff_set_shipping_quote(uuid,numeric,text) from public;
revoke all on function public.staff_update_order_workflow(uuid,text,text,text) from public;
revoke all on function public.staff_update_quote(text,text,numeric,numeric,numeric) from public;
grant execute on function public.staff_set_shipping_quote(uuid,numeric,text) to authenticated,service_role;
grant execute on function public.staff_update_order_workflow(uuid,text,text,text) to authenticated,service_role;
grant execute on function public.staff_update_quote(text,text,numeric,numeric,numeric) to authenticated,service_role;
grant execute on function public.customer_respond_to_quote(text,text,text) to authenticated,service_role;

commit;

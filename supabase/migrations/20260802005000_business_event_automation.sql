begin;

create or replace function public.emit_commerce_event(
  p_event_name text,p_entity_type text,p_entity_reference text,p_source_event_id text,
  p_value_usd numeric default null,p_currency text default 'USD',p_organization_id uuid default null,
  p_actor_user_id uuid default null,p_customer_hash text default null,p_channel text default 'database',p_properties jsonb default '{}'::jsonb
) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if coalesce(btrim(p_source_event_id),'')='' then raise exception 'source_event_id_required'; end if;
  insert into public.commerce_events(event_name,entity_type,entity_reference,organization_id,actor_user_id,customer_hash,value_usd,currency,channel,properties,source_event_id)
  values(p_event_name,p_entity_type,p_entity_reference,p_organization_id,p_actor_user_id,p_customer_hash,p_value_usd,upper(coalesce(p_currency,'USD')),p_channel,coalesce(p_properties,'{}'::jsonb),p_source_event_id)
  on conflict(event_name,source_event_id) do nothing;
exception when others then
  begin
    insert into public.security_events(severity,source,event_type,message,context)
    values('warning','commerce-event-automation','commerce_event_capture_failed','A business event could not be recorded.',jsonb_build_object('event',p_event_name,'entity',p_entity_reference,'error',sqlerrm));
  exception when others then null; end;
end; $$;
revoke all on function public.emit_commerce_event(text,text,text,text,numeric,text,uuid,uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.emit_commerce_event(text,text,text,text,numeric,text,uuid,uuid,text,text,jsonb) to service_role;

create or replace function public.capture_order_commerce_events() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if tg_op='INSERT' then
    perform public.emit_commerce_event('order_created','order',new.order_number,'db:order:'||new.id||':created',new.total,new.currency,null,new.user_id,null,'database',jsonb_build_object('payment_method',new.payment_method));
  end if;
  if tg_op='UPDATE' and old.payment_status is distinct from new.payment_status then
    if new.payment_status='paid' then
      perform public.emit_commerce_event('purchase_completed','order',new.order_number,'db:order:'||new.id||':paid',new.total,new.currency,null,new.user_id,null,'database','{}'::jsonb);
    elsif new.payment_status='partially_paid' then
      perform public.emit_commerce_event('deposit_paid','order',new.order_number,'db:order:'||new.id||':deposit',new.amount_paid,new.currency,null,new.user_id,null,'database','{}'::jsonb);
    elsif new.payment_status in ('failed','cancelled') then
      perform public.emit_commerce_event('payment_failed','order',new.order_number,'db:order:'||new.id||':payment:'||new.payment_status,null,new.currency,null,new.user_id,null,'database',jsonb_build_object('status',new.payment_status));
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists capture_order_commerce_events_trigger on public.orders;
create trigger capture_order_commerce_events_trigger after insert or update of payment_status on public.orders for each row execute function public.capture_order_commerce_events();

create or replace function public.capture_quote_commerce_events() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if tg_op='INSERT' then perform public.emit_commerce_event('quote_created','quote',new.quote_number,'db:quote:'||new.id||':created',new.total,new.currency,new.organization_id,new.user_id,null,'database','{}'::jsonb); end if;
  if tg_op='UPDATE' and old.status is distinct from new.status then
    if new.status in ('deposit_required','deposit_paid','design_in_progress') and old.status not in ('deposit_required','deposit_paid','design_in_progress') then
      perform public.emit_commerce_event('quote_approved','quote',new.quote_number,'db:quote:'||new.id||':approved',new.total,new.currency,new.organization_id,new.user_id,null,'database',jsonb_build_object('status',new.status));
    elsif new.status='cancelled' then
      perform public.emit_commerce_event('quote_rejected','quote',new.quote_number,'db:quote:'||new.id||':cancelled',new.total,new.currency,new.organization_id,new.user_id,null,'database','{}'::jsonb);
    elsif new.status='deposit_paid' then
      perform public.emit_commerce_event('deposit_paid','quote',new.quote_number,'db:quote:'||new.id||':deposit',round(coalesce(new.total,0)*coalesce(new.deposit_percent,50)/100.0,2),new.currency,new.organization_id,new.user_id,null,'database','{}'::jsonb);
    elsif new.status='in_production' then
      perform public.emit_commerce_event('production_started','quote',new.quote_number,'db:quote:'||new.id||':production',null,new.currency,new.organization_id,new.user_id,null,'database','{}'::jsonb);
    elsif new.status='completed' then
      perform public.emit_commerce_event('final_payment_paid','quote',new.quote_number,'db:quote:'||new.id||':completed',new.total,new.currency,new.organization_id,new.user_id,null,'database','{}'::jsonb);
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists capture_quote_commerce_events_trigger on public.quote_requests;
create trigger capture_quote_commerce_events_trigger after insert or update of status on public.quote_requests for each row execute function public.capture_quote_commerce_events();

create or replace function public.capture_return_commerce_events() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if tg_op='INSERT' then perform public.emit_commerce_event('return_requested','return',new.return_number,'db:return:'||new.id||':requested',new.refund_amount,'USD',null,new.user_id,null,'database',jsonb_build_object('order_number',new.order_number)); end if;
  if tg_op='UPDATE' and old.status is distinct from new.status and new.status in ('refunded','closed') then
    perform public.emit_commerce_event('return_completed','return',new.return_number,'db:return:'||new.id||':completed',new.refund_amount,'USD',null,new.user_id,null,'database',jsonb_build_object('status',new.status));
  end if;
  return new;
end; $$;
drop trigger if exists capture_return_commerce_events_trigger on public.return_requests;
create trigger capture_return_commerce_events_trigger after insert or update of status on public.return_requests for each row execute function public.capture_return_commerce_events();

create or replace function public.capture_shipment_commerce_events() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if tg_op='INSERT' then perform public.emit_commerce_event('shipment_created','shipment',new.shipment_number,'db:shipment:'||new.id||':created',null,'USD',null,null,null,'database',jsonb_build_object('order_id',new.order_id,'quote_id',new.quote_id)); end if;
  if tg_op='UPDATE' and old.status is distinct from new.status and new.status='delivered' then perform public.emit_commerce_event('shipment_delivered','shipment',new.shipment_number,'db:shipment:'||new.id||':delivered',null,'USD',null,null,null,'database','{}'::jsonb); end if;
  return new;
end; $$;
drop trigger if exists capture_shipment_commerce_events_trigger on public.shipments;
create trigger capture_shipment_commerce_events_trigger after insert or update of status on public.shipments for each row execute function public.capture_shipment_commerce_events();

create or replace function public.capture_inventory_commerce_events() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if coalesce(old.inventory_quantity,-1)>0 and coalesce(new.inventory_quantity,0)=0 then perform public.emit_commerce_event('inventory_stockout','variant',new.variant_id,'db:variant:'||new.variant_id||':stockout:'||extract(epoch from new.updated_at)::bigint,null,new.currency,null,null,null,'database',jsonb_build_object('product_id',new.product_id)); end if;
  if coalesce(old.inventory_quantity,0)=0 and coalesce(new.inventory_quantity,0)>0 and new.active then perform public.emit_commerce_event('ready_to_ship_conversion','variant',new.variant_id,'db:variant:'||new.variant_id||':restocked:'||extract(epoch from new.updated_at)::bigint,null,new.currency,null,null,null,'database',jsonb_build_object('quantity',new.inventory_quantity,'product_id',new.product_id)); end if;
  return new;
end; $$;
drop trigger if exists capture_inventory_commerce_events_trigger on public.product_catalog;
create trigger capture_inventory_commerce_events_trigger after update of inventory_quantity on public.product_catalog for each row execute function public.capture_inventory_commerce_events();

create or replace view public.business_intelligence_summary with (security_invoker=true) as
with deduped as (
  select distinct on (event_name,coalesce(entity_type,''),coalesce(entity_reference,''),coalesce(source_event_id,'')) *
  from public.commerce_events where occurred_at>=now()-interval '365 days'
  order by event_name,coalesce(entity_type,''),coalesce(entity_reference,''),coalesce(source_event_id,''),occurred_at desc
), e as (
  select count(*) filter(where event_name='checkout_started')::bigint checkout_started,
    count(distinct entity_reference) filter(where event_name='purchase_completed')::bigint purchases,
    count(distinct entity_reference) filter(where event_name='quote_created')::bigint quotes_created,
    count(distinct entity_reference) filter(where event_name='quote_approved')::bigint quotes_approved,
    count(distinct entity_reference) filter(where event_name='refund_completed')::bigint refunds,
    count(distinct customer_hash) filter(where event_name='purchase_completed' and customer_hash is not null)::bigint purchasing_customers,
    coalesce(sum(value_usd) filter(where event_name in('purchase_completed','deposit_paid','final_payment_paid')),0)::numeric(14,2) recognized_revenue_usd,
    coalesce(avg(value_usd) filter(where event_name='purchase_completed'),0)::numeric(14,2) average_order_value_usd
  from deduped
), r as (
  select count(*)::bigint repeat_customers from (select customer_hash from deduped where event_name='purchase_completed' and customer_hash is not null group by customer_hash having count(*)>1)x
), i as (
  select count(*) filter(where coalesce(inventory_quantity,0)=0)::bigint stockout_variants,count(*) filter(where coalesce(inventory_quantity,0)>0)::bigint stocked_variants from public.product_catalog
)
select e.*,r.repeat_customers,i.stockout_variants,i.stocked_variants,
  case when e.checkout_started=0 then 0 else round(e.purchases::numeric/e.checkout_started*100,2) end checkout_conversion_percent,
  case when e.quotes_created=0 then 0 else round(e.quotes_approved::numeric/e.quotes_created*100,2) end quote_to_order_percent,
  case when e.purchasing_customers=0 then 0 else round(r.repeat_customers::numeric/e.purchasing_customers*100,2) end repeat_customer_percent
from e cross join r cross join i;
grant select on public.business_intelligence_summary to authenticated;

commit;

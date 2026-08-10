begin;

-- Final operational controls for notifications, media and fulfillment.
-- All browser-callable functions require a trusted staff role with AAL2.

-- The outbox is service-role owned by default; staff receive only the minimum
-- read/update access needed to inspect failures and request a safe retry.
drop policy if exists "staff read commerce notifications" on public.commerce_notifications;
create policy "staff read commerce notifications"
on public.commerce_notifications for select to authenticated
using (public.is_shababuna_staff());
grant select on public.commerce_notifications to authenticated;

create or replace function public.staff_retry_commerce_notification(p_notification_id bigint)
returns public.commerce_notifications
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare before_row public.commerce_notifications; after_row public.commerce_notifications;
begin
  if not public.is_shababuna_staff() then raise exception 'staff_mfa_required'; end if;
  select * into before_row from public.commerce_notifications where id=p_notification_id for update;
  if not found then raise exception 'notification_not_found'; end if;
  if before_row.delivery_status='sent' then raise exception 'notification_already_sent'; end if;
  update public.commerce_notifications
  set delivery_status='pending', available_at=now(), last_error=null, sent_at=null, updated_at=now()
  where id=p_notification_id returning * into after_row;
  insert into public.operations_audit_log(actor_id,action,entity_type,entity_id,before_data,after_data)
  values(auth.uid(),'retry_notification','commerce_notification',p_notification_id::text,to_jsonb(before_row),to_jsonb(after_row));
  return after_row;
end;
$$;
revoke all on function public.staff_retry_commerce_notification(bigint) from public;
grant execute on function public.staff_retry_commerce_notification(bigint) to authenticated,service_role;

create or replace function public.staff_resolve_security_event(p_event_id uuid,p_resolved boolean default true)
returns public.security_events
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare before_row public.security_events; after_row public.security_events;
begin
  if not public.is_shababuna_staff() then raise exception 'staff_mfa_required'; end if;
  select * into before_row from public.security_events where id=p_event_id for update;
  if not found then raise exception 'security_event_not_found'; end if;
  update public.security_events
  set resolved_at=case when p_resolved then now() else null end,
      resolved_by=case when p_resolved then auth.uid() else null end
  where id=p_event_id returning * into after_row;
  insert into public.operations_audit_log(actor_id,action,entity_type,entity_id,before_data,after_data)
  values(auth.uid(),case when p_resolved then 'resolve_security_event' else 'reopen_security_event' end,'security_event',p_event_id::text,to_jsonb(before_row),to_jsonb(after_row));
  return after_row;
end;
$$;
revoke all on function public.staff_resolve_security_event(uuid,boolean) from public;
grant execute on function public.staff_resolve_security_event(uuid,boolean) to authenticated,service_role;

create or replace function public.staff_update_media_asset(
  p_asset_id uuid,
  p_alt_text_en text default null,
  p_alt_text_ar text default null,
  p_sort_order integer default null,
  p_visibility text default null,
  p_retry_scan boolean default false
) returns public.media_assets
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare before_row public.media_assets; after_row public.media_assets; v_visibility text;
begin
  if not public.is_shababuna_staff() then raise exception 'staff_mfa_required'; end if;
  select * into before_row from public.media_assets where id=p_asset_id for update;
  if not found then raise exception 'media_asset_not_found'; end if;
  v_visibility=coalesce(p_visibility,before_row.visibility);
  if v_visibility not in ('private','public') then raise exception 'invalid_media_visibility'; end if;
  if v_visibility='public' and before_row.scan_status<>'clean' then raise exception 'media_not_clean'; end if;
  update public.media_assets set
    alt_text_en=case when p_alt_text_en is null then alt_text_en else left(nullif(btrim(p_alt_text_en),''),500) end,
    alt_text_ar=case when p_alt_text_ar is null then alt_text_ar else left(nullif(btrim(p_alt_text_ar),''),500) end,
    sort_order=coalesce(p_sort_order,sort_order),
    visibility=v_visibility,
    scan_status=case when p_retry_scan and scan_status='failed' then 'quarantined' else scan_status end,
    metadata=case when p_retry_scan and scan_status='failed' then metadata-'lastScanError' else metadata end,
    updated_at=now()
  where id=p_asset_id returning * into after_row;
  insert into public.operations_audit_log(actor_id,action,entity_type,entity_id,before_data,after_data)
  values(auth.uid(),case when p_retry_scan then 'retry_media_scan' else 'update_media_asset' end,'media_asset',p_asset_id::text,to_jsonb(before_row),to_jsonb(after_row));
  return after_row;
end;
$$;
revoke all on function public.staff_update_media_asset(uuid,text,text,integer,text,boolean) from public;
grant execute on function public.staff_update_media_asset(uuid,text,text,integer,text,boolean) to authenticated,service_role;

create or replace function public.is_valid_shipment_status_transition(p_from text,p_to text)
returns boolean language sql immutable as $$
  select p_from=p_to or case p_from
    when 'pending' then p_to in ('label_created','in_transit','cancelled')
    when 'label_created' then p_to in ('in_transit','cancelled')
    when 'in_transit' then p_to in ('out_for_delivery','delivered','exception')
    when 'out_for_delivery' then p_to in ('delivered','exception')
    when 'exception' then p_to in ('in_transit','out_for_delivery','delivered','cancelled')
    else false end;
$$;

create or replace function public.staff_upsert_shipment(
  p_shipment_id uuid default null,
  p_shipment_number text default null,
  p_order_id uuid default null,
  p_quote_id text default null,
  p_carrier_id uuid default null,
  p_tracking_number text default null,
  p_status text default 'pending',
  p_metadata jsonb default '{}'::jsonb
) returns public.shipments
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare before_row public.shipments; after_row public.shipments; v_number text; v_status text; v_email text; v_order_number text;
begin
  if not public.is_shababuna_staff() then raise exception 'staff_mfa_required'; end if;
  if (p_order_id is null)=(p_quote_id is null) then raise exception 'shipment_requires_one_parent'; end if;
  v_status=coalesce(nullif(btrim(p_status),''),'pending');
  if v_status not in ('pending','label_created','in_transit','out_for_delivery','delivered','exception','cancelled') then raise exception 'invalid_shipment_status'; end if;
  if p_shipment_id is null then
    v_number=coalesce(nullif(btrim(p_shipment_number),''),'SHP-'||to_char(now(),'YYYYMMDD')||'-'||upper(substr(encode(gen_random_bytes(5),'hex'),1,8)));
    insert into public.shipments(shipment_number,order_id,quote_id,carrier_id,tracking_number,status,shipped_at,delivered_at,metadata)
    values(v_number,p_order_id,p_quote_id,p_carrier_id,nullif(btrim(p_tracking_number),''),v_status,
      case when v_status in ('in_transit','out_for_delivery','delivered') then now() else null end,
      case when v_status='delivered' then now() else null end,coalesce(p_metadata,'{}'::jsonb))
    returning * into after_row;
    insert into public.operations_audit_log(actor_id,action,entity_type,entity_id,after_data)
    values(auth.uid(),'create_shipment','shipment',after_row.id::text,to_jsonb(after_row));
  else
    select * into before_row from public.shipments where id=p_shipment_id for update;
    if not found then raise exception 'shipment_not_found'; end if;
    if not public.is_valid_shipment_status_transition(before_row.status,v_status) then raise exception 'invalid_shipment_status_transition'; end if;
    update public.shipments set carrier_id=coalesce(p_carrier_id,carrier_id),tracking_number=coalesce(nullif(btrim(p_tracking_number),''),tracking_number),status=v_status,
      shipped_at=case when v_status in ('in_transit','out_for_delivery','delivered') then coalesce(shipped_at,now()) else shipped_at end,
      delivered_at=case when v_status='delivered' then coalesce(delivered_at,now()) when v_status<>'delivered' and before_row.status<>'delivered' then null else delivered_at end,
      metadata=coalesce(metadata,'{}'::jsonb)||coalesce(p_metadata,'{}'::jsonb),updated_at=now()
    where id=p_shipment_id returning * into after_row;
    insert into public.operations_audit_log(actor_id,action,entity_type,entity_id,before_data,after_data)
    values(auth.uid(),'update_shipment','shipment',p_shipment_id::text,to_jsonb(before_row),to_jsonb(after_row));
  end if;
  if after_row.order_id is not null then
    update public.orders set fulfillment_status=case after_row.status when 'label_created' then 'ready_to_ship' when 'in_transit' then 'shipped' when 'out_for_delivery' then 'out_for_delivery' when 'delivered' then 'delivered' else fulfillment_status end,
      order_status=case when after_row.status='delivered' then 'delivered' else order_status end,
      delivered_at=case when after_row.status='delivered' then coalesce(delivered_at,after_row.delivered_at,now()) else delivered_at end,updated_at=now()
    where id=after_row.order_id;
    select customer_email,order_number into v_email,v_order_number from public.orders where id=after_row.order_id;
    perform public.enqueue_commerce_notification('shipment:'||after_row.id::text||':'||after_row.status,'shipment_status','shipment',after_row.id::text,v_email,
      'Shababuna shipment update — '||coalesce(v_order_number,after_row.shipment_number),
      jsonb_build_object('shipmentNumber',after_row.shipment_number,'orderNumber',v_order_number,'status',after_row.status,'trackingNumber',after_row.tracking_number,'updatedAt',now()));
  end if;
  return after_row;
end;
$$;
revoke all on function public.staff_upsert_shipment(uuid,text,uuid,text,uuid,text,text,jsonb) from public;
grant execute on function public.staff_upsert_shipment(uuid,text,uuid,text,uuid,text,text,jsonb) to authenticated,service_role;

-- Keep operational timestamps consistent for generic CRUD screens.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end; $$;
do $$ declare t text; begin
  foreach t in array array['catalog_brands','catalog_categories','catalog_collections','suppliers','purchase_orders','invoices','carriers','shipments'] loop
    execute format('drop trigger if exists %I on public.%I','touch_'||t,t);
    execute format('create trigger %I before update on public.%I for each row execute function public.touch_updated_at()','touch_'||t,t);
  end loop;
end $$;

commit;

begin;

create or replace function public.customer_register_payment_proof(
  p_entity_type text,
  p_entity_id text,
  p_media_asset_id uuid,
  p_amount numeric,
  p_currency text,
  p_payment_method text,
  p_reference text,
  p_note text
)
returns public.payment_proofs
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v public.payment_proofs;
  v_order uuid;
  v_quote text;
  v_invoice uuid;
  v_org uuid;
  v_allowed boolean:=false;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if p_entity_type not in ('order','quote','invoice') then raise exception 'invalid_payment_proof_entity'; end if;
  if p_amount is null or p_amount<=0 or p_amount>10000000 then raise exception 'invalid_payment_proof_amount'; end if;
  if not exists(select 1 from public.media_assets m where m.id=p_media_asset_id and m.owner_user_id=auth.uid() and m.scan_status in ('quarantined','scanning','clean')) then raise exception 'payment_proof_asset_not_found'; end if;
  if p_entity_type='order' then
    v_order=p_entity_id::uuid;
    select o.organization_id into v_org from public.orders o where o.id=v_order and (o.user_id=auth.uid() or public.is_organization_member(o.organization_id));
    v_allowed=found;
  elsif p_entity_type='quote' then
    v_quote=p_entity_id;
    select q.organization_id into v_org from public.quote_requests q where q.id=v_quote and (q.user_id=auth.uid() or public.is_organization_member(q.organization_id));
    v_allowed=found;
  else
    v_invoice=p_entity_id::uuid;
    select i.organization_id into v_org from public.invoices i where i.id=v_invoice and (
      public.is_organization_member(i.organization_id)
      or exists(select 1 from public.orders o where o.id=i.order_id and o.user_id=auth.uid())
      or exists(select 1 from public.quote_requests q where q.id=i.quote_id and (q.user_id=auth.uid() or public.is_organization_member(q.organization_id)))
    );
    v_allowed=found;
  end if;
  if not v_allowed then raise exception 'payment_proof_entity_not_found'; end if;
  if exists(select 1 from public.payment_proofs p where p.user_id=auth.uid() and p.media_asset_id=p_media_asset_id) then
    select * into v from public.payment_proofs where user_id=auth.uid() and media_asset_id=p_media_asset_id limit 1;
    return v;
  end if;
  insert into public.payment_proofs(user_id,organization_id,order_id,quote_id,invoice_id,media_asset_id,amount,currency,payment_method,reference,note)
  values(auth.uid(),v_org,v_order,v_quote,v_invoice,p_media_asset_id,round(p_amount,2),upper(left(coalesce(p_currency,'USD'),3)),left(coalesce(p_payment_method,'bank_transfer'),80),left(coalesce(p_reference,''),240),left(coalesce(p_note,''),2000))
  returning * into v;
  perform public.enqueue_commerce_notification('payment-proof:'||v.id::text,'payment_proof_submitted','payment_proof',v.id::text,null,'New payment proof — '||v.proof_number,jsonb_build_object('proofNumber',v.proof_number,'entityType',p_entity_type,'entityId',p_entity_id,'amount',v.amount,'currency',v.currency));
  return v;
end;
$$;
revoke all on function public.customer_register_payment_proof(text,text,uuid,numeric,text,text,text,text) from public;
grant execute on function public.customer_register_payment_proof(text,text,uuid,numeric,text,text,text,text) to authenticated,service_role;

create or replace function public.staff_review_payment_proof(
  p_proof_id uuid,
  p_status text,
  p_review_note text default ''
)
returns public.payment_proofs
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare v public.payment_proofs;
begin
  if not public.is_shababuna_staff() then raise exception 'staff_mfa_required'; end if;
  if p_status not in ('verified','rejected','duplicate','cancelled') then raise exception 'invalid_payment_proof_status'; end if;
  update public.payment_proofs set status=p_status,reviewed_by=auth.uid(),reviewed_at=now(),review_note=left(coalesce(p_review_note,''),2000),updated_at=now() where id=p_proof_id returning * into v;
  if v.id is null then raise exception 'payment_proof_not_found'; end if;
  insert into public.operations_audit_log(actor_id,action,entity_type,entity_id,after_data) values(auth.uid(),'review_payment_proof','payment_proof',v.id::text,to_jsonb(v));
  return v;
end;
$$;
revoke all on function public.staff_review_payment_proof(uuid,text,text) from public;
grant execute on function public.staff_review_payment_proof(uuid,text,text) to authenticated,service_role;

commit;

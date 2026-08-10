begin;

create table if not exists public.inventory_import_batches (
  id uuid primary key default gen_random_uuid(),
  uploaded_by uuid references auth.users(id) on delete set null,
  source_name text,
  status text not null default 'preview' check (status in ('preview','applied','rolled_back','failed')),
  row_count integer not null default 0,
  error_count integer not null default 0,
  errors jsonb not null default '[]'::jsonb,
  applied_at timestamptz,
  rolled_back_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_import_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.inventory_import_batches(id) on delete cascade,
  row_number integer not null,
  warehouse_id uuid references public.warehouses(id) on delete restrict,
  variant_id text references public.product_catalog(variant_id) on delete restrict,
  sku text,
  before_on_hand integer,
  after_on_hand integer,
  before_reserved integer,
  reorder_point integer,
  applied boolean not null default false,
  error_message text,
  created_at timestamptz not null default now(),
  unique(batch_id,row_number)
);

alter table public.inventory_import_batches enable row level security;
alter table public.inventory_import_rows enable row level security;
revoke all on public.inventory_import_batches,public.inventory_import_rows from anon,authenticated;
grant select,insert,update,delete on public.inventory_import_batches,public.inventory_import_rows to service_role;
grant select,insert,update,delete on public.inventory_import_batches,public.inventory_import_rows to authenticated;
drop policy if exists "staff manage inventory imports" on public.inventory_import_batches;
create policy "staff manage inventory imports" on public.inventory_import_batches for all to authenticated using(public.is_shababuna_staff()) with check(public.is_shababuna_staff());
drop policy if exists "staff manage inventory import rows" on public.inventory_import_rows;
create policy "staff manage inventory import rows" on public.inventory_import_rows for all to authenticated using(public.is_shababuna_staff()) with check(public.is_shababuna_staff());

create or replace function public.staff_apply_inventory_batch(
  p_batch_id uuid,
  p_source_name text,
  p_rows jsonb,
  p_dry_run boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_batch uuid:=coalesce(p_batch_id,gen_random_uuid());
  v_row jsonb; v_index integer:=0; v_errors jsonb:='[]'::jsonb; v_preview jsonb:='[]'::jsonb;
  v_warehouse public.warehouses; v_variant public.product_catalog; v_inventory public.warehouse_inventory;
  v_on_hand integer; v_reorder integer; v_delta integer;
begin
  if not public.is_shababuna_staff() then raise exception 'staff_mfa_required'; end if;
  if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)<1 or jsonb_array_length(p_rows)>1000 then raise exception 'invalid_inventory_import_rows'; end if;
  insert into public.inventory_import_batches(id,uploaded_by,source_name,status,row_count)
  values(v_batch,auth.uid(),left(coalesce(p_source_name,'inventory.csv'),240),'preview',jsonb_array_length(p_rows))
  on conflict(id) do update set source_name=excluded.source_name,row_count=excluded.row_count,status='preview',errors='[]'::jsonb,error_count=0,updated_at=now();
  delete from public.inventory_import_rows where batch_id=v_batch and applied=false;

  for v_row in select value from jsonb_array_elements(p_rows) loop
    v_index:=v_index+1;
    begin
      if coalesce(v_row->>'warehouse_code','')='' or coalesce(v_row->>'sku','')='' then raise exception 'warehouse_code_and_sku_required'; end if;
      if coalesce(v_row->>'on_hand','')!~'^[0-9]{1,9}$' then raise exception 'invalid_on_hand'; end if;
      if coalesce(v_row->>'reorder_point','0')!~'^[0-9]{1,9}$' then raise exception 'invalid_reorder_point'; end if;
      v_on_hand=(v_row->>'on_hand')::integer; v_reorder=coalesce((v_row->>'reorder_point')::integer,0);
      select * into v_warehouse from public.warehouses where lower(code)=lower(v_row->>'warehouse_code') and active limit 1;
      if v_warehouse.id is null then raise exception 'warehouse_not_found'; end if;
      select * into v_variant from public.product_catalog where lower(sku)=lower(v_row->>'sku') limit 1;
      if v_variant.variant_id is null then raise exception 'sku_not_found'; end if;
      select * into v_inventory from public.warehouse_inventory where warehouse_id=v_warehouse.id and variant_id=v_variant.variant_id;
      if coalesce(v_inventory.reserved,0)>v_on_hand then raise exception 'on_hand_below_reserved'; end if;
      v_preview:=v_preview||jsonb_build_array(jsonb_build_object('row',v_index,'warehouseCode',v_warehouse.code,'warehouseId',v_warehouse.id,'sku',v_variant.sku,'variantId',v_variant.variant_id,'beforeOnHand',coalesce(v_inventory.on_hand,0),'afterOnHand',v_on_hand,'reserved',coalesce(v_inventory.reserved,0),'reorderPoint',v_reorder));
      insert into public.inventory_import_rows(batch_id,row_number,warehouse_id,variant_id,sku,before_on_hand,after_on_hand,before_reserved,reorder_point)
      values(v_batch,v_index,v_warehouse.id,v_variant.variant_id,v_variant.sku,coalesce(v_inventory.on_hand,0),v_on_hand,coalesce(v_inventory.reserved,0),v_reorder);
    exception when others then
      v_errors:=v_errors||jsonb_build_array(jsonb_build_object('row',v_index,'sku',v_row->>'sku','warehouseCode',v_row->>'warehouse_code','error',sqlerrm));
      insert into public.inventory_import_rows(batch_id,row_number,sku,error_message) values(v_batch,v_index,left(coalesce(v_row->>'sku',''),240),left(sqlerrm,1000));
    end;
  end loop;

  update public.inventory_import_batches set error_count=jsonb_array_length(v_errors),errors=v_errors,status=case when jsonb_array_length(v_errors)>0 then 'failed' else 'preview' end,updated_at=now() where id=v_batch;
  if jsonb_array_length(v_errors)>0 then return jsonb_build_object('ok',false,'batchId',v_batch,'errors',v_errors,'preview',v_preview); end if;
  if p_dry_run then return jsonb_build_object('ok',true,'dryRun',true,'batchId',v_batch,'preview',v_preview,'errors','[]'::jsonb); end if;

  for v_inventory in select wi.* from public.warehouse_inventory wi join public.inventory_import_rows r on r.warehouse_id=wi.warehouse_id and r.variant_id=wi.variant_id where r.batch_id=v_batch for update loop
    null;
  end loop;
  for v_row in select to_jsonb(r) from public.inventory_import_rows r where r.batch_id=v_batch and r.error_message is null order by r.row_number loop
    v_delta=(v_row->>'after_on_hand')::integer-(v_row->>'before_on_hand')::integer;
    insert into public.warehouse_inventory(warehouse_id,variant_id,on_hand,reserved,reorder_point,verified_at,verified_by,updated_at)
    values((v_row->>'warehouse_id')::uuid,v_row->>'variant_id',(v_row->>'after_on_hand')::integer,(v_row->>'before_reserved')::integer,(v_row->>'reorder_point')::integer,now(),auth.uid(),now())
    on conflict(warehouse_id,variant_id) do update set on_hand=excluded.on_hand,reorder_point=excluded.reorder_point,verified_at=now(),verified_by=auth.uid(),updated_at=now();
    if v_delta<>0 then
      insert into public.stock_movement_ledger(warehouse_id,variant_id,movement_type,quantity_delta,balance_after,reference_type,reference_id,note,idempotency_key,recorded_by)
      values((v_row->>'warehouse_id')::uuid,v_row->>'variant_id','adjustment',v_delta,(v_row->>'after_on_hand')::integer,'inventory_import',v_batch::text,'CSV inventory import','inventory-import:'||v_batch::text||':'||(v_row->>'row_number'),auth.uid());
    end if;
    update public.inventory_import_rows set applied=true where batch_id=v_batch and row_number=(v_row->>'row_number')::integer;
  end loop;
  update public.product_catalog p set inventory_tracking=true,inventory_quantity=greatest(coalesce((select sum(w.on_hand-w.reserved) from public.warehouse_inventory w where w.variant_id=p.variant_id),0),0),inventory_source='warehouse_ledger',inventory_verified_at=now(),updated_at=now()
  where exists(select 1 from public.inventory_import_rows r where r.batch_id=v_batch and r.variant_id=p.variant_id);
  update public.inventory_import_batches set status='applied',applied_at=now(),updated_at=now() where id=v_batch;
  insert into public.operations_audit_log(actor_id,action,entity_type,entity_id,after_data) values(auth.uid(),'apply_inventory_import','inventory_import',v_batch::text,jsonb_build_object('rows',jsonb_array_length(p_rows)));
  return jsonb_build_object('ok',true,'dryRun',false,'batchId',v_batch,'preview',v_preview,'errors','[]'::jsonb);
end;
$$;
revoke all on function public.staff_apply_inventory_batch(uuid,text,jsonb,boolean) from public;
grant execute on function public.staff_apply_inventory_batch(uuid,text,jsonb,boolean) to authenticated,service_role;

create or replace function public.staff_rollback_inventory_batch(p_batch_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare v_batch public.inventory_import_batches; v_row public.inventory_import_rows; v_current public.warehouse_inventory; v_delta integer; v_count integer:=0;
begin
  if not public.is_shababuna_staff() then raise exception 'staff_mfa_required'; end if;
  select * into v_batch from public.inventory_import_batches where id=p_batch_id for update;
  if v_batch.id is null or v_batch.status<>'applied' then raise exception 'inventory_batch_not_rollbackable'; end if;
  for v_row in select * from public.inventory_import_rows where batch_id=p_batch_id and applied order by row_number loop
    select * into v_current from public.warehouse_inventory where warehouse_id=v_row.warehouse_id and variant_id=v_row.variant_id for update;
    if v_current.on_hand<>v_row.after_on_hand then raise exception 'inventory_changed_after_import:%',v_row.sku; end if;
    v_delta=v_row.before_on_hand-v_current.on_hand;
    update public.warehouse_inventory set on_hand=v_row.before_on_hand,reserved=least(reserved,v_row.before_on_hand),updated_at=now(),verified_at=now(),verified_by=auth.uid() where warehouse_id=v_row.warehouse_id and variant_id=v_row.variant_id;
    if v_delta<>0 then insert into public.stock_movement_ledger(warehouse_id,variant_id,movement_type,quantity_delta,balance_after,reference_type,reference_id,note,idempotency_key,recorded_by) values(v_row.warehouse_id,v_row.variant_id,'adjustment',v_delta,v_row.before_on_hand,'inventory_import_rollback',p_batch_id::text,'Rollback CSV inventory import','inventory-rollback:'||p_batch_id::text||':'||v_row.row_number,auth.uid()); end if;
    v_count:=v_count+1;
  end loop;
  update public.product_catalog p set inventory_quantity=greatest(coalesce((select sum(w.on_hand-w.reserved) from public.warehouse_inventory w where w.variant_id=p.variant_id),0),0),inventory_verified_at=now(),updated_at=now() where exists(select 1 from public.inventory_import_rows r where r.batch_id=p_batch_id and r.variant_id=p.variant_id);
  update public.inventory_import_batches set status='rolled_back',rolled_back_at=now(),updated_at=now() where id=p_batch_id;
  insert into public.operations_audit_log(actor_id,action,entity_type,entity_id,after_data) values(auth.uid(),'rollback_inventory_import','inventory_import',p_batch_id::text,jsonb_build_object('rows',v_count));
  return jsonb_build_object('ok',true,'batchId',p_batch_id,'rolledBackRows',v_count);
end;
$$;
revoke all on function public.staff_rollback_inventory_batch(uuid) from public;
grant execute on function public.staff_rollback_inventory_batch(uuid) to authenticated,service_role;

commit;

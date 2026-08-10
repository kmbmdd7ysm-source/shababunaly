begin;

-- Audited catalog creation/archival. New records are always drafts and cannot
-- enter the public projection until staff complete verified media, pricing and
-- inventory through the existing publishing controls.
create or replace function public.staff_create_catalog_product_draft(
  p_product_id text,
  p_slug text,
  p_name_en text,
  p_name_ar text,
  p_description_en text,
  p_description_ar text,
  p_brand text,
  p_category text,
  p_subcategory text,
  p_product_type text,
  p_sku text,
  p_color text default 'black',
  p_size text default 'OS',
  p_currency text default 'USD'
) returns public.product_catalog
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_product_id text; v_slug text; v_sku text; v_variant_id text; v_row public.product_catalog;
begin
  if not public.is_shababuna_staff() then raise exception 'staff_mfa_required'; end if;
  v_product_id=lower(btrim(coalesce(p_product_id,'')));
  v_slug=lower(btrim(coalesce(p_slug,'')));
  v_sku=upper(btrim(coalesce(p_sku,'')));
  if v_product_id !~ '^[a-z0-9][a-z0-9._-]{2,79}$' then raise exception 'invalid_product_id'; end if;
  if v_slug !~ '^[a-z0-9][a-z0-9-]{2,119}$' then raise exception 'invalid_product_slug'; end if;
  if v_sku !~ '^[A-Z0-9][A-Z0-9._-]{2,79}$' then raise exception 'invalid_sku'; end if;
  if char_length(btrim(coalesce(p_name_en,'')))<2 or char_length(btrim(coalesce(p_name_ar,'')))<2 then raise exception 'invalid_product_name'; end if;
  if char_length(btrim(coalesce(p_brand,'')))<1 or char_length(btrim(coalesce(p_category,'')))<1 then raise exception 'invalid_product_taxonomy'; end if;
  if exists(select 1 from public.product_catalog where product_id=v_product_id or canonical_slug=v_slug or sku=v_sku) then raise exception 'catalog_identifier_exists'; end if;
  v_variant_id=v_product_id||':'||v_sku;
  insert into public.product_catalog(variant_id,product_id,canonical_slug,sku,product_name,product_status,active,color,size,currency,unit_price,availability_state,inventory_tracking,inventory_quantity,inventory_source,variant_data)
  values(v_variant_id,v_product_id,v_slug,v_sku,left(btrim(p_name_en),180),'draft',false,left(coalesce(nullif(btrim(p_color),''),'black'),80),left(coalesce(nullif(btrim(p_size),''),'OS'),80),upper(left(coalesce(nullif(btrim(p_currency),''),'USD'),10)),0,'unavailable',true,0,'unverified_catalog',
    jsonb_build_object('nameEn',left(btrim(p_name_en),180),'nameAr',left(btrim(p_name_ar),180),'descriptionEn',left(coalesce(p_description_en,''),4000),'descriptionAr',left(coalesce(p_description_ar,''),4000),'brand',left(btrim(p_brand),120),'category',left(btrim(p_category),120),'subcategory',left(coalesce(p_subcategory,''),120),'productType',left(coalesce(p_product_type,''),160),'mediaStatus','missing','inventorySource','unverified_catalog','readyToShip',false,'retailAvailable',false,'wholesaleAvailable',false,'storefronts',jsonb_build_array('shop')))
  returning * into v_row;
  insert into public.operations_audit_log(actor_id,action,entity_type,entity_id,after_data) values(auth.uid(),'create_catalog_product_draft','catalog_product',v_product_id,to_jsonb(v_row));
  return v_row;
end; $$;
revoke all on function public.staff_create_catalog_product_draft(text,text,text,text,text,text,text,text,text,text,text,text,text,text) from public;
grant execute on function public.staff_create_catalog_product_draft(text,text,text,text,text,text,text,text,text,text,text,text,text,text) to authenticated,service_role;

create or replace function public.staff_add_catalog_variant_draft(
  p_product_id text,p_sku text,p_color text,p_size text
) returns public.product_catalog
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_base public.product_catalog; v_sku text; v_row public.product_catalog;
begin
  if not public.is_shababuna_staff() then raise exception 'staff_mfa_required'; end if;
  select * into v_base from public.product_catalog where product_id=p_product_id order by variant_id limit 1 for update;
  if not found then raise exception 'catalog_product_not_found'; end if;
  v_sku=upper(btrim(coalesce(p_sku,'')));
  if v_sku !~ '^[A-Z0-9][A-Z0-9._-]{2,79}$' then raise exception 'invalid_sku'; end if;
  if exists(select 1 from public.product_catalog where sku=v_sku) then raise exception 'sku_exists'; end if;
  insert into public.product_catalog(variant_id,product_id,canonical_slug,sku,product_name,product_status,active,color,size,currency,unit_price,compare_at_price,availability_state,inventory_tracking,inventory_quantity,inventory_source,variant_data)
  values(v_base.product_id||':'||v_sku,v_base.product_id,v_base.canonical_slug,v_sku,v_base.product_name,'draft',false,left(coalesce(nullif(btrim(p_color),''),'black'),80),left(coalesce(nullif(btrim(p_size),''),'OS'),80),v_base.currency,0,null,'unavailable',true,0,'unverified_catalog',v_base.variant_data||jsonb_build_object('color',left(coalesce(nullif(btrim(p_color),''),'black'),80),'size',left(coalesce(nullif(btrim(p_size),''),'OS'),80),'sku',v_sku,'readyToShip',false))
  returning * into v_row;
  insert into public.operations_audit_log(actor_id,action,entity_type,entity_id,after_data) values(auth.uid(),'add_catalog_variant_draft','catalog_variant',v_row.variant_id,to_jsonb(v_row));
  return v_row;
end; $$;
revoke all on function public.staff_add_catalog_variant_draft(text,text,text,text) from public;
grant execute on function public.staff_add_catalog_variant_draft(text,text,text,text) to authenticated,service_role;

create or replace function public.staff_archive_catalog_product(p_product_id text)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare v_count integer; v_before jsonb;
begin
  if not public.is_shababuna_staff() then raise exception 'staff_mfa_required'; end if;
  select jsonb_agg(to_jsonb(pc)) into v_before from public.product_catalog pc where product_id=p_product_id;
  update public.product_catalog set active=false,product_status='archived',availability_state='unavailable',variant_data=variant_data||jsonb_build_object('readyToShip',false),updated_at=now() where product_id=p_product_id;
  get diagnostics v_count=row_count;
  if v_count=0 then raise exception 'catalog_product_not_found'; end if;
  insert into public.operations_audit_log(actor_id,action,entity_type,entity_id,before_data,after_data) values(auth.uid(),'archive_catalog_product','catalog_product',p_product_id,v_before,jsonb_build_object('archivedVariants',v_count));
  return v_count;
end; $$;
revoke all on function public.staff_archive_catalog_product(text) from public;
grant execute on function public.staff_archive_catalog_product(text) to authenticated,service_role;

commit;

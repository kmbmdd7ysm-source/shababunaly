begin;

-- Enterprise collaboration, electronic approvals, payment-proof intake,
-- repeat ordering and private team stores. This migration is additive and
-- keeps all customer access behind organization membership or entity ownership.

create sequence if not exists public.contract_number_seq start 1;
create sequence if not exists public.reorder_number_seq start 1;
create sequence if not exists public.payment_proof_number_seq start 1;

create table if not exists public.organization_contracts (
  id uuid primary key default gen_random_uuid(),
  contract_number text not null unique default ('CTR-'||to_char(clock_timestamp(),'YYYYMMDD')||'-'||lpad(nextval('public.contract_number_seq')::text,7,'0')),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  quote_id text references public.quote_requests(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  title text not null,
  status text not null default 'draft' check (status in ('draft','sent','viewed','accepted','changes_requested','rejected','void','expired')),
  terms_version text not null default '1.0',
  terms jsonb not null default '{}'::jsonb,
  document_asset_id uuid references public.media_assets(id) on delete set null,
  valid_until timestamptz,
  sent_at timestamptz,
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (quote_id is not null or order_id is not null or jsonb_object_length(terms)>0)
);

create table if not exists public.contract_signatures (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.organization_contracts(id) on delete cascade,
  signer_id uuid references auth.users(id) on delete set null,
  signer_name text not null,
  signer_email text not null,
  signature_type text not null default 'typed' check (signature_type in ('typed','drawn','verified_click')),
  signature_hash text not null,
  consent_text_version text not null,
  signed_payload_hash text not null,
  ip_hash text,
  user_agent_hash text,
  signed_at timestamptz not null default now(),
  unique(contract_id,signer_id)
);

create table if not exists public.payment_proofs (
  id uuid primary key default gen_random_uuid(),
  proof_number text not null unique default ('PAYPROOF-'||to_char(clock_timestamp(),'YYYYMMDD')||'-'||lpad(nextval('public.payment_proof_number_seq')::text,7,'0')),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  quote_id text references public.quote_requests(id) on delete set null,
  invoice_id uuid references public.invoices(id) on delete set null,
  media_asset_id uuid not null references public.media_assets(id) on delete restrict,
  amount numeric(12,2) not null check (amount>0),
  currency text not null default 'USD',
  payment_method text not null default 'bank_transfer',
  reference text,
  note text,
  status text not null default 'submitted' check (status in ('submitted','under_review','verified','rejected','duplicate','cancelled')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (order_id is not null or quote_id is not null or invoice_id is not null)
);
create index if not exists payment_proofs_entity_idx on public.payment_proofs(order_id,quote_id,invoice_id,created_at desc);

create table if not exists public.reorder_requests (
  id uuid primary key default gen_random_uuid(),
  request_number text not null unique default ('REORDER-'||to_char(clock_timestamp(),'YYYYMMDD')||'-'||lpad(nextval('public.reorder_number_seq')::text,7,'0')),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_order_id uuid references public.orders(id) on delete set null,
  source_quote_id text references public.quote_requests(id) on delete set null,
  source_design_id text references public.custom_designs(id) on delete set null,
  request_type text not null default 'full_reorder' check (request_type in ('full_reorder','single_player','replacement','additional_units')),
  status text not null default 'submitted' check (status in ('submitted','under_review','quoted','accepted','rejected','in_production','completed','cancelled')),
  items jsonb not null default '[]'::jsonb,
  player_details jsonb not null default '{}'::jsonb,
  customer_note text,
  staff_note text,
  linked_quote_id text references public.quote_requests(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (source_order_id is not null or source_quote_id is not null or source_design_id is not null)
);

create table if not exists public.team_locker_stores (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  slug text not null unique,
  name text not null,
  description text,
  status text not null default 'draft' check (status in ('draft','active','paused','closed','archived')),
  access_mode text not null default 'private' check (access_mode in ('private','code','public')),
  access_code_hash text,
  opens_at timestamptz,
  closes_at timestamptz,
  hero_asset_id uuid references public.media_assets(id) on delete set null,
  settings jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_locker_products (
  id uuid primary key default gen_random_uuid(),
  locker_store_id uuid not null references public.team_locker_stores(id) on delete cascade,
  product_id text not null,
  variant_ids jsonb not null default '[]'::jsonb,
  price_override numeric(12,2),
  personalization_enabled boolean not null default false,
  roster_id text references public.team_rosters(id) on delete set null,
  status text not null default 'active' check (status in ('draft','active','hidden','sold_out')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(locker_store_id,product_id)
);

create table if not exists public.team_locker_orders (
  id uuid primary key default gen_random_uuid(),
  locker_store_id uuid not null references public.team_locker_stores(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete restrict,
  buyer_user_id uuid references auth.users(id) on delete set null,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique(locker_store_id,order_id)
);

-- Protected staff administration for enterprise tables.
do $$
declare t text;
begin
  foreach t in array array[
    'organization_contracts','contract_signatures','payment_proofs','reorder_requests',
    'team_locker_stores','team_locker_products','team_locker_orders'
  ] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon,authenticated',t);
    execute format('grant select,insert,update,delete on public.%I to service_role',t);
    execute format('drop policy if exists %L on public.%I','staff manage '||t,t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_shababuna_staff()) with check (public.is_shababuna_staff())','staff manage '||t,t);
    execute format('grant select,insert,update,delete on public.%I to authenticated',t);
  end loop;
end $$;

-- Organization members can read their own enterprise records. Writes use
-- narrowly-scoped RPC functions so fields such as status and staff notes
-- cannot be forged from the browser.
drop policy if exists "organization contracts visible to members" on public.organization_contracts;
create policy "organization contracts visible to members" on public.organization_contracts
for select to authenticated using (public.is_shababuna_staff() or public.is_organization_member(organization_id));

drop policy if exists "contract signatures visible to members" on public.contract_signatures;
create policy "contract signatures visible to members" on public.contract_signatures
for select to authenticated using (
  public.is_shababuna_staff() or exists(
    select 1 from public.organization_contracts c
    where c.id=contract_id and public.is_organization_member(c.organization_id)
  )
);

drop policy if exists "payment proofs visible to owner" on public.payment_proofs;
create policy "payment proofs visible to owner" on public.payment_proofs
for select to authenticated using (
  public.is_shababuna_staff() or user_id=auth.uid()
  or (organization_id is not null and public.is_organization_member(organization_id))
);

drop policy if exists "reorders visible to organization" on public.reorder_requests;
create policy "reorders visible to organization" on public.reorder_requests
for select to authenticated using (
  public.is_shababuna_staff() or user_id=auth.uid() or public.is_organization_member(organization_id)
);

drop policy if exists "locker stores visible to members" on public.team_locker_stores;
create policy "locker stores visible to members" on public.team_locker_stores
for select to authenticated using (
  public.is_shababuna_staff() or public.is_organization_member(organization_id)
  or (status='active' and access_mode='public' and (opens_at is null or opens_at<=now()) and (closes_at is null or closes_at>now()))
);

drop policy if exists "locker products visible with store" on public.team_locker_products;
create policy "locker products visible with store" on public.team_locker_products
for select to authenticated using (
  public.is_shababuna_staff() or exists(
    select 1 from public.team_locker_stores s where s.id=locker_store_id and (
      public.is_organization_member(s.organization_id)
      or (s.status='active' and s.access_mode='public' and (s.opens_at is null or s.opens_at<=now()) and (s.closes_at is null or s.closes_at>now()))
    )
  )
);

drop policy if exists "locker orders visible to organization" on public.team_locker_orders;
create policy "locker orders visible to organization" on public.team_locker_orders
for select to authenticated using (
  public.is_shababuna_staff() or buyer_user_id=auth.uid() or public.is_organization_member(organization_id)
);

-- Existing B2B documents and shipping data become visible to their rightful
-- customers without granting update access.
drop policy if exists "customers read own invoices" on public.invoices;
create policy "customers read own invoices" on public.invoices for select to authenticated using (
  public.is_shababuna_staff()
  or (organization_id is not null and public.is_organization_member(organization_id))
  or exists(select 1 from public.orders o where o.id=order_id and o.user_id=auth.uid())
  or exists(select 1 from public.quote_requests q where q.id=quote_id and (q.user_id=auth.uid() or public.is_organization_member(q.organization_id)))
);

drop policy if exists "customers read own shipments" on public.shipments;
create policy "customers read own shipments" on public.shipments for select to authenticated using (
  public.is_shababuna_staff()
  or exists(select 1 from public.orders o where o.id=order_id and o.user_id=auth.uid())
  or exists(select 1 from public.quote_requests q where q.id=quote_id and (q.user_id=auth.uid() or public.is_organization_member(q.organization_id)))
);

drop policy if exists "customers read own shipment items" on public.shipment_items;
create policy "customers read own shipment items" on public.shipment_items for select to authenticated using (
  public.is_shababuna_staff() or exists(
    select 1 from public.shipments s where s.id=shipment_id and (
      exists(select 1 from public.orders o where o.id=s.order_id and o.user_id=auth.uid())
      or exists(select 1 from public.quote_requests q where q.id=s.quote_id and (q.user_id=auth.uid() or public.is_organization_member(q.organization_id)))
    )
  )
);

-- Atomic typed electronic acceptance. The hash is supplied by the trusted API
-- after canonicalising the signed payload; the contract itself is locked.
create or replace function public.customer_sign_contract(
  p_contract_id uuid,
  p_signer_name text,
  p_signer_email text,
  p_signature_type text,
  p_signature_hash text,
  p_consent_text_version text,
  p_signed_payload_hash text,
  p_ip_hash text default null,
  p_user_agent_hash text default null
)
returns public.organization_contracts
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare v_contract public.organization_contracts;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select * into v_contract from public.organization_contracts where id=p_contract_id for update;
  if v_contract.id is null or not public.is_organization_manager(v_contract.organization_id) then raise exception 'contract_not_found'; end if;
  if v_contract.status not in ('sent','viewed','changes_requested') then raise exception 'contract_not_signable'; end if;
  if v_contract.valid_until is not null and v_contract.valid_until<=now() then raise exception 'contract_expired'; end if;
  if p_signature_type not in ('typed','drawn','verified_click') then raise exception 'invalid_signature_type'; end if;
  if char_length(btrim(coalesce(p_signer_name,'')))<2 or char_length(btrim(coalesce(p_signer_email,'')))<5 then raise exception 'signer_details_required'; end if;
  if char_length(coalesce(p_signature_hash,''))<32 or char_length(coalesce(p_signed_payload_hash,''))<32 then raise exception 'invalid_signature_hash'; end if;
  insert into public.contract_signatures(contract_id,signer_id,signer_name,signer_email,signature_type,signature_hash,consent_text_version,signed_payload_hash,ip_hash,user_agent_hash)
  values(v_contract.id,auth.uid(),left(btrim(p_signer_name),160),lower(left(btrim(p_signer_email),320)),p_signature_type,p_signature_hash,left(p_consent_text_version,80),p_signed_payload_hash,p_ip_hash,p_user_agent_hash)
  on conflict(contract_id,signer_id) do nothing;
  update public.organization_contracts set status='accepted',accepted_at=now(),accepted_by=auth.uid(),updated_at=now() where id=v_contract.id returning * into v_contract;
  insert into public.operations_audit_log(actor_id,action,entity_type,entity_id,after_data)
  values(auth.uid(),'contract_signed','organization_contract',v_contract.id::text,jsonb_build_object('contractNumber',v_contract.contract_number,'signatureType',p_signature_type));
  return v_contract;
end;
$$;
revoke all on function public.customer_sign_contract(uuid,text,text,text,text,text,text,text,text) from public;
grant execute on function public.customer_sign_contract(uuid,text,text,text,text,text,text,text,text) to authenticated,service_role;

create or replace function public.customer_create_reorder_request(p_payload jsonb)
returns public.reorder_requests
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare v public.reorder_requests; v_org uuid; v_type text;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  v_org=nullif(p_payload->>'organization_id','')::uuid;
  if v_org is null or not public.is_organization_member(v_org) then raise exception 'organization_not_found'; end if;
  v_type=coalesce(nullif(p_payload->>'request_type',''),'full_reorder');
  if v_type not in ('full_reorder','single_player','replacement','additional_units') then raise exception 'invalid_reorder_type'; end if;
  if coalesce(p_payload->>'source_order_id',p_payload->>'source_quote_id',p_payload->>'source_design_id','')='' then raise exception 'reorder_source_required'; end if;
  insert into public.reorder_requests(user_id,organization_id,source_order_id,source_quote_id,source_design_id,request_type,items,player_details,customer_note)
  values(auth.uid(),v_org,nullif(p_payload->>'source_order_id','')::uuid,nullif(p_payload->>'source_quote_id',''),nullif(p_payload->>'source_design_id',''),v_type,coalesce(p_payload->'items','[]'::jsonb),coalesce(p_payload->'player_details','{}'::jsonb),left(coalesce(p_payload->>'customer_note',''),3000))
  returning * into v;
  perform public.enqueue_commerce_notification('reorder:'||v.id::text,'new_reorder_request','reorder',v.id::text,null,'New Shababuna reorder request — '||v.request_number,jsonb_build_object('requestNumber',v.request_number,'organizationId',v.organization_id,'requestType',v.request_type));
  return v;
end;
$$;
revoke all on function public.customer_create_reorder_request(jsonb) from public;
grant execute on function public.customer_create_reorder_request(jsonb) to authenticated,service_role;

-- Customer messages are already protected by project_messages RLS. This RPC
-- normalises ownership and avoids clients forging sender identities.
create or replace function public.customer_create_project_message(
  p_organization_id uuid,
  p_quote_id text,
  p_order_id uuid,
  p_body text,
  p_attachment_ids jsonb default '[]'::jsonb
)
returns public.project_messages
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare v public.project_messages; v_allowed boolean:=false;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if char_length(btrim(coalesce(p_body,'')))<1 or char_length(p_body)>5000 then raise exception 'invalid_message'; end if;
  if p_organization_id is not null and public.is_organization_member(p_organization_id) then v_allowed=true; end if;
  if p_quote_id is not null and exists(select 1 from public.quote_requests q where q.id=p_quote_id and (q.user_id=auth.uid() or public.is_organization_member(q.organization_id))) then v_allowed=true; end if;
  if p_order_id is not null and exists(select 1 from public.orders o where o.id=p_order_id and o.user_id=auth.uid()) then v_allowed=true; end if;
  if not v_allowed then raise exception 'message_target_not_found'; end if;
  insert into public.project_messages(organization_id,quote_id,order_id,sender_id,body,attachment_ids,customer_visible)
  values(p_organization_id,p_quote_id,p_order_id,auth.uid(),left(btrim(p_body),5000),coalesce(p_attachment_ids,'[]'::jsonb),true)
  returning * into v;
  return v;
end;
$$;
revoke all on function public.customer_create_project_message(uuid,text,uuid,text,jsonb) from public;
grant execute on function public.customer_create_project_message(uuid,text,uuid,text,jsonb) to authenticated,service_role;

commit;

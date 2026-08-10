begin;

-- SHABABUNA production-completion layer.
-- This migration is intentionally additive and replaces unsafe financial and
-- return workflows with authoritative, auditable versions.

create extension if not exists pgcrypto;

-- Staff access requires a trusted app_metadata role and AAL2. Service-role
-- automation bypasses MFA while browser staff sessions do not.
create or replace function public.is_shababuna_staff()
returns boolean
language sql
stable
security definer
set search_path=public,pg_temp
as $$
  select auth.role()='service_role' or (
    coalesce(auth.jwt()->'app_metadata'->>'role','') in ('super_admin','admin','operations','sales')
    and coalesce(auth.jwt()->>'aal','aal1')='aal2'
  );
$$;
revoke all on function public.is_shababuna_staff() from public;
grant execute on function public.is_shababuna_staff() to authenticated,service_role;

-- Security and operational observability.
create table if not exists public.security_events (
  id uuid primary key default gen_random_uuid(),
  severity text not null default 'error' check (severity in ('debug','info','warning','error','critical')),
  source text not null,
  event_type text not null,
  message text not null,
  context jsonb not null default '{}'::jsonb,
  request_id text,
  user_id uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists security_events_created_idx on public.security_events(created_at desc);
create index if not exists security_events_unresolved_idx on public.security_events(severity,created_at desc) where resolved_at is null;
alter table public.security_events enable row level security;
revoke all on public.security_events from anon,authenticated;
grant select,insert,update on public.security_events to service_role;
drop policy if exists "staff read security events" on public.security_events;
create policy "staff read security events" on public.security_events for select to authenticated using (public.is_shababuna_staff());
grant select on public.security_events to authenticated;

-- Complete customer/order snapshots. Sensitive fields stay in the trusted DB,
-- never in localStorage.
alter table public.orders
  add column if not exists customer_name text,
  add column if not exists customer_phone text,
  add column if not exists customer_whatsapp text,
  add column if not exists preferred_contact_method text,
  add column if not exists shipping_address jsonb not null default '{}'::jsonb,
  add column if not exists billing_address jsonb not null default '{}'::jsonb,
  add column if not exists country_code text,
  add column if not exists exchange_rate_snapshot numeric(12,6),
  add column if not exists product_price_snapshot jsonb not null default '[]'::jsonb,
  add column if not exists shipping_price_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists outstanding_balance numeric(12,2) not null default 0;

update public.orders
set outstanding_balance=greatest(round(total-coalesce(amount_paid,0),2),0),
    country_code=coalesce(country_code,upper(shipping_summary->>'countryCode'),upper(shipping_summary->>'country')),
    shipping_address=case when shipping_address='{}'::jsonb then coalesce(shipping_summary->'address',shipping_summary,'{}'::jsonb) else shipping_address end,
    product_price_snapshot=case when product_price_snapshot='[]'::jsonb then coalesce(items_snapshot,'[]'::jsonb) else product_price_snapshot end,
    shipping_price_snapshot=case when shipping_price_snapshot='{}'::jsonb then jsonb_build_object('amount',shipping_total,'currency',currency,'capturedAt',created_at) else shipping_price_snapshot end;

alter table public.orders drop constraint if exists orders_balance_check;
alter table public.orders drop constraint if exists orders_outstanding_balance_check;
alter table public.orders add constraint orders_outstanding_balance_check
  check (
    outstanding_balance>=0
    and amount_due_now>=0
    and remaining_balance>=0
    and amount_due_now<=outstanding_balance+0.01
    and remaining_balance<=outstanding_balance+0.01
  ) not valid;

-- Quote totals are always derived from components. Staff cannot supply a
-- contradictory total.
alter table public.quote_requests
  add column if not exists tax_total numeric(12,2) not null default 0,
  add column if not exists discount_total numeric(12,2) not null default 0,
  add column if not exists outstanding_balance numeric(12,2) not null default 0,
  add column if not exists billing_details jsonb not null default '{}'::jsonb,
  add column if not exists accepted_at timestamptz;
update public.quote_requests
set total=case when subtotal is null then null else greatest(round(coalesce(subtotal,0)+coalesce(shipping_total,0)+coalesce(tax_total,0)-coalesce(discount_total,0),2),0) end,
    outstanding_balance=case when total is null then 0 else greatest(round(total-coalesce(amount_paid,0),2),0) end;
alter table public.quote_requests drop constraint if exists quote_requests_financial_components_check;
alter table public.quote_requests add constraint quote_requests_financial_components_check
  check (tax_total>=0 and discount_total>=0 and outstanding_balance>=0 and amount_due_now>=0 and amount_due_now<=outstanding_balance+0.01) not valid;

-- Immutable accounting ledger. Corrections are appended; rows are never
-- updated or deleted through authenticated roles.
create table if not exists public.payment_ledger (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('order','quote','special_request')),
  entity_id text not null,
  event_id text not null,
  event_kind text not null check (event_kind in ('charge','refund','adjustment','cash_received','cash_reversed')),
  provider text not null,
  transaction_id text,
  amount numeric(12,2) not null check (amount>0),
  currency text not null default 'USD',
  idempotency_key text not null,
  payload_hash text,
  metadata jsonb not null default '{}'::jsonb,
  recorded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(entity_type,idempotency_key)
);
create index if not exists payment_ledger_entity_idx on public.payment_ledger(entity_type,entity_id,created_at desc);
alter table public.payment_ledger enable row level security;
revoke all on public.payment_ledger from anon,authenticated;
grant select,insert on public.payment_ledger to service_role;
drop policy if exists "staff read payment ledger" on public.payment_ledger;
create policy "staff read payment ledger" on public.payment_ledger for select to authenticated using (public.is_shababuna_staff());
grant select on public.payment_ledger to authenticated;

-- Product administration and legal manufacturing-claim evidence.
alter table public.product_catalog
  add column if not exists wholesale_price numeric(12,2),
  add column if not exists brand text,
  add column if not exists category text,
  add column if not exists subcategory text,
  add column if not exists warehouse_id uuid,
  add column if not exists inventory_source text,
  add column if not exists inventory_verified_at timestamptz,
  add column if not exists manufacturing_country text,
  add column if not exists cut_country text,
  add column if not exists sewing_country text,
  add column if not exists printing_country text,
  add column if not exists material_origin text,
  add column if not exists manufacturing_claim_status text not null default 'unverified',
  add column if not exists claim_evidence_reference text,
  add column if not exists claim_verified boolean not null default false,
  add column if not exists claim_verified_by uuid references auth.users(id) on delete set null,
  add column if not exists claim_verified_at timestamptz;
alter table public.product_catalog drop constraint if exists product_catalog_product_status_check;
alter table public.product_catalog add constraint product_catalog_product_status_check
  check (product_status in ('draft','active','coming_soon','archived','out_of_stock')) not valid;
alter table public.product_catalog drop constraint if exists product_catalog_claim_check;
alter table public.product_catalog add constraint product_catalog_claim_check check (
  manufacturing_claim_status in ('unverified','under_review','verified','rejected')
  and (not claim_verified or (manufacturing_claim_status='verified' and claim_evidence_reference is not null and manufacturing_country is not null))
) not valid;

create table if not exists public.catalog_brands (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique,
  logo_asset_id uuid,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.catalog_categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.catalog_categories(id) on delete set null,
  slug text not null unique,
  name_en text not null,
  name_ar text not null,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.catalog_collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_en text not null,
  name_ar text not null,
  description_en text,
  description_ar text,
  status text not null default 'draft' check (status in ('draft','active','archived')),
  product_ids jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  entity_type text,
  entity_id text,
  bucket text not null,
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null,
  byte_size bigint not null check (byte_size>0),
  sha256 text,
  alt_text_en text,
  alt_text_ar text,
  sort_order integer not null default 0,
  scan_status text not null default 'quarantined' check (scan_status in ('quarantined','scanning','clean','infected','failed')),
  visibility text not null default 'private' check (visibility in ('private','public')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists media_assets_entity_idx on public.media_assets(entity_type,entity_id,sort_order);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('media-quarantine','media-quarantine',false,3145728,array[
  'image/jpeg','image/png','image/webp','application/pdf','text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]) on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('privacy-exports','privacy-exports',false,10485760,array['application/json'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

-- Warehouses and authoritative stock movements.
create table if not exists public.warehouses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  country_code text not null,
  city text,
  address jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  ready_to_ship_location boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.warehouse_inventory (
  warehouse_id uuid not null references public.warehouses(id) on delete cascade,
  variant_id text not null references public.product_catalog(variant_id) on delete cascade,
  on_hand integer not null default 0 check (on_hand>=0),
  reserved integer not null default 0 check (reserved>=0 and reserved<=on_hand),
  reorder_point integer not null default 0 check (reorder_point>=0),
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key(warehouse_id,variant_id)
);
create table if not exists public.stock_movement_ledger (
  id uuid primary key default gen_random_uuid(),
  warehouse_id uuid not null references public.warehouses(id) on delete restrict,
  variant_id text not null references public.product_catalog(variant_id) on delete restrict,
  movement_type text not null check (movement_type in ('receipt','sale_reservation','reservation_release','sale','return','adjustment','transfer_in','transfer_out','damage')),
  quantity_delta integer not null check (quantity_delta<>0),
  balance_after integer not null check (balance_after>=0),
  reference_type text,
  reference_id text,
  note text,
  idempotency_key text not null unique,
  recorded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists stock_movement_variant_idx on public.stock_movement_ledger(variant_id,created_at desc);

-- Full B2B administration primitives.
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  email text,
  phone text,
  country_code text,
  status text not null default 'active' check (status in ('active','inactive','blocked')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  po_number text not null unique,
  supplier_id uuid references public.suppliers(id) on delete restrict,
  organization_id uuid references public.organizations(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','sent','accepted','in_production','partially_received','received','cancelled')),
  currency text not null default 'USD',
  subtotal numeric(12,2) not null default 0,
  shipping_total numeric(12,2) not null default 0,
  tax_total numeric(12,2) not null default 0,
  discount_total numeric(12,2) not null default 0,
  total numeric(12,2) generated always as (greatest(0,subtotal+shipping_total+tax_total-discount_total)) stored,
  items jsonb not null default '[]'::jsonb,
  expected_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  order_id uuid references public.orders(id) on delete set null,
  quote_id text references public.quote_requests(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  customer_email text,
  status text not null default 'draft' check (status in ('draft','issued','partially_paid','paid','void','refunded')),
  currency text not null default 'USD',
  subtotal numeric(12,2) not null default 0,
  shipping_total numeric(12,2) not null default 0,
  tax_total numeric(12,2) not null default 0,
  discount_total numeric(12,2) not null default 0,
  total numeric(12,2) generated always as (greatest(0,subtotal+shipping_total+tax_total-discount_total)) stored,
  amount_paid numeric(12,2) not null default 0,
  due_at timestamptz,
  pdf_asset_id uuid references public.media_assets(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.carriers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  tracking_url_template text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.carriers add column if not exists code text;
alter table public.carriers add column if not exists updated_at timestamptz not null default now();
create unique index if not exists carriers_code_uidx on public.carriers(code) where code is not null;

create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  shipment_number text not null unique,
  order_id uuid references public.orders(id) on delete restrict,
  quote_id text references public.quote_requests(id) on delete restrict,
  carrier_id uuid references public.carriers(id) on delete set null,
  tracking_number text,
  status text not null default 'pending' check (status in ('pending','label_created','in_transit','out_for_delivery','delivered','exception','cancelled')),
  shipped_at timestamptz,
  delivered_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.shipment_items (
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  order_item_id uuid references public.order_items(id) on delete restrict,
  variant_id text,
  quantity integer not null check (quantity>0),
  primary key(shipment_id,order_item_id)
);
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null check (discount_type in ('fixed','percent')),
  discount_value numeric(12,2) not null check (discount_value>0),
  minimum_subtotal numeric(12,2) not null default 0,
  maximum_discount numeric(12,2),
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit integer,
  usage_count integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.tax_rules (
  id uuid primary key default gen_random_uuid(),
  country_code text not null,
  region text,
  rate numeric(8,6) not null check (rate>=0 and rate<=1),
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  unique(country_code,region)
);
create table if not exists public.project_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  quote_id text references public.quote_requests(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  body text not null check (char_length(body) between 1 and 5000),
  attachment_ids jsonb not null default '[]'::jsonb,
  customer_visible boolean not null default true,
  created_at timestamptz not null default now()
);

-- Design-studio persistence: movable layers, comments, assets and secure shares.
alter table public.custom_designs
  add column if not exists autosave_revision bigint not null default 0,
  add column if not exists locked_at timestamptz,
  add column if not exists locked_by uuid references auth.users(id) on delete set null,
  add column if not exists production_metadata jsonb not null default '{}'::jsonb;
create table if not exists public.design_assets (
  id uuid primary key default gen_random_uuid(),
  design_id text not null references public.custom_designs(id) on delete cascade,
  media_asset_id uuid not null references public.media_assets(id) on delete restrict,
  asset_role text not null check (asset_role in ('logo','sponsor','reference','proof','production','tech_pack')),
  created_at timestamptz not null default now(),
  unique(design_id,media_asset_id,asset_role)
);
create table if not exists public.design_comments (
  id uuid primary key default gen_random_uuid(),
  design_id text not null references public.custom_designs(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  view_key text not null default 'front',
  x numeric(8,5) not null check (x between 0 and 1),
  y numeric(8,5) not null check (y between 0 and 1),
  body text not null check (char_length(body) between 1 and 1000),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.design_share_links (
  id uuid primary key default gen_random_uuid(),
  design_id text not null references public.custom_designs(id) on delete cascade,
  token_hash text not null unique,
  permissions text not null default 'view' check (permissions in ('view','comment','approve')),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Manufacturing claim review evidence.
create table if not exists public.manufacturing_claim_evidence (
  id uuid primary key default gen_random_uuid(),
  product_id text not null,
  variant_id text references public.product_catalog(variant_id) on delete cascade,
  media_asset_id uuid references public.media_assets(id) on delete restrict,
  evidence_reference text,
  status text not null default 'under_review' check (status in ('under_review','approved','rejected','expired')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  expires_at timestamptz,
  review_note text,
  created_at timestamptz not null default now()
);

-- Privacy and retention operations.
create table if not exists public.privacy_export_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'requested' check (status in ('requested','processing','ready','expired','failed')),
  export_asset_id uuid references public.media_assets(id) on delete set null,
  expires_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.retention_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type text not null,
  entity_type text not null,
  entity_id text not null,
  eligible_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','running','completed','failed','cancelled')),
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(job_type,entity_type,entity_id)
);

-- Enable RLS on all operational tables and grant staff access only.
do $$
declare t text;
begin
  foreach t in array array[
    'catalog_brands','catalog_categories','catalog_collections','media_assets','warehouses','warehouse_inventory',
    'stock_movement_ledger','suppliers','purchase_orders','invoices','carriers','shipments','shipment_items',
    'coupons','tax_rules','project_messages','design_assets','design_comments','design_share_links',
    'manufacturing_claim_evidence','privacy_export_requests','retention_jobs'
  ] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon,authenticated',t);
    execute format('grant select,insert,update,delete on public.%I to service_role',t);
    execute format('drop policy if exists %L on public.%I','staff manage '||t,t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_shababuna_staff()) with check (public.is_shababuna_staff())','staff manage '||t,t);
    execute format('grant select,insert,update,delete on public.%I to authenticated',t);
  end loop;
end $$;

-- Customer-specific policies for collaboration and privacy data.
drop policy if exists "customers read project messages" on public.project_messages;
create policy "customers read project messages" on public.project_messages for select to authenticated using (
  customer_visible and (
    public.is_shababuna_staff()
    or (organization_id is not null and public.is_organization_member(organization_id))
    or exists(select 1 from public.quote_requests q where q.id=quote_id and (q.user_id=auth.uid() or public.is_organization_member(q.organization_id)))
    or exists(select 1 from public.orders o where o.id=order_id and o.user_id=auth.uid())
  )
);
drop policy if exists "customers create project messages" on public.project_messages;
create policy "customers create project messages" on public.project_messages for insert to authenticated with check (
  sender_id=auth.uid() and (
    (organization_id is not null and public.is_organization_member(organization_id))
    or exists(select 1 from public.quote_requests q where q.id=quote_id and (q.user_id=auth.uid() or public.is_organization_member(q.organization_id)))
    or exists(select 1 from public.orders o where o.id=order_id and o.user_id=auth.uid())
  )
);
drop policy if exists "design owners read comments" on public.design_comments;
create policy "design owners read comments" on public.design_comments for select to authenticated using (
  public.is_shababuna_staff() or exists(select 1 from public.custom_designs d where d.id=design_id and (d.user_id=auth.uid() or public.is_organization_member(d.organization_id)))
);
drop policy if exists "design owners create comments" on public.design_comments;
create policy "design owners create comments" on public.design_comments for insert to authenticated with check (
  author_id=auth.uid() and exists(select 1 from public.custom_designs d where d.id=design_id and (d.user_id=auth.uid() or public.is_organization_member(d.organization_id)))
);
drop policy if exists "users manage own privacy exports" on public.privacy_export_requests;
create policy "users manage own privacy exports" on public.privacy_export_requests for select to authenticated using (user_id=auth.uid() or public.is_shababuna_staff());
create policy "users request own privacy exports" on public.privacy_export_requests for insert to authenticated with check (user_id=auth.uid());
grant select,insert on public.privacy_export_requests to authenticated;

-- Atomic inventory movement. This function is the only supported way to
-- mutate warehouse stock from staff/browser workflows.
create or replace function public.staff_record_stock_movement(
  p_warehouse_id uuid,
  p_variant_id text,
  p_movement_type text,
  p_quantity_delta integer,
  p_reference_type text default null,
  p_reference_id text default null,
  p_note text default '',
  p_idempotency_key text default null
) returns public.warehouse_inventory
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare v_row public.warehouse_inventory; v_key text; v_new integer;
begin
  if not public.is_shababuna_staff() then raise exception 'staff_mfa_required'; end if;
  if p_quantity_delta=0 then raise exception 'invalid_stock_delta'; end if;
  if p_movement_type not in ('receipt','sale_reservation','reservation_release','sale','return','adjustment','transfer_in','transfer_out','damage') then raise exception 'invalid_stock_movement'; end if;
  v_key=coalesce(nullif(btrim(p_idempotency_key),''),gen_random_uuid()::text);
  if exists(select 1 from public.stock_movement_ledger where idempotency_key=v_key) then
    select * into v_row from public.warehouse_inventory where warehouse_id=p_warehouse_id and variant_id=p_variant_id;
    return v_row;
  end if;
  insert into public.warehouse_inventory(warehouse_id,variant_id,on_hand,reserved)
  values(p_warehouse_id,p_variant_id,0,0) on conflict do nothing;
  select * into v_row from public.warehouse_inventory where warehouse_id=p_warehouse_id and variant_id=p_variant_id for update;
  v_new=v_row.on_hand+p_quantity_delta;
  if v_new<0 or v_new<v_row.reserved then raise exception 'insufficient_inventory'; end if;
  update public.warehouse_inventory set on_hand=v_new,verified_at=now(),verified_by=auth.uid(),updated_at=now()
  where warehouse_id=p_warehouse_id and variant_id=p_variant_id returning * into v_row;
  insert into public.stock_movement_ledger(warehouse_id,variant_id,movement_type,quantity_delta,balance_after,reference_type,reference_id,note,idempotency_key,recorded_by)
  values(p_warehouse_id,p_variant_id,p_movement_type,p_quantity_delta,v_new,left(p_reference_type,80),left(p_reference_id,160),left(p_note,1000),v_key,auth.uid());
  update public.product_catalog set inventory_quantity=(select coalesce(sum(on_hand-reserved),0) from public.warehouse_inventory where variant_id=p_variant_id),inventory_source='warehouse_ledger',inventory_verified_at=now(),updated_at=now() where variant_id=p_variant_id;
  return v_row;
end;
$$;
revoke all on function public.staff_record_stock_movement(uuid,text,text,integer,text,text,text,text) from public;
grant execute on function public.staff_record_stock_movement(uuid,text,text,integer,text,text,text,text) to authenticated,service_role;

-- Correct international shipping quote: preserve staged 50/50 plans.
create or replace function public.staff_set_shipping_quote(p_order_id uuid,p_shipping_total numeric,p_note text default '')
returns public.orders
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare before_row public.orders; after_row public.orders; v_total numeric(12,2); v_outstanding numeric(12,2); v_due numeric(12,2);
begin
  if not public.is_shababuna_staff() then raise exception 'staff_mfa_required'; end if;
  if p_shipping_total is null or p_shipping_total<0 then raise exception 'invalid_shipping_total'; end if;
  select * into before_row from public.orders where id=p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  if not before_row.shipping_quote_required and before_row.order_status<>'pending_shipping_quote' then raise exception 'shipping_quote_not_required'; end if;
  v_total=round(before_row.subtotal+p_shipping_total+before_row.tax_total-before_row.discount_total,2);
  v_outstanding=greatest(round(v_total-before_row.amount_paid,2),0);
  v_due=case
    when before_row.payment_plan='half' and before_row.amount_paid<=0 then least(round(v_total/2,2),v_outstanding)
    when before_row.payment_plan='half' and before_row.amount_paid>0 then 0
    else v_outstanding
  end;
  update public.orders set
    shipping_total=round(p_shipping_total,2),total=v_total,outstanding_balance=v_outstanding,
    amount_due_now=v_due,remaining_balance=greatest(v_outstanding-v_due,0),
    shipping_quote_required=false,order_status=case when v_due>0 then 'awaiting_payment' else 'confirmed' end,
    payment_status=case when amount_paid>0 then 'partially_paid' else 'pending' end,
    shipping_quote_expires_at=now()+interval '7 days',payment_expires_at=case when v_due>0 then now()+interval '7 days' else null end,
    shipping_summary=coalesce(shipping_summary,'{}'::jsonb)||jsonb_build_object('amount',p_shipping_total,'currency','USD','pendingQuote',false,'staffNote',left(coalesce(p_note,''),500),'quotedAt',now(),'expiresAt',now()+interval '7 days'),
    shipping_price_snapshot=jsonb_build_object('amount',p_shipping_total,'currency','USD','quotedAt',now()),updated_at=now()
  where id=p_order_id returning * into after_row;
  insert into public.operations_audit_log(actor_id,action,entity_type,entity_id,before_data,after_data) values(auth.uid(),'set_shipping_quote','order',p_order_id::text,to_jsonb(before_row),to_jsonb(after_row));
  perform public.enqueue_commerce_notification('shipping-quote:'||after_row.id::text||':'||extract(epoch from after_row.updated_at)::bigint,'shipping_quote_ready','order',after_row.id::text,after_row.customer_email,'Shababuna shipping quote ready — '||after_row.order_number,jsonb_build_object('orderNumber',after_row.order_number,'shippingTotal',after_row.shipping_total,'total',after_row.total,'amountDueNow',after_row.amount_due_now,'outstandingBalance',after_row.outstanding_balance,'paymentPlan',after_row.payment_plan,'note',left(coalesce(p_note,''),500),'expiresAt',after_row.shipping_quote_expires_at));
  return after_row;
end;
$$;
revoke all on function public.staff_set_shipping_quote(uuid,numeric,text) from public;
grant execute on function public.staff_set_shipping_quote(uuid,numeric,text) to authenticated,service_role;

-- Strict quote calculation: total is never accepted as an independent input.
create or replace function public.staff_update_quote(
  p_quote_id text,p_status text,p_subtotal numeric default null,p_shipping_total numeric default null,p_total numeric default null,
  p_tax_total numeric default null,p_discount_total numeric default null
) returns public.quote_requests
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare before_row public.quote_requests; after_row public.quote_requests; v_sub numeric(12,2); v_ship numeric(12,2); v_tax numeric(12,2); v_discount numeric(12,2); v_total numeric(12,2); v_status text; v_outstanding numeric(12,2); v_due numeric(12,2);
begin
  if not public.is_shababuna_staff() then raise exception 'staff_mfa_required'; end if;
  select * into before_row from public.quote_requests where id=p_quote_id for update;
  if not found then raise exception 'quote_not_found'; end if;
  v_status=coalesce(p_status,before_row.status);
  if not public.is_valid_quote_status_transition(before_row.status,v_status) then raise exception 'invalid_quote_status_transition'; end if;
  if v_status in ('deposit_paid','completed') and v_status is distinct from before_row.status then raise exception 'record_quote_payment_through_financial_function'; end if;
  v_sub=coalesce(p_subtotal,before_row.subtotal); v_ship=coalesce(p_shipping_total,before_row.shipping_total,0);
  v_tax=coalesce(p_tax_total,before_row.tax_total,0); v_discount=coalesce(p_discount_total,before_row.discount_total,0);
  if v_sub is not null and (v_sub<0 or v_ship<0 or v_tax<0 or v_discount<0) then raise exception 'invalid_quote_price'; end if;
  v_total=case when v_sub is null then null else greatest(round(v_sub+v_ship+v_tax-v_discount,2),0) end;
  if p_total is not null and v_total is distinct from round(p_total,2) then raise exception 'quote_total_mismatch'; end if;
  if before_row.amount_paid>0 and v_total is distinct from before_row.total then raise exception 'quote_price_locked_after_payment'; end if;
  if v_status in ('quote_sent','awaiting_approval','deposit_required') and v_total is null then raise exception 'quote_price_required'; end if;
  v_outstanding=case when v_total is null then 0 else greatest(round(v_total-before_row.amount_paid,2),0) end;
  v_due=case
    when v_total is null then 0
    when v_status='deposit_required' then least(round(v_total*before_row.deposit_percent/100.0,2),v_outstanding)
    when v_status='final_payment_required' then v_outstanding
    else least(before_row.amount_due_now,v_outstanding)
  end;
  update public.quote_requests set status=v_status,subtotal=v_sub,shipping_total=v_ship,tax_total=v_tax,discount_total=v_discount,total=v_total,
    deposit_amount=case when v_total is null then null else round(v_total*deposit_percent/100.0,2) end,
    outstanding_balance=v_outstanding,amount_due_now=v_due,remaining_balance=greatest(v_outstanding-v_due,0),
    payment_status=case when amount_paid>=coalesce(v_total,0) and v_total is not null then 'paid' when amount_paid>0 then 'partially_paid' else 'pending' end,
    expires_at=case when v_status in ('quote_sent','awaiting_approval') then now()+interval '7 days' else expires_at end,updated_at=now()
  where id=p_quote_id returning * into after_row;
  insert into public.operations_audit_log(actor_id,action,entity_type,entity_id,before_data,after_data) values(auth.uid(),'update_quote','quote',p_quote_id,to_jsonb(before_row),to_jsonb(after_row));
  perform public.enqueue_commerce_notification('quote:'||after_row.id||':'||extract(epoch from after_row.updated_at)::bigint,'quote_update','quote',after_row.id,coalesce(after_row.request_data->>'customerEmail',after_row.request_data->>'email',''),'Shababuna quote update — '||after_row.quote_number,jsonb_build_object('quoteNumber',after_row.quote_number,'status',after_row.status,'subtotal',after_row.subtotal,'shippingTotal',after_row.shipping_total,'taxTotal',after_row.tax_total,'discountTotal',after_row.discount_total,'total',after_row.total,'depositAmount',after_row.deposit_amount,'amountDueNow',after_row.amount_due_now,'outstandingBalance',after_row.outstanding_balance,'expiresAt',after_row.expires_at));
  return after_row;
end;
$$;
revoke all on function public.staff_update_quote(text,text,numeric,numeric,numeric,numeric,numeric) from public;
grant execute on function public.staff_update_quote(text,text,numeric,numeric,numeric,numeric,numeric) to authenticated,service_role;

-- Financial event application keeps outstanding balance non-zero until money
-- is actually verified. remaining_balance represents the future (not current)
-- portion; outstanding_balance is the full unpaid amount.
create or replace function public.apply_verified_payment_event(
  p_provider text,p_event_id text,p_order_number text,p_event_status text,p_amount numeric,p_currency text,p_transaction_id text,p_payload_hash text
) returns public.orders
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare before_row public.orders; after_row public.orders; v_inserted integer:=0; v_success boolean; v_new_paid numeric(12,2); v_outstanding numeric(12,2); v_existing public.payment_events;
begin
  if auth.role()<>'service_role' and not public.is_shababuna_staff() then raise exception 'service_or_staff_required'; end if;
  if coalesce(length(btrim(p_event_id)),0)<4 or coalesce(length(btrim(p_payload_hash)),0)<16 then raise exception 'invalid_payment_event'; end if;
  select * into before_row from public.orders where order_number=upper(btrim(p_order_number)) for update;
  if not found then raise exception 'order_not_found'; end if;
  insert into public.payment_events(id,provider,event_type,order_id,order_number,transaction_id,amount,currency,payload_hash)
  values(left(p_event_id,240),left(coalesce(p_provider,'unknown'),80),left(coalesce(p_event_status,'unknown'),80),before_row.id,before_row.order_number,left(coalesce(p_transaction_id,''),240),p_amount,upper(coalesce(p_currency,'')),left(p_payload_hash,128)) on conflict(id) do nothing;
  get diagnostics v_inserted=row_count;
  if v_inserted=0 then
    select * into v_existing from public.payment_events where id=left(p_event_id,240);
    if not found or v_existing.order_number<>before_row.order_number or v_existing.provider<>left(coalesce(p_provider,'unknown'),80) or v_existing.payload_hash<>left(p_payload_hash,128) then raise exception 'payment_event_replay_mismatch'; end if;
    return before_row;
  end if;
  v_success=lower(coalesce(p_event_status,'')) in ('paid','succeeded','success','completed');
  if not v_success then
    update public.orders set payment_status=case when payment_status='partially_paid' then 'partially_paid' when lower(coalesce(p_event_status,'')) in ('cancelled','canceled') then 'cancelled' else 'failed' end,payment_provider=left(coalesce(p_provider,''),120),payment_reference=left(coalesce(p_transaction_id,p_event_id),240),updated_at=now() where id=before_row.id returning * into after_row;
  else
    if upper(coalesce(p_currency,''))<>'USD' then raise exception 'payment_currency_mismatch'; end if;
    if p_amount is null or abs(round(p_amount,2)-round(before_row.amount_due_now,2))>0.01 then raise exception 'payment_amount_mismatch'; end if;
    if before_row.amount_due_now<=0 or before_row.payment_status not in ('pending','failed','partially_paid') then raise exception 'order_not_payable'; end if;
    v_new_paid=round(before_row.amount_paid+p_amount,2); v_outstanding=greatest(round(before_row.total-v_new_paid,2),0);
    insert into public.payment_ledger(entity_type,entity_id,event_id,event_kind,provider,transaction_id,amount,currency,idempotency_key,payload_hash,metadata,recorded_by)
    values('order',before_row.id::text,left(p_event_id,240),'charge',left(coalesce(p_provider,'unknown'),80),left(coalesce(p_transaction_id,''),240),round(p_amount,2),'USD',left(p_event_id,240),left(p_payload_hash,128),jsonb_build_object('orderNumber',before_row.order_number,'stage',before_row.payment_stage),auth.uid()) on conflict do nothing;
    update public.orders set amount_paid=v_new_paid,outstanding_balance=v_outstanding,amount_due_now=0,remaining_balance=v_outstanding,
      payment_status=case when v_outstanding<=0.01 then 'paid' else 'partially_paid' end,payment_stage=case when v_outstanding<=0.01 then 'complete' else 'balance' end,
      payment_provider=left(coalesce(p_provider,''),120),payment_reference=left(coalesce(p_transaction_id,p_event_id),240),last_payment_at=now(),
      order_status=case when v_outstanding<=0.01 and before_row.order_status='final_payment_required' then 'ready_to_ship' when before_row.order_status in ('awaiting_payment','awaiting_cash_confirmation','received') then 'confirmed' else before_row.order_status end,
      fulfillment_status=case when before_row.fulfillment_status='quote_pending' then 'unfulfilled' else before_row.fulfillment_status end,updated_at=now()
    where id=before_row.id returning * into after_row;
  end if;
  update public.payment_events set processed=true,processed_at=now(),result=jsonb_build_object('paymentStatus',after_row.payment_status,'orderStatus',after_row.order_status,'amountPaid',after_row.amount_paid,'amountDueNow',after_row.amount_due_now,'outstandingBalance',after_row.outstanding_balance) where id=left(p_event_id,240);
  insert into public.operations_audit_log(actor_id,action,entity_type,entity_id,before_data,after_data) values(auth.uid(),'verified_payment_event','order',before_row.id::text,to_jsonb(before_row),to_jsonb(after_row));
  perform public.enqueue_commerce_notification('payment:'||left(p_event_id,200),'payment_update','order',after_row.id::text,after_row.customer_email,'Shababuna payment update — '||after_row.order_number,jsonb_build_object('orderNumber',after_row.order_number,'paymentStatus',after_row.payment_status,'amountPaid',after_row.amount_paid,'amountDueNow',after_row.amount_due_now,'outstandingBalance',after_row.outstanding_balance,'provider',p_provider,'reference',p_transaction_id));
  return after_row;
end;
$$;
revoke all on function public.apply_verified_payment_event(text,text,text,text,numeric,text,text,text) from public;
grant execute on function public.apply_verified_payment_event(text,text,text,text,numeric,text,text,text) to service_role;

create or replace function public.apply_verified_quote_payment_event(
  p_provider text,p_event_id text,p_quote_number text,p_event_status text,p_amount numeric,p_currency text,p_transaction_id text,p_payload_hash text
) returns public.quote_requests
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare before_row public.quote_requests; after_row public.quote_requests; v_existing public.quote_verified_payment_events; v_paid numeric(12,2); v_outstanding numeric(12,2); v_inserted integer:=0;
begin
  if auth.role()<>'service_role' then raise exception 'service_role_required'; end if;
  if lower(coalesce(p_event_status,'')) not in ('succeeded','paid','completed') or upper(coalesce(p_currency,''))<>'USD' then raise exception 'quote_payment_not_successful'; end if;
  select * into before_row from public.quote_requests where quote_number=upper(btrim(p_quote_number)) for update;
  if not found then raise exception 'quote_not_found'; end if;
  if before_row.status not in ('deposit_required','final_payment_required') or before_row.amount_due_now<=0 then raise exception 'quote_not_payable'; end if;
  if p_amount is null or abs(round(p_amount,2)-round(before_row.amount_due_now,2))>0.01 then raise exception 'quote_payment_amount_mismatch'; end if;
  insert into public.quote_verified_payment_events(id,quote_id,quote_number,provider,transaction_id,amount,currency,payload_hash)
  values(left(p_event_id,240),before_row.id,before_row.quote_number,left(coalesce(p_provider,'unknown'),80),left(coalesce(p_transaction_id,''),240),round(p_amount,2),'USD',left(p_payload_hash,128)) on conflict(id) do nothing;
  get diagnostics v_inserted=row_count;
  if v_inserted=0 then
    select * into v_existing from public.quote_verified_payment_events where id=left(p_event_id,240);
    if not found or v_existing.quote_id<>before_row.id or v_existing.payload_hash<>left(p_payload_hash,128) then raise exception 'quote_payment_event_replay_mismatch'; end if;
    return before_row;
  end if;
  v_paid=round(before_row.amount_paid+p_amount,2); v_outstanding=greatest(round(before_row.total-v_paid,2),0);
  insert into public.payment_ledger(entity_type,entity_id,event_id,event_kind,provider,transaction_id,amount,currency,idempotency_key,payload_hash,metadata)
  values('quote',before_row.id,left(p_event_id,240),'charge',left(coalesce(p_provider,'unknown'),80),left(coalesce(p_transaction_id,''),240),round(p_amount,2),'USD',left(p_event_id,240),left(p_payload_hash,128),jsonb_build_object('quoteNumber',before_row.quote_number,'status',before_row.status)) on conflict do nothing;
  update public.quote_requests set amount_paid=v_paid,outstanding_balance=v_outstanding,amount_due_now=0,remaining_balance=v_outstanding,
    payment_status=case when v_outstanding<=0.01 then 'paid' else 'partially_paid' end,status=case when v_outstanding<=0.01 then 'completed' else 'deposit_paid' end,
    payment_reference=left(coalesce(p_transaction_id,p_event_id),240),last_payment_at=now(),updated_at=now()
  where id=before_row.id returning * into after_row;
  insert into public.operations_audit_log(actor_id,action,entity_type,entity_id,before_data,after_data) values(null,'verified_quote_payment','quote',before_row.id,to_jsonb(before_row),to_jsonb(after_row));
  perform public.enqueue_commerce_notification('verified-quote-payment:'||left(p_event_id,200),'quote_payment','quote',after_row.id,coalesce(after_row.request_data->>'customerEmail',after_row.request_data->>'email',''),'Shababuna quote payment — '||after_row.quote_number,jsonb_build_object('quoteNumber',after_row.quote_number,'status',after_row.status,'paymentStatus',after_row.payment_status,'amountPaid',after_row.amount_paid,'amountDueNow',after_row.amount_due_now,'outstandingBalance',after_row.outstanding_balance,'provider',p_provider,'reference',p_transaction_id));
  return after_row;
end;
$$;
revoke all on function public.apply_verified_quote_payment_event(text,text,text,text,numeric,text,text,text) from public;
grant execute on function public.apply_verified_quote_payment_event(text,text,text,text,numeric,text,text,text) to service_role;

-- Marking a final payment as required never changes the outstanding balance.
create or replace function public.staff_update_order_workflow(p_order_id uuid,p_order_status text default null,p_payment_status text default null,p_fulfillment_status text default null)
returns public.orders
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare before_row public.orders; after_row public.orders; v_order text; v_payment text; v_fulfillment text; v_due numeric(12,2);
begin
  if not public.is_shababuna_staff() then raise exception 'staff_mfa_required'; end if;
  select * into before_row from public.orders where id=p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  v_order=coalesce(p_order_status,before_row.order_status); v_payment=coalesce(p_payment_status,before_row.payment_status); v_fulfillment=coalesce(p_fulfillment_status,before_row.fulfillment_status);
  if not public.is_valid_order_status_transition(before_row.order_status,v_order) then raise exception 'invalid_order_status_transition'; end if;
  if not public.is_valid_payment_status_transition(before_row.payment_status,v_payment) then raise exception 'invalid_payment_status_transition'; end if;
  if not public.is_valid_fulfillment_transition(before_row.fulfillment_status,v_fulfillment) then raise exception 'invalid_fulfillment_transition'; end if;
  if p_payment_status in ('paid','partially_paid','refunded','partially_refunded') and p_payment_status is distinct from before_row.payment_status then raise exception 'financial_function_required'; end if;
  if v_order in ('confirmed','processing','design_in_progress','awaiting_design_approval','design_approved','in_production','quality_control','arrived','final_payment_required','ready_to_ship','shipped','out_for_delivery','delivered') and before_row.payment_status not in ('partially_paid','paid') then raise exception 'payment_required_before_order_progress'; end if;
  if v_order='delivered' and v_payment<>'paid' then raise exception 'payment_required_before_delivery'; end if;
  v_due=case when v_order='final_payment_required' then before_row.outstanding_balance else before_row.amount_due_now end;
  if v_order='final_payment_required' and before_row.outstanding_balance<=0 then raise exception 'no_final_balance_due'; end if;
  update public.orders set order_status=v_order,payment_status=v_payment,fulfillment_status=v_fulfillment,amount_due_now=v_due,
    remaining_balance=greatest(before_row.outstanding_balance-v_due,0),
    payment_stage=case when v_order='final_payment_required' then 'final' else payment_stage end,updated_at=now()
  where id=p_order_id returning * into after_row;
  insert into public.operations_audit_log(actor_id,action,entity_type,entity_id,before_data,after_data) values(auth.uid(),'update_workflow','order',p_order_id::text,to_jsonb(before_row),to_jsonb(after_row));
  return after_row;
end;
$$;
revoke all on function public.staff_update_order_workflow(uuid,text,text,text) from public;
grant execute on function public.staff_update_order_workflow(uuid,text,text,text) to authenticated,service_role;

-- Cumulative return quantities are checked across every non-rejected request.
create or replace function public.create_return_request(p_order_number text,p_reason text,p_details text,p_items jsonb)
returns public.return_requests
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare v_order public.orders; v_item jsonb; v_order_item jsonb; v_qty integer; v_order_qty integer; v_used integer; v_return public.return_requests; v_number text; v_items jsonb;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select * into v_order from public.orders where order_number=upper(btrim(p_order_number)) and user_id=auth.uid() for update;
  if not found then raise exception 'order_not_found'; end if;
  if v_order.order_status<>'delivered' or v_order.delivered_at is null then raise exception 'order_not_delivered'; end if;
  if v_order.delivered_at<now()-interval '14 days' then raise exception 'return_window_closed'; end if;
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>30 then raise exception 'invalid_return_items'; end if;
  if exists(select 1 from public.return_requests where order_id=v_order.id and status not in ('rejected','refunded','closed','cancelled')) then raise exception 'active_return_exists'; end if;
  select jsonb_agg(jsonb_build_object('variantId',variant_id,'sku',sku,'name',item_name,'quantity',quantity) order by variant_id) into v_items
  from (select variant_id,max(sku) sku,max(item_name) item_name,sum(quantity)::integer quantity from (
    select nullif(btrim(coalesce(value->>'variantId',value->>'variant_id',value->>'sku')),'') variant_id,left(coalesce(value->>'sku',''),240) sku,left(coalesce(value->>'name',''),240) item_name,case when coalesce(value->>'quantity','')~'^[0-9]{1,4}$' then (value->>'quantity')::integer else 0 end quantity from jsonb_array_elements(p_items)
  ) r where variant_id is not null group by variant_id) n;
  if v_items is null then raise exception 'invalid_return_items'; end if;
  for v_item in select value from jsonb_array_elements(v_items) loop
    v_qty=coalesce((v_item->>'quantity')::integer,0); if v_qty<1 then raise exception 'invalid_return_quantity'; end if;
    select item into v_order_item from jsonb_array_elements(coalesce(v_order.items_snapshot,'[]'::jsonb)) item where coalesce(item->>'variantId',item->>'variant_id',item->>'sku')=v_item->>'variantId' limit 1;
    if v_order_item is null then raise exception 'return_item_not_in_order'; end if;
    if lower(coalesce(v_order_item->>'purchaseMode',v_order_item->>'purchase_mode','retail'))<>'retail' or coalesce((v_order_item->>'customizable')::boolean,false) or coalesce((v_order_item->'variant_snapshot'->>'customizable')::boolean,false) then raise exception 'custom_or_wholesale_item_not_returnable'; end if;
    v_order_qty=coalesce((v_order_item->>'quantity')::integer,0);
    select coalesce(sum((entry->>'quantity')::integer),0) into v_used from public.return_requests rr cross join lateral jsonb_array_elements(rr.requested_items) entry
    where rr.order_id=v_order.id and rr.status in ('requested','under_review','approved','received','refund_pending','refunded','closed') and coalesce(entry->>'variantId',entry->>'variant_id',entry->>'sku')=v_item->>'variantId';
    if v_qty>greatest(v_order_qty-v_used,0) then raise exception 'return_quantity_exceeds_remaining'; end if;
  end loop;
  v_number='RET-'||to_char(clock_timestamp(),'YYYYMMDD')||'-'||lpad(nextval('public.return_number_seq')::text,7,'0');
  insert into public.return_requests(return_number,order_id,order_number,user_id,customer_email,reason,details,requested_items)
  values(v_number,v_order.id,v_order.order_number,auth.uid(),v_order.customer_email,left(btrim(p_reason),120),left(coalesce(p_details,''),3000),v_items) returning * into v_return;
  perform public.enqueue_commerce_notification('new-return:'||v_return.id::text,'new_return_request','return',v_return.id::text,v_return.customer_email,'New Shababuna return request — '||v_return.return_number,jsonb_build_object('returnNumber',v_return.return_number,'orderNumber',v_return.order_number,'reason',v_return.reason,'details',v_return.details,'items',v_return.requested_items));
  return v_return;
end;
$$;
revoke all on function public.create_return_request(text,text,text,jsonb) from public;
grant execute on function public.create_return_request(text,text,text,jsonb) to authenticated,service_role;

-- Design secure sharing and comments.
create or replace function public.create_design_share_link(p_design_id text,p_permissions text default 'view',p_hours integer default 168)
returns text
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare v_token text; v_hash text;
begin
  if p_hours<1 or p_hours>720 then raise exception 'invalid_share_expiry'; end if;
  if p_permissions not in ('view','comment','approve') then raise exception 'invalid_share_permission'; end if;
  if not exists(select 1 from public.custom_designs d where d.id=p_design_id and (d.user_id=auth.uid() or public.is_organization_manager(d.organization_id) or public.is_shababuna_staff())) then raise exception 'design_not_found'; end if;
  v_token=encode(gen_random_bytes(32),'hex'); v_hash=encode(digest(v_token,'sha256'),'hex');
  insert into public.design_share_links(design_id,token_hash,permissions,expires_at,created_by) values(p_design_id,v_hash,p_permissions,now()+make_interval(hours=>p_hours),auth.uid());
  return v_token;
end;
$$;
revoke all on function public.create_design_share_link(text,text,integer) from public;
grant execute on function public.create_design_share_link(text,text,integer) to authenticated,service_role;

-- Staff product upsert for complete CRUD without browser service-role keys.
create or replace function public.staff_upsert_catalog_variant(p_payload jsonb)
returns public.product_catalog
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare v public.product_catalog; v_id text; v_status text; v_active boolean;
begin
  if not public.is_shababuna_staff() then raise exception 'staff_mfa_required'; end if;
  v_id=nullif(btrim(p_payload->>'variant_id'),''); if v_id is null then raise exception 'variant_id_required'; end if;
  v_status=coalesce(nullif(p_payload->>'product_status',''),'draft'); v_active=coalesce((p_payload->>'active')::boolean,false);
  if v_status not in ('draft','active','coming_soon','archived','out_of_stock') then raise exception 'invalid_product_status'; end if;
  if v_status='active' and (coalesce((p_payload->>'unit_price')::numeric,-1)<0 or nullif(p_payload->>'sku','') is null or nullif(p_payload->>'product_name','') is null or nullif(p_payload->>'canonical_slug','') is null) then raise exception 'active_product_incomplete'; end if;
  insert into public.product_catalog(variant_id,product_id,canonical_slug,sku,product_name,product_status,active,color,size,currency,unit_price,compare_at_price,availability_state,inventory_quantity,variant_data,wholesale_price,brand,category,subcategory,manufacturing_country,cut_country,sewing_country,printing_country,material_origin,manufacturing_claim_status,claim_evidence_reference,claim_verified)
  values(v_id,p_payload->>'product_id',p_payload->>'canonical_slug',p_payload->>'sku',p_payload->>'product_name',v_status,v_active,p_payload->>'color',p_payload->>'size',coalesce(p_payload->>'currency','USD'),coalesce((p_payload->>'unit_price')::numeric,0),nullif(p_payload->>'compare_at_price','')::numeric,coalesce(p_payload->>'availability_state','unavailable'),nullif(p_payload->>'inventory_quantity','')::integer,coalesce(p_payload->'variant_data','{}'::jsonb),nullif(p_payload->>'wholesale_price','')::numeric,p_payload->>'brand',p_payload->>'category',p_payload->>'subcategory',p_payload->>'manufacturing_country',p_payload->>'cut_country',p_payload->>'sewing_country',p_payload->>'printing_country',p_payload->>'material_origin',coalesce(p_payload->>'manufacturing_claim_status','unverified'),p_payload->>'claim_evidence_reference',coalesce((p_payload->>'claim_verified')::boolean,false))
  on conflict(variant_id) do update set product_id=excluded.product_id,canonical_slug=excluded.canonical_slug,sku=excluded.sku,product_name=excluded.product_name,product_status=excluded.product_status,active=excluded.active,color=excluded.color,size=excluded.size,currency=excluded.currency,unit_price=excluded.unit_price,compare_at_price=excluded.compare_at_price,availability_state=excluded.availability_state,inventory_quantity=excluded.inventory_quantity,variant_data=excluded.variant_data,wholesale_price=excluded.wholesale_price,brand=excluded.brand,category=excluded.category,subcategory=excluded.subcategory,manufacturing_country=excluded.manufacturing_country,cut_country=excluded.cut_country,sewing_country=excluded.sewing_country,printing_country=excluded.printing_country,material_origin=excluded.material_origin,manufacturing_claim_status=excluded.manufacturing_claim_status,claim_evidence_reference=excluded.claim_evidence_reference,claim_verified=excluded.claim_verified,updated_at=now()
  returning * into v;
  insert into public.operations_audit_log(actor_id,action,entity_type,entity_id,after_data) values(auth.uid(),'upsert_catalog_variant','catalog_variant',v.variant_id,to_jsonb(v));
  return v;
end;
$$;
revoke all on function public.staff_upsert_catalog_variant(jsonb) from public;
grant execute on function public.staff_upsert_catalog_variant(jsonb) to authenticated,service_role;

-- Export request and account-data inventory.
create or replace function public.request_my_privacy_export()
returns public.privacy_export_requests
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare v public.privacy_export_requests;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if exists(select 1 from public.privacy_export_requests where user_id=auth.uid() and status in ('requested','processing')) then
    select * into v from public.privacy_export_requests where user_id=auth.uid() and status in ('requested','processing') order by created_at desc limit 1; return v;
  end if;
  insert into public.privacy_export_requests(user_id,status) values(auth.uid(),'requested') returning * into v;
  return v;
end;
$$;
revoke all on function public.request_my_privacy_export() from public;
grant execute on function public.request_my_privacy_export() to authenticated,service_role;


-- Malware scanning job metadata for quarantined uploads.
alter table public.special_request_files
  add column if not exists scan_attempts integer not null default 0,
  add column if not exists next_scan_at timestamptz not null default now(),
  add column if not exists last_scan_error text;
create index if not exists special_request_files_scan_queue_idx on public.special_request_files(quarantine_status,next_scan_at) where quarantine_status in ('quarantined','scan_failed');

commit;

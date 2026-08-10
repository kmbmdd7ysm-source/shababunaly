-- SHABABUNA B2B design, roster, quote and operations workspace.

create or replace function public.is_shababuna_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.role() = 'service_role' or coalesce((auth.jwt() -> 'app_metadata' ->> 'role') in ('super_admin','admin','operations','sales'), false);
$$;
revoke all on function public.is_shababuna_staff() from public;
grant execute on function public.is_shababuna_staff() to authenticated, service_role;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 160),
  organization_type text not null check (organization_type in ('club','academy','federation','school_university','wholesale','distributor')),
  country_code text not null default 'LY' check (char_length(country_code)=2),
  city text,
  logo_url text,
  brand_colors jsonb not null default '[]'::jsonb,
  status text not null default 'pending' check (status in ('pending','approved','suspended')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','manager','member','viewer')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table if not exists public.custom_designs (
  id text primary key,
  user_id uuid references auth.users(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  name text not null check (char_length(name) between 1 and 120),
  product_type text not null,
  status text not null default 'draft' check (status in ('draft','quote_requested','under_review','proof_ready','changes_requested','approved','archived')),
  version integer not null default 1 check (version >= 1),
  design_data jsonb not null default '{}'::jsonb,
  preview_data jsonb not null default '{}'::jsonb,
  proof_data jsonb not null default '{}'::jsonb,
  approval_note text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.custom_design_versions (
  id bigint generated always as identity primary key,
  design_id text not null references public.custom_designs(id) on delete cascade,
  version integer not null,
  status text not null,
  design_data jsonb not null default '{}'::jsonb,
  preview_data jsonb not null default '{}'::jsonb,
  proof_data jsonb not null default '{}'::jsonb,
  archived_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(design_id, version)
);

create table if not exists public.team_rosters (
  id text primary key,
  user_id uuid references auth.users(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  name text not null check (char_length(name) between 1 and 120),
  players jsonb not null default '[]'::jsonb,
  player_count integer not null default 0 check (player_count >= 0),
  validation_errors integer not null default 0 check (validation_errors >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quote_requests (
  id text primary key,
  user_id uuid references auth.users(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  quote_number text not null unique,
  status text not null default 'under_review' check (status in ('under_review','quote_sent','awaiting_approval','deposit_required','deposit_paid','design_in_progress','awaiting_design_approval','design_approved','in_production','quality_control','arrived','final_payment_required','completed','cancelled')),
  currency text not null default 'USD' check (currency='USD'),
  subtotal numeric(12,2) check (subtotal is null or subtotal >= 0),
  shipping_total numeric(12,2) check (shipping_total is null or shipping_total >= 0),
  total numeric(12,2) check (total is null or total >= 0),
  deposit_percent integer not null default 50 check (deposit_percent between 0 and 100),
  request_data jsonb not null default '{}'::jsonb,
  response_note text,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.production_updates (
  id uuid primary key default gen_random_uuid(),
  quote_id text not null references public.quote_requests(id) on delete cascade,
  status text not null,
  title text,
  title_ar text,
  message text,
  media jsonb not null default '[]'::jsonb,
  visible_to_customer boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.operations_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

alter table public.custom_designs add column if not exists proof_data jsonb not null default '{}'::jsonb;
alter table public.custom_designs add column if not exists approval_note text;
alter table public.custom_designs add column if not exists approved_at timestamptz;
alter table public.quote_requests add column if not exists response_note text;
alter table public.quote_requests add column if not exists responded_at timestamptz;

create or replace function public.archive_custom_design_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.design_data is distinct from new.design_data
     or old.preview_data is distinct from new.preview_data
     or old.proof_data is distinct from new.proof_data
     or old.status is distinct from new.status then
    insert into public.custom_design_versions(design_id,version,status,design_data,preview_data,proof_data,archived_by)
    values(old.id,old.version,old.status,old.design_data,old.preview_data,coalesce(old.proof_data,'{}'::jsonb),auth.uid())
    on conflict(design_id,version) do nothing;
  end if;
  return new;
end;
$$;
drop trigger if exists archive_custom_design_version_trigger on public.custom_designs;
create trigger archive_custom_design_version_trigger before update on public.custom_designs for each row execute function public.archive_custom_design_version();

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.custom_designs enable row level security;
alter table public.custom_design_versions enable row level security;
alter table public.team_rosters enable row level security;
alter table public.quote_requests enable row level security;
alter table public.production_updates enable row level security;
alter table public.operations_audit_log enable row level security;

create or replace function public.is_organization_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.organization_members m where m.organization_id=p_organization_id and m.user_id=auth.uid());
$$;
revoke all on function public.is_organization_member(uuid) from public;
grant execute on function public.is_organization_member(uuid) to authenticated, service_role;

create or replace function public.is_organization_manager(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_shababuna_staff() or exists(
    select 1 from public.organization_members m
    where m.organization_id=p_organization_id and m.user_id=auth.uid() and m.role in ('owner','manager')
  );
$$;
revoke all on function public.is_organization_manager(uuid) from public;
grant execute on function public.is_organization_manager(uuid) to authenticated, service_role;

create or replace function public.create_or_get_my_organization(
  p_name text,
  p_organization_type text,
  p_country_code text default 'LY'
)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing public.organizations;
  v_created public.organizations;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;

  select o.* into v_existing
  from public.organizations o
  join public.organization_members m on m.organization_id=o.id
  where m.user_id=v_user_id
  order by m.created_at asc
  limit 1;
  if found then return v_existing; end if;

  if char_length(trim(coalesce(p_name,''))) not between 2 and 160 then raise exception 'invalid_organization_name'; end if;
  if p_organization_type not in ('club','academy','federation','school_university','wholesale','distributor') then raise exception 'invalid_organization_type'; end if;
  if char_length(trim(coalesce(p_country_code,''))) <> 2 then raise exception 'invalid_country_code'; end if;

  insert into public.organizations(name,organization_type,country_code,created_by)
  values(trim(p_name),p_organization_type,upper(trim(p_country_code)),v_user_id)
  returning * into v_created;
  insert into public.organization_members(organization_id,user_id,role)
  values(v_created.id,v_user_id,'owner');

  insert into public.operations_audit_log(actor_id,action,entity_type,entity_id,after_data)
  values(v_user_id,'create_organization','organization',v_created.id::text,to_jsonb(v_created));
  return v_created;
end;
$$;
revoke all on function public.create_or_get_my_organization(text,text,text) from public;
grant execute on function public.create_or_get_my_organization(text,text,text) to authenticated, service_role;

drop policy if exists "organizations visible to members and staff" on public.organizations;
create policy "organizations visible to members and staff" on public.organizations for select to authenticated using (public.is_shababuna_staff() or public.is_organization_member(id));
drop policy if exists "organizations created by users" on public.organizations;
create policy "organizations created by users" on public.organizations for insert to authenticated with check (created_by=auth.uid());
drop policy if exists "organizations managed by owners and staff" on public.organizations;
create policy "organizations managed by owners and staff" on public.organizations for update to authenticated using (public.is_organization_manager(id)) with check (public.is_organization_manager(id));

drop policy if exists "members visible within organization" on public.organization_members;
create policy "members visible within organization" on public.organization_members for select to authenticated using (public.is_shababuna_staff() or user_id=auth.uid() or public.is_organization_member(organization_id));
drop policy if exists "members managed by owners and staff" on public.organization_members;
create policy "members managed by owners and staff" on public.organization_members for all to authenticated using (public.is_organization_manager(organization_id)) with check (public.is_organization_manager(organization_id));

drop policy if exists "design owner or organization" on public.custom_designs;
create policy "design owner or organization" on public.custom_designs for select to authenticated using (public.is_shababuna_staff() or user_id=auth.uid() or (organization_id is not null and public.is_organization_member(organization_id)));
drop policy if exists "design insert owner" on public.custom_designs;
create policy "design insert owner" on public.custom_designs for insert to authenticated with check (user_id=auth.uid());
drop policy if exists "design update owner or staff" on public.custom_designs;
create policy "design update owner or staff" on public.custom_designs for update to authenticated using (public.is_shababuna_staff() or user_id=auth.uid() or (organization_id is not null and public.is_organization_manager(organization_id))) with check (public.is_shababuna_staff() or user_id=auth.uid() or (organization_id is not null and public.is_organization_manager(organization_id)));

drop policy if exists "design versions visible to owner organization and staff" on public.custom_design_versions;
create policy "design versions visible to owner organization and staff" on public.custom_design_versions for select to authenticated using (
  public.is_shababuna_staff() or exists(
    select 1 from public.custom_designs d where d.id=design_id and (d.user_id=auth.uid() or (d.organization_id is not null and public.is_organization_member(d.organization_id)))
  )
);

drop policy if exists "roster owner or organization" on public.team_rosters;
create policy "roster owner or organization" on public.team_rosters for select to authenticated using (public.is_shababuna_staff() or user_id=auth.uid() or (organization_id is not null and public.is_organization_member(organization_id)));
drop policy if exists "roster insert owner" on public.team_rosters;
create policy "roster insert owner" on public.team_rosters for insert to authenticated with check (user_id=auth.uid());
drop policy if exists "roster update owner or staff" on public.team_rosters;
create policy "roster update owner or staff" on public.team_rosters for update to authenticated using (public.is_shababuna_staff() or user_id=auth.uid() or (organization_id is not null and public.is_organization_manager(organization_id))) with check (public.is_shababuna_staff() or user_id=auth.uid() or (organization_id is not null and public.is_organization_manager(organization_id)));

drop policy if exists "quote owner or organization" on public.quote_requests;
create policy "quote owner or organization" on public.quote_requests for select to authenticated using (public.is_shababuna_staff() or user_id=auth.uid() or (organization_id is not null and public.is_organization_member(organization_id)));
drop policy if exists "quote insert owner" on public.quote_requests;
create policy "quote insert owner" on public.quote_requests for insert to authenticated with check (user_id=auth.uid());
drop policy if exists "quote update staff" on public.quote_requests;
create policy "quote update staff" on public.quote_requests for update to authenticated using (public.is_shababuna_staff()) with check (public.is_shababuna_staff());

drop policy if exists "production visible to quote owner" on public.production_updates;
create policy "production visible to quote owner" on public.production_updates for select to authenticated using (public.is_shababuna_staff() or (visible_to_customer and exists(select 1 from public.quote_requests q where q.id=quote_id and (q.user_id=auth.uid() or (q.organization_id is not null and public.is_organization_member(q.organization_id))))));
drop policy if exists "production staff write" on public.production_updates;
create policy "production staff write" on public.production_updates for all to authenticated using (public.is_shababuna_staff()) with check (public.is_shababuna_staff());

drop policy if exists "audit staff only" on public.operations_audit_log;
create policy "audit staff only" on public.operations_audit_log for select to authenticated using (public.is_shababuna_staff());

revoke insert, update, delete on public.operations_audit_log from anon, authenticated;
grant select on public.operations_audit_log to authenticated;

grant select, insert, update on public.organizations, public.organization_members, public.custom_designs, public.team_rosters, public.quote_requests, public.production_updates to authenticated;
grant select on public.custom_design_versions to authenticated;

drop policy if exists "staff can read all orders" on public.orders;
create policy "staff can read all orders" on public.orders for select to authenticated using (public.is_shababuna_staff());

create or replace function public.staff_publish_design_proof(p_design_id text, p_proof_data jsonb, p_note text default '')
returns public.custom_designs
language plpgsql
security definer
set search_path = public
as $$
declare before_row public.custom_designs; after_row public.custom_designs;
begin
  if not public.is_shababuna_staff() then raise exception 'staff_required'; end if;
  if p_proof_data is null or jsonb_typeof(p_proof_data) <> 'object' then raise exception 'invalid_proof_data'; end if;
  select * into before_row from public.custom_designs where id=p_design_id for update;
  if not found then raise exception 'design_not_found'; end if;
  update public.custom_designs set proof_data=p_proof_data, approval_note=left(coalesce(p_note,''),1000), status='proof_ready', version=version+1, approved_at=null, updated_at=now() where id=p_design_id returning * into after_row;
  insert into public.operations_audit_log(actor_id,action,entity_type,entity_id,before_data,after_data) values(auth.uid(),'publish_design_proof','custom_design',p_design_id,to_jsonb(before_row),to_jsonb(after_row));
  return after_row;
end;
$$;

create or replace function public.customer_respond_to_design(p_design_id text, p_decision text, p_note text default '')
returns public.custom_designs
language plpgsql
security definer
set search_path = public
as $$
declare before_row public.custom_designs; after_row public.custom_designs; v_status text;
begin
  select * into before_row from public.custom_designs where id=p_design_id for update;
  if not found then raise exception 'design_not_found'; end if;
  if not (before_row.user_id=auth.uid() or (before_row.organization_id is not null and public.is_organization_member(before_row.organization_id))) then raise exception 'not_authorized'; end if;
  if before_row.status <> 'proof_ready' then raise exception 'proof_not_ready'; end if;
  if p_decision='approved' then v_status := 'approved';
  elsif p_decision='changes_requested' then v_status := 'changes_requested';
  else raise exception 'invalid_decision'; end if;
  update public.custom_designs set status=v_status, approval_note=left(coalesce(p_note,''),1000), approved_at=case when v_status='approved' then now() else null end, version=version+1, updated_at=now() where id=p_design_id returning * into after_row;
  insert into public.operations_audit_log(actor_id,action,entity_type,entity_id,before_data,after_data) values(auth.uid(),'customer_design_response','custom_design',p_design_id,to_jsonb(before_row),to_jsonb(after_row));
  return after_row;
end;
$$;

create or replace function public.customer_respond_to_quote(p_quote_id text, p_decision text, p_note text default '')
returns public.quote_requests
language plpgsql
security definer
set search_path = public
as $$
declare before_row public.quote_requests; after_row public.quote_requests; v_status text;
begin
  select * into before_row from public.quote_requests where id=p_quote_id for update;
  if not found then raise exception 'quote_not_found'; end if;
  if not (before_row.user_id=auth.uid() or (before_row.organization_id is not null and public.is_organization_member(before_row.organization_id))) then raise exception 'not_authorized'; end if;
  if before_row.status not in ('quote_sent','awaiting_approval') then raise exception 'quote_not_awaiting_response'; end if;
  if p_decision='accepted' then v_status := 'deposit_required';
  elsif p_decision='changes_requested' then v_status := 'under_review';
  elsif p_decision='cancelled' then v_status := 'cancelled';
  else raise exception 'invalid_decision'; end if;
  update public.quote_requests set status=v_status,response_note=left(coalesce(p_note,''),1000),responded_at=now(),updated_at=now() where id=p_quote_id returning * into after_row;
  insert into public.operations_audit_log(actor_id,action,entity_type,entity_id,before_data,after_data) values(auth.uid(),'customer_quote_response','quote',p_quote_id,to_jsonb(before_row),to_jsonb(after_row));
  return after_row;
end;
$$;

create or replace function public.staff_set_shipping_quote(p_order_id uuid, p_shipping_total numeric, p_note text default '')
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  before_row public.orders;
  after_row public.orders;
begin
  if not public.is_shababuna_staff() then raise exception 'staff_required'; end if;
  if p_shipping_total is null or p_shipping_total < 0 then raise exception 'invalid_shipping_total'; end if;
  select * into before_row from public.orders where id=p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  update public.orders
  set shipping_total=round(p_shipping_total,2),
      total=round(subtotal + p_shipping_total + tax_total - discount_total,2),
      amount_due_now=case when payment_plan='half' then round((subtotal + p_shipping_total + tax_total - discount_total)/2,2) else round(subtotal + p_shipping_total + tax_total - discount_total,2) end,
      remaining_balance=case when payment_plan='half' then round((subtotal + p_shipping_total + tax_total - discount_total) - round((subtotal + p_shipping_total + tax_total - discount_total)/2,2),2) else 0 end,
      shipping_quote_required=false,
      payment_plan='full',
      order_status='awaiting_payment',
      payment_status='pending',
      shipping_summary=coalesce(shipping_summary,'{}'::jsonb) || jsonb_build_object('amount',p_shipping_total,'currency','USD','pendingQuote',false,'staffNote',left(coalesce(p_note,''),500),'quotedAt',now()),
      updated_at=now()
  where id=p_order_id returning * into after_row;
  insert into public.operations_audit_log(actor_id,action,entity_type,entity_id,before_data,after_data) values(auth.uid(),'set_shipping_quote','order',p_order_id::text,to_jsonb(before_row),to_jsonb(after_row));
  return after_row;
end;
$$;

create or replace function public.staff_update_order_workflow(p_order_id uuid, p_order_status text default null, p_payment_status text default null, p_fulfillment_status text default null)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare before_row public.orders; after_row public.orders;
begin
  if not public.is_shababuna_staff() then raise exception 'staff_required'; end if;
  select * into before_row from public.orders where id=p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  update public.orders set
    order_status=coalesce(p_order_status,order_status),
    payment_status=coalesce(p_payment_status,payment_status),
    fulfillment_status=coalesce(p_fulfillment_status,fulfillment_status),
    updated_at=now()
  where id=p_order_id returning * into after_row;
  insert into public.operations_audit_log(actor_id,action,entity_type,entity_id,before_data,after_data) values(auth.uid(),'update_workflow','order',p_order_id::text,to_jsonb(before_row),to_jsonb(after_row));
  return after_row;
end;
$$;

create or replace function public.staff_update_quote(p_quote_id text, p_status text, p_subtotal numeric default null, p_shipping_total numeric default null, p_total numeric default null)
returns public.quote_requests
language plpgsql
security definer
set search_path = public
as $$
declare before_row public.quote_requests; after_row public.quote_requests;
begin
  if not public.is_shababuna_staff() then raise exception 'staff_required'; end if;
  select * into before_row from public.quote_requests where id=p_quote_id for update;
  if not found then raise exception 'quote_not_found'; end if;
  update public.quote_requests set status=coalesce(p_status,status), subtotal=p_subtotal, shipping_total=p_shipping_total, total=p_total, updated_at=now() where id=p_quote_id returning * into after_row;
  insert into public.operations_audit_log(actor_id,action,entity_type,entity_id,before_data,after_data) values(auth.uid(),'update_quote','quote',p_quote_id,to_jsonb(before_row),to_jsonb(after_row));
  return after_row;
end;
$$;

create or replace function public.staff_set_exchange_rate(p_rate numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_shababuna_staff() then raise exception 'staff_required'; end if;
  if p_rate is null or p_rate <= 0 then raise exception 'invalid_exchange_rate'; end if;
  insert into public.commerce_settings(setting_key,numeric_value,updated_at) values('usd_to_lyd_rate',p_rate,now()) on conflict(setting_key) do update set numeric_value=excluded.numeric_value,updated_at=now();
  insert into public.operations_audit_log(actor_id,action,entity_type,entity_id,after_data) values(auth.uid(),'set_exchange_rate','commerce_setting','usd_to_lyd_rate',jsonb_build_object('rate',p_rate));
  return jsonb_build_object('usd_to_lyd_rate',p_rate);
end;
$$;

revoke all on function public.staff_publish_design_proof(text,jsonb,text) from public;
revoke all on function public.customer_respond_to_design(text,text,text) from public;
revoke all on function public.customer_respond_to_quote(text,text,text) from public;
grant execute on function public.staff_publish_design_proof(text,jsonb,text) to authenticated, service_role;
grant execute on function public.customer_respond_to_design(text,text,text) to authenticated, service_role;
grant execute on function public.customer_respond_to_quote(text,text,text) to authenticated, service_role;
revoke all on function public.staff_set_shipping_quote(uuid,numeric,text) from public;
revoke all on function public.staff_update_order_workflow(uuid,text,text,text) from public;
revoke all on function public.staff_update_quote(text,text,numeric,numeric,numeric) from public;
revoke all on function public.staff_set_exchange_rate(numeric) from public;
grant execute on function public.staff_set_shipping_quote(uuid,numeric,text) to authenticated, service_role;
grant execute on function public.staff_update_order_workflow(uuid,text,text,text) to authenticated, service_role;
grant execute on function public.staff_update_quote(text,text,numeric,numeric,numeric) to authenticated, service_role;
grant execute on function public.staff_set_exchange_rate(numeric) to authenticated, service_role;

create index if not exists custom_design_versions_design_idx on public.custom_design_versions(design_id, version desc);
create index if not exists custom_designs_user_updated_idx on public.custom_designs(user_id, updated_at desc);
create index if not exists team_rosters_user_updated_idx on public.team_rosters(user_id, updated_at desc);
create index if not exists quote_requests_user_updated_idx on public.quote_requests(user_id, updated_at desc);
create index if not exists quote_requests_status_created_idx on public.quote_requests(status, created_at desc);
create index if not exists production_updates_quote_created_idx on public.production_updates(quote_id, created_at desc);

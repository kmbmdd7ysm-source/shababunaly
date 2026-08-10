begin;

create sequence if not exists public.special_request_number_seq;

create table if not exists public.special_requests (
  id uuid primary key default gen_random_uuid(),
  request_number text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  idempotency_key uuid not null unique,
  status text not null default 'submitted' check (status in (
    'submitted','under_review','more_information_required','quoted','awaiting_customer',
    'awaiting_payment','ordered','unavailable','rejected','closed'
  )),
  customer_name text not null check (char_length(customer_name) between 2 and 160),
  customer_email text not null check (customer_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  phone text not null default '' check (char_length(phone) <= 60),
  whatsapp text not null default '' check (char_length(whatsapp) <= 60),
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  product_url text,
  description text not null check (char_length(description) between 10 and 5000),
  preferred_brand text check (char_length(preferred_brand) <= 120),
  desired_quantity integer not null check (desired_quantity between 1 and 100000),
  requested_size text check (char_length(requested_size) <= 120),
  requested_color text check (char_length(requested_color) <= 120),
  target_budget numeric(12,2) check (target_budget is null or target_budget >= 0),
  required_date date,
  preferred_contact_method text not null check (preferred_contact_method in ('email','phone','whatsapp')),
  consent_at timestamptz not null,
  captcha_verified boolean not null default false,
  request_payload jsonb not null default '{}'::jsonb,
  quoted_product_cost numeric(12,2) check (quoted_product_cost is null or quoted_product_cost >= 0),
  shipping_cost numeric(12,2) check (shipping_cost is null or shipping_cost >= 0),
  tax_total numeric(12,2) not null default 0 check (tax_total >= 0),
  discount_total numeric(12,2) not null default 0 check (discount_total >= 0),
  quote_total numeric(12,2) generated always as (
    greatest(0,coalesce(quoted_product_cost,0)+coalesce(shipping_cost,0)+tax_total-discount_total)
  ) stored,
  currency text not null default 'USD' check (currency in ('USD','LYD')),
  estimated_arrival_days integer check (estimated_arrival_days is null or estimated_arrival_days between 1 and 365),
  staff_notes text check (char_length(staff_notes) <= 5000),
  customer_note text check (char_length(customer_note) <= 2000),
  payment_url text,
  quote_expires_at timestamptz,
  customer_decision text not null default 'pending' check (customer_decision in ('pending','accepted','rejected')),
  customer_responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists special_requests_user_idx on public.special_requests(user_id,created_at desc);
create index if not exists special_requests_ops_idx on public.special_requests(status,created_at desc);

create table if not exists public.special_request_files (
  id uuid primary key default gen_random_uuid(),
  special_request_id uuid not null references public.special_requests(id) on delete cascade,
  storage_bucket text not null default 'special-request-quarantine',
  storage_path text not null unique,
  original_name text not null check (char_length(original_name) between 1 and 240),
  declared_mime text not null check (char_length(declared_mime) <= 160),
  detected_mime text not null check (char_length(detected_mime) <= 160),
  extension text not null check (extension ~ '^[a-z0-9]{1,10}$'),
  byte_size integer not null check (byte_size between 1 and 3145728),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  file_role text not null check (file_role in ('product_image','additional_file')),
  quarantine_status text not null default 'quarantined' check (quarantine_status in ('quarantined','scanning','clean','rejected','scan_failed')),
  antivirus_provider text,
  antivirus_reference text,
  scan_result jsonb not null default '{}'::jsonb,
  scanned_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists special_request_files_request_idx on public.special_request_files(special_request_id,created_at);

alter table public.special_requests enable row level security;
alter table public.special_request_files enable row level security;
revoke all on public.special_requests,public.special_request_files from anon,authenticated;
grant select on public.special_requests,public.special_request_files to authenticated,service_role;
grant insert,update,delete on public.special_requests,public.special_request_files to service_role;

drop policy if exists "customers read own special requests" on public.special_requests;
create policy "customers read own special requests" on public.special_requests
for select to authenticated using (user_id=auth.uid());
drop policy if exists "staff read special requests" on public.special_requests;
create policy "staff read special requests" on public.special_requests
for select to authenticated using (public.is_shababuna_staff());
drop policy if exists "customers read own special request files" on public.special_request_files;
create policy "customers read own special request files" on public.special_request_files
for select to authenticated using (exists(select 1 from public.special_requests r where r.id=special_request_id and r.user_id=auth.uid()));
drop policy if exists "staff read special request files" on public.special_request_files;
create policy "staff read special request files" on public.special_request_files
for select to authenticated using (public.is_shababuna_staff());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('special-request-quarantine','special-request-quarantine',false,3145728,array[
  'image/jpeg','image/png','image/webp','application/pdf','text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]) on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create or replace function public.create_special_request_api(
  p_user_id uuid,
  p_idempotency_key uuid,
  p_payload jsonb
) returns public.special_requests
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_row public.special_requests; v_existing public.special_requests; v_number text; v_url text; v_has_image boolean;
begin
  if auth.role()<>'service_role' then raise exception 'service_role_required'; end if;
  if p_idempotency_key is null or jsonb_typeof(p_payload)<>'object' then raise exception 'invalid_special_request'; end if;
  select * into v_existing from public.special_requests where idempotency_key=p_idempotency_key;
  if found then return v_existing; end if;
  v_url=nullif(btrim(coalesce(p_payload->>'productUrl','')),'');
  v_has_image=coalesce((p_payload->>'hasProductImage')::boolean,false);
  if v_url is null and not v_has_image then raise exception 'product_reference_required'; end if;
  if v_url is not null and v_url !~* '^https?://[^[:space:]]+$' then raise exception 'invalid_product_url'; end if;
  v_number='SR-'||to_char(clock_timestamp(),'YYYYMMDD')||'-'||lpad(nextval('public.special_request_number_seq')::text,7,'0');
  insert into public.special_requests(
    request_number,user_id,idempotency_key,customer_name,customer_email,phone,whatsapp,country_code,
    product_url,description,preferred_brand,desired_quantity,requested_size,requested_color,target_budget,
    required_date,preferred_contact_method,consent_at,captcha_verified,request_payload
  ) values(
    v_number,p_user_id,p_idempotency_key,left(btrim(p_payload->>'customerName'),160),lower(left(btrim(p_payload->>'email'),320)),
    left(btrim(coalesce(p_payload->>'phone','')),60),left(btrim(coalesce(p_payload->>'whatsapp','')),60),upper(btrim(p_payload->>'country')),
    v_url,left(btrim(p_payload->>'description'),5000),nullif(left(btrim(coalesce(p_payload->>'preferredBrand','')),120),''),
    greatest(1,least(100000,coalesce((p_payload->>'desiredQuantity')::integer,1))),nullif(left(btrim(coalesce(p_payload->>'size','')),120),''),
    nullif(left(btrim(coalesce(p_payload->>'color','')),120),''),nullif(p_payload->>'targetBudget','')::numeric,
    nullif(p_payload->>'requiredDate','')::date,btrim(p_payload->>'preferredContactMethod'),now(),true,p_payload
  ) returning * into v_row;
  insert into public.operations_audit_log(actor_id,action,entity_type,entity_id,after_data)
  values(p_user_id,'create_special_request','special_request',v_row.id::text,to_jsonb(v_row));
  return v_row;
end; $$;
revoke all on function public.create_special_request_api(uuid,uuid,jsonb) from public;
grant execute on function public.create_special_request_api(uuid,uuid,jsonb) to service_role;

create or replace function public.customer_respond_special_request(p_request_id uuid,p_decision text,p_note text default '')
returns public.special_requests language plpgsql security definer set search_path=public,pg_temp as $$
declare before_row public.special_requests; after_row public.special_requests; v_status text;
begin
  select * into before_row from public.special_requests where id=p_request_id for update;
  if not found then raise exception 'special_request_not_found'; end if;
  if before_row.user_id<>auth.uid() then raise exception 'not_authorized'; end if;
  if before_row.status not in ('quoted','awaiting_customer') then raise exception 'request_not_awaiting_response'; end if;
  if before_row.quote_expires_at is not null and before_row.quote_expires_at<now() then raise exception 'quote_expired'; end if;
  if p_decision='accepted' then v_status='awaiting_payment';
  elsif p_decision='rejected' then v_status='closed';
  else raise exception 'invalid_decision'; end if;
  update public.special_requests set customer_decision=p_decision,customer_note=left(coalesce(p_note,''),2000),
    customer_responded_at=now(),status=v_status,updated_at=now() where id=p_request_id returning * into after_row;
  insert into public.operations_audit_log(actor_id,action,entity_type,entity_id,before_data,after_data)
  values(auth.uid(),'customer_special_request_response','special_request',p_request_id::text,to_jsonb(before_row),to_jsonb(after_row));
  perform public.enqueue_commerce_notification(
    'special-response:'||after_row.id||':'||extract(epoch from after_row.updated_at)::bigint,
    'special_request_customer_response','special_request',after_row.id::text,after_row.customer_email,
    'Shababuna special request response — '||after_row.request_number,
    jsonb_build_object('requestNumber',after_row.request_number,'decision',after_row.customer_decision,'status',after_row.status,'note',after_row.customer_note)
  );
  return after_row;
end; $$;
revoke all on function public.customer_respond_special_request(uuid,text,text) from public;
grant execute on function public.customer_respond_special_request(uuid,text,text) to authenticated,service_role;

create or replace function public.staff_update_special_request(
  p_request_id uuid,p_status text,p_product_cost numeric default null,p_shipping_cost numeric default null,
  p_tax_total numeric default 0,p_discount_total numeric default 0,p_currency text default 'USD',
  p_estimated_arrival_days integer default null,p_staff_notes text default '',p_payment_url text default null,p_quote_expires_at timestamptz default null
) returns public.special_requests language plpgsql security definer set search_path=public,pg_temp as $$
declare before_row public.special_requests; after_row public.special_requests;
begin
  if not public.is_shababuna_staff() then raise exception 'staff_required'; end if;
  if p_status not in ('submitted','under_review','more_information_required','quoted','awaiting_customer','awaiting_payment','ordered','unavailable','rejected','closed') then raise exception 'invalid_status'; end if;
  if coalesce(p_product_cost,0)<0 or coalesce(p_shipping_cost,0)<0 or coalesce(p_tax_total,0)<0 or coalesce(p_discount_total,0)<0 then raise exception 'invalid_quote_amount'; end if;
  if p_currency not in ('USD','LYD') then raise exception 'invalid_currency'; end if;
  if p_payment_url is not null and p_payment_url<>'' and p_payment_url !~* '^https://[^[:space:]]+$' then raise exception 'invalid_payment_url'; end if;
  select * into before_row from public.special_requests where id=p_request_id for update;
  if not found then raise exception 'special_request_not_found'; end if;
  update public.special_requests set status=p_status,quoted_product_cost=p_product_cost,shipping_cost=p_shipping_cost,
    tax_total=coalesce(p_tax_total,0),discount_total=coalesce(p_discount_total,0),currency=p_currency,
    estimated_arrival_days=p_estimated_arrival_days,staff_notes=left(coalesce(p_staff_notes,''),5000),
    payment_url=nullif(left(coalesce(p_payment_url,''),1000),''),quote_expires_at=p_quote_expires_at,
    customer_decision=case when p_status in ('quoted','awaiting_customer') then 'pending' else customer_decision end,updated_at=now()
  where id=p_request_id returning * into after_row;
  insert into public.operations_audit_log(actor_id,action,entity_type,entity_id,before_data,after_data)
  values(auth.uid(),'staff_update_special_request','special_request',p_request_id::text,to_jsonb(before_row),to_jsonb(after_row));
  perform public.enqueue_commerce_notification(
    'special-update:'||after_row.id||':'||extract(epoch from after_row.updated_at)::bigint,
    'special_request_update','special_request',after_row.id::text,after_row.customer_email,
    'Shababuna special request update — '||after_row.request_number,
    jsonb_build_object('requestNumber',after_row.request_number,'status',after_row.status,'productCost',after_row.quoted_product_cost,
      'shippingCost',after_row.shipping_cost,'tax',after_row.tax_total,'discount',after_row.discount_total,'total',after_row.quote_total,
      'currency',after_row.currency,'estimatedArrivalDays',after_row.estimated_arrival_days,'paymentUrl',after_row.payment_url,
      'quoteExpiresAt',after_row.quote_expires_at,'staffNotes',after_row.staff_notes)
  );
  return after_row;
end; $$;
revoke all on function public.staff_update_special_request(uuid,text,numeric,numeric,numeric,numeric,text,integer,text,text,timestamptz) from public;
grant execute on function public.staff_update_special_request(uuid,text,numeric,numeric,numeric,numeric,text,integer,text,text,timestamptz) to authenticated,service_role;

create or replace function public.enqueue_new_special_request_notification()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  perform public.enqueue_commerce_notification(
    'new-special-request:'||new.id,
    'new_special_request','special_request',new.id::text,new.customer_email,
    'New Shababuna special request — '||new.request_number,
    jsonb_build_object('requestNumber',new.request_number,'customerName',new.customer_name,'customerEmail',new.customer_email,
      'phone',new.phone,'whatsapp',new.whatsapp,'country',new.country_code,'productUrl',new.product_url,
      'description',new.description,'preferredBrand',new.preferred_brand,'quantity',new.desired_quantity,
      'size',new.requested_size,'color',new.requested_color,'targetBudget',new.target_budget,'requiredDate',new.required_date,
      'preferredContactMethod',new.preferred_contact_method,'status',new.status,'createdAt',new.created_at)
  );
  return new;
end; $$;
drop trigger if exists enqueue_new_special_request_notification_trigger on public.special_requests;
create trigger enqueue_new_special_request_notification_trigger after insert on public.special_requests
for each row execute function public.enqueue_new_special_request_notification();

-- Product publishing and manufacturing-claim controls.
alter table public.product_catalog add column if not exists inventory_location text;
alter table public.product_catalog add column if not exists manufacturing_country text;
alter table public.product_catalog add column if not exists cut_country text;
alter table public.product_catalog add column if not exists sewing_country text;
alter table public.product_catalog add column if not exists printing_country text;
alter table public.product_catalog add column if not exists material_origin text;
alter table public.product_catalog add column if not exists manufacturing_claim_status text not null default 'unverified';
alter table public.product_catalog add column if not exists claim_evidence_reference text;
alter table public.product_catalog add column if not exists claim_verified boolean not null default false;

update public.product_catalog
set active=false,product_status='draft',inventory_tracking=false,inventory_quantity=0,availability_state='unavailable',
    variant_data=jsonb_set(jsonb_set(jsonb_set(coalesce(variant_data,'{}'::jsonb),'{readyToShip}','false'::jsonb,true),'{inventorySource}','"unverified_catalog"'::jsonb,true),'{productStatus}','"draft"'::jsonb,true),updated_at=now()
where coalesce(variant_data->>'mediaStatus','') in ('concept','missing')
   or coalesce(variant_data->>'inventorySource','') in ('unverified_catalog','concept_only','sample_data');

update public.product_catalog
set inventory_tracking=false,inventory_quantity=0,availability_state=case when active then 'in_stock' else 'unavailable' end,
    variant_data=jsonb_set(jsonb_set(coalesce(variant_data,'{}'::jsonb),'{readyToShip}','false'::jsonb,true),'{inventorySource}','"supplier_order"'::jsonb,true),updated_at=now()
where product_id like 'lha-%' and coalesce(variant_data->>'inventorySource','')='confirmed-lha-launch';

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),variant_id text not null references public.product_catalog(variant_id) on delete restrict,
  movement_type text not null check (movement_type in ('receipt','reservation','release','sale','return','adjustment','transfer')),
  quantity_delta integer not null check (quantity_delta<>0),quantity_after integer not null check (quantity_after>=0),
  reference_type text,reference_id text,note text,actor_id uuid references auth.users(id) on delete set null,created_at timestamptz not null default now()
);
alter table public.inventory_movements enable row level security;
revoke all on public.inventory_movements from anon,authenticated;
grant select on public.inventory_movements to authenticated,service_role;
grant insert on public.inventory_movements to service_role;
create policy "staff read inventory movements" on public.inventory_movements for select to authenticated using (public.is_shababuna_staff());

commit;

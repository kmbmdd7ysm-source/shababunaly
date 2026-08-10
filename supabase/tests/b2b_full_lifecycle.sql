-- Full database-backed B2B lifecycle: roster -> design -> quote -> 50% -> proof
-- -> production -> split shipment -> final 50% -> completion.
\set ON_ERROR_STOP on

create or replace function pg_temp.assert_true(p_condition boolean, p_message text)
returns void language plpgsql as $$
begin
  if not coalesce(p_condition,false) then raise exception 'assertion_failed: %',p_message; end if;
end; $$;

-- Disposable identity and records.
delete from public.shipments where quote_id='__b2b_lifecycle_quote';
delete from public.payment_ledger where entity_id='__b2b_lifecycle_quote';
delete from public.quote_verified_payment_events where quote_id='__b2b_lifecycle_quote';
delete from public.production_updates where quote_id='__b2b_lifecycle_quote';
delete from public.quote_requests where id='__b2b_lifecycle_quote';
delete from public.custom_design_versions where design_id='__b2b_lifecycle_design';
delete from public.custom_designs where id='__b2b_lifecycle_design';
delete from public.team_rosters where id='__b2b_lifecycle_roster';
delete from public.organization_members where user_id='91000000-0000-4000-8000-000000000001';
delete from public.organizations where name='B2B Lifecycle Test Club';
delete from auth.users where id='91000000-0000-4000-8000-000000000001';

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values('00000000-0000-0000-0000-000000000000','91000000-0000-4000-8000-000000000001','authenticated','authenticated',
'b2b-lifecycle@example.com',crypt('Local-test-only-123!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now());

insert into public.organizations(id,name,organization_type,country_code,status,created_by)
values('91000000-0000-4000-8000-000000000010','B2B Lifecycle Test Club','club','LY','approved','91000000-0000-4000-8000-000000000001');
insert into public.organization_members(organization_id,user_id,role)
values('91000000-0000-4000-8000-000000000010','91000000-0000-4000-8000-000000000001','owner');

insert into public.team_rosters(id,user_id,organization_id,name,players,player_count,validation_errors)
values('__b2b_lifecycle_roster','91000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000010','2026 Roster',
'[{"name":"Player One","number":"1","jerseySize":"L","shortsSize":"L"},{"name":"Player Two","number":"2","jerseySize":"XL","shortsSize":"XL"}]',2,0);

insert into public.custom_designs(id,user_id,organization_id,name,product_type,status,version,design_data,preview_data)
values('__b2b_lifecycle_design','91000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000010','B2B Lifecycle Uniform','game_uniform','under_review',1,
'{"rosterId":"__b2b_lifecycle_roster","factoryProfile":"generic-production-v2"}','{"front":"data:image/svg+xml;base64,PHN2Zy8+"}');

insert into public.quote_requests(id,user_id,organization_id,quote_number,status,currency,deposit_percent,request_data,idempotency_key)
values('__b2b_lifecycle_quote','91000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000010','QT-B2B-LIFECYCLE',
'under_review','USD',50,'{"customerEmail":"b2b-lifecycle@example.com","rosterId":"__b2b_lifecycle_roster","designId":"__b2b_lifecycle_design"}',
'91000000-0000-4000-8000-000000000011');

create or replace function public.__b2b_staff_quote(p_status text)
returns text language plpgsql security definer set search_path=public,pg_temp as $$
begin
  perform set_config('request.jwt.claim.role','service_role',false);
  return public.staff_update_quote('__b2b_lifecycle_quote',p_status,1000,100,1100,0,0)::text;
end; $$;
create or replace function public.__b2b_customer_quote()
returns text language plpgsql security definer set search_path=public,pg_temp as $$
begin
  perform set_config('request.jwt.claim.role','authenticated',false);
  perform set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',false);
  return public.customer_respond_to_quote('__b2b_lifecycle_quote','accepted','Approved for production')::text;
end; $$;
create or replace function public.__b2b_staff_proof()
returns text language plpgsql security definer set search_path=public,pg_temp as $$
begin
  perform set_config('request.jwt.claim.role','service_role',false);
  return public.staff_publish_design_proof('__b2b_lifecycle_design','{"proofUrl":"https://example.test/proofs/b2b.pdf","sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}','Factory proof v1')::text;
end; $$;
create or replace function public.__b2b_customer_design()
returns text language plpgsql security definer set search_path=public,pg_temp as $$
begin
  perform set_config('request.jwt.claim.role','authenticated',false);
  perform set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',false);
  return public.customer_respond_to_design('__b2b_lifecycle_design','approved','Approved')::text;
end; $$;
create or replace function public.__b2b_quote_payment(p_event text,p_amount numeric)
returns text language plpgsql security definer set search_path=public,pg_temp as $$
begin
  perform set_config('request.jwt.claim.role','service_role',false);
  return public.apply_verified_quote_payment_event('b2b-test-provider',p_event,'QT-B2B-LIFECYCLE','succeeded',p_amount,'USD','tx-'||p_event,repeat('c',64))::text;
end; $$;

-- Quote creation, customer approval and authoritative 50% deposit.
select public.__b2b_staff_quote('quote_sent');
select public.__b2b_customer_quote();
select public.__b2b_staff_quote('deposit_required');
select pg_temp.assert_true(
  (select status='deposit_required' and total=1100 and deposit_amount=550 and amount_due_now=550 and outstanding_balance=1100 from public.quote_requests where id='__b2b_lifecycle_quote'),
  'accepted quote must request an exact 50 percent deposit'
);
select public.__b2b_quote_payment('evt-b2b-deposit',550);
select pg_temp.assert_true(
  (select status='deposit_paid' and payment_status='partially_paid' and amount_paid=550 and outstanding_balance=550 from public.quote_requests where id='__b2b_lifecycle_quote'),
  'verified deposit must update quote and immutable ledger exactly once'
);

-- Proof approval and every production state transition.
select public.__b2b_staff_proof();
select public.__b2b_customer_design();
select public.__b2b_staff_quote('design_in_progress');
select public.__b2b_staff_quote('awaiting_design_approval');
select public.__b2b_staff_quote('design_approved');
select public.__b2b_staff_quote('in_production');
insert into public.production_updates(quote_id,status,title,message,visible_to_customer)
values('__b2b_lifecycle_quote','cutting','Cutting started','Production has started.',true),
('__b2b_lifecycle_quote','quality_control','Quality control','All units passed QC.',true);
select public.__b2b_staff_quote('quality_control');
select public.__b2b_staff_quote('arrived');
select public.__b2b_staff_quote('final_payment_required');
select pg_temp.assert_true(
  (select status='final_payment_required' and amount_due_now=550 and outstanding_balance=550 from public.quote_requests where id='__b2b_lifecycle_quote'),
  'final payment must equal the remaining verified balance'
);

-- Split shipment records are independently tracked.
select set_config('request.jwt.claim.role','service_role',false);
select public.staff_upsert_shipment(null,'SHP-B2B-A',null,'__b2b_lifecycle_quote',null,'TRACK-A','in_transit','{"split":1,"of":2}');
select public.staff_upsert_shipment(null,'SHP-B2B-B',null,'__b2b_lifecycle_quote',null,'TRACK-B','in_transit','{"split":2,"of":2}');
select public.staff_upsert_shipment(id,shipment_number,null,'__b2b_lifecycle_quote',null,tracking_number,'delivered','{"confirmed":true}')
from public.shipments where quote_id='__b2b_lifecycle_quote';

-- Final verified 50% closes the quote; no direct status mutation is accepted as payment.
select public.__b2b_quote_payment('evt-b2b-final',550);
select pg_temp.assert_true(
  (select status='completed' and payment_status='paid' and amount_paid=1100 and amount_due_now=0 and outstanding_balance=0 from public.quote_requests where id='__b2b_lifecycle_quote'),
  'final verified payment must reconcile the quote to zero outstanding balance'
);
select pg_temp.assert_true(
  (select count(*)=2 and sum(amount)=1100 from public.payment_ledger where entity_type='quote' and entity_id='__b2b_lifecycle_quote' and event_kind='charge'),
  'deposit and final payment must produce exactly two immutable ledger charges'
);
select pg_temp.assert_true(
  (select count(*)=2 and bool_and(status='delivered') from public.shipments where quote_id='__b2b_lifecycle_quote'),
  'both split shipments must be independently delivered'
);
select pg_temp.assert_true(
  (select status='approved' and approved_at is not null from public.custom_designs where id='__b2b_lifecycle_design'),
  'customer-approved proof must remain linked to the production workflow'
);
select pg_temp.assert_true(
  (select player_count=2 and validation_errors=0 from public.team_rosters where id='__b2b_lifecycle_roster'),
  'validated roster must remain attached to the B2B workflow'
);
select pg_temp.assert_true(
  (select count(*)>=10 from public.operations_audit_log where entity_id in ('__b2b_lifecycle_quote','__b2b_lifecycle_design')),
  'commercial and design transitions must be audited'
);

-- Cleanup.
drop function public.__b2b_staff_quote(text);
drop function public.__b2b_customer_quote();
drop function public.__b2b_staff_proof();
drop function public.__b2b_customer_design();
drop function public.__b2b_quote_payment(text,numeric);
delete from public.shipments where quote_id='__b2b_lifecycle_quote';
delete from public.payment_ledger where entity_id='__b2b_lifecycle_quote';
delete from public.quote_verified_payment_events where quote_id='__b2b_lifecycle_quote';
delete from public.production_updates where quote_id='__b2b_lifecycle_quote';
delete from public.quote_requests where id='__b2b_lifecycle_quote';
delete from public.custom_design_versions where design_id='__b2b_lifecycle_design';
delete from public.custom_designs where id='__b2b_lifecycle_design';
delete from public.team_rosters where id='__b2b_lifecycle_roster';
delete from public.organization_members where user_id='91000000-0000-4000-8000-000000000001';
delete from public.organizations where id='91000000-0000-4000-8000-000000000010';
delete from auth.users where id='91000000-0000-4000-8000-000000000001';

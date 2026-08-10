-- Executable RLS/IDOR/MFA role matrix. Runs after every clean db reset.
-- Covers anonymous privileges, two unrelated customers, organization member/owner,
-- staff AAL1/AAL2 and service-role boundaries with real row visibility assertions.
begin;
select plan(20);

-- Fixed disposable identities.
delete from public.organization_contracts where title='__rls_matrix_contract';
delete from public.organization_members where user_id in ('92000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000002');
delete from public.organizations where id='92000000-0000-4000-8000-000000000010';
delete from public.addresses where user_id in ('92000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000002');
delete from public.profiles where id in ('92000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000002');
delete from auth.users where id in ('92000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000002');

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
('00000000-0000-0000-0000-000000000000','92000000-0000-4000-8000-000000000001','authenticated','authenticated','rls-a@example.test',crypt('Local-test-only-123!',gen_salt('bf')),now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','92000000-0000-4000-8000-000000000002','authenticated','authenticated','rls-b@example.test',crypt('Local-test-only-123!',gen_salt('bf')),now(),'{}','{}',now(),now());
insert into public.profiles(id,display_name) values
('92000000-0000-4000-8000-000000000001','Customer A'),
('92000000-0000-4000-8000-000000000002','Customer B')
on conflict(id) do update set display_name=excluded.display_name;
insert into public.addresses(id,user_id,label,first_name,last_name,address_line_1,city,region,postal_code,country)
values
('92000000-0000-4000-8000-000000000101','92000000-0000-4000-8000-000000000001','A','A','User','A Street','Tripoli','Tripoli','10000','LY'),
('92000000-0000-4000-8000-000000000102','92000000-0000-4000-8000-000000000002','B','B','User','B Street','Tripoli','Tripoli','10000','LY');
insert into public.organizations(id,name,organization_type,country_code,status,created_by)
values('92000000-0000-4000-8000-000000000010','RLS Matrix Club','club','LY','approved','92000000-0000-4000-8000-000000000001');
insert into public.organization_members(organization_id,user_id,role) values
('92000000-0000-4000-8000-000000000010','92000000-0000-4000-8000-000000000001','owner');
insert into public.organization_contracts(id,organization_id,title,status,terms,created_by)
values('92000000-0000-4000-8000-000000000020','92000000-0000-4000-8000-000000000010','__rls_matrix_contract','draft','{"test":true}','92000000-0000-4000-8000-000000000001');

select ok(has_table_privilege('anon','public.profiles','SELECT')=false,'anon cannot read profiles');
select ok(has_table_privilege('anon','public.addresses','SELECT')=false,'anon cannot read addresses');
select ok(has_table_privilege('anon','public.orders','SELECT')=false,'anon cannot list orders');
select ok(has_table_privilege('authenticated','public.security_events','INSERT')=false,'browser users cannot forge security events');
select ok(has_table_privilege('authenticated','public.payment_ledger','INSERT')=false,'browser users cannot forge payment ledger entries');
select ok(has_function_privilege('anon','public.is_shababuna_staff()','EXECUTE')=false,'anon cannot call staff predicate');

set local role authenticated;
select set_config('request.jwt.claim.sub','92000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claims','{"sub":"92000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1","app_metadata":{}}',true);
select is((select count(*)::integer from public.profiles),1,'customer A sees only own profile');
select is((select count(*)::integer from public.profiles where id='92000000-0000-4000-8000-000000000002'),0,'customer A cannot IDOR customer B profile');
select is((select count(*)::integer from public.addresses),1,'customer A sees only own address');
select is((select count(*)::integer from public.addresses where user_id='92000000-0000-4000-8000-000000000002'),0,'customer A cannot IDOR customer B address');
select is((select count(*)::integer from public.organization_contracts where title='__rls_matrix_contract'),1,'organization owner sees own contract');
select is(public.is_shababuna_staff(),false,'ordinary customer is not staff');

select set_config('request.jwt.claim.sub','92000000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"92000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal1","app_metadata":{}}',true);
select is((select count(*)::integer from public.profiles),1,'customer B sees only own profile');
select is((select count(*)::integer from public.organization_contracts where title='__rls_matrix_contract'),0,'unrelated customer cannot read organization contract');

select set_config('request.jwt.claims','{"sub":"92000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal1","app_metadata":{"role":"admin"}}',true);
select is(public.is_shababuna_staff(),false,'admin claim at AAL1 is denied');
select is((select count(*)::integer from public.security_events),0,'AAL1 admin cannot read protected security events');
select set_config('request.jwt.claims','{"sub":"92000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal2","app_metadata":{"role":"admin"}}',true);
select is(public.is_shababuna_staff(),true,'admin claim at AAL2 is accepted');
select lives_ok($$select count(*) from public.security_events$$,'AAL2 admin can read protected security events');
reset role;

set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select set_config('request.jwt.claims','{"role":"service_role"}',true);
select is(public.is_shababuna_staff(),true,'service role is trusted without browser MFA');
select lives_ok($$select count(*) from public.payment_ledger$$,'service role can read trusted ledger');
reset role;

select * from finish();
rollback;

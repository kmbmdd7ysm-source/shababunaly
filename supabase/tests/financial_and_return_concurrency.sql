-- Concurrency proof for duplicate payment, over-refund and duplicate return races.
-- Run only against the disposable local Supabase database.
\set ON_ERROR_STOP on
create extension if not exists dblink;

create or replace function pg_temp.assert_true(p_condition boolean, p_message text)
returns void language plpgsql as $$
begin
  if not coalesce(p_condition, false) then raise exception 'assertion_failed: %', p_message; end if;
end; $$;

-- Clean fixtures from any previous interrupted run.
delete from public.refund_events where order_number like 'SHB-RACE-%';
delete from public.payment_events where order_number like 'SHB-RACE-%';
delete from public.payment_ledger where metadata->>'orderNumber' like 'SHB-RACE-%';
delete from public.return_requests where order_number like 'SHB-RACE-%';
delete from public.orders where order_number like 'SHB-RACE-%';
delete from auth.users where id='90000000-0000-4000-8000-000000000001';

insert into auth.users(
  instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at
) values (
  '00000000-0000-0000-0000-000000000000','90000000-0000-4000-8000-000000000001',
  'authenticated','authenticated','financial-race@example.com',crypt('Local-test-only-123!',gen_salt('bf')),now(),
  '{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now(),now()
);

insert into public.orders(
  order_number,user_id,customer_email,currency,subtotal,shipping_total,tax_total,discount_total,total,
  payment_method,payment_plan,amount_paid,amount_due_now,remaining_balance,outstanding_balance,
  payment_stage,payment_status,order_status,fulfillment_status,items_snapshot,idempotency_key
) values
  ('SHB-RACE-PAYMENT',null,'payment-race@example.com','USD',100,0,0,0,100,
   'online_card','full',0,100,0,100,'initial','pending','awaiting_payment','unfulfilled','[]',
   '90000000-0000-4000-8000-000000000011'),
  ('SHB-RACE-REFUND',null,'refund-race@example.com','USD',100,0,0,0,100,
   'online_card','full',100,0,0,0,'complete','paid','delivered','fulfilled','[]',
   '90000000-0000-4000-8000-000000000012'),
  ('SHB-RACE-RETURN','90000000-0000-4000-8000-000000000001','financial-race@example.com','USD',100,0,0,0,100,
   'online_card','full',100,0,0,0,'complete','paid','delivered','fulfilled',
   '[{"variantId":"RACE-VARIANT","sku":"RACE-SKU","name":"Race Jersey","quantity":1,"purchaseMode":"retail","customizable":false}]',
   '90000000-0000-4000-8000-000000000013');

-- Helpers set realistic JWT claims inside each independent dblink session.
create or replace function public.__race_apply_payment(p_event_id text)
returns text language plpgsql security definer set search_path=public,pg_temp as $$
begin
  perform set_config('request.jwt.claim.role','service_role',false);
  return public.apply_verified_payment_event(
    'race-provider',p_event_id,'SHB-RACE-PAYMENT','succeeded',100,'USD','tx-race-payment',
    repeat('a',64)
  )::text;
end; $$;

create or replace function public.__race_apply_refund(p_event_id text)
returns text language plpgsql security definer set search_path=public,pg_temp as $$
begin
  perform set_config('request.jwt.claim.role','service_role',false);
  return public.apply_verified_refund_event(
    'race-provider',p_event_id,'SHB-RACE-REFUND',80,'USD','tx-'||p_event_id,
    repeat('b',64),null
  )::text;
end; $$;

create or replace function public.__race_create_return()
returns text language plpgsql security definer set search_path=public,pg_temp as $$
begin
  perform set_config('request.jwt.claim.role','authenticated',false);
  perform set_config('request.jwt.claim.sub','90000000-0000-4000-8000-000000000001',false);
  return public.create_return_request(
    'SHB-RACE-RETURN','damaged','Concurrent return test',
    '[{"variantId":"RACE-VARIANT","sku":"RACE-SKU","name":"Race Jersey","quantity":1}]'::jsonb
  )::text;
end; $$;

-- The same provider event delivered twice concurrently must charge exactly once.
select dblink_connect('pay_a','dbname='||current_database());
select dblink_connect('pay_b','dbname='||current_database());
select dblink_send_query('pay_a',$$select public.__race_apply_payment('evt-race-payment')$$);
select dblink_send_query('pay_b',$$select public.__race_apply_payment('evt-race-payment')$$);
do $$
declare a_ok boolean:=false; b_ok boolean:=false;
begin
  begin perform * from dblink_get_result('pay_a') as t(result text); a_ok:=true; exception when others then null; end;
  begin perform * from dblink_get_result('pay_b') as t(result text); b_ok:=true; exception when others then null; end;
  if not a_ok or not b_ok then raise exception 'assertion_failed: idempotent duplicate payment deliveries must both resolve safely'; end if;
end $$;
select dblink_disconnect('pay_a'); select dblink_disconnect('pay_b');
select pg_temp.assert_true(
  (select amount_paid=100 and amount_due_now=0 and outstanding_balance=0 and payment_status='paid' from public.orders where order_number='SHB-RACE-PAYMENT'),
  'duplicate concurrent payment must apply money exactly once'
);
select pg_temp.assert_true(
  (select count(*)=1 from public.payment_events where id='evt-race-payment'),
  'duplicate concurrent payment must create one immutable provider event'
);
select pg_temp.assert_true(
  (select count(*)=1 from public.payment_ledger where event_id='evt-race-payment'),
  'duplicate concurrent payment must create one ledger charge'
);

-- Two different 80 USD refunds against a 100 USD payment must not over-refund.
select dblink_connect('refund_a','dbname='||current_database());
select dblink_connect('refund_b','dbname='||current_database());
select dblink_send_query('refund_a',$$select public.__race_apply_refund('evt-race-refund-a')$$);
select dblink_send_query('refund_b',$$select public.__race_apply_refund('evt-race-refund-b')$$);
do $$
declare a_ok boolean:=false; b_ok boolean:=false;
begin
  begin perform * from dblink_get_result('refund_a') as t(result text); a_ok:=true; exception when others then null; end;
  begin perform * from dblink_get_result('refund_b') as t(result text); b_ok:=true; exception when others then null; end;
  if (a_ok::integer+b_ok::integer)<>1 then raise exception 'assertion_failed: exactly one competing over-refund must succeed'; end if;
end $$;
select dblink_disconnect('refund_a'); select dblink_disconnect('refund_b');
select pg_temp.assert_true(
  (select amount_refunded=80 and payment_status='partially_refunded' from public.orders where order_number='SHB-RACE-REFUND'),
  'concurrent refunds must never exceed the verified paid amount'
);
select pg_temp.assert_true(
  (select count(*)=1 and sum(amount)=80 from public.refund_events where order_number='SHB-RACE-REFUND'),
  'only one competing refund event may be recorded'
);

-- Two concurrent customer requests for the same delivered order must create one active return.
select dblink_connect('return_a','dbname='||current_database());
select dblink_connect('return_b','dbname='||current_database());
select dblink_send_query('return_a',$$select public.__race_create_return()$$);
select dblink_send_query('return_b',$$select public.__race_create_return()$$);
do $$
declare a_ok boolean:=false; b_ok boolean:=false;
begin
  begin perform * from dblink_get_result('return_a') as t(result text); a_ok:=true; exception when others then null; end;
  begin perform * from dblink_get_result('return_b') as t(result text); b_ok:=true; exception when others then null; end;
  if (a_ok::integer+b_ok::integer)<>1 then raise exception 'assertion_failed: exactly one concurrent active return must succeed'; end if;
end $$;
select dblink_disconnect('return_a'); select dblink_disconnect('return_b');
select pg_temp.assert_true(
  (select count(*)=1 from public.return_requests where order_number='SHB-RACE-RETURN' and status not in ('rejected','refunded','closed','cancelled')),
  'concurrent return requests must create one active return'
);

-- Remove test-only helpers and fixtures.
drop function public.__race_apply_payment(text);
drop function public.__race_apply_refund(text);
drop function public.__race_create_return();
delete from public.refund_events where order_number like 'SHB-RACE-%';
delete from public.payment_events where order_number like 'SHB-RACE-%';
delete from public.payment_ledger where metadata->>'orderNumber' like 'SHB-RACE-%';
delete from public.return_requests where order_number like 'SHB-RACE-%';
delete from public.orders where order_number like 'SHB-RACE-%';
delete from auth.users where id='90000000-0000-4000-8000-000000000001';

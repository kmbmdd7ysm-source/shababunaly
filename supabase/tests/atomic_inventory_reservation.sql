-- Run against an isolated local Supabase/Postgres database after all migrations.
-- This test intentionally commits fixtures because dblink sessions must see them.
\set ON_ERROR_STOP on
create extension if not exists dblink;

create or replace function pg_temp.assert_true(p_condition boolean, p_message text)
returns void language plpgsql as $$
begin
  if not coalesce(p_condition, false) then
    raise exception 'assertion_failed: %', p_message;
  end if;
end; $$;

-- Clean and seed isolated fixtures.
delete from public.order_items where product_id like '__atomic_test_%';
delete from public.orders where customer_email like 'atomic-test-%@example.com';
delete from public.product_catalog where product_id like '__atomic_test_%';

insert into public.product_catalog(
  variant_id, product_id, canonical_slug, sku, product_name, product_status,
  active, currency, unit_price, availability_state, inventory_tracking,
  inventory_quantity, variant_data
) values
  ('__atomic_test_success_v','__atomic_test_success','atomic-test-success','AT-SUCCESS','Atomic Test','active',true,'USD',10,'in_stock',true,5,'{}'),
  ('__atomic_test_race_v','__atomic_test_race','atomic-test-race','AT-RACE','Atomic Test','active',true,'USD',10,'low_stock',true,1,'{}'),
  ('__atomic_test_rollback_v','__atomic_test_rollback','atomic-test-rollback','AT-ROLLBACK','Atomic Test','active',true,'USD',10,'in_stock',true,3,'{}'),
  ('__atomic_test_unlimited_v','__atomic_test_unlimited','atomic-test-unlimited','AT-UNLIMITED','Atomic Test','active',true,'USD',10,'in_stock',false,null,'{}');

-- Successful reservation.
select public.create_order_transactional(
  null,'atomic-test-success@example.com','USD','cash_on_delivery',
  '10000000-0000-0000-0000-000000000001','{}',
  '[{"variantId":"__atomic_test_success_v","productId":"__atomic_test_success","quantity":2}]'
);
select pg_temp.assert_true(
  (select inventory_quantity = 3 from public.product_catalog where variant_id='__atomic_test_success_v'),
  'successful reservation must decrement inventory exactly once'
);
select pg_temp.assert_true(
  (select count(*) = 1 from public.orders where idempotency_key='10000000-0000-0000-0000-000000000001'),
  'successful reservation must create one order'
);
select pg_temp.assert_true(
  (select count(*) = 1 from public.order_items where product_id='__atomic_test_success'),
  'successful reservation must create its order item'
);

-- Duplicate idempotent request must return the existing order without reserving again.
select public.create_order_transactional(
  null,'atomic-test-success@example.com','USD','cash_on_delivery',
  '10000000-0000-0000-0000-000000000001','{}',
  '[{"variantId":"__atomic_test_success_v","productId":"__atomic_test_success","quantity":2}]'
);
select pg_temp.assert_true(
  (select inventory_quantity = 3 from public.product_catalog where variant_id='__atomic_test_success_v'),
  'duplicate idempotent request must not decrement inventory twice'
);

-- Insufficient stock must create neither an order nor a partial reservation.
do $$
begin
  begin
    perform public.create_order_transactional(
      null,'atomic-test-insufficient@example.com','USD','cash_on_delivery',
      '10000000-0000-0000-0000-000000000002','{}',
      '[{"variantId":"__atomic_test_success_v","productId":"__atomic_test_success","quantity":4}]'
    );
    raise exception 'expected insufficient_inventory';
  exception when sqlstate '22023' then
    if sqlerrm <> 'insufficient_inventory' then raise; end if;
  end;
end $$;
select pg_temp.assert_true(
  (select inventory_quantity = 3 from public.product_catalog where variant_id='__atomic_test_success_v'),
  'insufficient stock must not change inventory'
);
select pg_temp.assert_true(
  not exists(select 1 from public.orders where idempotency_key='10000000-0000-0000-0000-000000000002'),
  'insufficient stock must not create an order'
);

-- Unlimited inventory is explicit and is never decremented.
select public.create_order_transactional(
  null,'atomic-test-unlimited@example.com','USD','cash_on_delivery',
  '10000000-0000-0000-0000-000000000003','{}',
  '[{"variantId":"__atomic_test_unlimited_v","productId":"__atomic_test_unlimited","quantity":99}]'
);
select pg_temp.assert_true(
  (select inventory_tracking = false and inventory_quantity is null from public.product_catalog where variant_id='__atomic_test_unlimited_v'),
  'unlimited inventory must remain unlimited'
);

-- Failure after decrement must roll back inventory, order, and order_items together.
create or replace function pg_temp.reject_atomic_rollback_item()
returns trigger language plpgsql as $$
begin
  if new.product_id = '__atomic_test_rollback' then
    raise exception 'forced_order_item_failure';
  end if;
  return new;
end; $$;
create trigger atomic_inventory_rollback_test
before insert on public.order_items
for each row execute function pg_temp.reject_atomic_rollback_item();

do $$
begin
  begin
    perform public.create_order_transactional(
      null,'atomic-test-rollback@example.com','USD','cash_on_delivery',
      '10000000-0000-0000-0000-000000000004','{}',
      '[{"variantId":"__atomic_test_rollback_v","productId":"__atomic_test_rollback","quantity":2}]'
    );
    raise exception 'expected forced_order_item_failure';
  exception when others then
    if sqlerrm <> 'forced_order_item_failure' then raise; end if;
  end;
end $$;
drop trigger atomic_inventory_rollback_test on public.order_items;
select pg_temp.assert_true(
  (select inventory_quantity = 3 from public.product_catalog where variant_id='__atomic_test_rollback_v'),
  'downstream failure must roll back inventory decrement'
);
select pg_temp.assert_true(
  not exists(select 1 from public.orders where idempotency_key='10000000-0000-0000-0000-000000000004'),
  'downstream failure must roll back the order'
);

-- Two concurrent checkouts compete for the final unit. Exactly one succeeds.
select dblink_connect('atomic_a', 'dbname=' || current_database());
select dblink_connect('atomic_b', 'dbname=' || current_database());
select dblink_send_query('atomic_a', $$
  select public.create_order_transactional(
    null,'atomic-test-race-a@example.com','USD','cash_on_delivery',
    '10000000-0000-0000-0000-000000000005','{}',
    '[{"variantId":"__atomic_test_race_v","productId":"__atomic_test_race","quantity":1}]'
  )::text
$$);
select dblink_send_query('atomic_b', $$
  select public.create_order_transactional(
    null,'atomic-test-race-b@example.com','USD','cash_on_delivery',
    '10000000-0000-0000-0000-000000000006','{}',
    '[{"variantId":"__atomic_test_race_v","productId":"__atomic_test_race","quantity":1}]'
  )::text
$$);

do $$
declare
  a_ok boolean := false;
  b_ok boolean := false;
begin
  begin perform * from dblink_get_result('atomic_a') as t(result text); a_ok := true; exception when others then null; end;
  begin perform * from dblink_get_result('atomic_b') as t(result text); b_ok := true; exception when others then null; end;
  if (a_ok::integer + b_ok::integer) <> 1 then
    raise exception 'assertion_failed: exactly one simultaneous checkout must succeed';
  end if;
end $$;
select dblink_disconnect('atomic_a');
select dblink_disconnect('atomic_b');
select pg_temp.assert_true(
  (select inventory_quantity = 0 from public.product_catalog where variant_id='__atomic_test_race_v'),
  'simultaneous checkout must reserve the final unit once'
);
select pg_temp.assert_true(
  (select count(*) = 1 from public.orders where idempotency_key in (
    '10000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000006'
  )),
  'simultaneous checkout must create exactly one order'
);
select pg_temp.assert_true(
  not exists(select 1 from public.product_catalog where inventory_tracking and inventory_quantity < 0),
  'tracked inventory must never become negative'
);

-- Cleanup.
delete from public.order_items where product_id like '__atomic_test_%';
delete from public.orders where customer_email like 'atomic-test-%@example.com';
delete from public.product_catalog where product_id like '__atomic_test_%';

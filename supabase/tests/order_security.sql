-- Executable with a local Supabase/Postgres test database after migrations and catalog seed.
begin;
select plan(6);

select ok(to_regclass('public.product_catalog') is not null, 'trusted product catalog exists');
select ok(to_regprocedure('public.create_order_transactional(uuid,text,text,text,uuid,jsonb,jsonb)') is not null, 'transactional order RPC exists');
select ok(has_table_privilege('anon','public.orders','INSERT') = false, 'anonymous visitors cannot insert orders directly');
select ok(has_table_privilege('authenticated','public.orders','UPDATE') = false, 'customers cannot update trusted order rows directly');
select ok(has_table_privilege('anon','public.orders','SELECT') = false, 'anonymous visitors cannot list orders');
select ok((select count(*) > 0 from public.product_catalog where active), 'published catalog seed exists');

select * from finish();
rollback;

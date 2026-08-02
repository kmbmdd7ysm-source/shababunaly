begin;
select plan(24);

select ok(to_regclass('public.payment_ledger') is not null, 'immutable payment ledger exists');
select ok(to_regclass('public.design_share_links') is not null, 'secure design share links exist');
select ok(to_regclass('public.design_comments') is not null, 'pinned design comments exist');
select ok(to_regclass('public.privacy_export_requests') is not null, 'privacy export requests exist');
select ok(to_regclass('public.special_requests') is not null, 'special requests exist');
select ok(to_regclass('public.special_request_files') is not null, 'special request files exist');

select ok(exists(select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='outstanding_balance'), 'orders track full outstanding balance');
select ok(exists(select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='delivered_at'), 'orders track actual delivery timestamp');
select ok(exists(select 1 from information_schema.columns where table_schema='public' and table_name='quote_requests' and column_name='outstanding_balance'), 'quotes track full outstanding balance');
select ok(exists(select 1 from information_schema.columns where table_schema='public' and table_name='design_share_links' and column_name='token_hash'), 'design share tokens are stored only as hashes');
select ok(exists(select 1 from information_schema.columns where table_schema='public' and table_name='special_request_files' and column_name='quarantine_status'), 'uploaded files retain quarantine state');
select ok(exists(select 1 from information_schema.columns where table_schema='public' and table_name='product_catalog' and column_name='claim_verified'), 'manufacturing claims require explicit verification');

select ok(to_regprocedure('public.apply_verified_payment_event(text,text,text,text,numeric,text,text,text)') is not null, 'verified order payment event function exists');
select ok(to_regprocedure('public.apply_verified_quote_payment_event(text,text,text,text,numeric,text,text,text)') is not null, 'verified quote payment event function exists');
select ok(to_regprocedure('public.create_return_request(text,text,text,jsonb)') is not null, 'cumulative return request function exists');
select ok(to_regprocedure('public.create_design_share_link(text,text,integer)') is not null, 'secure design share creation function exists');
select ok(to_regprocedure('public.get_shared_design(text)') is not null, 'shared design read function exists');
select ok(to_regprocedure('public.add_shared_design_comment(text,text,numeric,numeric,text,text,text)') is not null, 'shared design comment function exists');
select ok(to_regprocedure('public.respond_to_shared_design(text,text,text)') is not null, 'shared design decision function exists');
select ok(to_regprocedure('public.request_my_privacy_export()') is not null, 'privacy export function exists');

select ok(has_table_privilege('anon','public.orders','SELECT') = false, 'anonymous visitors cannot list orders');
select ok(has_table_privilege('anon','public.payment_ledger','SELECT') = false, 'anonymous visitors cannot read payment ledger');
select ok(has_table_privilege('anon','public.special_request_files','SELECT') = false, 'anonymous visitors cannot list quarantined files');
select ok(has_table_privilege('authenticated','public.payment_ledger','UPDATE') = false, 'customers cannot mutate payment ledger');

select * from finish();
rollback;

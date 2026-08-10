begin;
select plan(9);

select ok(to_regclass('public.organization_contracts') is not null, 'organization contracts exist');
select ok(to_regclass('public.contract_signatures') is not null, 'contract signatures exist');
select ok(to_regclass('public.payment_proofs') is not null, 'payment proofs exist');
select ok(to_regclass('public.reorder_requests') is not null, 'reorder requests exist');
select ok(to_regclass('public.team_locker_stores') is not null, 'team locker stores exist');
select ok(to_regprocedure('public.customer_sign_contract(uuid,text,text,text,text,text,text,text,text)') is not null, 'customer contract signature RPC exists');
select ok(to_regprocedure('public.customer_register_payment_proof(text,text,uuid,numeric,text,text,text,text)') is not null, 'customer payment proof RPC exists');
select ok(has_table_privilege('anon','public.payment_proofs','SELECT') = false, 'anonymous visitors cannot read payment proofs');
select ok(has_table_privilege('anon','public.organization_contracts','SELECT') = false, 'anonymous visitors cannot read contracts');

select * from finish();
rollback;

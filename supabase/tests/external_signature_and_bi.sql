begin;
select plan(18);

select has_table('public','contract_signature_envelopes','external signature envelopes exist');
select has_table('public','commerce_events','business intelligence event warehouse exists');
select has_function('public','customer_prepare_external_signature',array['uuid','text','text','text','text','text','timestamp with time zone','text','jsonb'],'customer external-signature preparation RPC exists');
select has_function('public','apply_external_signature_event',array['text','text','text','text','timestamp with time zone','text','text','text','text','jsonb','jsonb'],'trusted external-signature event RPC exists');
select has_view('public','business_intelligence_summary','protected BI summary view exists');

select ok(exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_contracts' and column_name='signature_mode'),'contracts distinguish internal and external signature modes');
select ok(exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_contracts' and column_name='external_signature_status'),'contracts track external signature status');
select ok(exists(select 1 from information_schema.columns where table_schema='public' and table_name='contract_signature_envelopes' and column_name='signed_document_sha256'),'signed document SHA-256 evidence is stored');
select ok(exists(select 1 from information_schema.columns where table_schema='public' and table_name='contract_signature_envelopes' and column_name='audit_certificate_sha256'),'audit certificate SHA-256 evidence is stored');
select ok(exists(select 1 from information_schema.columns where table_schema='public' and table_name='contract_signature_envelopes' and column_name='identity_verification'),'identity-verification evidence is stored');

select ok(has_table_privilege('anon','public.contract_signature_envelopes','SELECT') = false,'anonymous visitors cannot read signature evidence');
select ok(has_table_privilege('authenticated','public.contract_signature_envelopes','INSERT') = false,'customers cannot forge signature envelopes directly');
select ok(has_table_privilege('authenticated','public.contract_signature_envelopes','UPDATE') = false,'customers cannot forge completion evidence');
select ok(has_function_privilege('anon','public.apply_external_signature_event(text,text,text,text,timestamp with time zone,text,text,text,text,jsonb,jsonb)','EXECUTE') = false,'anonymous visitors cannot apply signature events');
select ok(has_function_privilege('authenticated','public.apply_external_signature_event(text,text,text,text,timestamp with time zone,text,text,text,text,jsonb,jsonb)','EXECUTE') = false,'customers cannot apply signature events');
select ok(has_table_privilege('anon','public.commerce_events','SELECT') = false,'anonymous visitors cannot read BI events');
select ok(has_table_privilege('authenticated','public.commerce_events','INSERT') = false,'customers cannot forge server-side BI events');
select ok((select relrowsecurity from pg_class where oid='public.contract_signature_envelopes'::regclass),'RLS is enabled for external signature evidence');

select * from finish();
rollback;

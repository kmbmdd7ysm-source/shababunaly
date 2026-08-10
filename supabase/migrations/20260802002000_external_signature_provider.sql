begin;

-- External legal-signature evidence is stored separately from the internal
-- acceptance record. A contract can require an external provider and cannot be
-- marked externally completed unless a trusted webhook stores both the signed
-- document hash and the provider audit-certificate hash.
alter table public.organization_contracts
  add column if not exists signature_mode text not null default 'internal_acceptance'
    check (signature_mode in ('internal_acceptance','external_optional','external_required')),
  add column if not exists external_signature_status text not null default 'not_requested'
    check (external_signature_status in ('not_requested','prepared','sent','viewed','signed','declined','expired','void','failed')),
  add column if not exists external_signature_provider text,
  add column if not exists external_signature_completed_at timestamptz;

create table if not exists public.contract_signature_envelopes (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.organization_contracts(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null,
  provider_envelope_id text not null,
  provider_status text not null default 'prepared',
  signer_id uuid references auth.users(id) on delete set null,
  signer_name text not null,
  signer_email text not null,
  signing_url text,
  signing_url_expires_at timestamptz,
  provider_event_id text,
  provider_event_at timestamptz,
  document_sha256 text,
  signed_document_url text,
  signed_document_sha256 text,
  audit_certificate_url text,
  audit_certificate_sha256 text,
  identity_verification jsonb not null default '{}'::jsonb,
  provider_metadata jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider,provider_envelope_id),
  check (char_length(provider_envelope_id) between 2 and 300),
  check (document_sha256 is null or document_sha256 ~ '^[0-9a-f]{64}$'),
  check (signed_document_sha256 is null or signed_document_sha256 ~ '^[0-9a-f]{64}$'),
  check (audit_certificate_sha256 is null or audit_certificate_sha256 ~ '^[0-9a-f]{64}$')
);
create index if not exists contract_signature_envelopes_contract_idx on public.contract_signature_envelopes(contract_id,created_at desc);
create index if not exists contract_signature_envelopes_org_idx on public.contract_signature_envelopes(organization_id,created_at desc);

alter table public.contract_signature_envelopes enable row level security;
revoke all on public.contract_signature_envelopes from anon,authenticated;
grant select,insert,update,delete on public.contract_signature_envelopes to service_role;
grant select on public.contract_signature_envelopes to authenticated;

drop policy if exists "signature envelopes visible to organization" on public.contract_signature_envelopes;
create policy "signature envelopes visible to organization" on public.contract_signature_envelopes
for select to authenticated using (
  public.is_shababuna_staff() or public.is_organization_member(organization_id)
);

create or replace function public.customer_prepare_external_signature(
  p_contract_id uuid,
  p_provider text,
  p_provider_envelope_id text,
  p_signer_name text,
  p_signer_email text,
  p_signing_url text default null,
  p_signing_url_expires_at timestamptz default null,
  p_document_sha256 text default null,
  p_provider_metadata jsonb default '{}'::jsonb
)
returns public.contract_signature_envelopes
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare v_contract public.organization_contracts; v_envelope public.contract_signature_envelopes;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select * into v_contract from public.organization_contracts where id=p_contract_id for update;
  if v_contract.id is null or not public.is_organization_manager(v_contract.organization_id) then raise exception 'contract_not_found'; end if;
  if v_contract.status not in ('sent','viewed','changes_requested') then raise exception 'contract_not_signable'; end if;
  if v_contract.valid_until is not null and v_contract.valid_until<=now() then raise exception 'contract_expired'; end if;
  if char_length(btrim(coalesce(p_provider,'')))<2 or char_length(btrim(coalesce(p_provider_envelope_id,'')))<2 then raise exception 'provider_envelope_required'; end if;
  if char_length(btrim(coalesce(p_signer_name,'')))<2 or char_length(btrim(coalesce(p_signer_email,'')))<5 then raise exception 'signer_details_required'; end if;
  insert into public.contract_signature_envelopes(
    contract_id,organization_id,provider,provider_envelope_id,provider_status,signer_id,signer_name,signer_email,
    signing_url,signing_url_expires_at,document_sha256,provider_metadata
  ) values(
    v_contract.id,v_contract.organization_id,left(lower(btrim(p_provider)),80),left(btrim(p_provider_envelope_id),300),'sent',auth.uid(),
    left(btrim(p_signer_name),160),lower(left(btrim(p_signer_email),320)),nullif(left(btrim(coalesce(p_signing_url,'')),2000),''),
    p_signing_url_expires_at,nullif(lower(btrim(coalesce(p_document_sha256,''))),''),coalesce(p_provider_metadata,'{}'::jsonb)
  )
  on conflict(provider,provider_envelope_id) do update set
    signing_url=excluded.signing_url,signing_url_expires_at=excluded.signing_url_expires_at,
    provider_status='sent',updated_at=now()
  returning * into v_envelope;
  update public.organization_contracts set
    external_signature_provider=v_envelope.provider,external_signature_status='sent',updated_at=now()
  where id=v_contract.id;
  insert into public.operations_audit_log(actor_id,action,entity_type,entity_id,after_data)
  values(auth.uid(),'external_signature_started','organization_contract',v_contract.id::text,
    jsonb_build_object('provider',v_envelope.provider,'envelopeId',v_envelope.provider_envelope_id));
  return v_envelope;
end;
$$;
revoke all on function public.customer_prepare_external_signature(uuid,text,text,text,text,text,timestamptz,text,jsonb) from public;
grant execute on function public.customer_prepare_external_signature(uuid,text,text,text,text,text,timestamptz,text,jsonb) to authenticated,service_role;

create or replace function public.apply_external_signature_event(
  p_provider text,
  p_provider_envelope_id text,
  p_provider_event_id text,
  p_provider_status text,
  p_provider_event_at timestamptz,
  p_signed_document_url text default null,
  p_signed_document_sha256 text default null,
  p_audit_certificate_url text default null,
  p_audit_certificate_sha256 text default null,
  p_identity_verification jsonb default '{}'::jsonb,
  p_provider_metadata jsonb default '{}'::jsonb
)
returns public.contract_signature_envelopes
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare v public.contract_signature_envelopes; v_normalized text; v_contract_status text;
begin
  if auth.role()<>'service_role' and not public.is_shababuna_staff() then raise exception 'staff_required'; end if;
  v_normalized=lower(btrim(coalesce(p_provider_status,'')));
  if v_normalized not in ('prepared','sent','viewed','signed','declined','expired','void','failed') then raise exception 'invalid_signature_status'; end if;
  select * into v from public.contract_signature_envelopes
  where provider=lower(btrim(p_provider)) and provider_envelope_id=p_provider_envelope_id for update;
  if v.id is null then raise exception 'signature_envelope_not_found'; end if;
  if v.provider_event_id=p_provider_event_id then return v; end if;
  if v_normalized='signed' and (
    coalesce(p_signed_document_sha256,'') !~ '^[0-9a-f]{64}$' or
    coalesce(p_audit_certificate_sha256,'') !~ '^[0-9a-f]{64}$' or
    coalesce(p_signed_document_url,'') !~ '^https://' or
    coalesce(p_audit_certificate_url,'') !~ '^https://'
  ) then raise exception 'signed_evidence_required'; end if;
  update public.contract_signature_envelopes set
    provider_status=v_normalized,provider_event_id=left(p_provider_event_id,300),provider_event_at=coalesce(p_provider_event_at,now()),
    signed_document_url=nullif(left(btrim(coalesce(p_signed_document_url,'')),2000),''),
    signed_document_sha256=nullif(lower(btrim(coalesce(p_signed_document_sha256,''))),''),
    audit_certificate_url=nullif(left(btrim(coalesce(p_audit_certificate_url,'')),2000),''),
    audit_certificate_sha256=nullif(lower(btrim(coalesce(p_audit_certificate_sha256,''))),''),
    identity_verification=coalesce(p_identity_verification,'{}'::jsonb),
    provider_metadata=coalesce(provider_metadata,'{}'::jsonb)||coalesce(p_provider_metadata,'{}'::jsonb),
    completed_at=case when v_normalized='signed' then coalesce(p_provider_event_at,now()) else completed_at end,
    updated_at=now()
  where id=v.id returning * into v;
  v_contract_status=case v_normalized when 'signed' then 'accepted' when 'declined' then 'rejected' when 'expired' then 'expired' when 'void' then 'void' else null end;
  update public.organization_contracts set
    external_signature_status=v_normalized,
    external_signature_completed_at=case when v_normalized='signed' then coalesce(p_provider_event_at,now()) else external_signature_completed_at end,
    status=coalesce(v_contract_status,status),
    accepted_at=case when v_normalized='signed' then coalesce(p_provider_event_at,now()) else accepted_at end,
    accepted_by=case when v_normalized='signed' then v.signer_id else accepted_by end,
    updated_at=now()
  where id=v.contract_id;
  insert into public.operations_audit_log(actor_id,action,entity_type,entity_id,after_data)
  values(null,'external_signature_'||v_normalized,'organization_contract',v.contract_id::text,
    jsonb_build_object('provider',v.provider,'envelopeId',v.provider_envelope_id,'eventId',p_provider_event_id,
      'signedDocumentSha256',v.signed_document_sha256,'auditCertificateSha256',v.audit_certificate_sha256));
  return v;
end;
$$;
revoke all on function public.apply_external_signature_event(text,text,text,text,timestamptz,text,text,text,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.apply_external_signature_event(text,text,text,text,timestamptz,text,text,text,text,jsonb,jsonb) to service_role;

-- Internal acceptance is not allowed when the contract explicitly requires a
-- third-party signature certificate.
create or replace function public.customer_sign_contract(
  p_contract_id uuid,p_signer_name text,p_signer_email text,p_signature_type text,p_signature_hash text,
  p_consent_text_version text,p_signed_payload_hash text,p_ip_hash text default null,p_user_agent_hash text default null
)
returns public.organization_contracts
language plpgsql security definer set search_path=public,pg_temp
as $$
declare v_contract public.organization_contracts;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select * into v_contract from public.organization_contracts where id=p_contract_id for update;
  if v_contract.id is null or not public.is_organization_manager(v_contract.organization_id) then raise exception 'contract_not_found'; end if;
  if v_contract.signature_mode='external_required' then raise exception 'external_signature_required'; end if;
  if v_contract.status not in ('sent','viewed','changes_requested') then raise exception 'contract_not_signable'; end if;
  if v_contract.valid_until is not null and v_contract.valid_until<=now() then raise exception 'contract_expired'; end if;
  if p_signature_type not in ('typed','drawn','verified_click') then raise exception 'invalid_signature_type'; end if;
  if char_length(btrim(coalesce(p_signer_name,'')))<2 or char_length(btrim(coalesce(p_signer_email,'')))<5 then raise exception 'signer_details_required'; end if;
  if char_length(coalesce(p_signature_hash,''))<32 or char_length(coalesce(p_signed_payload_hash,''))<32 then raise exception 'invalid_signature_hash'; end if;
  insert into public.contract_signatures(contract_id,signer_id,signer_name,signer_email,signature_type,signature_hash,consent_text_version,signed_payload_hash,ip_hash,user_agent_hash)
  values(v_contract.id,auth.uid(),left(btrim(p_signer_name),160),lower(left(btrim(p_signer_email),320)),p_signature_type,p_signature_hash,left(p_consent_text_version,80),p_signed_payload_hash,p_ip_hash,p_user_agent_hash)
  on conflict(contract_id,signer_id) do nothing;
  update public.organization_contracts set status='accepted',accepted_at=now(),accepted_by=auth.uid(),updated_at=now() where id=v_contract.id returning * into v_contract;
  insert into public.operations_audit_log(actor_id,action,entity_type,entity_id,after_data)
  values(auth.uid(),'contract_internal_acceptance','organization_contract',v_contract.id::text,
    jsonb_build_object('contractNumber',v_contract.contract_number,'signatureType',p_signature_type,'legalProviderCertificate',false));
  return v_contract;
end;
$$;
revoke all on function public.customer_sign_contract(uuid,text,text,text,text,text,text,text,text) from public;
grant execute on function public.customer_sign_contract(uuid,text,text,text,text,text,text,text,text) to authenticated,service_role;

commit;

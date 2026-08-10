begin;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('contract-signature-evidence','contract-signature-evidence',false,25000000,array['application/pdf','application/json','application/octet-stream'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

alter table public.contract_signature_envelopes
  add column if not exists signed_document_storage_path text,
  add column if not exists audit_certificate_storage_path text,
  add column if not exists evidence_verified_at timestamptz,
  add column if not exists trusted_timestamp timestamptz;

create or replace function public.require_verified_signature_evidence()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  if new.provider_status='signed' and (
    coalesce(new.signed_document_storage_path,'')='' or
    coalesce(new.audit_certificate_storage_path,'')='' or
    new.evidence_verified_at is null or
    coalesce(new.signed_document_sha256,'') !~ '^[0-9a-f]{64}$' or
    coalesce(new.audit_certificate_sha256,'') !~ '^[0-9a-f]{64}$' or
    coalesce(new.identity_verification->>'verified','false')<>'true'
  ) then raise exception 'verified_signature_evidence_required'; end if;
  return new;
end; $$;
drop trigger if exists contract_signature_verified_evidence_guard on public.contract_signature_envelopes;
create trigger contract_signature_verified_evidence_guard before insert or update on public.contract_signature_envelopes
for each row execute function public.require_verified_signature_evidence();

create or replace function public.apply_verified_external_signature_event(
  p_provider text,p_provider_envelope_id text,p_provider_event_id text,p_provider_event_at timestamptz,
  p_signed_document_storage_path text,p_signed_document_sha256 text,p_audit_certificate_storage_path text,
  p_audit_certificate_sha256 text,p_identity_verification jsonb,p_provider_metadata jsonb default '{}'::jsonb
) returns public.contract_signature_envelopes
language plpgsql security definer set search_path=public,pg_temp as $$
declare v public.contract_signature_envelopes;
begin
  if auth.role()<>'service_role' then raise exception 'service_role_required'; end if;
  if coalesce(p_signed_document_storage_path,'')='' or coalesce(p_audit_certificate_storage_path,'')='' then raise exception 'private_evidence_paths_required'; end if;
  if coalesce(p_signed_document_sha256,'') !~ '^[0-9a-f]{64}$' or coalesce(p_audit_certificate_sha256,'') !~ '^[0-9a-f]{64}$' then raise exception 'evidence_hashes_required'; end if;
  if coalesce(p_identity_verification->>'verified','false')<>'true' then raise exception 'verified_identity_required'; end if;
  select * into v from public.contract_signature_envelopes where provider=lower(btrim(p_provider)) and provider_envelope_id=p_provider_envelope_id for update;
  if v.id is null then raise exception 'signature_envelope_not_found'; end if;
  if v.provider_event_id=p_provider_event_id and v.provider_status='signed' then return v; end if;
  update public.contract_signature_envelopes set provider_status='signed',provider_event_id=left(p_provider_event_id,300),
    provider_event_at=coalesce(p_provider_event_at,now()),signed_document_url=null,audit_certificate_url=null,
    signed_document_storage_path=p_signed_document_storage_path,signed_document_sha256=lower(p_signed_document_sha256),
    audit_certificate_storage_path=p_audit_certificate_storage_path,audit_certificate_sha256=lower(p_audit_certificate_sha256),
    identity_verification=p_identity_verification,provider_metadata=coalesce(provider_metadata,'{}'::jsonb)||coalesce(p_provider_metadata,'{}'::jsonb),
    evidence_verified_at=now(),trusted_timestamp=coalesce(p_provider_event_at,now()),completed_at=coalesce(p_provider_event_at,now()),updated_at=now()
  where id=v.id returning * into v;
  update public.organization_contracts set external_signature_status='signed',external_signature_completed_at=v.completed_at,
    status='accepted',accepted_at=v.completed_at,accepted_by=v.signer_id,updated_at=now() where id=v.contract_id;
  insert into public.operations_audit_log(actor_id,action,entity_type,entity_id,after_data)
  values(null,'external_signature_signed_verified','organization_contract',v.contract_id::text,
    jsonb_build_object('provider',v.provider,'envelopeId',v.provider_envelope_id,'eventId',p_provider_event_id,
      'signedDocumentSha256',v.signed_document_sha256,'auditCertificateSha256',v.audit_certificate_sha256,
      'evidenceVerifiedAt',v.evidence_verified_at));
  return v;
end; $$;
revoke all on function public.apply_verified_external_signature_event(text,text,text,timestamptz,text,text,text,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.apply_verified_external_signature_event(text,text,text,timestamptz,text,text,text,text,jsonb,jsonb) to service_role;

commit;

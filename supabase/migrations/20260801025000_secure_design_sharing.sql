-- Secure, expiring customer review links for production designs.

alter table public.design_share_links
  add column if not exists access_count bigint not null default 0,
  add column if not exists last_accessed_at timestamptz;

alter table public.design_comments
  add column if not exists guest_name text,
  add column if not exists guest_email text;

create or replace function public.get_shared_design(p_token text)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_hash text;
  v_link public.design_share_links;
  v_design public.custom_designs;
  v_comments jsonb;
begin
  if p_token is null or length(p_token)<32 or length(p_token)>256 then raise exception 'invalid_share_token'; end if;
  v_hash=encode(digest(p_token,'sha256'),'hex');
  select * into v_link from public.design_share_links
    where token_hash=v_hash and revoked_at is null and expires_at>now()
    for update;
  if not found then raise exception 'share_link_invalid_or_expired'; end if;
  select * into v_design from public.custom_designs where id=v_link.design_id;
  if not found then raise exception 'shared_design_not_found'; end if;
  update public.design_share_links set access_count=access_count+1,last_accessed_at=now() where id=v_link.id;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',c.id,'view',c.view_key,'x',round((c.x*100)::numeric,3),'y',round((c.y*100)::numeric,3),
    'text',c.body,'resolved',c.resolved_at is not null,'createdAt',c.created_at,
    'author',coalesce(nullif(c.guest_name,''),'SHABABUNA')
  ) order by c.created_at),'[]'::jsonb) into v_comments
  from public.design_comments c where c.design_id=v_design.id;
  return jsonb_build_object(
    'id',v_design.id,'name',v_design.name,'productType',v_design.product_type,'status',v_design.status,
    'version',v_design.version,'designData',v_design.design_data,'previewData',v_design.preview_data,
    'proofData',v_design.proof_data,'approvalNote',v_design.approval_note,'approvedAt',v_design.approved_at,
    'permissions',v_link.permissions,'expiresAt',v_link.expires_at,'comments',v_comments
  );
end;
$$;
revoke all on function public.get_shared_design(text) from public;
grant execute on function public.get_shared_design(text) to anon,authenticated,service_role;

create or replace function public.add_shared_design_comment(
  p_token text,p_view text,p_x numeric,p_y numeric,p_body text,p_guest_name text default null,p_guest_email text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare v_hash text; v_link public.design_share_links; v_comment public.design_comments;
begin
  if p_token is null or length(p_token)<32 or length(p_token)>256 then raise exception 'invalid_share_token'; end if;
  if p_view not in ('front','back','side') then raise exception 'invalid_design_view'; end if;
  if p_x<0 or p_x>100 or p_y<0 or p_y>100 then raise exception 'invalid_comment_position'; end if;
  if char_length(btrim(coalesce(p_body,'')))<2 or char_length(p_body)>1000 then raise exception 'invalid_comment'; end if;
  if p_guest_email is not null and p_guest_email<>'' and p_guest_email!~* '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$' then raise exception 'invalid_email'; end if;
  v_hash=encode(digest(p_token,'sha256'),'hex');
  select * into v_link from public.design_share_links where token_hash=v_hash and revoked_at is null and expires_at>now();
  if not found or v_link.permissions not in ('comment','approve') then raise exception 'comment_not_allowed'; end if;
  insert into public.design_comments(design_id,author_id,view_key,x,y,body,guest_name,guest_email)
  values(v_link.design_id,auth.uid(),p_view,p_x/100.0,p_y/100.0,left(btrim(p_body),1000),left(btrim(coalesce(p_guest_name,'')),120),left(lower(btrim(coalesce(p_guest_email,''))),254))
  returning * into v_comment;
  perform public.enqueue_commerce_notification(
    'shared-design-comment:'||v_comment.id::text,'shared_design_comment','design',v_link.design_id,null,
    'New comment on shared design',jsonb_build_object('designId',v_link.design_id,'commentId',v_comment.id,'view',v_comment.view_key,'comment',v_comment.body,'guestName',v_comment.guest_name,'guestEmail',v_comment.guest_email)
  );
  return jsonb_build_object('id',v_comment.id,'view',v_comment.view_key,'x',p_x,'y',p_y,'text',v_comment.body,'resolved',false,'createdAt',v_comment.created_at,'author',coalesce(nullif(v_comment.guest_name,''),'Reviewer'));
end;
$$;
revoke all on function public.add_shared_design_comment(text,text,numeric,numeric,text,text,text) from public;
grant execute on function public.add_shared_design_comment(text,text,numeric,numeric,text,text,text) to anon,authenticated,service_role;

create or replace function public.respond_to_shared_design(p_token text,p_decision text,p_note text default '')
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare v_hash text; v_link public.design_share_links; v_design public.custom_designs; v_status text;
begin
  if p_decision not in ('approve','request_changes') then raise exception 'invalid_design_decision'; end if;
  if char_length(coalesce(p_note,''))>2000 then raise exception 'note_too_long'; end if;
  v_hash=encode(digest(p_token,'sha256'),'hex');
  select * into v_link from public.design_share_links where token_hash=v_hash and revoked_at is null and expires_at>now();
  if not found or v_link.permissions<>'approve' then raise exception 'approval_not_allowed'; end if;
  select * into v_design from public.custom_designs where id=v_link.design_id for update;
  if not found then raise exception 'shared_design_not_found'; end if;
  if v_design.status not in ('proof_ready','changes_requested') then raise exception 'design_not_ready_for_decision'; end if;
  v_status=case when p_decision='approve' then 'approved' else 'changes_requested' end;
  update public.custom_designs set status=v_status,approval_note=left(btrim(coalesce(p_note,'')),2000),approved_at=case when v_status='approved' then now() else null end,version=version+1,updated_at=now() where id=v_design.id;
  update public.design_share_links set revoked_at=case when v_status='approved' then now() else revoked_at end where id=v_link.id;
  insert into public.operations_audit_log(actor_id,action,entity_type,entity_id,before_data,after_data)
    values(auth.uid(),'shared_design_'||p_decision,'custom_design',v_design.id,to_jsonb(v_design),jsonb_build_object('status',v_status,'note',left(btrim(coalesce(p_note,'')),2000)));
  perform public.enqueue_commerce_notification(
    'shared-design-decision:'||v_link.id::text||':'||v_status,'shared_design_decision','design',v_design.id,null,
    'Shared design decision — '||v_status,jsonb_build_object('designId',v_design.id,'status',v_status,'note',left(btrim(coalesce(p_note,'')),2000))
  );
  return jsonb_build_object('id',v_design.id,'status',v_status,'approvedAt',case when v_status='approved' then now() else null end);
end;
$$;
revoke all on function public.respond_to_shared_design(text,text,text) from public;
grant execute on function public.respond_to_shared_design(text,text,text) to anon,authenticated,service_role;

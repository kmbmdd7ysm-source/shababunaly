begin;

alter table public.quote_requests
  add column if not exists idempotency_key uuid;

create unique index if not exists quote_requests_idempotency_key_uidx
  on public.quote_requests(idempotency_key)
  where idempotency_key is not null;

-- Quote intake is performed only through a rate-limited server endpoint using
-- the service role. Browser RLS remains unchanged and guests never insert rows.

commit;

-- Compatibility cleanup for an earlier LHA inventory approach.
-- SHABABUNA reserves tracked inventory atomically during trusted order creation
-- (or when an international shipping quote is accepted). Deducting again after
-- payment would double-decrement stock, so the legacy trigger is removed.
begin;

alter table public.orders add column if not exists inventory_committed_at timestamptz;
drop trigger if exists orders_commit_inventory on public.orders;
drop function if exists public.commit_inventory_on_confirmed_payment();

commit;

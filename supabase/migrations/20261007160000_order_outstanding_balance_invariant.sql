begin;

-- outstanding_balance is the authoritative unpaid portion of an order.
-- Older checkout functions predate this column, so normalize it before every
-- insert/update that changes the financial basis instead of relying on defaults.
create or replace function public.sync_order_outstanding_balance()
returns trigger
language plpgsql
set search_path=public,pg_temp
as $$
begin
  new.outstanding_balance := greatest(
    round(coalesce(new.total,0) - coalesce(new.amount_paid,0), 2),
    0
  );
  return new;
end;
$$;

drop trigger if exists sync_order_outstanding_balance_trigger on public.orders;
create trigger sync_order_outstanding_balance_trigger
before insert or update of total,amount_paid on public.orders
for each row execute function public.sync_order_outstanding_balance();

update public.orders
set outstanding_balance=greatest(round(total-coalesce(amount_paid,0),2),0)
where outstanding_balance is distinct from greatest(round(total-coalesce(amount_paid,0),2),0);

commit;

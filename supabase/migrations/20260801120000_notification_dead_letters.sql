begin;

alter table public.commerce_notifications
  drop constraint if exists commerce_notifications_delivery_status_check;
alter table public.commerce_notifications
  add constraint commerce_notifications_delivery_status_check
  check (delivery_status in ('pending','sending','sent','failed','dead_letter'));
alter table public.commerce_notifications
  add column if not exists dead_letter_at timestamptz;
alter table public.commerce_notifications
  add column if not exists template_version text not null default '2026-08-01.1';

create index if not exists commerce_notifications_dead_letter_idx
  on public.commerce_notifications(dead_letter_at desc)
  where delivery_status='dead_letter';

commit;

alter table public.finalisasi_honor drop constraint if exists finalisasi_honor_periode_check;
alter table public.finalisasi_honor
  add constraint finalisasi_honor_periode_check
  check (periode ~ '^[0-9]{4}-(0[1-9]|1[0-2])$');

create unique index if not exists finalisasi_honor_one_active_per_member_period_uidx
  on public.finalisasi_honor(periode, tim_id)
  where status = 'FINAL' and tim_id is not null;

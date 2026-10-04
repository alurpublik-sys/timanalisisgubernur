grant select on table public.opd_master to anon, authenticated;
grant select on table public.opd_aliases to anon, authenticated;
grant usage, select on sequence public.opd_master_id_seq to authenticated;
grant usage, select on sequence public.opd_aliases_id_seq to authenticated;
